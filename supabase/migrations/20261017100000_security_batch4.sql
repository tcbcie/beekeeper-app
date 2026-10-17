-- Security batch 4 (17/10/2026): cross-account holes in the sharing rules.
-- Applied via MCP as six migrations, reproduced here in order:
--   security_batch4_links_and_admin, security_batch4_coordinate_privacy,
--   security_batch4_membership_consent, security_batch4_distribution_recipients,
--   security_batch4_distribution_hive_placement, security_batch4_rearing_group_transfer.
-- See docs/features/security-hotfix-batch4-plan.md.

-- ===== 1. security_batch4_links_and_admin =====================================

-- DB-02: a batch's mating apiary only grants group access when the batch owner can access it directly.
CREATE OR REPLACE FUNCTION public.can_access_apiary_direct(apiary_uuid uuid, user_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM apiaries WHERE id = apiary_uuid AND user_id = user_uuid)
      OR EXISTS (SELECT 1 FROM team_apiaries ta JOIN team_members tm ON ta.team_id = tm.team_id
                 WHERE ta.apiary_id = apiary_uuid AND tm.user_id = user_uuid)
      OR EXISTS (SELECT 1 FROM team_apiaries ta JOIN teams t ON ta.team_id = t.id
                 WHERE ta.apiary_id = apiary_uuid AND t.owner_id = user_uuid);
$$;
REVOKE EXECUTE ON FUNCTION public.can_access_apiary_direct(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.can_access_apiary(apiary_uuid uuid, user_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $function$
  SELECT public.can_access_apiary_direct(apiary_uuid, user_uuid)
  OR EXISTS (
    SELECT 1 FROM rearing_batches rb
    INNER JOIN rearing_group_members rgm ON rb.rearing_group_id = rgm.group_id
    WHERE rb.mating_apiary_id = apiary_uuid AND rgm.user_id = user_uuid
      AND public.can_access_apiary_direct(apiary_uuid, rb.user_id)
  );
$function$;

CREATE OR REPLACE FUNCTION public.guard_rearing_batch_links()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- Server-side writes (secret key) are trusted; user writes are checked when a link is set or changed.
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  IF NEW.mating_apiary_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.mating_apiary_id IS DISTINCT FROM OLD.mating_apiary_id)
     AND NOT public.can_access_apiary_direct(NEW.mating_apiary_id, NEW.user_id) THEN
    RAISE EXCEPTION 'The mating apiary must be one of your own or team-shared apiaries' USING ERRCODE = '42501';
  END IF;

  IF NEW.rearing_group_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.rearing_group_id IS DISTINCT FROM OLD.rearing_group_id)
     AND NOT (public.is_rearing_group_owner(NEW.rearing_group_id, NEW.user_id)
              OR EXISTS (SELECT 1 FROM rearing_group_members
                         WHERE group_id = NEW.rearing_group_id AND user_id = NEW.user_id)) THEN
    RAISE EXCEPTION 'A batch can only be linked to a rearing group you belong to' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.guard_rearing_batch_links() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_guard_rearing_batch_links ON public.rearing_batches;
CREATE TRIGGER trg_guard_rearing_batch_links
  BEFORE INSERT OR UPDATE OF mating_apiary_id, rearing_group_id ON public.rearing_batches
  FOR EACH ROW EXECUTE FUNCTION public.guard_rearing_batch_links();

-- DB-03 (integrity): a distribution's recipient apiary and hive must belong to the recipient.
CREATE OR REPLACE FUNCTION public.guard_distribution_recipient()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  IF NEW.recipient_apiary_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.recipient_apiary_id IS DISTINCT FROM OLD.recipient_apiary_id
          OR NEW.recipient_user_id IS DISTINCT FROM OLD.recipient_user_id)
     AND NOT EXISTS (SELECT 1 FROM apiaries WHERE id = NEW.recipient_apiary_id AND user_id = NEW.recipient_user_id) THEN
    RAISE EXCEPTION 'The recipient apiary must belong to the recipient' USING ERRCODE = '42501';
  END IF;

  IF NEW.recipient_hive_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.recipient_hive_id IS DISTINCT FROM OLD.recipient_hive_id
          OR NEW.recipient_user_id IS DISTINCT FROM OLD.recipient_user_id)
     AND NOT EXISTS (SELECT 1 FROM hives WHERE id = NEW.recipient_hive_id AND user_id = NEW.recipient_user_id) THEN
    RAISE EXCEPTION 'The recipient hive must belong to the recipient' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.guard_distribution_recipient() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_guard_distribution_recipient ON public.graft_distributions;
