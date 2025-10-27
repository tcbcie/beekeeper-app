-- Diagnostic Script to Check Teams Feature Setup
-- Run this in Supabase SQL Editor to diagnose issues

-- 1. Check if tables exist
SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE tablename IN ('teams', 'team_members', 'team_apiaries', 'team_invitations')
ORDER BY tablename;

-- 2. Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('teams', 'team_members', 'team_apiaries', 'team_invitations')
ORDER BY tablename;

-- 3. List all policies on teams tables
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
WHERE tablename IN ('teams', 'team_members', 'team_apiaries', 'team_invitations')
ORDER BY tablename, policyname;

-- 4. Check triggers on teams table
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('teams', 'team_members', 'team_apiaries', 'team_invitations')
ORDER BY event_object_table, trigger_name;

-- 5. Test if you can query the tables (should return empty result if working)
SELECT COUNT(*) as team_count FROM teams;
SELECT COUNT(*) as member_count FROM team_members;
SELECT COUNT(*) as apiary_link_count FROM team_apiaries;
SELECT COUNT(*) as invitation_count FROM team_invitations;

-- 6. Check current user's auth.uid()
SELECT auth.uid() as current_user_id;

-- 7. Check user_profiles table structure
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 8. Check if current user has a profile
SELECT *
FROM user_profiles
WHERE user_id = auth.uid();

-- 9. Alternative: Check profiles table (Supabase default)
SELECT
  id,
  email
FROM auth.users
WHERE id = auth.uid();
