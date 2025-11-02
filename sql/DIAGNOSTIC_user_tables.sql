-- Check all user-related tables and their structure

-- Check what user tables exist
SELECT
  'User tables in database' as info,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%profile%'
    OR table_name LIKE '%user%'
  )
ORDER BY table_name;

-- Check profiles table structure
SELECT 'profiles table structure' as info, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check user_profiles table structure
SELECT 'user_profiles table structure' as info, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Check user_profiles_with_email if it exists
SELECT 'user_profiles_with_email structure' as info, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_profiles_with_email'
ORDER BY ordinal_position;

-- Check if user_profiles_with_email is a view
SELECT
  'Is user_profiles_with_email a view?' as info,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'user_profiles_with_email';

-- Count records in each table
SELECT 'Record counts' as info;
SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles;
SELECT 'user_profiles' as table_name, COUNT(*) as count FROM user_profiles;
SELECT 'user_profiles_with_email' as table_name, COUNT(*) as count FROM user_profiles_with_email;

-- Check auth.users table (Supabase built-in)
SELECT
  'auth.users columns' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'auth' AND table_name = 'users'
ORDER BY ordinal_position;
