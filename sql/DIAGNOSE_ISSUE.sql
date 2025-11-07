-- DIAGNOSTIC SCRIPT - Run this to identify the issue
-- Copy all of this into Supabase SQL Editor and run it

-- 1. Check if profiles table has is_active column
SELECT 'Step 1: Checking profiles table structure' as step;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if toggle_user_account function exists
SELECT 'Step 2: Checking if toggle_user_account function exists' as step;
SELECT
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'toggle_user_account';

-- 3. Check the actual function body (look for 'updated_at')
SELECT 'Step 3: Checking function definition (look for updated_at)' as step;
SELECT pg_get_functiondef(p.oid) as function_code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'toggle_user_account';

-- 4. Check profiles table data
SELECT 'Step 4: Current user profiles data' as step;
SELECT
  id,
  email,
  role,
  is_active,
  created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 5;

-- 5. Check if there are any views or materialized views using profiles
SELECT 'Step 5: Checking for views that might be caching data' as step;
SELECT schemaname, viewname, definition
FROM pg_views
WHERE schemaname = 'public'
  AND definition ILIKE '%profiles%';
