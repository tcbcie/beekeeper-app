-- ============================================================================
-- CHECK USER DELETION IMPACT
-- ============================================================================
-- This checks what happens when a user with an active subscription is deleted
-- ============================================================================

-- Check foreign key constraints on subscription_history table
SELECT
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as references_table,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.subscription_history'::regclass
  AND contype = 'f'  -- foreign key constraints
ORDER BY conname;

-- Check if subscription_history has CASCADE delete
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'subscription_history';

-- Check what user data exists in related tables
SELECT
  'profiles' as table_name,
  COUNT(*) as record_count
FROM profiles
WHERE id = (SELECT id FROM profiles WHERE email = 'rickneefe65@gmail.com')

UNION ALL

SELECT
  'subscription_history' as table_name,
  COUNT(*) as record_count
FROM subscription_history
WHERE user_id = (SELECT id FROM profiles WHERE email = 'rickneefe65@gmail.com')

UNION ALL

SELECT
  'hives' as table_name,
  COUNT(*) as record_count
FROM hives
WHERE user_id = (SELECT id FROM profiles WHERE email = 'rickneefe65@gmail.com')

UNION ALL

SELECT
  'inspections' as table_name,
  COUNT(*) as record_count
FROM inspections
WHERE user_id = (SELECT id FROM profiles WHERE email = 'rickneefe65@gmail.com')

UNION ALL

SELECT
  'apiaries' as table_name,
  COUNT(*) as record_count
FROM apiaries
WHERE user_id = (SELECT id FROM profiles WHERE email = 'rickneefe65@gmail.com');

-- Check for auth.users deletion policy
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND cmd = 'DELETE'
ORDER BY policyname;
