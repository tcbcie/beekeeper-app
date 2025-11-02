-- Add missing columns from user_profiles to profiles table
-- This migration adds first_name, last_name, role, and mobile_number if they don't exist

DO $$
BEGIN
  -- Add first_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN first_name TEXT;
    RAISE NOTICE 'Added first_name column';
  ELSE
    RAISE NOTICE 'first_name column already exists';
  END IF;

  -- Add last_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_name TEXT;
    RAISE NOTICE 'Added last_name column';
  ELSE
    RAISE NOTICE 'last_name column already exists';
  END IF;

  -- Add mobile_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'mobile_number'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN mobile_number TEXT;
    RAISE NOTICE 'Added mobile_number column';
  ELSE
    RAISE NOTICE 'mobile_number column already exists';
  END IF;

  -- Role column might already exist, but add if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN role TEXT;
    RAISE NOTICE 'Added role column';
  ELSE
    RAISE NOTICE 'role column already exists';
  END IF;
END $$;

-- If user_profiles table still exists, copy data from it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    RAISE NOTICE 'user_profiles table exists - migrating data...';

    -- Update profiles with data from user_profiles where profiles data is null
    UPDATE public.profiles p
    SET
      first_name = COALESCE(p.first_name, up.first_name),
      last_name = COALESCE(p.last_name, up.last_name),
      role = COALESCE(p.role, up.role),
      mobile_number = COALESCE(p.mobile_number, up.mobile_number)
    FROM public.user_profiles up
    WHERE p.id = up.id;

    RAISE NOTICE 'Migrated data from user_profiles to profiles';
  ELSE
    RAISE NOTICE 'user_profiles table does not exist - no data to migrate';
  END IF;
END $$;

-- Update full_name to be a computed column based on first_name and last_name
-- First, drop the existing full_name column if it's not a generated column
DO $$
BEGIN
  -- Check if full_name exists and is not generated
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
      AND column_name = 'full_name'
      AND is_generated = 'NEVER'
  ) THEN
    -- Drop the existing full_name column
    ALTER TABLE public.profiles DROP COLUMN full_name;
    RAISE NOTICE 'Dropped existing full_name column';
  END IF;

  -- Add full_name as a generated column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN full_name TEXT GENERATED ALWAYS AS (
      CASE
        WHEN first_name IS NOT NULL AND last_name IS NOT NULL
          THEN first_name || ' ' || last_name
        WHEN first_name IS NOT NULL
          THEN first_name
        WHEN last_name IS NOT NULL
          THEN last_name
        ELSE NULL
      END
    ) STORED;
    RAISE NOTICE 'Added full_name as computed column';
  ELSE
    RAISE NOTICE 'full_name column already exists as generated column';
  END IF;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Summary
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'MIGRATION COMPLETE!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Added missing columns to profiles:';
  RAISE NOTICE '  - first_name';
  RAISE NOTICE '  - last_name';
  RAISE NOTICE '  - role';
  RAISE NOTICE '  - mobile_number';
  RAISE NOTICE '  - full_name (computed from first + last)';
  RAISE NOTICE '============================================';
END $$;
