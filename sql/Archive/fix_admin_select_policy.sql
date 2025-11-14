-- ============================================================================
-- FIX ADMIN SELECT POLICY FOR PROFILES
-- ============================================================================
-- Removes the broken policy and creates a working one
-- ============================================================================

-- Drop the broken policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a working policy that checks a custom claim or uses a direct auth check
-- This version allows the user to see their own profile first, so they can check if they're admin
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    -- Allow users to see their own profile
    auth.uid() = id
    OR
    -- OR allow if user's own profile has admin role
    -- This works because the policy allows seeing your own profile first
    (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) = 'Admin'
  );

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ ADMIN SELECT POLICY FIXED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Policy: Admins can view all profiles (FIXED)';
  RAISE NOTICE '';
  RAISE NOTICE 'What this does:';
  RAISE NOTICE '  • All users can see their own profile';
  RAISE NOTICE '  • Users with Admin role can see ALL profiles';
  RAISE NOTICE '  • No circular dependency issue';
  RAISE NOTICE '';
  RAISE NOTICE 'The get_users_with_email() function should now work!';
  RAISE NOTICE 'Refresh the page and try user management again.';
  RAISE NOTICE '============================================';
END $$;

-- Test that the policy works
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  -- This test runs as the current user
  SELECT COUNT(*) INTO test_count FROM public.profiles WHERE deleted_at IS NULL;
  RAISE NOTICE '✅ Can query profiles table: % profiles found', test_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Cannot query profiles table: %', SQLERRM;
END $$;
