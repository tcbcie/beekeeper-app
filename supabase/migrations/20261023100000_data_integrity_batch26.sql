-- Batch 26: data integrity (Phase 2 fix batch 13)
--   A. Queen lineage cycles (C6-08): a queen can never become her own ancestor.
--   B. Invitations: one pending invitation per team/group and email (any case); accepted and
--      declined history no longer blocks re-inviting a former member.
--   C. Dashboard: "today" is the Irish date, not the database's UTC date.

-- ---------------------------------------------------------------------------
-- A. Queen lineage cycles
-- ---------------------------------------------------------------------------

-- A queen can't be her own mother or father (also covers an insert naming its own id).
ALTER TABLE public.queens
  ADD CONSTRAINT queens_not_own_parent
  CHECK (mother_id IS DISTINCT FROM id AND father_id IS DISTINCT FROM id);

-- When a queen's mother or father changes, walk up from the new parents. If the queen herself
-- is among their ancestors, the change would close a loop, so it is refused. SECURITY DEFINER
-- so the walk also sees ancestors the caller can't read (e.g. another beekeeper's queen).
-- UNION (not UNION ALL) drops repeats, so the walk always ends.
CREATE OR REPLACE FUNCTION public.queens_prevent_lineage_cycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    WITH RECURSIVE ancestors(id) AS (
      SELECT parent_id
      FROM (VALUES (NEW.mother_id), (NEW.father_id)) AS parents(parent_id)
      WHERE parent_id IS NOT NULL
      UNION
      SELECT p.parent_id
      FROM ancestors a
      JOIN queens q ON q.id = a.id
      CROSS JOIN LATERAL (VALUES (q.mother_id), (q.father_id)) AS p(parent_id)
      WHERE p.parent_id IS NOT NULL
    )
    SELECT 1 FROM ancestors WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Queen % can''t have one of her own descendants as a parent.', NEW.queen_number
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger-only function: nobody calls it directly.
REVOKE EXECUTE ON FUNCTION public.queens_prevent_lineage_cycle() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER queens_prevent_lineage_cycle
  BEFORE UPDATE OF mother_id, father_id ON public.queens
  FOR EACH ROW
  WHEN (NEW.mother_id IS DISTINCT FROM OLD.mother_id OR NEW.father_id IS DISTINCT FROM OLD.father_id)
  EXECUTE FUNCTION public.queens_prevent_lineage_cycle();

-- ---------------------------------------------------------------------------
-- B. Invitations
-- ---------------------------------------------------------------------------

-- The old rules allowed one row per (team/group, email, status): a former member's old
-- 'accepted' row made accepting a new invitation fail, and 'Anne@' and 'anne@' were different.
ALTER TABLE public.team_invitations DROP CONSTRAINT team_invitations_unique;
ALTER TABLE public.rearing_group_invitations DROP CONSTRAINT rearing_group_invitations_group_id_email_status_key;

CREATE UNIQUE INDEX team_invitations_one_pending_per_email
  ON public.team_invitations (team_id, lower(email))
  WHERE status = 'pending';

CREATE UNIQUE INDEX rearing_group_invitations_one_pending_per_email
  ON public.rearing_group_invitations (group_id, lower(email))
  WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- C. Dashboard overview: Irish date
-- ---------------------------------------------------------------------------

-- Same signature, guard and body as security_hotfix_batch1; only current_date (UTC) is
-- replaced by v_today, the date in Europe/Dublin. Grants are kept by CREATE OR REPLACE.
CREATE OR REPLACE FUNCTION public.get_dashboard_overview(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today date := (now() AT TIME ZONE 'Europe/Dublin')::date;
  v_queen_cutoff date := v_today - 21;
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
        'recentInspections', (SELECT count(*) FROM inspections WHERE user_id = p_user_id AND inspection_date >= v_today - 7),
        'queens', (SELECT count(*) FROM queens WHERE user_id = p_user_id AND status = 'active'),
        'activeTasks', (SELECT count(*) FROM tasks_events WHERE user_id = p_user_id AND completed = false)
      ),
      'alerts', jsonb_build_object(
        'overdueInspections', (
          SELECT count(*) FROM active_hives h
          WHERE NOT EXISTS (SELECT 1 FROM inspections i WHERE i.hive_id = h.id AND i.inspection_date >= v_today - 14)
        ),
        'oldQueens', (SELECT count(*) FROM queens WHERE user_id = p_user_id AND status = 'active' AND birth_date < v_today - interval '2 years'),
        'highVarroa', (SELECT count(DISTINCT hive_id) FROM varroa_checks WHERE user_id = p_user_id AND infestation_rate > 3 AND check_date >= v_today - 30),
        'todayTasks', (SELECT count(*) FROM tasks_events WHERE user_id = p_user_id AND completed = false AND start_date = v_today)
      ),
      'apiaries', ea.data
    )
    FROM enriched_apiaries ea
  );
END;
$function$;
