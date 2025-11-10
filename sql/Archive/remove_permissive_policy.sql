-- ============================================================================
-- REMOVE OVERLY PERMISSIVE POLICY
-- ============================================================================
-- Remove "Users can view all profiles" policy that allows any authenticated
-- user to view all other users' profiles
-- ============================================================================

-- Remove the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ PERMISSIVE POLICY REMOVED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Removed: "Users can view all profiles"';
  RAISE NOTICE '';
  RAISE NOTICE 'Security improved:';
  RAISE NOTICE '  ✓ Regular users can only see their own profile';
  RAISE NOTICE '  ✓ Admins can see all profiles';
  RAISE NOTICE '  ✓ No unauthorized profile viewing';
  RAISE NOTICE '============================================';
END $$;

-- Show remaining SELECT policies
SELECT
  policyname,
  cmd as command,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'profiles'
  AND schemaname = 'public'
  AND cmd = 'SELECT'
ORDER BY policyname;