CREATE TRIGGER trg_guard_distribution_recipient
  BEFORE INSERT OR UPDATE OF recipient_user_id, recipient_apiary_id, recipient_hive_id ON public.graft_distributions
  FOR EACH ROW EXECUTE FUNCTION public.guard_distribution_recipient();

-- DB-05: admin rights come from profiles.role (is_current_user_admin), never the legacy del_user_profiles table.
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can update all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can delete tickets" ON public.support_tickets;
CREATE POLICY "Admins can view all tickets" ON public.support_tickets FOR SELECT TO authenticated
  USING ((SELECT public.is_current_user_admin()));
CREATE POLICY "Admins can update all tickets" ON public.support_tickets FOR UPDATE TO authenticated
  USING ((SELECT public.is_current_user_admin())) WITH CHECK ((SELECT public.is_current_user_admin()));
CREATE POLICY "Admins can delete tickets" ON public.support_tickets FOR DELETE TO authenticated
  USING ((SELECT public.is_current_user_admin()));

DROP POLICY IF EXISTS "Allow admins to manage varroa treatment products" ON public.varroa_treatment_products;
CREATE POLICY "Allow admins to manage varroa treatment products" ON public.varroa_treatment_products FOR ALL TO authenticated
  USING ((SELECT public.is_current_user_admin())) WITH CHECK ((SELECT public.is_current_user_admin()));

-- Legacy table: no client access at all (only the service-role admin export reads it).
REVOKE ALL ON public.del_user_profiles FROM anon, authenticated;

-- ===== 2. security_batch4_coordinate_privacy ==================================

-- DB-06: community coordinates are obfuscated with a secret seed (Vault), never raw, never to anon.
-- The seed is generated inside the database; its value never appears in the repo.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'coord_obfuscation_salt') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'coord_obfuscation_salt',
                                'Secret seed for community coordinate obfuscation');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.coord_obfuscation_seed(p_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT md5(p_id::text || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'coord_obfuscation_salt'));
