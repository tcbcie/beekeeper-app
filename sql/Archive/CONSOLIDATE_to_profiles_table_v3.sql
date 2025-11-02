-- CONSOLIDATE USER TABLES TO STANDARD PROFILES TABLE (v3 - SAFE VERSION)
-- This handles the case where profiles already exists as a table

-- Step 0: Drop only views (not tables)
DO $$
BEGIN
  -- Drop user_profiles_with_email if it's a view
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'user_profiles_with_email'
  ) THEN
    DROP VIEW public.user_profiles_with_email CASCADE;
    RAISE NOTICE 'Dropped user_profiles_with_email view';
  END IF;

  -- Check if profiles is a view (unlikely but handle it)
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    DROP VIEW public.profiles CASCADE;
    RAISE NOTICE 'Dropped profiles view';
  END IF;
END $$;

-- Step 1: Determine current state and consolidate tables
DO $$
DECLARE
  profiles_exists BOOLEAN;
  user_profiles_exists BOOLEAN;
  profiles_count INT := 0;
  user_profiles_count INT := 0;
BEGIN
  -- Check what exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles' AND table_type = 'BASE TABLE'
  ) INTO profiles_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND table_type = 'BASE TABLE'
  ) INTO user_profiles_exists;

  RAISE NOTICE 'Current state: profiles exists = %, user_profiles exists = %', profiles_exists, user_profiles_exists;

  -- Scenario 1: Only user_profiles exists - rename it
  IF NOT profiles_exists AND user_profiles_exists THEN
    ALTER TABLE public.user_profiles RENAME TO profiles;
    RAISE NOTICE 'Renamed user_profiles to profiles';

  -- Scenario 2: Both exist - merge user_profiles into profiles
  ELSIF profiles_exists AND user_profiles_exists THEN
    SELECT COUNT(*) INTO profiles_count FROM public.profiles;
    SELECT COUNT(*) INTO user_profiles_count FROM public.user_profiles;
    RAISE NOTICE 'Both tables exist: profiles has % rows, user_profiles has % rows', profiles_count, user_profiles_count;

    -- If user_profiles has data and profiles is empty, swap them
    IF user_profiles_count > 0 AND profiles_count = 0 THEN
      DROP TABLE public.profiles;
      ALTER TABLE public.user_profiles RENAME TO profiles;
      RAISE NOTICE 'Dropped empty profiles table and renamed user_profiles to profiles';

    -- If profiles has data and user_profiles is empty, just drop user_profiles
    ELSIF profiles_count > 0 AND user_profiles_count = 0 THEN
      DROP TABLE public.user_profiles CASCADE;
      RAISE NOTICE 'Dropped empty user_profiles table, keeping profiles';

    -- If both have data, we need manual intervention
    ELSIF profiles_count > 0 AND user_profiles_count > 0 THEN
      RAISE EXCEPTION 'Both profiles and user_profiles contain data. Manual merge required. profiles: % rows, user_profiles: % rows', profiles_count, user_profiles_count;

    -- Both empty - keep profiles, drop user_profiles
    ELSE
      DROP TABLE public.user_profiles CASCADE;
      RAISE NOTICE 'Both tables empty - dropped user_profiles, keeping profiles';
    END IF;

  -- Scenario 3: Only profiles exists - nothing to do
  ELSIF profiles_exists AND NOT user_profiles_exists THEN
    RAISE NOTICE 'Only profiles exists - no renaming needed';

  -- Scenario 4: Neither exists - error
  ELSE
    RAISE EXCEPTION 'Neither profiles nor user_profiles exists!';
  END IF;
END $$;

-- Step 2: Add full_name and email columns if they don't exist
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

-- Step 3: Populate email from auth.users
UPDATE public.profiles
SET email = auth.users.email
FROM auth.users
WHERE profiles.id = auth.users.id
  AND profiles.email IS NULL;

-- Step 4: Create a trigger to keep email in sync with auth.users
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS sync_profile_email_trigger ON auth.users;

