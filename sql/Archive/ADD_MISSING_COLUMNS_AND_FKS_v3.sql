-- Add missing columns and foreign keys to existing profiles table
-- This version handles view/table conflicts more carefully

-- Step 0: Handle the profiles view/table situation
DO $$
DECLARE
  is_view BOOLEAN;
  is_table BOOLEAN;
  view_def TEXT;
BEGIN
  -- Check if profiles is a view
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) INTO is_view;

  -- Check if profiles is a table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles' AND table_type = 'BASE TABLE'
  ) INTO is_table;

  RAISE NOTICE 'profiles is_view: %, is_table: %', is_view, is_table;

  -- If profiles is only a view (not a table)
  IF is_view AND NOT is_table THEN
    -- Get the view definition for logging
    BEGIN
      SELECT pg_get_viewdef('public.profiles'::regclass, true) INTO view_def;
      RAISE NOTICE 'Current profiles view definition: %', view_def;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not get view definition';
    END;

    -- Drop the view without CASCADE to see what breaks
    BEGIN
      DROP VIEW public.profiles;
      RAISE NOTICE 'Dropped profiles view';
    EXCEPTION WHEN OTHERS THEN
      -- If that fails, try with CASCADE
      RAISE NOTICE 'Dropping profiles view with CASCADE due to dependencies';
      DROP VIEW public.profiles CASCADE;
      RAISE NOTICE 'Dropped profiles view with CASCADE';
    END;

    -- Now rename user_profiles to profiles if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'user_profiles' AND table_type = 'BASE TABLE'
    ) THEN
      ALTER TABLE public.user_profiles RENAME TO profiles;
      RAISE NOTICE 'Renamed user_profiles to profiles';
    ELSE
      RAISE EXCEPTION 'Cannot find user_profiles base table to rename';
    END IF;
  ELSIF is_view AND is_table THEN
    -- Both exist - drop the view, keep the table
    RAISE NOTICE 'Both profiles view and table exist - dropping view';
    DROP VIEW public.profiles CASCADE;
    RAISE NOTICE 'Dropped profiles view, keeping profiles table';
  ELSIF NOT is_view AND NOT is_table THEN
    -- Neither exists - rename user_profiles
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'user_profiles' AND table_type = 'BASE TABLE'
    ) THEN
      ALTER TABLE public.user_profiles RENAME TO profiles;
      RAISE NOTICE 'Renamed user_profiles to profiles';
    ELSE
      RAISE EXCEPTION 'Cannot find user_profiles or profiles';
    END IF;
  ELSE
    RAISE NOTICE 'profiles table already exists, no renaming needed';
  END IF;
END $$;

-- Step 1: Add full_name and email columns if they don't exist
DO $$
BEGIN
  -- Add full_name as a generated column (computed from first_name + last_name)
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
    RAISE NOTICE 'Added full_name computed column';
  ELSE
    RAISE NOTICE 'full_name column already exists';
  END IF;

  -- Add email column if it doesn't exist (will be populated from auth.users)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
    RAISE NOTICE 'Added email column';
  ELSE
    RAISE NOTICE 'email column already exists';
  END IF;
END $$;

-- Step 2: Populate email from auth.users
DO $$
BEGIN
  UPDATE public.profiles
  SET email = auth.users.email
  FROM auth.users
  WHERE profiles.id = auth.users.id
    AND profiles.email IS NULL;

  RAISE NOTICE 'Populated email column from auth.users';
END $$;

-- Step 3: Create a trigger to keep email in sync with auth.users
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_profile_email_trigger ON auth.users;

CREATE TRIGGER sync_profile_email_trigger
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_email();

DO $$
BEGIN
  RAISE NOTICE 'Created email sync trigger';
END $$;

-- Step 4: Add missing foreign keys for user_id columns
DO $$
BEGIN
  -- Inspections
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'inspections_user_id_fkey' AND table_name = 'inspections'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'inspections' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE public.inspections
        ADD CONSTRAINT inspections_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added inspections_user_id_fkey';
    END IF;
  ELSE
    RAISE NOTICE 'inspections_user_id_fkey already exists';
  END IF;

  -- Varroa treatments
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'varroa_treatments_user_id_fkey' AND table_name = 'varroa_treatments'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'varroa_treatments' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE public.varroa_treatments
        ADD CONSTRAINT varroa_treatments_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added varroa_treatments_user_id_fkey';
    END IF;
  ELSE
    RAISE NOTICE 'varroa_treatments_user_id_fkey already exists';
  END IF;

  -- Varroa checks
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'varroa_checks_user_id_fkey' AND table_name = 'varroa_checks'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'varroa_checks' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE public.varroa_checks
        ADD CONSTRAINT varroa_checks_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added varroa_checks_user_id_fkey';
    END IF;
  ELSE
    RAISE NOTICE 'varroa_checks_user_id_fkey already exists';
  END IF;

  -- Feedings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'feedings_user_id_fkey' AND table_name = 'feedings'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'feedings' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE public.feedings
        ADD CONSTRAINT feedings_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added feedings_user_id_fkey';
    END IF;
  ELSE
    RAISE NOTICE 'feedings_user_id_fkey already exists';
  END IF;

  -- Harvests
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'harvests_user_id_fkey' AND table_name = 'harvests'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'harvests' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE public.harvests
        ADD CONSTRAINT harvests_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added harvests_user_id_fkey';
    END IF;
  ELSE
    RAISE NOTICE 'harvests_user_id_fkey already exists';
  END IF;
END $$;

-- Step 5: Create or replace view for backward compatibility
CREATE OR REPLACE VIEW public.user_profiles_with_email AS
SELECT
  p.*,
  p.full_name as display_name
FROM public.profiles p;

DO $$
BEGIN
  RAISE NOTICE 'Created user_profiles_with_email view';
END $$;

-- Step 6: Grant permissions
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_profiles_with_email TO authenticated;

-- Step 7: Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Summary
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'MIGRATION COMPLETE!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '  - Handled profiles view/table conflict';
  RAISE NOTICE '  - Added full_name computed column';
  RAISE NOTICE '  - Added email column synced with auth.users';
  RAISE NOTICE '  - Created email sync trigger';
  RAISE NOTICE '  - Added foreign keys for all activity tables';
  RAISE NOTICE '  - Created user_profiles_with_email view';
  RAISE NOTICE '============================================';
END $$;
