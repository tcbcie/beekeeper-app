-- Security batch 6 (17/10/2026): database rules (DB-04, DB-07, DB-08, DB-10, DB-11, DB-15).
-- Applied via MCP as four migrations, reproduced here in order:
--   security_batch6_record_moves, security_batch6_public_trace,
--   security_batch6_misc_rules, security_batch6_batch_links.
-- See docs/features/security-batch6-plan.md.

-- ===== 1. security_batch6_record_moves ========================================

-- DB-07: edits must stay within hives/apiaries the user can access (mirrors the INSERT rules).
ALTER POLICY "Users can update their own inspections" ON public.inspections
  WITH CHECK ((user_id = (SELECT auth.uid())) AND can_access_hive(hive_id, (SELECT auth.uid())));
ALTER POLICY "Users can update their own feedings" ON public.feedings
  WITH CHECK ((user_id = (SELECT auth.uid())) AND can_access_hive(hive_id, (SELECT auth.uid())));
ALTER POLICY "Users can update their own harvests" ON public.harvests
  WITH CHECK ((user_id = (SELECT auth.uid())) AND can_access_hive(hive_id, (SELECT auth.uid())));
ALTER POLICY "Users can update their own checks" ON public.varroa_checks
  WITH CHECK ((user_id = (SELECT auth.uid())) AND can_access_hive(hive_id, (SELECT auth.uid())));
ALTER POLICY "Users can update their own treatments" ON public.varroa_treatments
  WITH CHECK ((user_id = (SELECT auth.uid())) AND can_access_hive(hive_id, (SELECT auth.uid())));
ALTER POLICY "yard_benches_update_policy" ON public.yard_benches
  WITH CHECK ((user_id = (SELECT auth.uid())) AND can_access_apiary(apiary_id, (SELECT auth.uid())));

-- Hives: unchanged edit rights, but the (new) apiary must be one the user can access.
ALTER POLICY "hives_update_policy" ON public.hives
  WITH CHECK (
    ((user_id = (SELECT auth.uid())) OR ((apiary_id IS NOT NULL) AND can_access_apiary(apiary_id, (SELECT auth.uid()))))
    AND ((apiary_id IS NULL) OR can_access_apiary(apiary_id, (SELECT auth.uid())))
  );

-- GDD records feed get_shared_gdd_records (apiary location): only accessible apiaries.
ALTER POLICY "Users can insert own gdd_records" ON public.gdd_records
  WITH CHECK ((user_id = (SELECT auth.uid())) AND ((apiary_id IS NULL) OR can_access_apiary(apiary_id, (SELECT auth.uid()))));
ALTER POLICY "Users can update own gdd_records" ON public.gdd_records
  WITH CHECK ((user_id = (SELECT auth.uid())) AND ((apiary_id IS NULL) OR can_access_apiary(apiary_id, (SELECT auth.uid()))));

-- Container links: only harvests the user can see (the harvests RLS decides inside the subquery).
ALTER POLICY "Users manage via container" ON public.container_harvests
  WITH CHECK (
    EXISTS (SELECT 1 FROM bulk_containers
            WHERE bulk_containers.id = container_harvests.container_id
              AND bulk_containers.user_id = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM harvests WHERE harvests.id = container_harvests.harvest_id)
  );

-- ===== 2. security_batch6_public_trace ========================================

