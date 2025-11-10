-- ============================================================================
-- CHECK PROFILES TABLE RLS POLICIES
-- ============================================================================
-- This checks if profiles table has RLS enabled and what policies exist
-- ============================================================================

-- Check if RLS is enabled on profiles
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'profiles';

-- List all policies on profiles table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY policyname;

-- Check if service_role can bypass RLS
SELECT
  rolname,
  rolsuper,
  rolbypassrls
FROM pg_roles
WHERE rolname IN ('authenticated', 'anon', 'service_role');
