-- Find and clean up orphaned records before adding foreign key constraints
-- These are records with user_ids that don't exist in the profiles table

DO $$
DECLARE
    table_rec RECORD;
    orphaned_count INTEGER;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'FINDING ORPHANED RECORDS';
    RAISE NOTICE '============================================';

    -- Loop through all activity tables
    FOR table_rec IN
        SELECT unnest(ARRAY['inspections', 'varroa_checks', 'varroa_treatments', 'feedings', 'harvests']) AS table_name
    LOOP
        RAISE NOTICE '';
        RAISE NOTICE 'Checking table: %', table_rec.table_name;

        -- Count orphaned records
        EXECUTE format(
            'SELECT COUNT(*) FROM public.%I WHERE user_id NOT IN (SELECT id FROM public.profiles)',
            table_rec.table_name
        ) INTO orphaned_count;

        IF orphaned_count > 0 THEN
            RAISE NOTICE '  ⚠ Found % orphaned records', orphaned_count;

            -- Show the orphaned user_ids
            RAISE NOTICE '  Orphaned user_ids:';
            FOR table_rec IN
                EXECUTE format(
                    'SELECT DISTINCT user_id FROM public.%I WHERE user_id NOT IN (SELECT id FROM public.profiles)',
                    table_rec.table_name
                )
            LOOP
                RAISE NOTICE '    - %', table_rec.user_id;
            END LOOP;
        ELSE
            RAISE NOTICE '  ✓ No orphaned records found';
        END IF;

    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'SUMMARY';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Run the next script to decide what to do:';
    RAISE NOTICE '  - Option 1: Delete orphaned records';
    RAISE NOTICE '  - Option 2: Create missing profiles';
    RAISE NOTICE '============================================';
END $$;
