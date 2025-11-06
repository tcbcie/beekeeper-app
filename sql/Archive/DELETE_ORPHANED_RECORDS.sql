-- Delete orphaned records that reference non-existent user_ids
-- USE WITH CAUTION: This will permanently delete records

DO $$
DECLARE
    table_rec RECORD;
    deleted_count INTEGER;
    total_deleted INTEGER := 0;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'DELETING ORPHANED RECORDS';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'WARNING: This will permanently delete records';
    RAISE NOTICE '';

    -- Loop through all activity tables
    FOR table_rec IN
        SELECT unnest(ARRAY['inspections', 'varroa_checks', 'varroa_treatments', 'feedings', 'harvests']) AS table_name
    LOOP
        RAISE NOTICE 'Processing table: %', table_rec.table_name;

        -- Delete orphaned records and get count
        EXECUTE format(
            'DELETE FROM public.%I WHERE user_id NOT IN (SELECT id FROM public.profiles)',
            table_rec.table_name
        );

        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        total_deleted := total_deleted + deleted_count;

        IF deleted_count > 0 THEN
            RAISE NOTICE '  ✓ Deleted % orphaned records', deleted_count;
        ELSE
            RAISE NOTICE '  • No orphaned records to delete';
        END IF;

    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'COMPLETE!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Total records deleted: %', total_deleted;
    RAISE NOTICE 'You can now run FIX_ALL_USER_ID_FKS.sql';
    RAISE NOTICE '============================================';
END $$;
