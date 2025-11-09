-- ============================================================================
-- COMPREHENSIVE DATABASE INVESTIGATION
-- ============================================================================
-- Check all critical tables and their row counts
-- ============================================================================

-- 1. Check auth.users (should have users from Supabase auth)
SELECT
  '=== AUTH.USERS ===' as info,
  COUNT(*) as total_users
FROM auth.users;

SELECT
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at
LIMIT 10;

-- 2. Check public.profiles
SELECT
  '=== PUBLIC.PROFILES ===' as info,
  COUNT(*) as total_profiles
FROM public.profiles;

SELECT
  id,
  email,
  role,
  is_active,
  subscription_expires_at,
  created_at
FROM public.profiles
ORDER BY created_at
LIMIT 10;

-- 3. Check hives table
SELECT
  '=== HIVES ===' as info,
  COUNT(*) as total_hives
FROM public.hives;

SELECT *
FROM public.hives
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check apiaries table
SELECT
  '=== APIARIES ===' as info,
  COUNT(*) as total_apiaries
FROM public.apiaries;

SELECT *
FROM public.apiaries
ORDER BY created_at DESC
LIMIT 5;

-- 5. Check beekeeping_associations table
SELECT
  '=== BEEKEEPING ASSOCIATIONS ===' as info,
  COUNT(*) as total_associations
FROM public.beekeeping_associations;

SELECT
  id,
  name,
  jurisdiction,
  county_area,
  created_at
FROM public.beekeeping_associations
ORDER BY name
LIMIT 10;

-- 6. Check subscription_history
SELECT
  '=== SUBSCRIPTION HISTORY ===' as info,
  COUNT(*) as total_history_records
FROM public.subscription_history;

SELECT
  user_id,
  subscription_type,
  activated_at,
  expires_at
FROM public.subscription_history
ORDER BY activated_at DESC
LIMIT 5;

-- 7. Check registration_codes
SELECT
  '=== REGISTRATION CODES ===' as info,
  COUNT(*) as total_codes
FROM public.registration_codes;

SELECT *
FROM public.registration_codes
ORDER BY created_at DESC
LIMIT 5;

-- 8. Check varroa_treatments
SELECT
  '=== VARROA TREATMENTS ===' as info,
  COUNT(*) as total_treatments
FROM public.varroa_treatments;

-- 9. Summary of all tables
SELECT
  '=== SUMMARY ===' as info;

DO $$
DECLARE
  v_auth_users INTEGER;
  v_profiles INTEGER;
  v_hives INTEGER;
  v_apiaries INTEGER;
  v_associations INTEGER;
  v_history INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_auth_users FROM auth.users;
  SELECT COUNT(*) INTO v_profiles FROM public.profiles;
  SELECT COUNT(*) INTO v_hives FROM public.hives;
  SELECT COUNT(*) INTO v_apiaries FROM public.apiaries;
  SELECT COUNT(*) INTO v_associations FROM public.beekeeping_associations;
  SELECT COUNT(*) INTO v_history FROM public.subscription_history;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'DATABASE STATE INVESTIGATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'auth.users: %', v_auth_users;
  RAISE NOTICE 'public.profiles: %', v_profiles;
  RAISE NOTICE 'public.hives: %', v_hives;
  RAISE NOTICE 'public.apiaries: %', v_apiaries;
  RAISE NOTICE 'public.beekeeping_associations: %', v_associations;
  RAISE NOTICE 'public.subscription_history: %', v_history;
  RAISE NOTICE '========================================';

  IF v_auth_users = 0 THEN
    RAISE NOTICE '⚠️  WARNING: auth.users is EMPTY!';
  END IF;

  IF v_profiles = 0 THEN
    RAISE NOTICE '⚠️  WARNING: profiles is EMPTY!';
  END IF;

  IF v_hives = 0 AND v_apiaries = 0 THEN
    RAISE NOTICE 'ℹ️  No hives or apiaries (might be normal for new users)';
  END IF;

  IF v_associations = 0 THEN
    RAISE NOTICE '⚠️  WARNING: beekeeping_associations is EMPTY!';
  END IF;

  RAISE NOTICE '========================================';
END $$;
