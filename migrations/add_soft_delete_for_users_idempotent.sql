-- ============================================================================
-- ADD SOFT DELETE FOR USER ACCOUNTS (IDEMPOTENT VERSION)
-- ============================================================================
-- Safe to run multiple times - handles existing objects gracefully
-- ============================================================================

-- Add deleted_at column to profiles (safe if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
    RAISE NOTICE 'Added deleted_at column to profiles';
  ELSE
    RAISE NOTICE 'deleted_at column already exists';
  END IF;
END $$;

-- Add index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at
  ON public.profiles(deleted_at) WHERE deleted_at IS NOT NULL;

-- Create function to soft delete a user
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

  -- Soft delete the user
  UPDATE public.profiles
  SET
    deleted_at = NOW(),
    is_active = false,
    -- Optionally anonymize email
    email = 'deleted_' || id || '@deleted.local'
  WHERE id = p_user_id;

  -- Also disable auth.users account
  UPDATE auth.users
  SET
    email = 'deleted_' || id || '@deleted.local',
    email_confirmed_at = NULL,
    banned_until = '2099-12-31'::timestamptz  -- Effectively permanent ban
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'User soft deleted successfully',
    'deleted_at', NOW(),
    'subscription_history_preserved', true,
    'payment_history_preserved', true
  );
END;
$$;

COMMENT ON FUNCTION public.soft_delete_user IS
  'Soft deletes a user account while preserving all subscription and payment history';

GRANT EXECUTE ON FUNCTION public.soft_delete_user TO authenticated;

-- Create function to restore a soft-deleted user
CREATE OR REPLACE FUNCTION public.restore_deleted_user(
  p_user_id UUID,
  p_new_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Check if user exists and is deleted
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
    AND deleted_at IS NOT NULL;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found or not deleted'
    );
  END IF;

  -- Validate new email format
  IF p_new_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid email format'
    );
  END IF;

  -- Check if new email is already in use
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE email = p_new_email
      AND id != p_user_id
      AND deleted_at IS NULL
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Email already in use by another user'
    );
  END IF;

  -- Restore the user
  UPDATE public.profiles
  SET
    deleted_at = NULL,
    is_active = true,
    email = p_new_email
  WHERE id = p_user_id;

  -- Restore auth.users account
  UPDATE auth.users
  SET
    email = p_new_email,
    banned_until = NULL
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'User restored successfully',
    'email', p_new_email
  );
END;
$$;

COMMENT ON FUNCTION public.restore_deleted_user IS
  'Restores a soft-deleted user account with a new email address';

GRANT EXECUTE ON FUNCTION public.restore_deleted_user TO authenticated;

-- Create view for active users only (safe if already exists)
CREATE OR REPLACE VIEW public.active_profiles AS
SELECT *
FROM public.profiles
WHERE deleted_at IS NULL;

COMMENT ON VIEW public.active_profiles IS
  'View showing only active (non-deleted) user profiles';

-- Create view for deleted users (safe if already exists)
CREATE OR REPLACE VIEW public.deleted_profiles AS
SELECT *
FROM public.profiles
WHERE deleted_at IS NOT NULL;

COMMENT ON VIEW public.deleted_profiles IS
  'View showing soft-deleted user profiles';

-- Update RLS policies (handle existing policies gracefully)
-- Drop and recreate to ensure correct definition

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own active profile" ON public.profiles;

CREATE POLICY "Users can view their own active profile"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  AND deleted_at IS NULL  -- Only show if not soft-deleted
);

-- Admin policy to view all users including deleted
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles including deleted" ON public.profiles;

CREATE POLICY "Admins can view all profiles including deleted"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
);

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ SOFT DELETE SYSTEM INSTALLED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  • soft_delete_user(user_id)';
  RAISE NOTICE '  • restore_deleted_user(user_id, new_email)';
  RAISE NOTICE '';
  RAISE NOTICE 'Views created:';
  RAISE NOTICE '  • active_profiles';
  RAISE NOTICE '  • deleted_profiles';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Policies updated:';
  RAISE NOTICE '  • Users can view their own active profile';
  RAISE NOTICE '  • Admins can view all profiles including deleted';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Run sql/fix_user_deletion_policy.sql';
  RAISE NOTICE '============================================';
END $$;
