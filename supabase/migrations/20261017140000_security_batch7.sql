-- Security batch 7 (17/10/2026): API routes (API-02, API-03, API-05, API-07, API-08).
-- Applied via MCP as three migrations, reproduced here in order:
--   security_batch7_rate_limiter, security_batch7_code_attempts,
--   security_batch7_scale_guard_and_audit.
-- See docs/features/security-batch7-plan.md.

-- ===== 1. security_batch7_rate_limiter ========================================

-- API-03/05/07: one shared, race-proof rate limiter. Server routes call it with the secret key;
-- database functions call it directly with auth.uid().
CREATE TABLE public.api_rate_events (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid        NOT NULL,
  bucket     text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_rate_events_lookup ON public.api_rate_events (user_id, bucket, created_at DESC);
ALTER TABLE public.api_rate_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_rate_events FROM anon, authenticated;

-- Returns true and records one event when the user is under p_limit events in the last
-- p_window_seconds for p_bucket; returns false (records nothing) otherwise. The advisory lock
-- serialises concurrent calls for the same user and bucket, so parallel requests can't slip past.
CREATE OR REPLACE FUNCTION public.consume_rate_limit(p_user_id uuid, p_bucket text, p_limit integer, p_window_seconds integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  IF p_user_id IS NULL OR p_bucket IS NULL OR p_limit IS NULL OR p_limit < 1
     OR p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid rate limit arguments';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_bucket, 0));

  SELECT count(*) INTO v_count
  FROM api_rate_events
  WHERE user_id = p_user_id
    AND bucket = p_bucket
    AND created_at > now() - make_interval(secs => p_window_seconds);

  IF v_count >= p_limit THEN
    RETURN false;
  END IF;

  INSERT INTO api_rate_events (user_id, bucket) VALUES (p_user_id, p_bucket);
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(uuid, text, integer, integer) TO service_role;

-- Old events are only needed for the longest window (one day); purge daily.
SELECT cron.schedule('purge-api-rate-events', '17 3 * * *',
  $$DELETE FROM public.api_rate_events WHERE created_at < now() - interval '2 days'$$);

-- ===== 2. security_batch7_code_attempts =======================================

-- API-05: registration-code guesses are limited per user. A real attempt is two calls (lookup, then
-- activate or checkout), so the bucket allows 20 calls an hour (10 attempts).
CREATE OR REPLACE FUNCTION public.lookup_registration_code(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  IF NOT consume_rate_limit(auth.uid(), 'code_attempt', 20, 3600) THEN
    RAISE EXCEPTION 'Too many code attempts. Please wait an hour and try again.'
      USING ERRCODE = 'P0429';
  END IF;

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
  INTO v_result
  FROM registration_codes rc
  WHERE rc.code = p_code;

  RETURN v_result;
END;
$function$;

-- activate_subscription: unchanged apart from the code-attempt limit after the auth check.
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

  -- Look up the code
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
  WHERE UPPER(rc.code) = UPPER(sub_code);

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

-- ===== 3. security_batch7_scale_guard_and_audit ===============================

-- API-02: only a hive's owner may change which BEEP/Wolf device it points at. The data routes read
-- with the owner's vendor token, so a team member re-pointing a shared hive could read any device.
CREATE OR REPLACE FUNCTION public.guard_hive_scale_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM OLD.user_id AND (
       NEW.beep_device_id   IS DISTINCT FROM OLD.beep_device_id
    OR NEW.beep_device_name IS DISTINCT FROM OLD.beep_device_name
    OR NEW.wolf_scale_id    IS DISTINCT FROM OLD.wolf_scale_id
    OR NEW.wolf_scale_name  IS DISTINCT FROM OLD.wolf_scale_name
  ) THEN
    RAISE EXCEPTION 'Only the hive owner can change its scale' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.guard_hive_scale_columns() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_guard_hive_scale_columns BEFORE UPDATE ON public.hives
  FOR EACH ROW EXECUTE FUNCTION public.guard_hive_scale_columns();

-- API-08: append-only admin audit trail. Server routes write with the secret key; database
-- triggers write admin changes made through any path. Only admins can read it.
CREATE TABLE public.admin_audit_log (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at     timestamptz NOT NULL DEFAULT now(),
  admin_id       uuid,
  action         text        NOT NULL,
  target_user_id uuid,
  details        jsonb       NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX admin_audit_log_created ON public.admin_audit_log (created_at DESC);
CREATE INDEX admin_audit_log_target ON public.admin_audit_log (target_user_id, created_at DESC);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_audit_log FROM anon, authenticated;
GRANT SELECT ON public.admin_audit_log TO authenticated;
CREATE POLICY "Admins can read the audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated USING ((SELECT is_current_user_admin()));

CREATE OR REPLACE FUNCTION public.admin_audit_log_append_only()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'The admin audit log is append-only';
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_audit_log_append_only() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_admin_audit_log_append_only BEFORE UPDATE OR DELETE ON public.admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.admin_audit_log_append_only();

-- Admin changes to another user's profile (status, deletion, restore, subscription, role).
CREATE OR REPLACE FUNCTION public.audit_admin_profile_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_changes jsonb := '{}'::jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT is_current_user_admin() THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF auth.uid() IS DISTINCT FROM OLD.id THEN
      INSERT INTO admin_audit_log (admin_id, action, target_user_id)
      VALUES (auth.uid(), 'profile_deleted', OLD.id);
    END IF;
    RETURN NULL;
  END IF;

  IF auth.uid() = NEW.id THEN
    RETURN NULL;
  END IF;

  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    v_changes := v_changes || jsonb_build_object('is_active', jsonb_build_array(OLD.is_active, NEW.is_active));
  END IF;
  IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    v_changes := v_changes || jsonb_build_object('deleted_at', jsonb_build_array(OLD.deleted_at, NEW.deleted_at));
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    v_changes := v_changes || jsonb_build_object('role', jsonb_build_array(OLD.role, NEW.role));
  END IF;
  IF NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at THEN
    v_changes := v_changes || jsonb_build_object('subscription_expires_at', jsonb_build_array(OLD.subscription_expires_at, NEW.subscription_expires_at));
  END IF;
  IF NEW.subscription_type IS DISTINCT FROM OLD.subscription_type THEN
    v_changes := v_changes || jsonb_build_object('subscription_type', jsonb_build_array(OLD.subscription_type, NEW.subscription_type));
  END IF;

  IF v_changes <> '{}'::jsonb THEN
    INSERT INTO admin_audit_log (admin_id, action, target_user_id, details)
    VALUES (auth.uid(), 'profile_changed', NEW.id, v_changes);
  END IF;
  RETURN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.audit_admin_profile_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_audit_admin_profile_change AFTER UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_profile_change();

-- Admin transfers of someone else's apiary.
CREATE OR REPLACE FUNCTION public.audit_admin_apiary_transfer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     AND auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM OLD.user_id
     AND is_current_user_admin() THEN
    INSERT INTO admin_audit_log (admin_id, action, target_user_id, details)
    VALUES (auth.uid(), 'apiary_transferred', OLD.user_id,
            jsonb_build_object('apiary_id', NEW.id, 'new_owner_id', NEW.user_id));
  END IF;
  RETURN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.audit_admin_apiary_transfer() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_audit_admin_apiary_transfer AFTER UPDATE OF user_id ON public.apiaries
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_apiary_transfer();
