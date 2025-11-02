-- Fix foreign key on varroa_treatments.user_id to point to profiles.id
-- This is needed for PostgREST to perform the join

-- First, drop any existing foreign key constraint on user_id (if it exists and points to wrong table)
DO $$
DECLARE
    fk_name TEXT;
BEGIN
    -- Find any existing FK constraint on varroa_treatments.user_id
    SELECT tc.constraint_name INTO fk_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'varroa_treatments'
      AND kcu.column_name = 'user_id'
      AND tc.table_schema = 'public';

    -- Drop it if it exists
    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.varroa_treatments DROP CONSTRAINT %I', fk_name);
        RAISE NOTICE 'Dropped existing FK constraint: %', fk_name;
    ELSE
        RAISE NOTICE 'No existing FK constraint found on user_id';
    END IF;
END $$;

-- Add the correct foreign key constraint to profiles.id
ALTER TABLE public.varroa_treatments
ADD CONSTRAINT varroa_treatments_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Verify the constraint was added
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'varroa_treatments'
  AND kcu.column_name = 'user_id';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Summary
SELECT 'Foreign key constraint added: varroa_treatments.user_id -> profiles.id' AS status;
