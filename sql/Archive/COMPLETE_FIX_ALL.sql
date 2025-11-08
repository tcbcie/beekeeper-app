-- COMPLETE FIX - Run this entire script in Supabase SQL Editor
-- This will fix all issues related to user account enable/disable

-- STEP 1: Ensure is_active column exists in profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
      AND column_name = 'is_active'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL;
    RAISE NOTICE '✓ Added is_active column to profiles table';
  ELSE
    RAISE NOTICE '✓ is_active column already exists';
  END IF;
END $$;

-- STEP 2: Set all existing users to active (if they don't have a value)
UPDATE public.profiles
SET is_active = TRUE
WHERE is_active IS NULL;

-- STEP 3: Create or replace the toggle_user_account function (without updated_at)
CREATE OR REPLACE FUNCTION public.toggle_user_account(
  target_user_id UUID,
  enable_account BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_admin_id UUID;
  rows_affected INTEGER;
BEGIN
  -- Get current user ID
  current_admin_id := auth.uid();

  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = current_admin_id AND role = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can enable/disable user accounts';
  END IF;

  -- Prevent admin from disabling their own account
  IF target_user_id = current_admin_id THEN
    RAISE EXCEPTION 'Cannot disable your own admin account';
  END IF;

  -- Update the user's is_active status
  UPDATE public.profiles
  SET is_active = enable_account
  WHERE id = target_user_id;

  -- Get number of rows affected
  GET DIAGNOSTICS rows_affected = ROW_COUNT;

  -- Check if update was successful
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'User not found or no changes made';
  END IF;

  RETURN json_build_object(
    'success', true,
    'user_id', target_user_id,
    'is_active', enable_account,
    'rows_affected', rows_affected,
    'message', CASE
      WHEN enable_account THEN 'User account enabled successfully'
      ELSE 'User account disabled successfully'
    END
  );
END;
$$;

-- STEP 4: Grant execute permission
GRANT EXECUTE ON FUNCTION public.toggle_user_account(UUID, BOOLEAN) TO authenticated;

-- STEP 5: Reload schema cache (forces PostgREST to recognize changes)
NOTIFY pgrst, 'reload schema';

-- VERIFICATION
DO $$
DECLARE
  col_exists BOOLEAN;
  func_exists BOOLEAN;
BEGIN
  -- Check column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
      AND column_name = 'is_active'
  ) INTO col_exists;

  -- Check function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'toggle_user_account'
  ) INTO func_exists;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION RESULTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'profiles.is_active column exists: %', col_exists;
  RAISE NOTICE 'toggle_user_account function exists: %', func_exists;
  RAISE NOTICE '';

  IF col_exists AND func_exists THEN
    RAISE NOTICE '✓ ALL CHECKS PASSED!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Go to your HiveCraic app';
    RAISE NOTICE '2. Navigate to Settings → Users';
    RAISE NOTICE '3. Try to disable/enable a user account';
    RAISE NOTICE '4. The status should now update correctly';
  ELSE
    RAISE NOTICE '✗ SOME CHECKS FAILED';
    RAISE NOTICE 'Please review the errors above';
  END IF;
  RAISE NOTICE '========================================';
END $$;
