-- ============================================================================
-- TEMPORARILY DISABLE RLS ON PROFILES
-- ============================================================================
-- This will let you back into the dashboard
-- We'll re-enable it with proper policies after
-- ============================================================================

-- Disable RLS on profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '⚠️  RLS TEMPORARILY DISABLED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'The profiles table now has NO row level security';
  RAISE NOTICE '';
  RAISE NOTICE 'This is TEMPORARY to restore your access';
  RAISE NOTICE '';
  RAISE NOTICE 'What to do next:';
  RAISE NOTICE '  1. Refresh the dashboard - you should have access now';
  RAISE NOTICE '  2. Go to user management and verify it works';
  RAISE NOTICE '  3. Let me know and I will re-enable RLS properly';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  DO NOT use this in production for long!';
  RAISE NOTICE '============================================';
END $$;
