-- Complete diagnostic to understand the current database state

-- 1. Check what profiles is (table or view)
SELECT
  'What is profiles?' as info,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'profiles';

-- 2. Check profiles columns
SELECT
  'profiles columns' as info,
  column_name,
  data_type,
  is_nullable,
  column_default,
  is_generated,
  generation_expression
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. Check if user_profiles exists
SELECT
  'What is user_profiles?' as info,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'user_profiles';

-- 4. Check user_profiles columns if it exists
SELECT
  'user_profiles columns' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 5. Check for any views that contain 'profile' in their name
SELECT
  'Views with profile in name' as info,
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name LIKE '%profile%'
ORDER BY table_name;

-- 6. Check existing foreign keys
SELECT
  'Existing foreign keys to profiles/user_profiles' as info,
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
  AND ccu.table_name IN ('profiles', 'user_profiles')
ORDER BY tc.table_name;

-- 7. Count records
DO $$
DECLARE
  profiles_count INT := 0;
  user_profiles_count INT := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    EXECUTE 'SELECT COUNT(*) FROM profiles' INTO profiles_count;
    RAISE NOTICE 'profiles record count: %', profiles_count;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    EXECUTE 'SELECT COUNT(*) FROM user_profiles' INTO user_profiles_count;
    RAISE NOTICE 'user_profiles record count: %', user_profiles_count;
  END IF;
END $$;
