-- MIGRATE ROLE DATA FROM del_user_profiles TO profiles
-- This script handles migrating admin role assignments from the old table

-- Step 1: Ensure profiles table has a role column
DO $$
BEGIN
  -- Check if role column exists in profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
  ) THEN
    -- Add role column with default 'User'
    ALTER TABLE public.profiles
    ADD COLUMN role TEXT NOT NULL DEFAULT 'User';

    RAISE NOTICE 'Added role column to profiles table with default "User"';

    -- Add check constraint to ensure valid values
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('User', 'Admin'));

    RAISE NOTICE 'Added check constraint for valid role values';
  ELSE
    RAISE NOTICE 'Role column already exists in profiles table';

    -- Ensure check constraint exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND constraint_name = 'profiles_role_check'
    ) THEN
      -- Drop old constraint if it exists with wrong values
      ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

      ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('User', 'Admin'));

      RAISE NOTICE 'Added check constraint for valid role values';
    END IF;
  END IF;
END $$;

-- Step 2: Migrate role data from del_user_profiles if it exists
DO $$
DECLARE
  del_table_exists BOOLEAN;
  del_has_role_column BOOLEAN;
  migrated_count INT := 0;
  admin_count INT := 0;
BEGIN
  -- Check if del_user_profiles exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'del_user_profiles'
  ) INTO del_table_exists;

  IF del_table_exists THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Found del_user_profiles table';

    -- Check if it has a role column
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'del_user_profiles'
        AND column_name = 'role'
    ) INTO del_has_role_column;

    IF del_has_role_column THEN
      RAISE NOTICE 'del_user_profiles has role column - proceeding with migration';

      -- Update profiles with role data from del_user_profiles
      -- Match by id (user_id)
      -- Normalize the role values to match TypeScript expectations: 'User' or 'Admin'
      UPDATE public.profiles p
      SET role = CASE
        WHEN LOWER(dup.role) = 'admin' THEN 'Admin'
        ELSE 'User'
      END
      FROM public.del_user_profiles dup
      WHERE p.id = dup.id
        AND dup.role IS NOT NULL;

      GET DIAGNOSTICS migrated_count = ROW_COUNT;
      RAISE NOTICE 'Updated % user roles from del_user_profiles', migrated_count;

      -- Count how many admins we have now
      SELECT COUNT(*) INTO admin_count
      FROM public.profiles
      WHERE role = 'Admin';

      RAISE NOTICE 'Total admin users after migration: %', admin_count;

    ELSE
      RAISE NOTICE 'del_user_profiles exists but has no role column';
    END IF;

  ELSE
    RAISE NOTICE '========================================';
    RAISE NOTICE 'del_user_profiles table does not exist';
    RAISE NOTICE 'No migration needed - possibly already completed';
  END IF;

  RAISE NOTICE '========================================';
END $$;

-- Step 3: Normalize role values to match TypeScript expectations
-- Convert any variations to proper case: 'User' or 'Admin'
UPDATE public.profiles
SET role = CASE
  WHEN LOWER(role) = 'admin' THEN 'Admin'
  WHEN LOWER(role) = 'user' THEN 'User'
  ELSE 'User'  -- Default for any unknown values
END
WHERE role IS NOT NULL
  AND role NOT IN ('User', 'Admin');

-- Step 4: Set any NULL roles to 'User' (default)
UPDATE public.profiles
SET role = 'User'
WHERE role IS NULL;

-- Step 5: Update the default value and NOT NULL constraint
ALTER TABLE public.profiles
ALTER COLUMN role SET DEFAULT 'User',
ALTER COLUMN role SET NOT NULL;

-- Step 6: Create index on role for faster admin checks
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Step 7: Update the handle_new_user trigger function to set default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    'User',  -- Default role for new users (capital U to match TypeScript)
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Show summary of roles
DO $$
DECLARE
  total_users INT;
  admin_users INT;
  regular_users INT;
BEGIN
  SELECT COUNT(*) INTO total_users FROM public.profiles;
  SELECT COUNT(*) INTO admin_users FROM public.profiles WHERE role = 'Admin';
  SELECT COUNT(*) INTO regular_users FROM public.profiles WHERE role = 'User';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'ROLE MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total users: %', total_users;
  RAISE NOTICE 'Admin users: %', admin_users;
  RAISE NOTICE 'Regular users: %', regular_users;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Admin role functionality restored!';
  RAISE NOTICE 'Users with role = ''Admin'' can now access Settings page';
  RAISE NOTICE '========================================';
END $$;

-- Step 9: Display admin users (if any exist)
DO $$
DECLARE
  admin_count INT;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE role = 'Admin';

  IF admin_count > 0 THEN
    RAISE NOTICE 'Current admin users:';
  ELSE
    RAISE NOTICE '========================================';
    RAISE NOTICE 'WARNING: No admin users found!';
    RAISE NOTICE 'You may need to manually set a user to admin:';
    RAISE NOTICE 'UPDATE public.profiles SET role = ''Admin'' WHERE email = ''your@email.com'';';
    RAISE NOTICE '========================================';
  END IF;
END $$;

SELECT
  id,
  email,
  first_name,
  last_name,
  role,
  created_at
FROM public.profiles
WHERE role = 'Admin'
ORDER BY created_at;
