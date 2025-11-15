-- ============================================================================
-- DIAGNOSTIC: LIST ALL RLS POLICIES
-- ============================================================================
-- This script shows all existing RLS policies for team-related tables
-- Run this to identify duplicates before cleanup
-- ============================================================================

-- Show all policies for each table with their definitions
SELECT
  schemaname,
  tablename,
  policyname,
  CASE
    WHEN cmd = 'SELECT' THEN 'SELECT'
    WHEN cmd = 'INSERT' THEN 'INSERT'
    WHEN cmd = 'UPDATE' THEN 'UPDATE'
    WHEN cmd = 'DELETE' THEN 'DELETE'
    WHEN cmd = '*' THEN 'ALL'
  END as command,
  CASE
    WHEN roles = '{authenticated}' THEN 'authenticated'
    WHEN roles = '{public}' THEN 'public'
    ELSE roles::text
  END as roles,
  CASE WHEN permissive = 't' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END as type
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'teams', 'team_members', 'team_apiaries', 'team_invitations',
    'apiaries', 'hives', 'queens', 'inspections',
    'varroa_checks', 'varroa_treatments', 'feedings', 'harvests',
    'rearing_batches'
  )
ORDER BY tablename, command, policyname;

-- Summary count
SELECT
  tablename,
  COUNT(*) as total_policies,
  COUNT(*) FILTER (WHERE cmd = 'SELECT') as select_policies,
  COUNT(*) FILTER (WHERE cmd = 'INSERT') as insert_policies,
  COUNT(*) FILTER (WHERE cmd = 'UPDATE') as update_policies,
  COUNT(*) FILTER (WHERE cmd = 'DELETE') as delete_policies,
  COUNT(*) FILTER (WHERE cmd = '*') as all_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'teams', 'team_members', 'team_apiaries', 'team_invitations',
    'apiaries', 'hives', 'queens', 'inspections',
    'varroa_checks', 'varroa_treatments', 'feedings', 'harvests',
    'rearing_batches'
  )
GROUP BY tablename
ORDER BY tablename;
