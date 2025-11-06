-- Fix all database references from user_profiles to profiles
-- This script updates foreign keys, views, and removes the old user_profiles table

-- Step 1: Find and update any foreign keys pointing to user_profiles
DO $$
DECLARE
    fk_record RECORD;
    drop_sql TEXT;
    add_sql TEXT;
BEGIN
    -- Loop through all foreign keys that reference user_profiles
    FOR fk_record IN
        SELECT
            tc.table_name,
            tc.constraint_name,
            kcu.column_name,
            ccu.column_name AS referenced_column
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'user_profiles'
          AND tc.table_schema = 'public'
    LOOP
        -- Drop the old foreign key
        drop_sql := format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I',
                          fk_record.table_name,
                          fk_record.constraint_name);
        EXECUTE drop_sql;
        RAISE NOTICE 'Dropped FK: % from table %', fk_record.constraint_name, fk_record.table_name;

        -- Add new foreign key pointing to profiles instead
        add_sql := format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.profiles(%I) ON DELETE CASCADE',
                         fk_record.table_name,
                         fk_record.constraint_name,
                         fk_record.column_name,
                         fk_record.referenced_column);
        EXECUTE add_sql;
        RAISE NOTICE 'Added FK: % to table % pointing to profiles', fk_record.constraint_name, fk_record.table_name;
    END LOOP;
END $$;

-- Step 2: Drop views that reference user_profiles (they'll need to be recreated manually if needed)
DO $$
DECLARE
    view_record RECORD;
BEGIN
    FOR view_record IN
        SELECT viewname
        FROM pg_views
        WHERE definition LIKE '%user_profiles%'
          AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', view_record.viewname);
        RAISE NOTICE 'Dropped view: %', view_record.viewname;
    END LOOP;
END $$;

-- Step 3: Drop the user_profiles table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_profiles'
    ) THEN
        DROP TABLE public.user_profiles CASCADE;
        RAISE NOTICE 'Dropped user_profiles table';
    ELSE
        RAISE NOTICE 'user_profiles table does not exist';
    END IF;
END $$;

-- Step 4: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Summary
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'MIGRATION COMPLETE!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Updated all foreign keys to reference profiles table';
    RAISE NOTICE 'Dropped views referencing user_profiles';
    RAISE NOTICE 'Dropped user_profiles table';
    RAISE NOTICE 'Schema cache reloaded';
    RAISE NOTICE '============================================';
END $$;
