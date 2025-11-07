-- TEST: Toggle user account directly in SQL
-- Run this in Supabase SQL Editor to test if the function works

-- Step 1: Show current users
SELECT 'Current users before toggle:' as step;
SELECT id, email, role, is_active FROM profiles ORDER BY created_at;

-- Step 2: Find a non-admin user to test with (replace with actual UUID from above)
-- Copy a user ID from the results above (NOT an admin)
DO $$
DECLARE
  test_user_id UUID;
  test_user_email TEXT;
  current_status BOOLEAN;
  result JSON;
BEGIN
  -- Find first non-admin user
  SELECT id, email, is_active INTO test_user_id, test_user_email, current_status
  FROM profiles
  WHERE role = 'User'
  LIMIT 1;

  IF test_user_id IS NULL THEN
    RAISE NOTICE 'No non-admin user found to test with';
    RETURN;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Testing toggle_user_account function';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Test user: % (%)', test_user_email, test_user_id;
  RAISE NOTICE 'Current status: %', CASE WHEN current_status THEN 'Active' ELSE 'Disabled' END;
  RAISE NOTICE '';

  -- Try to toggle the status
  RAISE NOTICE 'Attempting to toggle to: %', CASE WHEN NOT current_status THEN 'Active' ELSE 'Disabled' END;

  BEGIN
    SELECT toggle_user_account(test_user_id, NOT current_status) INTO result;
    RAISE NOTICE 'Result: %', result;
    RAISE NOTICE '✅ Function executed successfully!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Function failed with error: %', SQLERRM;
    RETURN;
  END;

  -- Check if status actually changed
  SELECT is_active INTO current_status FROM profiles WHERE id = test_user_id;
  RAISE NOTICE '';
  RAISE NOTICE 'New status in database: %', CASE WHEN current_status THEN 'Active' ELSE 'Disabled' END;
  RAISE NOTICE '========================================';
END $$;

-- Step 3: Show users after toggle
SELECT 'Users after toggle:' as step;
SELECT id, email, role, is_active FROM profiles ORDER BY created_at;
