-- ============================================================================
-- PERMANENTLY DELETE ALL SOFT-DELETED USERS
-- ============================================================================
-- ⚠️ WARNING: THIS IS IRREVERSIBLE! ⚠️
-- This script will PERMANENTLY DELETE all users that have been soft-deleted.
-- All their data will be removed from both profiles and auth.users tables.
-- ============================================================================
-- IMPORTANT: Review the list of users to be deleted before proceeding!
-- ============================================================================

-- First, show which users will be permanently deleted
DO $$
DECLARE
  user_record RECORD;
  user_count INTEGER;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '⚠️  USERS TO BE PERMANENTLY DELETED';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';

  -- Count users
  SELECT COUNT(*) INTO user_count
  FROM public.profiles
  WHERE deleted_at IS NOT NULL;

  IF user_count = 0 THEN
    RAISE NOTICE 'No soft-deleted users found. Nothing to delete.';
    RAISE NOTICE '============================================';
    RETURN;
  END IF;

  RAISE NOTICE 'Found % soft-deleted user(s):', user_count;
  RAISE NOTICE '';

  -- List each user to be deleted
  FOR user_record IN
    SELECT
      id,
      email as display_email,
      first_name,
      last_name,
      role,
      deleted_at
    FROM public.profiles
    WHERE deleted_at IS NOT NULL
    ORDER BY deleted_at DESC
  LOOP
    RAISE NOTICE 'User ID: %', user_record.id;
    RAISE NOTICE '  Email: %', user_record.display_email;
    RAISE NOTICE '  Name: % %', COALESCE(user_record.first_name, '(none)'), COALESCE(user_record.last_name, '(none)');
    RAISE NOTICE '  Role: %', user_record.role;
    RAISE NOTICE '  Deleted: %', user_record.deleted_at;
    RAISE NOTICE '';
  END LOOP;

  RAISE NOTICE '============================================';
  RAISE NOTICE '⚠️  REVIEW THE ABOVE LIST CAREFULLY!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'To proceed with permanent deletion:';
  RAISE NOTICE '1. Review the list above';
  RAISE NOTICE '2. Uncomment the DELETE statements below';
  RAISE NOTICE '3. Run this script again';
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
END $$;

-- ============================================================================
-- UNCOMMENT THE SECTION BELOW TO ACTUALLY DELETE THE USERS
-- ============================================================================
/*
DO $$
DECLARE
  deleted_profiles_count INTEGER;
  deleted_auth_count INTEGER;
  user_record RECORD;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '🗑️  STARTING PERMANENT DELETION';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';

  -- Get list of users to delete for logging
  FOR user_record IN
    SELECT
      id,
      email as display_email,
      first_name,
      last_name
    FROM public.profiles
    WHERE deleted_at IS NOT NULL
  LOOP
    RAISE NOTICE 'Deleting: % (% %)', user_record.display_email,
                 COALESCE(user_record.first_name, ''),
                 COALESCE(user_record.last_name, '');
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Permanently deleting from profiles table...';

  -- Delete from profiles table
  DELETE FROM public.profiles
  WHERE deleted_at IS NOT NULL;

  GET DIAGNOSTICS deleted_profiles_count = ROW_COUNT;

  RAISE NOTICE '✓ Deleted % users from profiles table', deleted_profiles_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Permanently deleting from auth.users table...';

  -- Delete from auth.users table
  -- Note: Users with deleted_* emails and banned_until = 2099-12-31
  DELETE FROM auth.users
  WHERE email LIKE 'deleted_%@deleted.local'
    AND banned_until = '2099-12-31'::timestamptz;

  GET DIAGNOSTICS deleted_auth_count = ROW_COUNT;

  RAISE NOTICE '✓ Deleted % users from auth.users table', deleted_auth_count;
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ PERMANENT DELETION COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  Profiles deleted: %', deleted_profiles_count;
  RAISE NOTICE '  Auth users deleted: %', deleted_auth_count;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  THIS CANNOT BE UNDONE!';
  RAISE NOTICE 'All data for these users has been permanently removed.';
  RAISE NOTICE '============================================';
END $$;
*/

-- ============================================================================
-- VERIFICATION QUERIES (safe to run anytime)
-- ============================================================================

-- Show count of soft-deleted users
SELECT
  'Soft-deleted users' as category,
  COUNT(*) as count
FROM public.profiles
WHERE deleted_at IS NOT NULL

UNION ALL

SELECT
  'Auth users with deleted emails' as category,
  COUNT(*) as count
FROM auth.users
WHERE email LIKE 'deleted_%@deleted.local'
  AND banned_until = '2099-12-31'::timestamptz;
