-- ============================================================================
-- FIX ADMIN POLICY INFINITE RECURSION
-- ============================================================================
-- The issue: If there's an "Admins can update any profile" policy with a
-- subquery like (SELECT role FROM profiles WHERE id = auth.uid()), it causes
-- infinite recursion. We need to use a SECURITY DEFINER function instead.
-- ============================================================================

-- Step 1: Create admin check function with SECURITY DEFINER
-- This bypasses RLS when checking if user is admin, preventing recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'Admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Step 2: Drop any admin policies that might have subqueries
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Step 3: Recreate admin policy using the SECURITY DEFINER function
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ ADMIN POLICY FIXED';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '  • Created is_admin() SECURITY DEFINER function';
  RAISE NOTICE '  • Recreated admin policy without subquery';
  RAISE NOTICE '';
  RAISE NOTICE 'The is_admin() function bypasses RLS, preventing recursion!';
  RAISE NOTICE '============================================';
END $$;

-- Show final UPDATE policies
SELECT
  policyname,
  cmd as command,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'profiles'
  AND schemaname = 'public'
  AND cmd = 'UPDATE'
ORDER BY policyname;
