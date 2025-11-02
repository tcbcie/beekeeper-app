-- Verify that the migration was successful (fixed version)

-- 1. Check profiles table structure
SELECT
  'profiles table columns' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Check that email column has data
SELECT
  'Email population check' as info,
  COUNT(*) as total_profiles,
  COUNT(email) as profiles_with_email,
  COUNT(full_name) as profiles_with_full_name
FROM public.profiles;

-- 3. Check all foreign keys are in place
SELECT
  'Foreign keys to profiles' as info,
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('inspections', 'varroa_treatments', 'varroa_checks', 'feedings', 'harvests')
  AND ccu.table_name = 'profiles'
ORDER BY tc.table_name;

-- 4. Test if foreign key join works for inspections
SELECT
  'Sample inspection with profile' as info,
  i.id as inspection_id,
  i.user_id,
  p.full_name,
  p.email
FROM inspections i
LEFT JOIN profiles p ON i.user_id = p.id
LIMIT 3;

-- 5. Test if foreign key join works for varroa_treatments
SELECT
  'Sample varroa treatment with profile' as info,
  vt.id as treatment_id,
  vt.user_id,
  p.full_name,
  p.email
FROM varroa_treatments vt
LEFT JOIN profiles p ON vt.user_id = p.id
LIMIT 3;

-- 6. Check if the Supabase PostgREST query will work
-- This simulates what the frontend does with .select('*, profiles(full_name, email)')
SELECT
  'Test PostgREST-style query' as info,
  json_build_object(
    'id', i.id,
    'user_id', i.user_id,
    'profiles', json_build_object(
      'full_name', p.full_name,
      'email', p.email
    )
  ) as result
FROM inspections i
LEFT JOIN profiles p ON i.user_id = p.id
LIMIT 1;
