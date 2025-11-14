-- ============================================================================
-- DIAGNOSE GET_USERS_WITH_EMAIL ISSUE
-- ============================================================================
-- Check function exists, permissions, and test execution
-- ============================================================================

-- 1. Check if function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_users_with_email'
  ) THEN
    RAISE NOTICE '✅ Function get_users_with_email EXISTS';
  ELSE
    RAISE NOTICE '❌ Function get_users_with_email DOES NOT EXIST';
  END IF;
END $$;

-- 2. Check function details
SELECT
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_users_with_email';

-- 3. Check permissions
SELECT
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'get_users_with_email';

-- 4. Test calling the function directly
DO $$
DECLARE
  test_record RECORD;
  record_count INTEGER := 0;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'TESTING FUNCTION CALL';
  RAISE NOTICE '============================================';

  FOR test_record IN
    SELECT * FROM public.get_users_with_email() LIMIT 3
  LOOP
    record_count := record_count + 1;
    RAISE NOTICE 'Record %: id=%, email=%', record_count, test_record.id, test_record.email;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Function executed successfully!';
  RAISE NOTICE 'Found % records (showing first 3)', record_count;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Function execution FAILED';
    RAISE NOTICE 'Error: %', SQLERRM;
    RAISE NOTICE 'Detail: %', SQLSTATE;
END $$;

-- 5. Check if there are any profiles
SELECT COUNT(*) as total_profiles FROM public.profiles WHERE deleted_at IS NULL;

-- 6. Check RLS policies on profiles table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles';
