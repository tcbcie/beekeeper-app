-- Find all database objects that reference user_profiles table
-- Run this to identify what needs to be updated
-- Run each query separately in the SQL editor

-- ========================================
-- 1. Check for foreign keys referencing user_profiles
-- ========================================
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'user_profiles'
  AND tc.table_schema = 'public';

-- ========================================
-- 2. Check for views that reference user_profiles
-- ========================================
SELECT
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE definition LIKE '%user_profiles%'
  AND schemaname = 'public';

-- ========================================
-- 3. Check if user_profiles table exists
-- ========================================
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
) AS user_profiles_exists;
