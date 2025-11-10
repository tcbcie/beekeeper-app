-- ============================================================================
-- FIX SOFT DELETE TO PRESERVE ORIGINAL EMAIL
-- ============================================================================
-- Add original_email column and update soft_delete_user to preserve it
-- ============================================================================

-- Add original_email column to store the email before anonymization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'original_email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN original_email TEXT;
    RAISE NOTICE 'Added original_email column to profiles';
  ELSE
    RAISE NOTICE 'original_email column already exists';
  END IF;
END $$;

-- Update soft_delete_user function to preserve original email
CREATE OR REPLACE FUNCTION public.soft_delete_user(
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Check if user exists
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;

  -- Check if already deleted
  IF v_profile.deleted_at IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User already deleted',
      'deleted_at', v_profile.deleted_at
    );
  END IF;

  -- Soft delete the user and preserve original email
  UPDATE public.profiles
  SET
    deleted_at = NOW(),
    is_active = false,
    original_email = email,  -- PRESERVE ORIGINAL EMAIL BEFORE ANONYMIZING
    email = 'deleted_' || id || '@deleted.local'
  WHERE id = p_user_id;

  -- Also disable auth.users account
  UPDATE auth.users
  SET
    email = 'deleted_' || id || '@deleted.local',
    email_confirmed_at = NULL,
    banned_until = '2099-12-31'::timestamptz
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'User soft deleted successfully',
    'deleted_at', NOW(),
    'original_email_preserved', true,
    'subscription_history_preserved', true,
    'payment_history_preserved', true
  );
END;
$$;

COMMENT ON FUNCTION public.soft_delete_user IS
  'Soft deletes a user account while preserving original email, subscription and payment history';

-- Update deleted_profiles view to show original_email
DROP VIEW IF EXISTS public.deleted_profiles;

CREATE VIEW public.deleted_profiles AS
SELECT
  p.id,
  p.original_email as email,  -- Show original email instead of anonymized one
  p.role,
  p.first_name,
  p.last_name,
  p.mobile_number,
  p.is_active,
  p.created_at,
  p.deleted_at,
  p.current_subscription_code_id,
  p.subscription_type,
  p.subscription_expires_at,
  -- Show registration code if exists
  (SELECT rc.code FROM public.registration_codes rc WHERE rc.id = p.current_subscription_code_id) as registration_code,
  -- Show code description or subscription type
  COALESCE(
    (SELECT rc.description FROM public.registration_codes rc WHERE rc.id = p.current_subscription_code_id),
    CASE
      WHEN p.subscription_type IS NOT NULL THEN 'Credit Card: ' || p.subscription_type
      ELSE NULL
    END
  ) as code_description,
  -- Calculate subscription status
  CASE
    WHEN p.subscription_expires_at IS NULL THEN 'no_subscription'
    WHEN p.subscription_expires_at > NOW() + INTERVAL '30 days' THEN 'active'
    WHEN p.subscription_expires_at > NOW() + INTERVAL '7 days' THEN 'expiring_soon'
    WHEN p.subscription_expires_at > NOW() THEN 'expiring_very_soon'
    ELSE 'expired'
  END as subscription_status,
  -- Calculate days remaining
  CASE
    WHEN p.subscription_expires_at IS NULL THEN NULL
    ELSE EXTRACT(DAY FROM (p.subscription_expires_at - NOW()))::INTEGER
  END as days_remaining
FROM public.profiles p
WHERE p.deleted_at IS NOT NULL
ORDER BY p.deleted_at DESC;

GRANT SELECT ON public.deleted_profiles TO authenticated;

-- Backfill original_email for already-deleted users (if any exist)
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- This won't help users already deleted (their emails are gone),
  -- but we set it to show the anonymized email so admins know it's lost
  UPDATE public.profiles
  SET original_email = 'Email lost - deleted before fix applied'
  WHERE deleted_at IS NOT NULL
    AND original_email IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count > 0 THEN
    RAISE NOTICE 'Updated % previously deleted users with placeholder message', updated_count;
    RAISE NOTICE 'These users original emails were lost during deletion.';
    RAISE NOTICE 'Future deletions will preserve the original email.';
  ELSE
    RAISE NOTICE 'No previously deleted users found, or all already have original_email set.';
  END IF;
END $$;

-- Verification
DO $$
DECLARE
  deleted_count INTEGER;
  with_original_email INTEGER;
BEGIN
  SELECT COUNT(*) INTO deleted_count FROM public.profiles WHERE deleted_at IS NOT NULL;
  SELECT COUNT(*) INTO with_original_email FROM public.profiles
    WHERE deleted_at IS NOT NULL AND original_email IS NOT NULL;

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ SOFT DELETE EMAIL PRESERVATION UPDATED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  - Added original_email column to profiles';
  RAISE NOTICE '  - Updated soft_delete_user() to preserve email';
  RAISE NOTICE '  - Updated deleted_profiles view to show original email';
  RAISE NOTICE '';
  RAISE NOTICE 'Deleted users: %', deleted_count;
  RAISE NOTICE 'With original email: %', with_original_email;
  RAISE NOTICE '';
  RAISE NOTICE 'Going forward, all deleted users will show their original email.';
  RAISE NOTICE 'Previously deleted users show: "Email lost - deleted before fix applied"';
  RAISE NOTICE '============================================';
END $$;

-- Show deleted users with their original emails
SELECT
  original_email as email,
  first_name,
  last_name,
  role,
  deleted_at
FROM public.deleted_profiles
ORDER BY deleted_at DESC
LIMIT 10;