-- DB-04: public trace data. Coordinates only when the apiary shares its location, and then
-- the same approximate point the community map shows (same secret seed and radius), so two
-- different blurred points can never be combined.
CREATE OR REPLACE FUNCTION public.get_public_batch_info(p_trace_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_batch RECORD;
  v_result JSONB;
  v_origins JSONB;
  v_floral_sources JSONB;
  v_beekeeper_name TEXT;
  v_apiary_image_url TEXT;
  v_jars JSONB;
BEGIN
  -- Find the batch by trace_code (must be public)
  SELECT br.*, p.first_name, p.full_name
  INTO v_batch
  FROM batch_runs br
  LEFT JOIN profiles p ON p.id = br.user_id
  WHERE br.trace_code = p_trace_code
    AND br.is_public = true;

  -- Return NULL if not found or not public
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Get beekeeper name (prefer first_name, fallback to full_name)
  v_beekeeper_name := COALESCE(v_batch.first_name, v_batch.full_name, 'Local Beekeeper');

  -- Get apiary image URL if show_apiary_image is enabled (use first linked apiary with an image)
  IF v_batch.show_apiary_image THEN
    SELECT a.image_url
    INTO v_apiary_image_url
    FROM batch_containers bc
    JOIN bulk_containers c ON c.id = bc.container_id
    JOIN container_harvests ch ON ch.container_id = c.id
    JOIN harvests h ON h.id = ch.harvest_id
    JOIN hives hv ON hv.id = h.hive_id
    JOIN apiaries a ON a.id = hv.apiary_id
    WHERE bc.batch_id = v_batch.id
      AND a.image_url IS NOT NULL
    LIMIT 1;
  END IF;

  -- Get origins with (approximate) location data
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'apiary_name', origin.apiary_name,
      'city', origin.city,
      'percentage', origin.percentage,
      'latitude', origin.latitude,
      'longitude', origin.longitude,
      'show_map', origin.latitude IS NOT NULL
    ) ORDER BY origin.percentage DESC
  ), '[]'::jsonb)
  INTO v_origins
  FROM (
    SELECT DISTINCT ON (a.id)
      a.name as apiary_name,
      a.city,
      o.obfuscated_lat as latitude,
      o.obfuscated_lng as longitude,
      ROUND(
        (SUM(COALESCE(h.honey_weight, 0)) OVER (PARTITION BY a.id) /
         NULLIF(SUM(COALESCE(h.honey_weight, 0)) OVER (), 0) * 100)::numeric,
        0
      ) as percentage
    FROM batch_containers bc
    JOIN bulk_containers c ON c.id = bc.container_id
    JOIN container_harvests ch ON ch.container_id = c.id
    JOIN harvests h ON h.id = ch.harvest_id
    JOIN hives hv ON hv.id = h.hive_id
    JOIN apiaries a ON a.id = hv.apiary_id
    LEFT JOIN LATERAL (
      SELECT ob.obfuscated_lat, ob.obfuscated_lng
      FROM obfuscate_coordinates(a.latitude::double precision, a.longitude::double precision,
                                 public.coord_obfuscation_seed(a.id), 5.0) ob
      WHERE a.share_location = true AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL
    ) o ON true
    WHERE bc.batch_id = v_batch.id
  ) origin;

  -- Get unique floral sources from harvests
  SELECT COALESCE(jsonb_agg(DISTINCT h.floral_source), '[]'::jsonb)
  INTO v_floral_sources
  FROM batch_containers bc
  JOIN bulk_containers c ON c.id = bc.container_id
  JOIN container_harvests ch ON ch.container_id = c.id
  JOIN harvests h ON h.id = ch.harvest_id
  WHERE bc.batch_id = v_batch.id
    AND h.floral_source IS NOT NULL;

  -- Get jar sizes for this batch (ordered by size)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'jar_size_ml', bj.jar_size_ml,
      'jar_weight_g', bj.jar_weight_g,
      'jar_count', bj.jar_count
    ) ORDER BY bj.jar_size_ml
  ), '[]'::jsonb)
  INTO v_jars
  FROM batch_jars bj
  WHERE bj.batch_id = v_batch.id;

  -- Build result
  v_result := jsonb_build_object(
    'batch_code', v_batch.batch_code,
    'trace_code', v_batch.trace_code,
    'batch_date', v_batch.batch_date,
    'best_before_date', v_batch.best_before_date,
    'jar_size_ml', v_batch.jar_size_ml,
    'jar_weight_g', v_batch.jar_weight_g,
    'jars', v_jars,
    'beekeeper_name', v_beekeeper_name,
    'floral_sources', v_floral_sources,
    'origins', v_origins,
    'public_title', v_batch.public_title,
    'public_origin', v_batch.public_origin,
    'public_story', v_batch.public_story,
    'apiary_image_url', v_apiary_image_url,
    'show_feedback', COALESCE(v_batch.show_feedback, true)
  );

  RETURN v_result;
