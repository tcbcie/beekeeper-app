-- Diagnostic queries for team_members RLS policies
-- Run this FIRST to see what policies currently exist and might be causing the issue

-- Query 1: List all policies on team_members table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'team_members'
ORDER BY cmd, policyname;

-- Query 2: Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'team_members';

-- Query 3: Look for potential recursion issues
-- (Policies that reference team_members in their USING clause)
SELECT
  policyname,
  cmd,
  CASE
    WHEN qual::text LIKE '%team_members%' THEN 'WARNING: References team_members table - potential recursion!'
    ELSE 'OK: No self-reference'
  END as recursion_risk,
  qual::text as using_clause
FROM pg_policies
WHERE tablename = 'team_members'
ORDER BY cmd;
