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
  p.disabled_at,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.is_active = false
ORDER BY p.disabled_at DESC NULLS LAST;

-- Step 2: Check if any accounts have is_active = false but no disabled_at timestamp
-- (These might be incorrectly marked as inactive)
DO $$
DECLARE
  incorrect_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO incorrect_count
  FROM public.profiles
  WHERE is_active = false AND disabled_at IS NULL;

  IF incorrect_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  WARNING: Found % account(s) with is_active=false but no disabled_at timestamp', incorrect_count;
    RAISE NOTICE 'These accounts may have been incorrectly marked as inactive.';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✓ All inactive accounts have proper disabled_at timestamps';
  END IF;
END $$;

-- Step 3: (OPTIONAL) Reactivate ALL accounts that were incorrectly marked inactive
-- UNCOMMENT THE LINES BELOW TO REACTIVATE ACCOUNTS:

/*
UPDATE public.profiles
SET
  is_active = true,
  disabled_at = NULL
WHERE is_active = false
  AND disabled_at IS NULL;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Reactivated accounts that had no disabled_at timestamp';
  RAISE NOTICE 'Affected rows: %', (SELECT COUNT(*) FROM public.profiles WHERE is_active = true);
END $$;
*/

-- Step 4: (OPTIONAL) Reactivate a SPECIFIC account by email
-- UNCOMMENT AND EDIT THE EMAIL BELOW:

/*
UPDATE public.profiles p
SET
  is_active = true,
  disabled_at = NULL
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
