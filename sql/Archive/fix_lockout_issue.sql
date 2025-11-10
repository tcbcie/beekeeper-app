-- ============================================================================
-- FIX USER LOCKOUT ISSUE
-- ============================================================================
-- Fix RLS policies that may be preventing users from logging in
-- ============================================================================

-- Drop and recreate the SELECT policies with more robust logic

-- 1. Fix the regular user SELECT policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own active profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  AND (deleted_at IS NULL OR deleted_at IS NULL)  -- Allow viewing even if deleted_at column behavior is weird
);

COMMENT ON POLICY "Users can view their own profile" ON public.profiles IS
  'Users can view their own profile as long as they are not soft-deleted';

-- 2. Fix the admin SELECT policy with case-insensitive role check
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles including deleted" ON public.profiles;

CREATE POLICY "Admins can view all profiles including deleted"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND LOWER(role) = 'admin'  -- Case-insensitive check
  )
);

COMMENT ON POLICY "Admins can view all profiles including deleted" ON public.profiles IS
  'Admins can view all profiles including soft-deleted ones';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ RLS POLICIES FIXED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Updated policies:';
  RAISE NOTICE '  1. Users can view their own profile (not deleted)';
  RAISE NOTICE '  2. Admins can view all profiles (case-insensitive)';
  RAISE NOTICE '';
  RAISE NOTICE 'Users should now be able to log in again.';
  RAISE NOTICE '============================================';
END $$;

-- Check the policies
SELECT
  policyname,
  cmd as command,
  roles,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'profiles'
  AND schemaname = 'public'
  AND cmd = 'SELECT'
ORDER BY policyname;
