-- Security hotfix batch 1 (full application audit, 15/10/2026)
-- Findings: SEC-C1, SEC-C2, SEC-H2, SEC-H4 and the sign-up metadata hole.
-- See docs/features/security-hotfix-batch1-plan.md (includes rollback).

-- ============================================================
-- SEC-C1: users must not edit their own subscription, status or billing fields
-- ============================================================
-- SECURITY INVOKER on purpose: current_user is then the real caller. Normal API
-- calls run as 'authenticated'/'anon'; admin edits pass via is_admin(); the
-- service role and SECURITY DEFINER functions (activate_subscription, Stripe,
-- sign-up and subscription triggers) run as another role and pass through.
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at
     OR NEW.subscription_type IS DISTINCT FROM OLD.subscription_type
     OR NEW.subscription_price IS DISTINCT FROM OLD.subscription_price
     OR NEW.used_registration_code_id IS DISTINCT FROM OLD.used_registration_code_id
     OR NEW.current_subscription_code_id IS DISTINCT FROM OLD.current_subscription_code_id
     OR NEW.is_association_member IS DISTINCT FROM OLD.is_association_member
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     OR NEW.original_email IS DISTINCT FROM OLD.original_email
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.last_subscription_reminder_sent IS DISTINCT FROM OLD.last_subscription_reminder_sent
  THEN
    RAISE EXCEPTION 'Subscription, account status and billing details can only be changed by an administrator'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.protect_profile_privileged_columns() FROM PUBLIC, anon, authenticated;

-- Fires after the other BEFORE UPDATE triggers (alphabetical), so it sees the final row.
CREATE TRIGGER trigger_protect_profile_privileged_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_columns();

-- Profiles are only created by handle_new_user; no client code inserts them.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- ============================================================
-- Sign-up: stop trusting client-supplied registration_code_id metadata
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  -- Codes are redeemed only via activate_subscription / Stripe, which validate them.
  INSERT INTO public.profiles (id, email, role, is_active, created_at)
  VALUES (NEW.id, NEW.email, 'User', TRUE, NOW())
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$function$;

