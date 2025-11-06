-- Check if 'profiles' is a table or a view
-- This will help us understand if profiles is actually a view pointing to user_profiles

-- 1. Check what type of object 'profiles' is
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'profiles';

-- 2. If it's a view, show its definition
SELECT
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname = 'profiles';

-- 3. Show the actual table structure
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;
