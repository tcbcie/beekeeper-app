-- ============================================================================
-- DIAGNOSE CURRENT RLS POLICIES ON PROFILES TABLE
-- ============================================================================
-- This script shows all current policies to identify what's causing recursion
-- ============================================================================

-- Show ALL policies on the profiles table
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'ALL POLICIES ON PROFILES TABLE';
  RAISE NOTICE '============================================';
END $$;

SELECT
  schemaname,
  tablename,
  policyname,
  cmd as command,
  roles,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'profiles'
  AND schemaname = 'public'
ORDER BY cmd, policyname;

-- Show all triggers on profiles table
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'ALL TRIGGERS ON PROFILES TABLE';
  RAISE NOTICE '============================================';
END $$;

SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
  AND event_object_schema = 'public'
ORDER BY trigger_name;

-- Check if the prevent_role_self_change function exists
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'CHECKING PREVENT_ROLE_SELF_CHANGE FUNCTION';
  RAISE NOTICE '============================================';
END $$;

SELECT
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'prevent_role_self_change';

-- Summary
DO $$
DECLARE
  policy_count INTEGER;
  update_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'profiles' AND schemaname = 'public';

  SELECT COUNT(*) INTO update_policy_count
  FROM pg_policies
  WHERE tablename = 'profiles' AND schemaname = 'public' AND cmd = 'UPDATE';

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'SUMMARY';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total policies on profiles: %', policy_count;
  RAISE NOTICE 'UPDATE policies on profiles: %', update_policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Look for policies with subqueries in USING or WITH CHECK clauses.';
  RAISE NOTICE 'These can cause infinite recursion!';
  RAISE NOTICE '============================================';
END $$;
