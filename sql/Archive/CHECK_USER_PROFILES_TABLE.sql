-- Simple check to see if user_profiles table exists and what's in it

-- 1. Does the table exist?
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_profiles', 'profiles')
ORDER BY table_name;

-- 2. If user_profiles exists, what columns does it have?
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 3. Check for any constraints on user_profiles
SELECT
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'user_profiles';
