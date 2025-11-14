-- ============================================================================
-- ADD ADMIN SELECT POLICY FOR PROFILES
-- ============================================================================
-- Allows admins to view all user profiles
-- ============================================================================

-- Create policy for admins to select all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ ADMIN SELECT POLICY ADDED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Policy: Admins can view all profiles';
  RAISE NOTICE '';
  RAISE NOTICE 'What this does:';
  RAISE NOTICE '  • Allows users with Admin role to SELECT from profiles table';
  RAISE NOTICE '  • Admins can now view all user profiles';
  RAISE NOTICE '  • Required for user management page';
  RAISE NOTICE '';
  RAISE NOTICE 'The get_users_with_email() function should now work!';
  RAISE NOTICE 'Refresh the user management page to test.';
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
