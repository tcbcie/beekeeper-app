-- Fix foreign key constraints on all activity tables to reference profiles.id
-- This is needed for PostgREST to perform joins and display "Recorded by" information

-- Helper function to drop and recreate FK constraint
DO $$
DECLARE
    fk_name TEXT;
    table_rec RECORD;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'FIXING FOREIGN KEY CONSTRAINTS';
    RAISE NOTICE '============================================';

    -- Loop through all activity tables
    FOR table_rec IN
        SELECT unnest(ARRAY['inspections', 'varroa_checks', 'varroa_treatments', 'feedings', 'harvests']) AS table_name
    LOOP
        RAISE NOTICE '';
        RAISE NOTICE 'Processing table: %', table_rec.table_name;

        -- Find any existing FK constraint on user_id
        SELECT tc.constraint_name INTO fk_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = table_rec.table_name
          AND kcu.column_name = 'user_id'
          AND tc.table_schema = 'public';

        -- Drop existing FK if it exists
        IF fk_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', table_rec.table_name, fk_name);
            RAISE NOTICE '  ✓ Dropped existing FK constraint: %', fk_name;
        ELSE
            RAISE NOTICE '  • No existing FK constraint found';
        END IF;

        -- Add the correct foreign key constraint to profiles.id
        EXECUTE format(
            'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE',
            table_rec.table_name,
            table_rec.table_name || '_user_id_fkey'
        );
        RAISE NOTICE '  ✓ Added FK constraint: %_user_id_fkey -> profiles.id', table_rec.table_name;

    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'VERIFYING CONSTRAINTS';
    RAISE NOTICE '============================================';
END $$;

-- Verify all constraints were added correctly
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'user_id'
  AND tc.table_name IN ('inspections', 'varroa_checks', 'varroa_treatments', 'feedings', 'harvests')
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Reload schema cache so PostgREST picks up the changes
NOTIFY pgrst, 'reload schema';

-- Summary
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'COMPLETE!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'All activity tables now have FK constraints:';
    RAISE NOTICE '  - inspections.user_id -> profiles.id';
    RAISE NOTICE '  - varroa_checks.user_id -> profiles.id';
    RAISE NOTICE '  - varroa_treatments.user_id -> profiles.id';
    RAISE NOTICE '  - feedings.user_id -> profiles.id';
    RAISE NOTICE '  - harvests.user_id -> profiles.id';
    RAISE NOTICE '';
    RAISE NOTICE 'PostgREST schema cache reloaded';
    RAISE NOTICE '============================================';
END $$;
