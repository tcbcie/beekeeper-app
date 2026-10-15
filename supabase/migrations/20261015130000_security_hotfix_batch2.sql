-- Security hotfix batch 2 (full application audit, 15/10/2026)
-- Scale-token columns, distribution user search, batch feedback, logged-out decline,
-- deleted-account check. See docs/features/security-hotfix-batch2-plan.md.
-- Additive part: safe to apply before the matching app code deploys.
-- The lockdown (profiles column grants, anon deleted-profile policy) is in
-- 20261015140000_security_hotfix_batch2_lockdown.sql and is applied after the deploy.
-- The notify_admin_new_user trigger change is applied separately, once its secret exists.

-- ============================================================
-- SEC-H7: distribution recipient search must not reveal email addresses
-- ============================================================
-- Name fragments (3+ characters) or a complete email address only; emails come back masked.
CREATE OR REPLACE FUNCTION public.search_users_for_distribution(search_text text)
 RETURNS TABLE(id uuid, full_name text, email text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  SELECT p.id, p.full_name,
         CASE WHEN position('@' in coalesce(p.email, '')) > 1
              THEN left(p.email, 1) || '•••' || substring(p.email from position('@' in p.email))
         END AS email
  FROM profiles p
  WHERE length(trim(search_text)) >= 3
    AND (p.full_name ILIKE '%' || trim(search_text) || '%'
      OR lower(p.email) = lower(trim(search_text)))
    AND p.id != auth.uid()
  LIMIT 20;
$function$;

-- ============================================================
-- SEC-M1: batch feedback only for the caller's own batches
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_batch_feedback_summary(p_user_id uuid)
 RETURNS TABLE(batch_id uuid, feedback_count bigint, average_rating numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    bf.batch_id,
    COUNT(bf.id) as feedback_count,
    ROUND(AVG(bf.rating)::numeric, 1) as average_rating
  FROM batch_feedback bf
  JOIN batch_runs br ON br.id = bf.batch_id
  WHERE br.user_id = p_user_id
  GROUP BY bf.batch_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_batch_feedback_details(p_batch_id uuid, p_user_id uuid)
 RETURNS TABLE(feedback_id uuid, rating integer, comment text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  -- Verify the batch belongs to the caller
  IF p_user_id IS DISTINCT FROM auth.uid()
     OR NOT EXISTS (SELECT 1 FROM batch_runs WHERE id = p_batch_id AND user_id = p_user_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    bf.id as feedback_id,
    bf.rating,
    bf.comment,
    bf.created_at
  FROM batch_feedback bf
  WHERE bf.batch_id = p_batch_id
  ORDER BY bf.created_at DESC;
END;
$function$;

-- ============================================================
-- SEC-M2: declining from the email link works without logging in
-- ============================================================
-- The unguessable invitation ID in the link is the credential. Only a pending,
-- unexpired invitation can be declined; returns false otherwise.
CREATE OR REPLACE FUNCTION public.decline_team_invitation(p_invitation_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH declined AS (
    UPDATE team_invitations
    SET status = 'declined', declined_at = now()
    WHERE id = p_invitation_id AND status = 'pending' AND expires_at > now()
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM declined);
$function$;

CREATE OR REPLACE FUNCTION public.decline_rearing_group_invitation(p_invitation_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH declined AS (
    UPDATE rearing_group_invitations
    SET status = 'declined', declined_at = now()
    WHERE id = p_invitation_id AND status = 'pending' AND expires_at > now()
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM declined);
$function$;

REVOKE EXECUTE ON FUNCTION public.decline_team_invitation(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decline_rearing_group_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decline_team_invitation(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decline_rearing_group_invitation(uuid) TO anon, authenticated;

-- ============================================================
-- SEC-L1: deleted-account check returns yes/no instead of the profile row
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_deleted_account(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE original_email = p_email AND deleted_at IS NOT NULL
  );
$function$;

REVOKE EXECUTE ON FUNCTION public.is_deleted_account(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_deleted_account(text) TO anon, authenticated;
