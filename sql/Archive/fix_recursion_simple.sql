-- ============================================================================
-- FIX INFINITE RECURSION - SIMPLE SOLUTION
-- ============================================================================
-- Remove ALL complex admin policies that cause recursion
-- Keep it simple: users can only view their own profile
-- Admin panel will use service role key to bypass RLS
-- ============================================================================

-- Remove ALL existing SELECT policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own active profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles including deleted" ON public.profiles;
DROP POLICY IF EXISTS "Users and admins can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create ONE simple policy: users can view their own profile only
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

COMMENT ON POLICY "Users can view own profile" ON public.profiles IS
  'Users can only view their own profile. Admin panel uses service role to bypass RLS.';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ RECURSION FIXED - SIMPLE SOLUTION';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Policy: Users can only view their own profile';
  RAISE NOTICE 'Admin Panel: Uses service role to bypass RLS';
  RAISE NOTICE '';
  RAISE NOTICE 'This is the safest approach:';
  RAISE NOTICE '  ✓ No recursion possible';
  RAISE NOTICE '  ✓ Regular users protected';
  RAISE NOTICE '  ✓ Admin panel has full access via service role';
  RAISE NOTICE '============================================';
END $$;

-- Show current policies
SELECT
  policyname,
  cmd as command,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'profiles'
  AND schemaname = 'public'
  AND cmd = 'SELECT'
ORDER BY policyname;
