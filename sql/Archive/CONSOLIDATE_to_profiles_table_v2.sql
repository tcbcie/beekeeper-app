-- CONSOLIDATE USER TABLES TO STANDARD PROFILES TABLE (ROBUST VERSION)
-- This follows Supabase conventions and consolidates user_profiles into profiles

-- Step 0: Drop any existing views that might conflict
DROP VIEW IF EXISTS public.profiles CASCADE;
DROP VIEW IF EXISTS public.user_profiles_with_email CASCADE;

-- Step 1: Check if profiles table already exists as a table (not view)
DO $$
BEGIN
  -- If profiles table doesn't exist as a real table, rename user_profiles to profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND table_type = 'BASE TABLE'
  ) THEN
    -- Rename user_profiles to profiles
    ALTER TABLE public.user_profiles RENAME TO profiles;
    RAISE NOTICE 'Renamed user_profiles to profiles';
  ELSE
    RAISE NOTICE 'profiles table already exists as a base table';
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
  END IF;

  -- Add email column if it doesn't exist (will be populated from auth.users)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
    RAISE NOTICE 'Added email column';
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

-- Step 5: Drop old foreign key constraints and recreate with correct table name
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  -- Find all foreign keys that reference user_profiles
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
    -- Drop the old constraint
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
      constraint_record.table_name,
      constraint_record.constraint_name);
    RAISE NOTICE 'Dropped constraint % from %',
      constraint_record.constraint_name,
      constraint_record.table_name;
  END LOOP;
END $$;

-- Step 6: Add new foreign keys referencing profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'inspections_user_id_fkey'
    AND table_name = 'inspections'
  ) THEN
    ALTER TABLE public.inspections
    ADD CONSTRAINT inspections_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'varroa_treatments_user_id_fkey'
    AND table_name = 'varroa_treatments'
  ) THEN
    ALTER TABLE public.varroa_treatments
    ADD CONSTRAINT varroa_treatments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'varroa_checks_user_id_fkey'
    AND table_name = 'varroa_checks'
  ) THEN
    ALTER TABLE public.varroa_checks
    ADD CONSTRAINT varroa_checks_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'feedings_user_id_fkey'
    AND table_name = 'feedings'
  ) THEN
    ALTER TABLE public.feedings
    ADD CONSTRAINT feedings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'harvests_user_id_fkey'
    AND table_name = 'harvests'
  ) THEN
    ALTER TABLE public.harvests
    ADD CONSTRAINT harvests_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
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
  RAISE NOTICE '1. Dropped any conflicting views';
  RAISE NOTICE '2. Renamed user_profiles to profiles (if needed)';
  RAISE NOTICE '3. Added full_name computed column';
  RAISE NOTICE '4. Added email column synced with auth.users';
  RAISE NOTICE '5. Created email sync trigger';
  RAISE NOTICE '6. Updated all foreign keys to reference profiles';
  RAISE NOTICE '7. Created user_profiles_with_email view for compatibility';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Table structure:';
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
