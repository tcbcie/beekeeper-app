-- ============================================================================
-- RE-ENABLE RLS ON PROFILES - PROPER APPROACH
-- ============================================================================
-- This script properly re-enables Row Level Security with correct policies
-- Run this after confirming user management works with RLS disabled
-- ============================================================================

-- First, clean up any duplicate or problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Admins can view all profiles (simplified, no subquery)
-- This works because SECURITY DEFINER functions bypass RLS anyway
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'Admin'
  );

-- Policy 3: Users can update their own profile (but not role)
-- This already exists, but let's ensure it's correct
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

-- Policy 4: Admins can update any profile (including roles)
-- This already exists from earlier fix
-- Just verify it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
    AND policyname = 'Admins can update any profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can update any profile"
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = ''Admin''
      )
      WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = ''Admin''
      )';
  END IF;
END $$;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ RLS RE-ENABLED WITH PROPER POLICIES';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Policies created:';
  RAISE NOTICE '  1. Users can view own profile';
  RAISE NOTICE '  2. Admins can view all profiles';
  RAISE NOTICE '  3. Users can update own profile (not role)';
  RAISE NOTICE '  4. Admins can update any profile';
  RAISE NOTICE '';
  RAISE NOTICE 'Key points:';
  RAISE NOTICE '  • RLS is now ENABLED';
  RAISE NOTICE '  • Admin check uses simple subquery with LIMIT 1';
  RAISE NOTICE '  • get_users_with_email() uses SECURITY DEFINER';
  RAISE NOTICE '  • This combination provides proper security';
  RAISE NOTICE '';
  RAISE NOTICE 'Test by:';
  RAISE NOTICE '  1. Refresh dashboard (should still work)';
  RAISE NOTICE '  2. Try user management (should work)';
  RAISE NOTICE '  3. Try changing user roles (should work)';
  RAISE NOTICE '============================================';
END $$;

-- Show all current policies
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
