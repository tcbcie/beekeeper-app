-- Check foreign keys on user_id columns for all activity tables
-- These all need to reference profiles.id for PostgREST joins to work

-- Check inspections.user_id
SELECT
    'inspections' AS table_name,
    EXISTS (
        SELECT 1
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'inspections'
          AND kcu.column_name = 'user_id'
          AND ccu.table_name = 'profiles'
    ) AS has_fk_to_profiles;

-- Check varroa_checks.user_id
SELECT
    'varroa_checks' AS table_name,
    EXISTS (
        SELECT 1
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'varroa_checks'
          AND kcu.column_name = 'user_id'
          AND ccu.table_name = 'profiles'
    ) AS has_fk_to_profiles;

-- Check varroa_treatments.user_id
SELECT
    'varroa_treatments' AS table_name,
    EXISTS (
        SELECT 1
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'varroa_treatments'
          AND kcu.column_name = 'user_id'
          AND ccu.table_name = 'profiles'
    ) AS has_fk_to_profiles;

-- Check feedings.user_id
SELECT
    'feedings' AS table_name,
    EXISTS (
        SELECT 1
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'feedings'
          AND kcu.column_name = 'user_id'
          AND ccu.table_name = 'profiles'
    ) AS has_fk_to_profiles;

-- Check harvests.user_id
SELECT
    'harvests' AS table_name,
    EXISTS (
        SELECT 1
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'harvests'
          AND kcu.column_name = 'user_id'
          AND ccu.table_name = 'profiles'
    ) AS has_fk_to_profiles;