-- Create trigger on auth.users email changes
CREATE TRIGGER sync_profile_email_trigger
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_email();

-- Step 5: Update foreign key constraints to reference profiles
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  -- Drop any foreign keys that reference user_profiles
  FOR constraint_record IN
    SELECT
      tc.table_name,
      tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'user_profiles'
  LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
      constraint_record.table_name,
      constraint_record.constraint_name);
    RAISE NOTICE 'Dropped constraint % from %',
      constraint_record.constraint_name,
      constraint_record.table_name;
  END LOOP;
END $$;

-- Step 6: Add/update foreign keys to reference profiles
DO $$
BEGIN
  -- Inspections
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'inspections_user_id_fkey' AND table_name = 'inspections'
  ) THEN
    ALTER TABLE public.inspections DROP CONSTRAINT inspections_user_id_fkey;
  END IF;
  ALTER TABLE public.inspections
    ADD CONSTRAINT inspections_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  RAISE NOTICE 'Updated inspections foreign key';

  -- Varroa treatments
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'varroa_treatments_user_id_fkey' AND table_name = 'varroa_treatments'
  ) THEN
    ALTER TABLE public.varroa_treatments DROP CONSTRAINT varroa_treatments_user_id_fkey;
  END IF;
  ALTER TABLE public.varroa_treatments
    ADD CONSTRAINT varroa_treatments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  RAISE NOTICE 'Updated varroa_treatments foreign key';

  -- Varroa checks
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'varroa_checks_user_id_fkey' AND table_name = 'varroa_checks'
  ) THEN
    ALTER TABLE public.varroa_checks DROP CONSTRAINT varroa_checks_user_id_fkey;
  END IF;
  ALTER TABLE public.varroa_checks
    ADD CONSTRAINT varroa_checks_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  RAISE NOTICE 'Updated varroa_checks foreign key';

  -- Feedings
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'feedings_user_id_fkey' AND table_name = 'feedings'
  ) THEN
    ALTER TABLE public.feedings DROP CONSTRAINT feedings_user_id_fkey;
  END IF;
  ALTER TABLE public.feedings
    ADD CONSTRAINT feedings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  RAISE NOTICE 'Updated feedings foreign key';

  -- Harvests
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'harvests_user_id_fkey' AND table_name = 'harvests'
  ) THEN
    ALTER TABLE public.harvests DROP CONSTRAINT harvests_user_id_fkey;
  END IF;
  ALTER TABLE public.harvests
    ADD CONSTRAINT harvests_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  RAISE NOTICE 'Updated harvests foreign key';
END $$;

-- Step 7: Create or replace view for backward compatibility
CREATE OR REPLACE VIEW public.user_profiles_with_email AS
SELECT
  p.*,
  p.full_name as display_name
FROM public.profiles p;

-- Step 8: Grant permissions
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_profiles_with_email TO authenticated;

-- Step 9: Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Summary
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'CONSOLIDATION COMPLETE!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '1. Consolidated to single profiles table';
  RAISE NOTICE '2. Added full_name computed column';
  RAISE NOTICE '3. Added email column synced with auth.users';
  RAISE NOTICE '4. Created email sync trigger';
  RAISE NOTICE '5. Updated all foreign keys to reference profiles';
  RAISE NOTICE '6. Created user_profiles_with_email view for compatibility';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Final table structure:';
  RAISE NOTICE '  - id: UUID (PK)';
  RAISE NOTICE '  - first_name: TEXT';
  RAISE NOTICE '  - last_name: TEXT';
  RAISE NOTICE '  - full_name: TEXT (computed)';
  RAISE NOTICE '  - email: TEXT (synced from auth.users)';
  RAISE NOTICE '  - role: TEXT';
  RAISE NOTICE '  - mobile_number: TEXT';
  RAISE NOTICE '  - created_at: TIMESTAMP';
  RAISE NOTICE '  - updated_at: TIMESTAMP';
  RAISE NOTICE '============================================';
END $$;
