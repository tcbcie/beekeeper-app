-- VERIFICATION QUERIES
-- Run these to check the current state before and after the fix

-- 1. Check if profiles table has is_active column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check current toggle_user_account function definition
SELECT
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'toggle_user_account';

-- 3. Check all users and their is_active status
SELECT
  id,
  email,
  role,
  is_active,
  created_at
FROM public.profiles
ORDER BY created_at DESC;

-- 4. Test if function exists and can be called (this will fail if you're not admin)
-- SELECT public.toggle_user_account('00000000-0000-0000-0000-000000000000'::uuid, true);
