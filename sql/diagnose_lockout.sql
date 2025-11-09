-- ============================================================================
-- DIAGNOSE USER LOCKOUT ISSUE
-- ============================================================================
-- Check RLS policies and identify why users might be locked out
-- ============================================================================

-- 1. Check all RLS policies on profiles table
SELECT
  policyname,
  cmd as command,
  permissive,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'profiles'
  AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 2. Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'profiles'
  AND schemaname = 'public';

-- 3. Check active_profiles view definition
SELECT pg_get_viewdef('public.active_profiles', true);

-- 4. Test: Can we see profiles?
SELECT
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_profiles,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_profiles
FROM public.profiles;

-- 5. Check if there are any users without deleted_at column issue
SELECT
  id,
  email,
  role,
  is_active,
  deleted_at,
  created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 5;

-- 6. Check what policies are blocking SELECT
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RLS POLICY DIAGNOSIS';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'If users cannot log in, check:';
  RAISE NOTICE '1. Is there a SELECT policy that allows users to view their own profile?';
  RAISE NOTICE '2. Does the policy check deleted_at IS NULL?';
  RAISE NOTICE '3. Is the active_profiles view being used correctly?';
  RAISE NOTICE '============================================';
END $$;