$$;
REVOKE EXECUTE ON FUNCTION public.coord_obfuscation_seed(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_shared_apiaries_obfuscated()
RETURNS TABLE(id uuid, city text, latitude double precision, longitude double precision, created_at timestamptz, hive_count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT a.id, a.city::text, o.obfuscated_lat, o.obfuscated_lng, a.created_at,
         (SELECT count(*)::integer FROM hives h WHERE h.apiary_id = a.id AND h.archived_at IS NULL)
  FROM apiaries a
  CROSS JOIN LATERAL obfuscate_coordinates(a.latitude::double precision, a.longitude::double precision,
                                           public.coord_obfuscation_seed(a.id), 5.0) o
  WHERE a.share_location = true AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL
    AND a.user_id <> auth.uid();
END $$;
REVOKE EXECUTE ON FUNCTION public.get_shared_apiaries_obfuscated() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_shared_apiaries_obfuscated() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_wild_colonies_obfuscated()
RETURNS TABLE(id uuid, latitude double precision, longitude double precision, status text, nesting_type text, observation_date date)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT is_power_user_or_admin() THEN RETURN; END IF;
  RETURN QUERY
  SELECT wc.id, o.obfuscated_lat, o.obfuscated_lng, wc.status::text, wc.nesting_type::text, wc.observation_date::date
  FROM wild_colonies wc
  CROSS JOIN LATERAL obfuscate_coordinates(wc.latitude::double precision, wc.longitude::double precision,
                                           public.coord_obfuscation_seed(wc.id), 5.0) o
  WHERE wc.latitude IS NOT NULL AND wc.longitude IS NOT NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.get_wild_colonies_obfuscated() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_wild_colonies_obfuscated() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_all_apiaries_obfuscated()
RETURNS TABLE(id uuid, city text, latitude double precision, longitude double precision, created_at timestamptz, hive_count integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT is_power_user_or_admin() THEN RETURN; END IF;
  RETURN QUERY
  SELECT a.id, a.city, o.obfuscated_lat, o.obfuscated_lng, a.created_at,
         (SELECT count(*)::integer FROM hives h WHERE h.apiary_id = a.id AND h.archived_at IS NULL)
  FROM apiaries a
  CROSS JOIN LATERAL obfuscate_coordinates(a.latitude::double precision, a.longitude::double precision,
                                           public.coord_obfuscation_seed(a.id), 5.0) o
  WHERE a.user_id != auth.uid() AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_shared_gdd_records()
RETURNS TABLE(id uuid, vegetation_type_id uuid, year integer, start_date date, end_date date, gdd_value numeric, user_id uuid, vegetation_name text, city text, latitude double precision, longitude double precision)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT gr.id, gr.vegetation_type_id, gr.year, gr.start_date, gr.end_date, gr.gdd_value, gr.user_id,
         dv.value::TEXT, a.city::TEXT, o.obfuscated_lat, o.obfuscated_lng
  FROM gdd_records gr
  JOIN apiaries a ON gr.apiary_id = a.id
  LEFT JOIN dropdown_values dv ON gr.vegetation_type_id = dv.id
  CROSS JOIN LATERAL obfuscate_coordinates(a.latitude::double precision, a.longitude::double precision,
                                           public.coord_obfuscation_seed(a.id), 5.0) o
  WHERE gr.is_shared = true AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.get_shared_gdd_records() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_shared_gdd_records() TO authenticated;

REVOKE ALL ON public.shared_gdd_records_community FROM anon, authenticated;
REVOKE ALL ON public.shared_apiaries_obfuscated FROM anon;
REVOKE ALL ON public.wild_colonies_obfuscated FROM anon;

-- ===== 3. security_batch4_membership_consent ==================================

-- DB-01 / D9: nobody can be added to a team or rearing group without accepting an invitation
-- sent to their own email. Owners may only insert themselves (group creation); the sign-up
-- trigger (SECURITY DEFINER) keeps auto-accepting team invitations for new accounts.
CREATE OR REPLACE FUNCTION public.accept_team_invitation(p_invitation_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_inv record;
  v_rows integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;

  SELECT id, team_id, email, status, expires_at INTO v_inv
  FROM team_invitations WHERE id = p_invitation_id FOR UPDATE;
  IF NOT FOUND OR lower(v_inv.email) IS DISTINCT FROM v_email THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE = '42501';
  END IF;
  IF v_inv.status = 'accepted' THEN RETURN 'already_member'; END IF;
  IF v_inv.status <> 'pending' THEN RAISE EXCEPTION 'This invitation is no longer pending' USING ERRCODE = '22023'; END IF;
  IF v_inv.expires_at IS NOT NULL AND v_inv.expires_at <= now() THEN
    RAISE EXCEPTION 'This invitation has expired' USING ERRCODE = '22023';
  END IF;

  INSERT INTO team_members (team_id, user_id, role) VALUES (v_inv.team_id, v_uid, 'member')
  ON CONFLICT (team_id, user_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  UPDATE team_invitations SET status = 'accepted', accepted_at = now() WHERE id = p_invitation_id;
  RETURN CASE WHEN v_rows = 0 THEN 'already_member' ELSE 'accepted' END;
END $$;
REVOKE EXECUTE ON FUNCTION public.accept_team_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_team_invitation(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_rearing_group_invitation(p_invitation_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_inv record;
  v_rows integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;

  SELECT id, group_id, email, status, expires_at INTO v_inv
  FROM rearing_group_invitations WHERE id = p_invitation_id FOR UPDATE;
  IF NOT FOUND OR lower(v_inv.email) IS DISTINCT FROM v_email THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE = '42501';
  END IF;
  IF v_inv.status = 'accepted' THEN RETURN 'already_member'; END IF;
  IF v_inv.status <> 'pending' THEN RAISE EXCEPTION 'This invitation is no longer pending' USING ERRCODE = '22023'; END IF;
  IF v_inv.expires_at IS NOT NULL AND v_inv.expires_at <= now() THEN
    RAISE EXCEPTION 'This invitation has expired' USING ERRCODE = '22023';
  END IF;

  INSERT INTO rearing_group_members (group_id, user_id, role) VALUES (v_inv.group_id, v_uid, 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  UPDATE rearing_group_invitations SET status = 'accepted', accepted_at = now() WHERE id = p_invitation_id;
  RETURN CASE WHEN v_rows = 0 THEN 'already_member' ELSE 'accepted' END;
END $$;
REVOKE EXECUTE ON FUNCTION public.accept_rearing_group_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_rearing_group_invitation(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_pending_invitations()
RETURNS TABLE(kind text, invitation_id uuid, name text, inviter_name text, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH me AS (SELECT lower(email) AS email FROM auth.users WHERE id = auth.uid())
  SELECT 'team', ti.id, t.name::text, NULLIF(trim(concat_ws(' ', p.first_name, p.last_name)), ''), ti.expires_at
  FROM team_invitations ti JOIN teams t ON t.id = ti.team_id
  LEFT JOIN profiles p ON p.id = ti.invited_by, me
  WHERE lower(ti.email) = me.email AND ti.status = 'pending' AND (ti.expires_at IS NULL OR ti.expires_at > now())
  UNION ALL
  SELECT 'rearing_group', ri.id, g.name::text, NULLIF(trim(concat_ws(' ', p.first_name, p.last_name)), ''), ri.expires_at
  FROM rearing_group_invitations ri JOIN rearing_groups g ON g.id = ri.group_id
  LEFT JOIN profiles p ON p.id = ri.invited_by, me
  WHERE lower(ri.email) = me.email AND ri.status = 'pending' AND (ri.expires_at IS NULL OR ri.expires_at > now());
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_pending_invitations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_pending_invitations() TO authenticated;

DROP POLICY IF EXISTS "Team owners can add members" ON public.team_members;
CREATE POLICY "Team owners can add themselves" ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (is_team_owner(team_id, (SELECT auth.uid())) AND user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "Group owners can insert members" ON public.rearing_group_members;
CREATE POLICY "Group owners can add themselves" ON public.rearing_group_members FOR INSERT TO authenticated
  WITH CHECK (is_rearing_group_owner(group_id, (SELECT auth.uid())) AND user_id = (SELECT auth.uid()));

-- Membership rows can't be re-pointed at another user or group; only owners change roles
-- (anyone may step down to 'member'). Covers DB-09.
CREATE OR REPLACE FUNCTION public.guard_membership_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_is_owner boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'A membership cannot be moved to another user' USING ERRCODE = '42501';
  END IF;
  IF TG_TABLE_NAME = 'team_members' THEN
    IF NEW.team_id IS DISTINCT FROM OLD.team_id THEN
      RAISE EXCEPTION 'A membership cannot be moved to another team' USING ERRCODE = '42501';
    END IF;
    v_is_owner := is_team_owner(OLD.team_id, auth.uid());
  ELSE
    IF NEW.group_id IS DISTINCT FROM OLD.group_id THEN
      RAISE EXCEPTION 'A membership cannot be moved to another group' USING ERRCODE = '42501';
    END IF;
    v_is_owner := is_rearing_group_owner(OLD.group_id, auth.uid());
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT v_is_owner AND NEW.role <> 'member' THEN
    RAISE EXCEPTION 'Only the owner can change roles' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.guard_membership_columns() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_guard_team_member_columns ON public.team_members;
CREATE TRIGGER trg_guard_team_member_columns BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_membership_columns();
DROP TRIGGER IF EXISTS trg_guard_rearing_group_member_columns ON public.rearing_group_members;
CREATE TRIGGER trg_guard_rearing_group_member_columns BEFORE UPDATE ON public.rearing_group_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_membership_columns();

-- ===== 4. security_batch4_distribution_recipients =============================

-- DB-03 / D10: a distribution reveals a recipient's profile and apiary details only when the
-- recipient is the caller or shares a team or rearing group with them. Everyone else sees
-- name + apiary name via get_distribution_recipient_labels.
CREATE OR REPLACE FUNCTION public.shares_group_or_team_with_me(p_other uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT p_other IS NOT NULL AND (
    p_other = auth.uid()
    OR EXISTS (SELECT 1 FROM team_members a JOIN team_members b ON a.team_id = b.team_id
               WHERE a.user_id = auth.uid() AND b.user_id = p_other)
    OR EXISTS (SELECT 1 FROM teams t JOIN team_members m ON m.team_id = t.id
               WHERE (t.owner_id = auth.uid() AND m.user_id = p_other)
                  OR (t.owner_id = p_other AND m.user_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM rearing_group_members a JOIN rearing_group_members b ON a.group_id = b.group_id
               WHERE a.user_id = auth.uid() AND b.user_id = p_other)
    OR EXISTS (SELECT 1 FROM rearing_groups g JOIN rearing_group_members m ON m.group_id = g.id
               WHERE (g.owner_id = auth.uid() AND m.user_id = p_other)
                  OR (g.owner_id = p_other AND m.user_id = auth.uid()))
  );
$$;
REVOKE EXECUTE ON FUNCTION public.shares_group_or_team_with_me(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shares_group_or_team_with_me(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can view accessible apiaries" ON public.apiaries;
CREATE POLICY "Users can view accessible apiaries" ON public.apiaries FOR SELECT
  USING (
    can_access_apiary(id, (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM graft_distributions gd
      WHERE gd.recipient_apiary_id = apiaries.id
        AND gd.user_id = (SELECT auth.uid())
        AND public.shares_group_or_team_with_me(gd.recipient_user_id)
    )
  );

DROP POLICY IF EXISTS "Users can view own and related profiles" ON public.profiles;
CREATE POLICY "Users can view own and related profiles" ON public.profiles FOR SELECT
  USING (
    ((SELECT auth.uid()) = id)
    OR (EXISTS (SELECT 1 FROM graft_distributions gd
                WHERE gd.user_id = (SELECT auth.uid()) AND gd.recipient_user_id = profiles.id)
        AND public.shares_group_or_team_with_me(profiles.id))
    OR (EXISTS (SELECT 1 FROM rearing_group_members rgm1
                JOIN rearing_group_members rgm2 ON rgm1.group_id = rgm2.group_id
                WHERE rgm1.user_id = (SELECT auth.uid()) AND rgm2.user_id = profiles.id))
    OR (EXISTS (SELECT 1 FROM team_members tm1
                JOIN team_members tm2 ON tm1.team_id = tm2.team_id
                WHERE tm1.user_id = (SELECT auth.uid()) AND tm2.user_id = profiles.id))
  );

CREATE OR REPLACE FUNCTION public.get_distribution_recipient_labels(p_distribution_ids uuid[])
RETURNS TABLE(distribution_id uuid, recipient_name text, apiary_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT gd.id,
         COALESCE(NULLIF(trim(p.full_name), ''), NULLIF(trim(concat_ws(' ', p.first_name, p.last_name)), '')),
         a.name::text
  FROM graft_distributions gd
  LEFT JOIN profiles p ON p.id = gd.recipient_user_id
  LEFT JOIN apiaries a ON a.id = gd.recipient_apiary_id AND a.user_id = gd.recipient_user_id
  WHERE gd.id = ANY(p_distribution_ids)
    AND gd.recipient_user_id IS NOT NULL
    AND (gd.user_id = auth.uid()
         OR gd.batch_id IN (SELECT rb.id FROM rearing_batches rb
                            WHERE rb.user_id IN (SELECT public.get_rearing_group_member_user_ids(auth.uid()))));
$$;
REVOKE EXECUTE ON FUNCTION public.get_distribution_recipient_labels(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_distribution_recipient_labels(uuid[]) TO authenticated;

-- ===== 5. security_batch4_distribution_hive_placement =========================

-- D10: a distributed queen is placed into the recipient's hive only when the recipient is the
-- caller or shares a team/rearing group with them; otherwise it is created unplaced.
DO $do$
DECLARE
  v_oid oid;
  v_def text;
  v_old text := 'IF v_queen_id IS NOT NULL AND p_recipient_hive_id IS NOT NULL AND EXISTS (';
  v_new text := 'IF v_queen_id IS NOT NULL AND p_recipient_hive_id IS NOT NULL'
             || E'\n     AND (p_recipient_user_id = v_caller OR public.shares_group_or_team_with_me(p_recipient_user_id))'
             || E'\n     AND EXISTS (';
BEGIN
  SELECT p.oid INTO STRICT v_oid FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'create_queen_for_distribution';
  v_def := pg_get_functiondef(v_oid);
  IF position(v_old IN v_def) = 0 THEN
    RAISE EXCEPTION 'create_queen_for_distribution: placement condition not found, nothing changed';
  END IF;
  EXECUTE replace(v_def, v_old, v_new);
END
$do$;

-- ===== 6. security_batch4_rearing_group_transfer ==============================

-- Ownership transfer never worked: the UPDATE policy had no WITH CHECK, so the USING clause
-- (owner_id = me) was re-applied to the new row. Allow the owner to hand the group only to
-- one of its existing members.
DROP POLICY IF EXISTS "Owners can update their groups" ON public.rearing_groups;
CREATE POLICY "Owners can update their groups" ON public.rearing_groups FOR UPDATE
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.rearing_group_members m
               WHERE m.group_id = rearing_groups.id AND m.user_id = rearing_groups.owner_id)
  );
