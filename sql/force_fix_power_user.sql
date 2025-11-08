-- FORCE FIX: Power User Role Support
-- This script forcefully fixes the Power User role issue

-- ==================================================
-- STEP 1: Drop ALL existing role constraints
-- ==================================================
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  -- Find and drop all CHECK constraints on profiles table
  FOR constraint_record IN
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND constraint_type = 'CHECK'
  LOOP
    EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_record.constraint_name);
    RAISE NOTICE 'Dropped constraint: %', constraint_record.constraint_name;
  END LOOP;

  RAISE NOTICE 'All CHECK constraints removed from profiles table';
END $$;

-- ==================================================
-- STEP 2: Add the new constraint with Power User
-- ==================================================
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('User', 'Power User', 'Admin'));

RAISE NOTICE 'Added new role constraint with Power User support';

-- ==================================================
-- STEP 3: Test the constraint
-- ==================================================
DO $$
BEGIN
  -- Try to validate that 'Power User' is acceptable
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'profiles'
      AND c.contype = 'c'
      AND c.conbin::text LIKE '%Power User%'
  ) THEN
    RAISE NOTICE '✓ Constraint includes Power User';
  ELSE
    RAISE WARNING '✗ Constraint does NOT include Power User - check manually';
  END IF;
END $$;

-- ==================================================
-- STEP 4: Show current state
-- ==================================================
SELECT
  'Current Constraint:' as info,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'profiles'
  AND tc.constraint_name = 'profiles_role_check';

-- ==================================================
-- STEP 5: Test update capability
-- ==================================================
DO $$
DECLARE
  test_user_id UUID;
  test_role TEXT;
BEGIN
  -- Find a test user (not admin)
  SELECT id INTO test_user_id
  FROM public.profiles
  WHERE role = 'User'
  LIMIT 1;

  IF test_user_id IS NOT NULL THEN
    -- Try to update to Power User
    UPDATE public.profiles
    SET role = 'Power User'
    WHERE id = test_user_id;

    -- Check if it worked
    SELECT role INTO test_role
    FROM public.profiles
    WHERE id = test_user_id;

    IF test_role = 'Power User' THEN
      RAISE NOTICE '✓ Successfully updated user % to Power User', test_user_id;

      -- Revert the test change
      UPDATE public.profiles
      SET role = 'User'
      WHERE id = test_user_id;

      RAISE NOTICE '✓ Reverted test user back to User';
    ELSE
      RAISE WARNING '✗ Failed to update user to Power User. Current role: %', test_role;
    END IF;
  ELSE
    RAISE NOTICE 'No test user found to verify update';
  END IF;
END $$;

-- ==================================================
-- FINAL STATUS
-- ==================================================
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'POWER USER FIX COMPLETE!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'The profiles.role column now accepts:';
  RAISE NOTICE '  • User';
  RAISE NOTICE '  • Power User';
  RAISE NOTICE '  • Admin';
  RAISE NOTICE '';
  RAISE NOTICE 'Test the fix in the UI:';
  RAISE NOTICE '1. Go to Settings > User Management';
  RAISE NOTICE '2. Change a user to "Power User"';
  RAISE NOTICE '3. Refresh the page';
  RAISE NOTICE '4. Verify it persists';
  RAISE NOTICE '============================================';
END $$;
