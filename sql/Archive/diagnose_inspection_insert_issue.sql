-- ============================================================================
-- DIAGNOSE INSPECTION INSERT ISSUE
-- ============================================================================
-- Check why users cannot save hive inspections
-- ============================================================================

-- 1. Check if inspections table exists and its structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'inspections'
ORDER BY ordinal_position;

-- 2. Check RLS policies on inspections table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'inspections'
  AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 3. Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'inspections'
  AND schemaname = 'public';

-- 4. Check foreign key constraints
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
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'inspections'
  AND tc.constraint_type = 'FOREIGN KEY';

-- 5. Test if we can insert a sample inspection
DO $$
DECLARE
  test_user_id UUID;
  test_hive_id UUID;
BEGIN
  -- Get a real user and hive for testing
  SELECT id INTO test_user_id FROM profiles LIMIT 1;
  SELECT id INTO test_hive_id FROM hives WHERE user_id = test_user_id LIMIT 1;

  IF test_user_id IS NULL THEN
    RAISE NOTICE '⚠️  No users found for testing';
    RETURN;
  END IF;

  IF test_hive_id IS NULL THEN
    RAISE NOTICE '⚠️  No hives found for user % for testing', test_user_id;
    RETURN;
  END IF;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'TESTING INSPECTION INSERT';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Test user: %', test_user_id;
  RAISE NOTICE 'Test hive: %', test_hive_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Attempting INSERT...';

  -- Try to insert (will be rolled back in DO block)
  BEGIN
    INSERT INTO inspections (
      hive_id,
      user_id,
      inspection_date,
      queen_seen
    ) VALUES (
      test_hive_id,
      test_user_id,
      CURRENT_DATE,
      true
    );

    RAISE NOTICE '✅ INSERT successful (but rolled back in test)';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ INSERT failed: %', SQLERRM;
  END;

  RAISE NOTICE '============================================';
END $$;
