-- ============================================================================
-- TEST INSPECTION INSERT
-- ============================================================================
-- Try to insert a test inspection to see what the actual error is
-- ============================================================================

-- First, get a test user and hive
DO $$
DECLARE
  test_user_id UUID;
  test_hive_id UUID;
  test_inspection_id UUID;
BEGIN
  -- Get first user
  SELECT id INTO test_user_id FROM profiles LIMIT 1;

  -- Get first hive for that user
  SELECT id INTO test_hive_id FROM hives WHERE user_id = test_user_id LIMIT 1;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'TEST INSPECTION INSERT';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Test User ID: %', test_user_id;
  RAISE NOTICE 'Test Hive ID: %', test_hive_id;
  RAISE NOTICE '';

  IF test_user_id IS NULL THEN
    RAISE NOTICE '❌ No user found for testing';
    RETURN;
  END IF;

  IF test_hive_id IS NULL THEN
    RAISE NOTICE '❌ No hive found for user';
    RETURN;
  END IF;

  -- Try to insert
  BEGIN
    INSERT INTO inspections (
      hive_id,
      user_id,
      inspection_date,
      inspection_time,
      queen_seen,
      eggs_present,
      notes
    ) VALUES (
      test_hive_id,
      test_user_id,
      CURRENT_DATE,
      CURRENT_TIME,
      true,
      true,
      'Test inspection from SQL script'
    ) RETURNING id INTO test_inspection_id;

    RAISE NOTICE '✅ INSERT SUCCESSFUL!';
    RAISE NOTICE 'Inspection ID: %', test_inspection_id;

    -- Clean up test data
    DELETE FROM inspections WHERE id = test_inspection_id;
    RAISE NOTICE 'Test data cleaned up';

  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ INSERT FAILED!';
      RAISE NOTICE 'Error: %', SQLERRM;
      RAISE NOTICE 'Detail: %', SQLSTATE;
  END;

  RAISE NOTICE '============================================';
END $$;

-- Check if there are any CHECK constraints on inspections table
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'inspections'
  AND nsp.nspname = 'public'
  AND con.contype = 'c';

-- Check for NOT NULL columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'inspections'
  AND is_nullable = 'NO'
  AND column_default IS NULL
ORDER BY ordinal_position;
