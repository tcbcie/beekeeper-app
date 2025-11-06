-- DIAGNOSTIC: Check role migration status and identify what needs to be done

-- Step 1: Check if del_user_profiles table exists
DO $$
DECLARE
  del_table_exists BOOLEAN;
  profiles_table_exists BOOLEAN;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ROLE MIGRATION DIAGNOSTIC';
  RAISE NOTICE '========================================';

  -- Check if del_user_profiles exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'del_user_profiles'
  ) INTO del_table_exists;

  -- Check if profiles exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) INTO profiles_table_exists;

  RAISE NOTICE 'del_user_profiles exists: %', del_table_exists;
  RAISE NOTICE 'profiles exists: %', profiles_table_exists;
  RAISE NOTICE '========================================';
END $$;

-- Step 2: If del_user_profiles exists, show its structure and data
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'del_user_profiles'
  ) THEN
    RAISE NOTICE 'del_user_profiles table structure:';
  END IF;
END $$;

-- Show del_user_profiles columns (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'del_user_profiles'
  ) THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'del_user_profiles columns:';
    RAISE NOTICE '========================================';
  END IF;
END $$;

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'del_user_profiles'
ORDER BY ordinal_position;

-- Check if role column exists in del_user_profiles
DO $$
DECLARE
  del_table_exists BOOLEAN;
  del_has_role BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'del_user_profiles'
  ) INTO del_table_exists;

  IF del_table_exists THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'del_user_profiles'
        AND column_name = 'role'
    ) INTO del_has_role;

    RAISE NOTICE '========================================';
    IF del_has_role THEN
      RAISE NOTICE 'del_user_profiles HAS role column - migration possible';
    ELSE
      RAISE NOTICE 'del_user_profiles DOES NOT HAVE role column - no data to migrate';
    END IF;
    RAISE NOTICE '========================================';
  END IF;
END $$;

-- Step 3: Check profiles table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Step 4: Show role distribution in profiles table
SELECT
  role,
  COUNT(*) as count
FROM profiles
GROUP BY role
ORDER BY role;

-- Step 5: Check if profiles table has role column
DO $$
DECLARE
  role_column_exists BOOLEAN;
  role_column_type TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
  ) INTO role_column_exists;

  IF role_column_exists THEN
    SELECT data_type INTO role_column_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role';

    RAISE NOTICE '========================================';
    RAISE NOTICE 'profiles.role column EXISTS';
    RAISE NOTICE 'Data type: %', role_column_type;
    RAISE NOTICE '========================================';
  ELSE
    RAISE NOTICE '========================================';
    RAISE NOTICE 'profiles.role column DOES NOT EXIST';
    RAISE NOTICE 'Will need to add it';
    RAISE NOTICE '========================================';
  END IF;
END $$;

-- Step 6: If both tables exist, check for role data that needs migration
DO $$
DECLARE
  del_table_exists BOOLEAN;
  del_table_count INT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'del_user_profiles'
  ) INTO del_table_exists;

  IF del_table_exists THEN
    EXECUTE 'SELECT COUNT(*) FROM del_user_profiles' INTO del_table_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'del_user_profiles has % rows of data', del_table_count;

    IF del_table_count > 0 THEN
      RAISE NOTICE 'Data migration may be needed';
    ELSE
      RAISE NOTICE 'No data to migrate from del_user_profiles';
    END IF;
    RAISE NOTICE '========================================';
  END IF;
END $$;

-- Step 7: Summary
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSTIC COMPLETE';
  RAISE NOTICE 'Review the output above to determine:';
  RAISE NOTICE '1. Whether del_user_profiles exists and has data';
  RAISE NOTICE '2. Whether profiles.role column exists';
  RAISE NOTICE '3. Current role distribution in profiles';
  RAISE NOTICE '4. What migration steps are needed';
  RAISE NOTICE '========================================';
END $$;
