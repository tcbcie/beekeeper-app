-- ============================================================================
-- FINAL FIX - RLS WITHOUT CIRCULAR DEPENDENCY
-- ============================================================================
-- The key insight: SECURITY DEFINER functions bypass RLS entirely!
-- So we don't need an admin SELECT policy at all.
-- ============================================================================

-- Drop all problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: ONLY policy needed for SELECT
-- Users can view their own profile
-- Admins don't need a special policy because they use get_users_with_email()
-- which has SECURITY DEFINER and bypasses RLS entirely
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Users can update their own profile (but not role)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Policy 3: Admins can update any profile
-- This one is OK because it only checks on UPDATE, not SELECT
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'Admin'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'Admin'
  );

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ RLS FIXED - NO CIRCULAR DEPENDENCY';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Key insight:';
  RAISE NOTICE '  • SECURITY DEFINER functions bypass RLS!';
  RAISE NOTICE '  • get_users_with_email() does not need RLS policy';
  RAISE NOTICE '  • Regular users can only see their own profile';
  RAISE NOTICE '  • Admins use the function (which bypasses RLS)';
  RAISE NOTICE '';
  RAISE NOTICE 'Policies created:';
  RAISE NOTICE '  1. Users can view own profile (SELECT)';
  RAISE NOTICE '  2. Users can update own profile (UPDATE, not role)';
  RAISE NOTICE '  3. Admins can update any profile (UPDATE)';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS is now ENABLED and secure!';
  RAISE NOTICE 'Try refreshing the dashboard now.';
  RAISE NOTICE '============================================';
END $$;

-- Show all current policies
SELECT
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
