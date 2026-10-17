-- Security batch 10 (17/10/2026): database Low findings (DB-13, DB-16, DB-17, DB-18).
-- Applied via MCP as two migrations, reproduced here in order:
--   security_batch10_db_rules, security_batch10_storage.
-- See docs/features/security-batch10-plan.md.

-- ===== 1. security_batch10_db_rules ===========================================

-- DB-13: a task's owner may stay the same or become the person editing it, never a third user.
CREATE OR REPLACE FUNCTION public.guard_task_owner_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NEW.user_id IS DISTINCT FROM OLD.user_id
     AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'A task can only be reassigned to yourself' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.guard_task_owner_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_guard_task_owner_change BEFORE UPDATE OF user_id ON public.tasks_events
  FOR EACH ROW EXECUTE FUNCTION public.guard_task_owner_change();

-- DB-16: comments are readable only by people who can see the photo (the diagnosis_images
-- rules decide inside the subquery: owner, power users, admins).
DROP POLICY "Users can view comments on accessible images" ON public.diagnosis_image_comments;
CREATE POLICY "Users can view comments on images they can see" ON public.diagnosis_image_comments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM diagnosis_images di WHERE di.id = diagnosis_image_comments.diagnosis_image_id));

-- DB-18: anonymous visitors never write tables (RLS already blocked it; drop the grants too),
-- now and for tables created later. Read grants stay for the public pages.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLES FROM anon;
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT DISTINCT column_name FROM information_schema.column_privileges
    WHERE table_schema = 'public' AND table_name = 'profiles' AND grantee = 'anon'
      AND privilege_type IN ('INSERT', 'UPDATE', 'REFERENCES')
  LOOP
    EXECUTE format('REVOKE INSERT (%1$I), UPDATE (%1$I), REFERENCES (%1$I) ON public.profiles FROM anon', c);
  END LOOP;
END $$;

