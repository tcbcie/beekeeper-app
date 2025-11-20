-- ============================================================================
-- CHECK AND FIX INACTIVE ACCOUNTS
-- ============================================================================
-- This script identifies and optionally reactivates accounts that are marked
-- as inactive (is_active = false) but should be active.
--
-- IMPORTANT: Review the results before running the UPDATE section!
-- ============================================================================

-- Step 1: Check which accounts are marked as inactive
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'CHECKING INACTIVE ACCOUNTS';
  RAISE NOTICE '============================================';
END $$;

-- Show all inactive accounts
SELECT
  u.id,
  u.email,
  p.first_name,
  p.last_name,
  p.is_active,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.is_active = false
ORDER BY u.created_at DESC;

-- Step 2: Count inactive accounts
DO $$
DECLARE
  inactive_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO inactive_count
  FROM public.profiles
  WHERE is_active = false;

  IF inactive_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  WARNING: Found % inactive account(s)', inactive_count;
    RAISE NOTICE 'These accounts cannot log in to the application.';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✓ No inactive accounts found - all accounts are active';
  END IF;
END $$;

-- Step 3: (OPTIONAL) Reactivate ALL inactive accounts
-- UNCOMMENT THE LINES BELOW TO REACTIVATE ALL ACCOUNTS:

/*
UPDATE public.profiles
SET is_active = true
WHERE is_active = false;

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Reactivated % account(s)', updated_count;
END $$;
*/

-- Step 4: (OPTIONAL) Reactivate a SPECIFIC account by email
-- UNCOMMENT AND EDIT THE EMAIL BELOW:

/*
UPDATE public.profiles p
SET is_active = true
FROM auth.users u
WHERE p.id = u.id
  AND u.email = 'user@example.com';  -- CHANGE THIS EMAIL

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Reactivated specific account';
END $$;
*/

-- Step 5: Show summary
DO $$
DECLARE
  total_users INTEGER;
  active_users INTEGER;
  inactive_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM public.profiles;
  SELECT COUNT(*) INTO active_users FROM public.profiles WHERE is_active != false;
  SELECT COUNT(*) INTO inactive_users FROM public.profiles WHERE is_active = false;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'SUMMARY';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total users: %', total_users;
  RAISE NOTICE 'Active users: %', active_users;
  RAISE NOTICE 'Inactive users: %', inactive_users;
  RAISE NOTICE '============================================';
END $$;
