-- Diagnostic script to understand current database state

-- Check what tables/views exist
SELECT
  'User-related tables and views' as info,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%profile%'
    OR table_name LIKE '%user%'
  )
ORDER BY table_name;

-- Check profiles structure if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    RAISE NOTICE 'profiles table exists - checking structure...';
  END IF;
END $$;

SELECT 'profiles columns' as info, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check user_profiles structure if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    RAISE NOTICE 'user_profiles table exists - checking structure...';
  END IF;
END $$;

SELECT 'user_profiles columns' as info, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Check existing foreign keys
SELECT
  'Existing foreign keys' as info,
  tc.table_name,
  tc.constraint_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('inspections', 'varroa_treatments', 'varroa_checks', 'feedings', 'harvests')
  AND ccu.table_name IN ('profiles', 'user_profiles')
ORDER BY tc.table_name;

-- Count records
DO $$
DECLARE
  profiles_count INT;
  user_profiles_count INT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    SELECT COUNT(*) INTO profiles_count FROM profiles;
    RAISE NOTICE 'profiles record count: %', profiles_count;
  ELSE
    RAISE NOTICE 'profiles table does not exist';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    SELECT COUNT(*) INTO user_profiles_count FROM user_profiles;
    RAISE NOTICE 'user_profiles record count: %', user_profiles_count;
  ELSE
    RAISE NOTICE 'user_profiles table does not exist';
  END IF;
END $$;