-- DB-18: yes/no helpers that take a user ID are oracles about other users' data. Signed-in
-- users keep them (RLS policies call them); anonymous visitors lose them.
REVOKE EXECUTE ON FUNCTION
  public.can_access_apiary(uuid, uuid),
  public.can_access_hive(uuid, uuid),
  public.can_access_hive_by_user_id(uuid, uuid),
  public.can_access_queen(uuid, uuid),
  public.check_user_owns_apiary(uuid, uuid),
  public.is_rearing_group_member(uuid, uuid),
  public.is_rearing_group_owner(uuid, uuid),
  public.is_team_member(uuid, uuid),
  public.is_team_owner(uuid, uuid),
  public.get_rearing_group_member_user_ids(uuid),
  public.has_valid_invitation(uuid, uuid),
  public.get_user_role(uuid),
  public.is_admin(uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.can_access_apiary(uuid, uuid),
  public.can_access_hive(uuid, uuid),
  public.can_access_hive_by_user_id(uuid, uuid),
  public.can_access_queen(uuid, uuid),
  public.check_user_owns_apiary(uuid, uuid),
  public.is_rearing_group_member(uuid, uuid),
  public.is_rearing_group_owner(uuid, uuid),
  public.is_team_member(uuid, uuid),
  public.is_team_owner(uuid, uuid),
  public.get_rearing_group_member_user_ids(uuid),
  public.has_valid_invitation(uuid, uuid),
  public.get_user_role(uuid),
  public.is_admin(uuid)
TO authenticated, service_role;

-- DB-18: honey feedback (anonymous): capped comment, at most 30 entries per batch per hour,
-- and refused when the beekeeper has turned feedback off.
CREATE OR REPLACE FUNCTION public.submit_batch_feedback(p_trace_code text, p_rating integer, p_comment text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_batch_id UUID;
  v_is_public BOOLEAN;
  v_show_feedback BOOLEAN;
  v_recent integer;
BEGIN
  -- Validate rating
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RETURN json_build_object('success', false, 'error', 'Rating must be between 1 and 5');
  END IF;

  -- Find batch by trace code
  SELECT id, is_public, COALESCE(show_feedback, true)
  INTO v_batch_id, v_is_public, v_show_feedback
  FROM batch_runs
  WHERE trace_code = p_trace_code;

  -- Unknown, private or feedback switched off: same answer
  IF v_batch_id IS NULL OR NOT v_is_public OR NOT v_show_feedback THEN
    RETURN json_build_object('success', false, 'error', 'Batch not found');
  END IF;

  -- Spam brake: at most 30 entries per batch per hour (serialised per batch)
  PERFORM pg_advisory_xact_lock(hashtextextended('batch_feedback:' || v_batch_id::text, 0));
  SELECT count(*) INTO v_recent
  FROM batch_feedback
  WHERE batch_id = v_batch_id AND created_at > now() - interval '1 hour';
  IF v_recent >= 30 THEN
    RETURN json_build_object('success', false, 'error', 'Too much feedback for this batch right now. Please try again later.');
  END IF;

  INSERT INTO batch_feedback (batch_id, rating, comment)
  VALUES (v_batch_id, p_rating, NULLIF(left(btrim(COALESCE(p_comment, '')), 1000), ''));

  RETURN json_build_object('success', true);
END;
$function$;

-- DB-18: lock the code row so concurrent redemptions can't exceed max_uses.
CREATE OR REPLACE FUNCTION public.activate_subscription(sub_code text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  code_record RECORD;
  current_user_id UUID;
  new_expiry TIMESTAMPTZ;
  subscription_message TEXT;
BEGIN
  -- Get current user
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not authenticated'
    );
  END IF;

  -- Limit code guessing (shared with lookup_registration_code and checkout)
  IF NOT consume_rate_limit(current_user_id, 'code_attempt', 20, 3600) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Too many code attempts. Please wait an hour and try again.'
    );
  END IF;

  -- Look up the code, locking it so concurrent redemptions are counted one at a time
  SELECT
    rc.id,
    rc.code,
    rc.subscription_expires_at,
    rc.is_active,
    rc.max_uses,
    rc.current_uses,
    rc.code_type,
    rc.association_id
  INTO code_record
  FROM public.registration_codes rc
  WHERE UPPER(rc.code) = UPPER(sub_code)
  FOR UPDATE;

  -- Validate code exists
  IF code_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid subscription code'
    );
  END IF;

  -- Validate code is active
  IF NOT code_record.is_active THEN
    RETURN json_build_object(
      'success', false,
      'message', 'This subscription code has been disabled'
    );
  END IF;

  -- Validate max uses not exceeded
  IF code_record.max_uses IS NOT NULL AND code_record.current_uses >= code_record.max_uses THEN
    RETURN json_build_object(
      'success', false,
      'message', 'This code has reached its maximum number of uses'
    );
  END IF;

  -- Calculate new expiry from code's fixed expiry date
  new_expiry := code_record.subscription_expires_at;

  -- Validate expiry is in the future
  IF new_expiry <= NOW() THEN
    RETURN json_build_object(
      'success', false,
      'message', 'This subscription code has expired'
    );
  END IF;

  -- Update user profile
  UPDATE public.profiles
  SET
    subscription_expires_at = new_expiry,
    subscription_type = 'code',
    subscription_price = 0.00,
    current_subscription_code_id = code_record.id,
    is_association_member = (code_record.code_type = 'association'),
    association_id = code_record.association_id
  WHERE id = current_user_id;

  -- Log to subscription_history (NO duration_days)
  INSERT INTO public.subscription_history (
    user_id,
    code_id,
    code,
    activated_at,
    expires_at,
    subscription_type,
    price_paid,
    payment_method
  ) VALUES (
    current_user_id,
    code_record.id,
    code_record.code,
    NOW(),
    new_expiry,
    'code',
    0.00,
    'code'
  );

  -- Increment code usage
  UPDATE public.registration_codes
  SET current_uses = current_uses + 1
  WHERE id = code_record.id;

  subscription_message := 'Subscription activated successfully! Valid until ' ||
                         TO_CHAR(new_expiry, 'DD Mon YYYY');

  RETURN json_build_object(
    'success', true,
    'message', subscription_message,
    'expires_at', new_expiry
  );
END;
$function$;

-- DB-18: leftovers from the 29/08/2026 data fixes (owner approved dropping them, 17/10/2026).
DROP TABLE public.changelog_dupe_backup_20260829;
DROP TABLE public.queen_assignments_nuc_fix_backup_20260829;

-- ===== 2. security_batch10_storage ============================================

-- DB-17: nobody can list other people's files any more. Public buckets still serve their public
-- URLs without these rules; the owner-only SELECT is what the browser's remove() needs to undo
-- its own failed upload.
DROP POLICY "Allow public read" ON storage.objects;
DROP POLICY "Allow public read access to inspection images" ON storage.objects;
CREATE POLICY "Users can see their own uploads" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('apiary-images', 'inspection-images') AND owner = (SELECT auth.uid()));

-- Uploads only into the folders the app uses: apiary photos into the uploader's own folder,
-- record photos into the feature folders (src/lib/upload-image.ts callers).
ALTER POLICY "Allow authenticated uploads" ON storage.objects
  WITH CHECK (
    bucket_id = 'apiary-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
ALTER POLICY "Allow authenticated users to upload inspection images" ON storage.objects
  WITH CHECK (
    bucket_id = 'inspection-images'
    AND (storage.foldername(name))[1] IN ('inspections', 'varroa-checks', 'diagnoses', 'wild-colonies', 'wild-colony-inspections')
  );

-- Same limits the app already enforces before upload: four image types, 10 MB.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    file_size_limit = 10485760
WHERE id IN ('apiary-images', 'inspection-images');
