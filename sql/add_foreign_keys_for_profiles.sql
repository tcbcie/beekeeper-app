-- Add foreign key relationships to profiles table for automatic joins
-- This allows Supabase PostgREST to automatically join with profiles table

-- Add foreign key for inspections.user_id -> profiles.id
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
END $$;

-- Add foreign key for varroa_treatments.user_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'varroa_treatments_user_id_fkey'
    AND table_name = 'varroa_treatments'
  ) THEN
    ALTER TABLE public.varroa_treatments
    ADD CONSTRAINT varroa_treatments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key for varroa_checks.user_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'varroa_checks_user_id_fkey'
    AND table_name = 'varroa_checks'
  ) THEN
    ALTER TABLE public.varroa_checks
    ADD CONSTRAINT varroa_checks_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key for feedings.user_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'feedings_user_id_fkey'
    AND table_name = 'feedings'
  ) THEN
    ALTER TABLE public.feedings
    ADD CONSTRAINT feedings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key for harvests.user_id -> profiles.id
DO $$
BEGIN
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

-- Reload the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
