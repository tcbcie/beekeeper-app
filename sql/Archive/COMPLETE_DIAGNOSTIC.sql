-- COMPLETE DIAGNOSTIC: Power User Role Issue
-- Run this to see EXACTLY what's preventing Power User from working

\echo '============================================'
\echo 'POWER USER DIAGNOSTIC REPORT'
\echo '============================================'
\echo ''

-- 1. Column Type
\echo '1. COLUMN TYPE:'
SELECT
  column_name,
  data_type,
  udt_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'role';

\echo ''
\echo '2. CHECK CONSTRAINTS:'
SELECT
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'profiles'
  AND tc.constraint_type = 'CHECK';

\echo ''
\echo '3. RLS POLICIES:'
SELECT
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles';

\echo ''
\echo '4. TRIGGERS:'
SELECT
  trigger_name,
  event_manipulation as event,
  action_timing as timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'profiles';

\echo ''
\echo '5. CURRENT ROLES IN DATABASE:'
SELECT
  role,
  COUNT(*) as user_count
FROM public.profiles
GROUP BY role
ORDER BY role;

\echo ''
\echo '6. ENUM CHECK (if applicable):'
SELECT
  t.typname as enum_name,
  e.enumlabel as allowed_value,
  e.enumsortorder as sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname LIKE '%role%'
ORDER BY t.typname, e.enumsortorder;

\echo ''
\echo '============================================'
\echo 'DIAGNOSTIC COMPLETE'
\echo '============================================'
\echo 'Next steps:'
\echo '1. Review the CHECK CONSTRAINTS section'
\echo '2. If constraint does NOT include "Power User", run force_fix_power_user.sql'
\echo '3. Check RLS POLICIES for any that might filter role updates'
\echo '4. Check TRIGGERS for any that might revert role changes'
\echo '============================================'
