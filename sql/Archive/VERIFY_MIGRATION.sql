-- Verify that the migration was successful

-- 1. Check profiles table structure
SELECT
  'profiles table columns' as info,
  column_name,
  data_type,
  is_nullable,
  is_generated,
  generation_expression
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Check that email column has data
SELECT
  'Email population check' as info,
  COUNT(*) as total_profiles,
  COUNT(email) as profiles_with_email,
  COUNT(*) - COUNT(email) as profiles_without_email
FROM public.profiles;

-- 3. Check all foreign keys are in place
SELECT
  'Foreign keys to profiles' as info,
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('inspections', 'varroa_treatments', 'varroa_checks', 'feedings', 'harvests')
  AND ccu.table_name = 'profiles'
ORDER BY tc.table_name;

-- 4. Check if trigger exists
SELECT
  'Email sync trigger' as info,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'sync_profile_email_trigger';

-- 5. Test a sample query to see if foreign key join works
SELECT
  'Sample inspection with profile' as info,
  i.id,
  i.user_id,
  p.first_name,
  p.last_name,
  p.full_name,
  p.email
FROM inspections i
LEFT JOIN profiles p ON i.user_id = p.id
LIMIT 3;