END;
$function$;

-- The public pages read through the functions above; the table itself is no longer listable.
DROP POLICY "Public can view public batches" ON public.batch_runs;

-- Batch codes are unique across all users, so the next number must be found across all
-- batches without exposing them. Returns only the next code for the month.
CREATE OR REPLACE FUNCTION public.next_batch_code(p_batch_date date)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prefix text;
  v_next   integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_batch_date IS NULL THEN
    RAISE EXCEPTION 'Batch date is required';
  END IF;

  v_prefix := 'L-' || to_char(p_batch_date, 'YYYY') || '-' || to_char(p_batch_date, 'MM') || '-';

  SELECT COALESCE(MAX(substring(batch_code FROM '^L-[0-9]{4}-[0-9]{2}-([0-9]{3,})$')::integer), 0) + 1
  INTO v_next
  FROM batch_runs
  WHERE batch_code LIKE v_prefix || '%';

  RETURN v_prefix || lpad(v_next::text, greatest(3, length(v_next::text)), '0');
END;
$function$;

REVOKE ALL ON FUNCTION public.next_batch_code(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_batch_code(date) TO authenticated;

-- ===== 3. security_batch6_misc_rules ==========================================

-- DB-08: the anonymous reactivation request no longer reveals whether an email belongs to a
-- deleted account, nor its user ID. One pending request per account is still enforced.
CREATE OR REPLACE FUNCTION public.request_account_reactivation(p_email text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  c_message CONSTANT text :=
    'If a deleted account exists for this email address, your request has been sent to an administrator for review.';
  v_profile RECORD;
BEGIN
  SELECT id, original_email
  INTO v_profile
  FROM public.profiles
  WHERE lower(original_email) = lower(btrim(COALESCE(p_email, '')))
    AND deleted_at IS NOT NULL
  LIMIT 1;

  IF FOUND AND NOT EXISTS (
    SELECT 1 FROM public.reactivation_requests
    WHERE user_id = v_profile.id AND status = 'pending'
  ) THEN
    INSERT INTO public.reactivation_requests (user_id, original_email, status)
    VALUES (v_profile.id, v_profile.original_email, 'pending');
  END IF;

  RETURN json_build_object('success', true, 'message', c_message);
END;
$function$;

-- DB-10: terminology is read by any logged-in user; only power users and admins change it
-- (the same people who can open Settings).
DROP POLICY "Allow write access for authenticated users" ON public.terminology;
DROP POLICY "Allow update access for authenticated users" ON public.terminology;
DROP POLICY "Allow delete access for authenticated users" ON public.terminology;
CREATE POLICY "Power users and admins can insert terminology" ON public.terminology
  FOR INSERT TO authenticated WITH CHECK ((SELECT is_power_user_or_admin()));
CREATE POLICY "Power users and admins can update terminology" ON public.terminology
  FOR UPDATE TO authenticated USING ((SELECT is_power_user_or_admin())) WITH CHECK ((SELECT is_power_user_or_admin()));
CREATE POLICY "Power users and admins can delete terminology" ON public.terminology
  FOR DELETE TO authenticated USING ((SELECT is_power_user_or_admin()));

-- DB-10: client history rows only for a hive the user can access, recorded as themselves.
-- (The UPDATE trigger writes as SECURITY DEFINER and is unaffected.)
DROP POLICY "Service role can insert config history" ON public.hive_configuration_history;
CREATE POLICY "Users can insert config history for accessible hives" ON public.hive_configuration_history
  FOR INSERT TO authenticated
  WITH CHECK ((changed_by = (SELECT auth.uid())) AND can_access_hive(hive_id, (SELECT auth.uid())));

-- DB-11: QR tags readable only when logged in: own tags, team-shared tags, tags on accessible hives.
DROP POLICY "Anyone can read tags" ON public.qr_tags;
CREATE POLICY "Users can read own, team and accessible hive tags" ON public.qr_tags
  FOR SELECT TO authenticated
  USING (
    (user_id = (SELECT auth.uid()))
    OR ((team_id IS NOT NULL) AND (team_id IN (SELECT tm.team_id FROM team_members tm WHERE tm.user_id = (SELECT auth.uid()))))
    OR ((hive_id IS NOT NULL) AND can_access_hive(hive_id, (SELECT auth.uid())))
  );

-- DB-15: only admins (and the CLI script with the secret key) write the changelog.
DROP POLICY "Authenticated users can create changelog entries" ON public.changelog;
DROP POLICY "Users can update own changelog entries" ON public.changelog;

-- ===== 4. security_batch6_batch_links =========================================

-- DB-07 (traceability): a batch may only use the caller's own containers, and a container only
-- harvests the caller can access. Covers the direct table rules and the two definer RPCs.
ALTER POLICY "Users manage via batch" ON public.batch_containers
  WITH CHECK (
    EXISTS (SELECT 1 FROM batch_runs WHERE batch_runs.id = batch_containers.batch_id AND batch_runs.user_id = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM bulk_containers WHERE bulk_containers.id = batch_containers.container_id AND bulk_containers.user_id = (SELECT auth.uid()))
  );

CREATE OR REPLACE FUNCTION public.replace_container_harvests(p_container_id uuid, p_harvest_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorisation: caller must own the container (SECURITY DEFINER bypasses RLS).
  IF NOT EXISTS (
    SELECT 1 FROM bulk_containers WHERE id = p_container_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorised for container %', p_container_id;
  END IF;

  -- Every harvest must exist and be on a hive the caller can access.
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_harvest_ids, '{}'::uuid[])) AS ids(harvest_id)
    LEFT JOIN harvests h ON h.id = ids.harvest_id
    WHERE h.id IS NULL OR NOT can_access_hive(h.hive_id, auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorised for one or more harvests';
  END IF;

  -- Replace harvest links atomically.
  DELETE FROM container_harvests WHERE container_id = p_container_id;
  IF p_harvest_ids IS NOT NULL AND array_length(p_harvest_ids, 1) > 0 THEN
    INSERT INTO container_harvests (container_id, harvest_id)
    SELECT p_container_id, unnest(p_harvest_ids);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.replace_batch_links(p_batch_id uuid, p_container_ids uuid[], p_jars jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorisation: caller must own the batch (SECURITY DEFINER bypasses RLS).
  IF NOT EXISTS (
    SELECT 1 FROM batch_runs WHERE id = p_batch_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorised for batch %', p_batch_id;
  END IF;

  -- Every container must be the caller's own.
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_container_ids, '{}'::uuid[])) AS ids(container_id)
    LEFT JOIN bulk_containers c ON c.id = ids.container_id AND c.user_id = auth.uid()
    WHERE c.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Not authorised for one or more containers';
  END IF;

  -- Replace container links atomically.
  DELETE FROM batch_containers WHERE batch_id = p_batch_id;
  IF p_container_ids IS NOT NULL AND array_length(p_container_ids, 1) > 0 THEN
    INSERT INTO batch_containers (batch_id, container_id)
    SELECT p_batch_id, unnest(p_container_ids);
  END IF;

  -- Replace jar rows atomically.
  DELETE FROM batch_jars WHERE batch_id = p_batch_id;
  IF p_jars IS NOT NULL AND jsonb_array_length(p_jars) > 0 THEN
    INSERT INTO batch_jars (batch_id, jar_size_ml, jar_weight_g, jar_count)
    SELECT p_batch_id,
           NULLIF(j->>'jar_size_ml', '')::int,
           NULLIF(j->>'jar_weight_g', '')::int,
           NULLIF(j->>'jar_count', '')::int
    FROM jsonb_array_elements(p_jars) AS j;
  END IF;
END;
$function$;
