-- Diagnostic query to check what tables exist and their structure

-- Check if profiles table exists
SELECT 'profiles table exists' as check_name,
       EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'profiles'
       ) as result;

-- Check if user_profiles table exists
SELECT 'user_profiles table exists' as check_name,
       EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'user_profiles'
       ) as result;

-- Show columns in profiles table (if it exists)
SELECT 'profiles columns' as info, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Show columns in user_profiles table (if it exists)
SELECT 'user_profiles columns' as info, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Check existing foreign keys on inspections
SELECT
  'inspections foreign keys' as info,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name='inspections';

-- Check if we can actually query profiles
SELECT 'Can query profiles' as check_name, COUNT(*) as row_count FROM profiles LIMIT 1;

-- Check if we can actually query user_profiles
SELECT 'Can query user_profiles' as check_name, COUNT(*) as row_count FROM user_profiles LIMIT 1;
