-- ============================================================================
-- CLEANUP EXTRA POLICIES
-- ============================================================================
-- Remove the overly permissive "Users can view all profiles" policy
-- This policy allows ANY authenticated user to see ALL profiles
-- ============================================================================

-- Check what this policy actually allows
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'CHECKING: "Users can view all profiles" policy';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Current definition: auth.role() = authenticated';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  WARNING: This allows ANY authenticated user to';
  RAISE NOTICE '    view ALL user profiles, not just their own!';
  RAISE NOTICE '';
  RAISE NOTICE 'This should probably be removed unless intentional.';
  RAISE NOTICE '============================================';
END $$;

-- OPTIONAL: Uncomment the line below to remove this policy
-- DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- After dropping, users will only be able to:
-- 1. View their own profile (via "Users can view their own profile")
-- 2. Admins can view all profiles (via "Admins can view all profiles")

-- Show all current SELECT policies
SELECT
  policyname,
  cmd as command,
  permissive,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'profiles'
  AND schemaname = 'public'
  AND cmd = 'SELECT'
ORDER BY policyname;
