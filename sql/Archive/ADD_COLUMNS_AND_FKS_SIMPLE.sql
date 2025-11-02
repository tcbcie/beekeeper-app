-- Simple migration: just add what's missing without touching existing views

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
DECLARE
  rows_updated INT;
BEGIN
  UPDATE public.profiles
  SET email = auth.users.email
  FROM auth.users
  WHERE profiles.id = auth.users.id
    AND profiles.email IS NULL;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE 'Populated email for % rows', rows_updated;
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
  -- Inspections user_id
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
    ELSE
      RAISE NOTICE 'inspections.user_id column does not exist';
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
    ELSE
      RAISE NOTICE 'varroa_treatments.user_id column does not exist';
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
    ELSE
      RAISE NOTICE 'varroa_checks.user_id column does not exist';
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
    ELSE
      RAISE NOTICE 'feedings.user_id column does not exist';
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
    ELSE
      RAISE NOTICE 'harvests.user_id column does not exist';
    END IF;
  ELSE
    RAISE NOTICE 'harvests_user_id_fkey already exists';
  END IF;
END $$;

-- Step 5: Grant permissions on profiles table
GRANT SELECT ON public.profiles TO authenticated;

-- Step 6: Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Summary
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'MIGRATION COMPLETE!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '  - Added full_name computed column (if missing)';
  RAISE NOTICE '  - Added email column synced with auth.users (if missing)';
  RAISE NOTICE '  - Created email sync trigger';
  RAISE NOTICE '  - Added foreign keys for all activity tables with user_id';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'NOTE: Skipped view creation to avoid conflicts';
  RAISE NOTICE 'The profiles table is ready to use!';
  RAISE NOTICE '============================================';
END $$;
