-- ============================================================================
-- SYNC AND ENABLE ALL USERS
-- ============================================================================
-- This script will:
-- 1. Create profile records for any auth users missing them
-- 2. Set is_active = true for all profiles
-- ============================================================================

-- Create profiles for any auth.users that don't have a profile record
INSERT INTO public.profiles (id, email, role, is_active)
SELECT
  au.id,
  au.email,
  'Admin' as role,  -- Default to Admin for missing profiles
  true as is_active
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
);

-- Now ensure ALL existing profiles are active
UPDATE public.profiles
SET is_active = true
WHERE is_active IS NULL OR is_active = false;

-- Show results
SELECT
  'Created profiles for auth users' as action,
  COUNT(*) as count
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
);

-- Show all profiles now
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
  v_total INTEGER;
  v_active INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.profiles;
  SELECT COUNT(*) INTO v_active FROM public.profiles WHERE is_active = true;

  RAISE NOTICE '✅ Profile sync complete';
  RAISE NOTICE '✅ Total profiles: %', v_total;
  RAISE NOTICE '✅ Active profiles: %', v_active;
END $$;
