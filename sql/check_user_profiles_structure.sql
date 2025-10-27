-- Check user_profiles table structure and data
-- This helps diagnose why existing users aren't being recognized

-- Step 1: Show table structure
SELECT 'user_profiles table structure:' as step;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Show all users in user_profiles
SELECT 'All users in user_profiles:' as step;
SELECT id, user_id, email, first_name, last_name, role
FROM public.user_profiles
ORDER BY created_at DESC;

-- Step 3: Show all users in auth.users
SELECT 'All users in auth.users:' as step;
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at DESC;

-- Step 4: Compare - find users in auth but not in user_profiles
SELECT 'Users in auth.users but NOT in user_profiles:' as step;
SELECT au.id, au.email, au.created_at
FROM auth.users au
LEFT JOIN public.user_profiles up ON up.user_id = au.id
WHERE up.id IS NULL;

-- Step 5: Show current user info
SELECT 'Current authenticated user:' as step;
SELECT auth.uid() as user_id,
       (SELECT email FROM auth.users WHERE id = auth.uid()) as email;

SELECT 'DIAGNOSTIC COMPLETE' as final_message;
