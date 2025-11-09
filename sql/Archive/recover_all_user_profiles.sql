-- ============================================================================
-- RECOVER ALL USER PROFILES FROM AUTH.USERS
-- ============================================================================
-- This script recreates all user profiles from the auth.users table
-- Setting all users as active with User role (you can manually promote to Admin after)
-- ============================================================================

-- First, show what we're about to recover
SELECT
  '=== USERS TO RECOVER ===' as info,
  COUNT(*) as total_auth_users
FROM auth.users;

SELECT
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
ORDER BY created_at;

-- Now create profiles for all auth users
INSERT INTO public.profiles (
  id,
  email,
  role,
  is_active,
  created_at
)
SELECT
  au.id,
  au.email,
  'User' as role,  -- Default to User role
  true as is_active,
  au.created_at
FROM auth.users au
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  is_active = true;  -- Ensure all are active

-- Show recovery results
SELECT
  '=== RECOVERY COMPLETE ===' as info,
  COUNT(*) as total_profiles_created
FROM public.profiles;

-- Show all recovered profiles
SELECT
  id,
  email,
  role,
  is_active,
  created_at
FROM public.profiles
ORDER BY created_at;

-- Success message
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.profiles;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ USER PROFILE RECOVERY COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Total profiles recovered: %', v_count;
  RAISE NOTICE '✅ All accounts set to active';
  RAISE NOTICE '✅ All accounts set to "User" role';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ℹ️  NEXT STEPS:';
  RAISE NOTICE '1. Go to Settings > User Management';
  RAISE NOTICE '2. Promote your account to Admin role';
  RAISE NOTICE '3. Check other users and adjust roles as needed';
  RAISE NOTICE '========================================';
END $$;
