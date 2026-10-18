-- Security batch 11 (18/10/2026): API Low findings, database part (API-09, API-10).
-- Applied via MCP as security_batch11_admin_guard_and_code_uses.
-- See docs/features/security-batch11-plan.md.

-- API-09: there must always be at least one active admin. Serialised with an advisory lock so two
-- admins demoting each other at the same moment can't both succeed.
CREATE OR REPLACE FUNCTION public.guard_last_active_admin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_remaining integer;
BEGIN
  -- Only relevant when an active admin stops being one (demoted, deactivated, deleted).
  IF NOT (OLD.role = 'Admin' AND OLD.is_active IS NOT FALSE AND OLD.deleted_at IS NULL) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.role = 'Admin' AND NEW.is_active IS NOT FALSE AND NEW.deleted_at IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('guard_last_active_admin', 0));
  SELECT count(*) INTO v_remaining
  FROM profiles
  WHERE role = 'Admin' AND is_active IS NOT FALSE AND deleted_at IS NULL AND id <> OLD.id;

  IF v_remaining = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last active administrator' USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;
REVOKE ALL ON FUNCTION public.guard_last_active_admin() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_guard_last_active_admin
  BEFORE UPDATE OF role, is_active, deleted_at OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_last_active_admin();

-- API-10: count an association-code use after payment. The UPDATE locks the row, so concurrent
-- payments are counted one at a time; a payment that takes the code past max_uses is still
-- honoured (the customer has paid) but recorded in the admin audit log.
DROP FUNCTION public.increment_code_uses(text);
CREATE FUNCTION public.increment_code_uses(p_code text, p_user_id uuid DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_id uuid;
  v_uses integer;
  v_max integer;
BEGIN
  UPDATE public.registration_codes
  SET current_uses = current_uses + 1
  WHERE UPPER(code) = UPPER(p_code)
  RETURNING id, current_uses, max_uses INTO v_id, v_uses, v_max;

  IF v_id IS NOT NULL AND v_max IS NOT NULL AND v_uses > v_max THEN
    INSERT INTO public.admin_audit_log (admin_id, action, target_user_id, details)
    VALUES (NULL, 'association_code_over_limit', p_user_id,
            jsonb_build_object('code_id', v_id, 'current_uses', v_uses, 'max_uses', v_max));
  END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.increment_code_uses(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_code_uses(text, uuid) TO service_role;