-- ============================================================
-- SEC-C2: functions must only return the caller's own data
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_overview(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_queen_cutoff date := current_date - 21;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH active_hives AS (
      SELECT id, apiary_id, beep_device_id, wolf_scale_id, is_queenless, queenless_reason
      FROM hives
      WHERE user_id = p_user_id AND archived_at IS NULL
    ),
    hive_counts AS (
      SELECT apiary_id, count(*) AS cnt FROM active_hives GROUP BY apiary_id
    ),
    last_inspection AS (
      SELECT h.apiary_id, max(i.inspection_date)::text AS last_date
      FROM inspections i JOIN active_hives h ON h.id = i.hive_id
      GROUP BY h.apiary_id
    ),
    apiary_tasks AS (
      SELECT apiary_id, count(*) AS cnt
      FROM tasks_events
      WHERE user_id = p_user_id AND completed = false AND apiary_id IS NOT NULL
      GROUP BY apiary_id
    ),
    scale_devices AS (
      SELECT apiary_id, jsonb_agg(device) AS scales FROM (
        SELECT apiary_id, jsonb_build_object('hiveId', id, 'type', 'beep', 'deviceId', beep_device_id) AS device
        FROM active_hives WHERE beep_device_id IS NOT NULL
        UNION ALL
        SELECT apiary_id, jsonb_build_object('hiveId', id, 'type', 'wolf', 'deviceId', wolf_scale_id) AS device
        FROM active_hives WHERE wolf_scale_id IS NOT NULL
      ) devs GROUP BY apiary_id
    ),
    confirmed_queenless AS (
      SELECT
        apiary_id,
        count(*) AS cnt,
        COALESCE(
          jsonb_agg(DISTINCT COALESCE(queenless_reason, 'unknown') ORDER BY COALESCE(queenless_reason, 'unknown')),
          '[]'::jsonb
        ) AS reasons
      FROM active_hives
      WHERE is_queenless = true
      GROUP BY apiary_id
    ),
    last_queenright_per_hive AS (
      SELECT i.hive_id, max(i.inspection_date) AS last_qr_date
      FROM inspections i JOIN active_hives h ON h.id = i.hive_id
      WHERE i.queen_seen = true OR i.eggs_present = true
      GROUP BY i.hive_id
    ),
    last_queenright_per_apiary AS (
      SELECT h.apiary_id, max(lq.last_qr_date)::text AS last_date
      FROM last_queenright_per_hive lq JOIN active_hives h ON h.id = lq.hive_id
      GROUP BY h.apiary_id
    ),
    queenright_risk AS (
      SELECT h.apiary_id, count(*) AS cnt
      FROM active_hives h
      LEFT JOIN last_queenright_per_hive lq ON lq.hive_id = h.id
      WHERE h.is_queenless = false
        AND (lq.last_qr_date IS NULL OR lq.last_qr_date < v_queen_cutoff)
      GROUP BY h.apiary_id
    ),
    close_dates AS (
      SELECT i.hive_id, max(i.inspection_date) AS close_date
      FROM inspections i JOIN active_hives h ON h.id = i.hive_id
      WHERE (i.eggs_present = true OR i.brood_frames > 0)
         OR (i.brood_frames IS NULL AND i.eggs_present IS NOT true)
      GROUP BY i.hive_id
    ),
    brood_absent_since AS (
      SELECT i.hive_id, min(i.inspection_date) AS absent_since
      FROM inspections i
      JOIN active_hives h ON h.id = i.hive_id
      LEFT JOIN close_dates cd ON cd.hive_id = i.hive_id
      WHERE i.brood_frames = 0
        AND (cd.close_date IS NULL OR i.inspection_date > cd.close_date)
      GROUP BY i.hive_id
    ),
    brood_risk AS (
      SELECT h.apiary_id, count(*) AS cnt
      FROM active_hives h
      JOIN brood_absent_since bas ON bas.hive_id = h.id
      WHERE h.is_queenless = false
        AND bas.absent_since < v_queen_cutoff
      GROUP BY h.apiary_id
    ),
    queen_issue AS (
      SELECT h.apiary_id, count(DISTINCT h.id) AS cnt
      FROM active_hives h
      LEFT JOIN last_queenright_per_hive lq ON lq.hive_id = h.id
      LEFT JOIN brood_absent_since bas ON bas.hive_id = h.id
      WHERE h.is_queenless = true
         OR (lq.last_qr_date IS NULL OR lq.last_qr_date < v_queen_cutoff)
         OR (bas.absent_since IS NOT NULL AND bas.absent_since < v_queen_cutoff)
      GROUP BY h.apiary_id
    ),
    enriched_apiaries AS (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', a.id, 'name', a.name, 'location', a.location, 'city', a.city,
          'latitude', a.latitude, 'longitude', a.longitude,
          'hiveCount', COALESCE(hc.cnt, 0),
          'lastInspectionDate', li.last_date,
          'lastQueenrightDate', lqr.last_date,
          'queenIssueHiveCount', COALESCE(qi.cnt, 0),
          'queenrightAtRiskHiveCount', COALESCE(qr.cnt, 0),
          'broodAtRiskHiveCount', COALESCE(br.cnt, 0),
          'queenlessConfirmedHiveCount', COALESCE(cq.cnt, 0),
          'queenlessConfirmedReasons', COALESCE(cq.reasons, '[]'::jsonb),
          'scales', COALESCE(sd.scales, '[]'::jsonb),
          'activeTaskCount', COALESCE(atk.cnt, 0)
        ) ORDER BY a.name
      ), '[]'::jsonb) AS data
      FROM apiaries a
      LEFT JOIN hive_counts hc ON hc.apiary_id = a.id
      LEFT JOIN last_inspection li ON li.apiary_id = a.id
      LEFT JOIN last_queenright_per_apiary lqr ON lqr.apiary_id = a.id
      LEFT JOIN queen_issue qi ON qi.apiary_id = a.id
      LEFT JOIN queenright_risk qr ON qr.apiary_id = a.id
      LEFT JOIN brood_risk br ON br.apiary_id = a.id
      LEFT JOIN confirmed_queenless cq ON cq.apiary_id = a.id
      LEFT JOIN scale_devices sd ON sd.apiary_id = a.id
      LEFT JOIN apiary_tasks atk ON atk.apiary_id = a.id
      WHERE a.user_id = p_user_id
    )
    SELECT jsonb_build_object(
      'stats', jsonb_build_object(
        'apiaries', (SELECT count(*) FROM apiaries WHERE user_id = p_user_id),
        'hives', (SELECT count(*) FROM hives WHERE user_id = p_user_id),
        'recentInspections', (SELECT count(*) FROM inspections WHERE user_id = p_user_id AND inspection_date >= current_date - 7),
        'queens', (SELECT count(*) FROM queens WHERE user_id = p_user_id AND status = 'active'),
        'activeTasks', (SELECT count(*) FROM tasks_events WHERE user_id = p_user_id AND completed = false)
      ),
      'alerts', jsonb_build_object(
        'overdueInspections', (
          SELECT count(*) FROM active_hives h
          WHERE NOT EXISTS (SELECT 1 FROM inspections i WHERE i.hive_id = h.id AND i.inspection_date >= current_date - 14)
        ),
        'oldQueens', (SELECT count(*) FROM queens WHERE user_id = p_user_id AND status = 'active' AND birth_date < current_date - interval '2 years'),
        'highVarroa', (SELECT count(DISTINCT hive_id) FROM varroa_checks WHERE user_id = p_user_id AND infestation_rate > 3 AND check_date >= current_date - 30),
        'todayTasks', (SELECT count(*) FROM tasks_events WHERE user_id = p_user_id AND completed = false AND start_date = current_date)
      ),
      'apiaries', ea.data
    )
    FROM enriched_apiaries ea
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_recent_activity(p_user_id uuid, p_limit integer DEFAULT 5)
 RETURNS TABLE(id uuid, record_type text, activity_date text, hive_id uuid, hive_number text, apiary_name text, queen_seen boolean, treatment_type text, infestation_rate numeric, feed_type text, honey_weight numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT * FROM (
    (
      SELECT i.id, 'inspection'::text AS record_type, i.inspection_date::text AS activity_date,
             i.hive_id, h.hive_number, a.name AS apiary_name,
             i.queen_seen, NULL::text AS treatment_type, NULL::numeric AS infestation_rate,
             NULL::text AS feed_type, NULL::numeric AS honey_weight
      FROM inspections i
      JOIN hives h ON h.id = i.hive_id
      JOIN apiaries a ON a.id = h.apiary_id
      WHERE i.user_id = p_user_id
      ORDER BY i.inspection_date DESC LIMIT 10
    )
    UNION ALL
    (
      SELECT vt.id, 'varroa_treatment'::text, vt.treatment_date::text,
             vt.hive_id, h.hive_number, a.name,
             NULL::boolean, vt.treatment_type, NULL::numeric,
             NULL::text, NULL::numeric
      FROM varroa_treatments vt
      JOIN hives h ON h.id = vt.hive_id
      JOIN apiaries a ON a.id = h.apiary_id
      WHERE vt.user_id = p_user_id
      ORDER BY vt.treatment_date DESC LIMIT 10
    )
    UNION ALL
    (
      SELECT vc.id, 'varroa_check'::text, vc.check_date::date::text,
             vc.hive_id, h.hive_number, a.name,
             NULL::boolean, NULL::text, vc.infestation_rate,
             NULL::text, NULL::numeric
      FROM varroa_checks vc
      JOIN hives h ON h.id = vc.hive_id
      JOIN apiaries a ON a.id = h.apiary_id
      WHERE vc.user_id = p_user_id
      ORDER BY vc.check_date DESC LIMIT 10
    )
    UNION ALL
    (
      SELECT f.id, 'feeding'::text, f.feed_date::text,
             f.hive_id, h.hive_number, a.name,
             NULL::boolean, NULL::text, NULL::numeric,
             f.feed_type, NULL::numeric
      FROM feedings f
      JOIN hives h ON h.id = f.hive_id
      JOIN apiaries a ON a.id = h.apiary_id
      WHERE f.user_id = p_user_id
      ORDER BY f.feed_date DESC LIMIT 10
    )
    UNION ALL
    (
      SELECT hr.id, 'harvest'::text, hr.harvest_date::text,
             hr.hive_id, h.hive_number, a.name,
             NULL::boolean, NULL::text, NULL::numeric,
             NULL::text, hr.honey_weight
      FROM harvests hr
      JOIN hives h ON h.id = hr.hive_id
      JOIN apiaries a ON a.id = h.apiary_id
      WHERE hr.user_id = p_user_id
      ORDER BY hr.harvest_date DESC LIMIT 10
    )
  ) combined
  WHERE p_user_id = (SELECT auth.uid())
  ORDER BY 3 DESC
  LIMIT LEAST(p_limit, 50);
$function$;

-- Email only for yourself, an admin, or someone you share a team / rearing group with.
CREATE OR REPLACE FUNCTION public.get_user_email(search_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  user_email text;
BEGIN
  IF v_caller IS NULL THEN
    RETURN 'Unknown';
  END IF;

  IF search_user_id IS DISTINCT FROM v_caller
     AND NOT public.is_admin()
     AND NOT EXISTS (
       SELECT 1 FROM teams t
       WHERE (t.owner_id = v_caller
              OR EXISTS (SELECT 1 FROM team_members m WHERE m.team_id = t.id AND m.user_id = v_caller))
         AND (t.owner_id = search_user_id
              OR EXISTS (SELECT 1 FROM team_members m WHERE m.team_id = t.id AND m.user_id = search_user_id))
     )
     AND NOT EXISTS (
       SELECT 1 FROM rearing_groups g
       WHERE (g.owner_id = v_caller
              OR EXISTS (SELECT 1 FROM rearing_group_members m WHERE m.group_id = g.id AND m.user_id = v_caller))
         AND (g.owner_id = search_user_id
              OR EXISTS (SELECT 1 FROM rearing_group_members m WHERE m.group_id = g.id AND m.user_id = search_user_id))
     )
  THEN
    RETURN 'Unknown';
  END IF;

  SELECT email INTO user_email
  FROM auth.users
  WHERE id = search_user_id;

  RETURN COALESCE(user_email, 'Unknown');
END;
$function$;

-- ============================================================
-- SEC-H2: invitations readable only by the owner or the invitee
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view invitations" ON public.team_invitations;
CREATE POLICY "Owners and invitees can view team invitations"
  ON public.team_invitations FOR SELECT TO authenticated
  USING (
    is_team_owner(team_id, (SELECT auth.uid()))
    OR lower(email) = lower((SELECT auth.jwt() ->> 'email'))
  );

DROP POLICY IF EXISTS "Anyone can view invitations by UUID" ON public.rearing_group_invitations;
CREATE POLICY "Owners and invitees can view rearing group invitations"
  ON public.rearing_group_invitations FOR SELECT TO authenticated
  USING (
    is_rearing_group_owner(group_id, (SELECT auth.uid()))
    OR lower(email) = lower((SELECT auth.jwt() ->> 'email'))
  );

-- Invitation links open before login: fetch one invitation by its unguessable ID,
-- in the same shape the pages used before (row + team/group name).
CREATE OR REPLACE FUNCTION public.get_team_invitation(p_invitation_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT to_jsonb(i) || jsonb_build_object('teams', jsonb_build_object('name', t.name))
  FROM team_invitations i
  LEFT JOIN teams t ON t.id = i.team_id
  WHERE i.id = p_invitation_id;
$function$;

CREATE OR REPLACE FUNCTION public.get_rearing_group_invitation(p_invitation_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT to_jsonb(i) || jsonb_build_object('rearing_groups', jsonb_build_object('name', g.name))
  FROM rearing_group_invitations i
  LEFT JOIN rearing_groups g ON g.id = i.group_id
  WHERE i.id = p_invitation_id;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_team_invitation(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_rearing_group_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_team_invitation(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_rearing_group_invitation(uuid) TO anon, authenticated;

-- ============================================================
-- SEC-H4: registration codes readable by admins only
-- ============================================================
DROP POLICY IF EXISTS "Allow authenticated users to read all codes" ON public.registration_codes;
-- Dead policies: compared against lowercase 'admin'; "Admins can manage registration codes" covers admins.
DROP POLICY IF EXISTS "Allow admins to delete codes" ON public.registration_codes;
DROP POLICY IF EXISTS "Allow admins to insert codes" ON public.registration_codes;
DROP POLICY IF EXISTS "Allow admins to update codes" ON public.registration_codes;

-- Look up one code by its exact text (used by the renew-subscription modal).
CREATE OR REPLACE FUNCTION public.lookup_registration_code(p_code text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT jsonb_build_object(
    'id', rc.id,
    'code', rc.code,
    'code_type', rc.code_type,
    'association_id', rc.association_id,
    'is_active', rc.is_active,
    'max_uses', rc.max_uses,
    'current_uses', rc.current_uses,
    'subscription_expires_at', rc.subscription_expires_at
  )
  FROM registration_codes rc
  WHERE rc.code = p_code;
$function$;

REVOKE EXECUTE ON FUNCTION public.lookup_registration_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_registration_code(text) TO authenticated;
