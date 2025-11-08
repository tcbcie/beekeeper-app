-- Check if get_users_with_email function exists and what it returns

-- 1. Check if function exists
SELECT 'Checking if get_users_with_email function exists:' as step;
SELECT
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_users_with_email';

-- 2. Try to call the function to see what it returns
SELECT 'Testing get_users_with_email function call:' as step;
-- Note: This will only work if you're running as admin
-- SELECT * FROM get_users_with_email();

-- 3. Check profiles table to see actual data
SELECT 'Current profiles table data:' as step;
SELECT
  id,
  email,
  role,
  is_active,
  created_at
FROM public.profiles
ORDER BY created_at DESC;
