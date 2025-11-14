-- ============================================================================
-- DIAGNOSE USER DELETION FAILURE
-- ============================================================================
-- Run this to understand why a user deletion is failing
-- Replace 'USER_ID_HERE' with the actual UUID of the user you're trying to delete
-- ============================================================================

-- Set the user ID you want to check
\set user_id 'USER_ID_HERE'

-- Check if user exists
SELECT
  'User Profile' as check_type,
  CASE
    WHEN COUNT(*) = 0 THEN '❌ User not found in profiles'
    WHEN MAX(deleted_at) IS NOT NULL THEN '⚠️ User already soft-deleted on ' || MAX(deleted_at)::text
    ELSE '✓ User exists and not deleted'
  END as status
FROM public.profiles
WHERE id = :'user_id';

-- Check auth.users
SELECT
  'Auth User' as check_type,
  CASE
    WHEN COUNT(*) = 0 THEN '❌ User not found in auth.users'
    ELSE '✓ User exists in auth.users'
  END as status
FROM auth.users
WHERE id = :'user_id';

-- Check for related data that might block deletion
SELECT 'Related Data Count' as info;

SELECT 'apiaries' as table_name, COUNT(*) as count
FROM public.apiaries WHERE user_id = :'user_id'
UNION ALL
SELECT 'hives', COUNT(*)
FROM public.hives WHERE user_id = :'user_id'
UNION ALL
SELECT 'queens', COUNT(*)
FROM public.queens WHERE user_id = :'user_id'
UNION ALL
SELECT 'inspections', COUNT(*)
FROM public.inspections WHERE user_id = :'user_id'
UNION ALL
SELECT 'varroa_checks', COUNT(*)
FROM public.varroa_checks WHERE user_id = :'user_id'
UNION ALL
SELECT 'varroa_treatments', COUNT(*)
FROM public.varroa_treatments WHERE user_id = :'user_id'
UNION ALL
SELECT 'feedings', COUNT(*)
FROM public.feedings WHERE user_id = :'user_id'
UNION ALL
SELECT 'harvests', COUNT(*)
FROM public.harvests WHERE user_id = :'user_id'
UNION ALL
SELECT 'subscription_history', COUNT(*)
FROM public.subscription_history WHERE user_id = :'user_id'
UNION ALL
SELECT 'team_members', COUNT(*)
FROM public.team_members WHERE user_id = :'user_id'
UNION ALL
SELECT 'teams (owner)', COUNT(*)
FROM public.teams WHERE owner_id = :'user_id';

-- Check foreign key constraints
SELECT
  'Foreign Key Constraints' as info,
  tc.table_name,
  kcu.column_name,
  rc.delete_rule,
  CASE
    WHEN rc.delete_rule = 'RESTRICT' THEN '⚠️ Will block deletion if records exist'
    WHEN rc.delete_rule = 'CASCADE' THEN '✓ Will cascade delete'
    WHEN rc.delete_rule = 'SET NULL' THEN '✓ Will set to NULL'
    ELSE rc.delete_rule
  END as effect
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'user_id'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Test soft_delete_user function
SELECT 'Testing soft_delete_user function...' as info;

-- Actually test it (will show the result without committing)
BEGIN;
SELECT * FROM public.soft_delete_user(:'user_id'::uuid);
ROLLBACK;

RAISE NOTICE '============================================';
RAISE NOTICE 'Diagnostic complete. Check results above.';
RAISE NOTICE '============================================';
