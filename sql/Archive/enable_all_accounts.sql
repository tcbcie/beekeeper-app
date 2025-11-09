-- ============================================================================
-- ENABLE ALL USER ACCOUNTS
-- ============================================================================
-- Set is_active = true for all user accounts
-- ============================================================================

-- Update all profiles to be active
UPDATE public.profiles
SET is_active = true
WHERE is_active IS NULL OR is_active = false;

-- Show results
SELECT
  COUNT(*) FILTER (WHERE is_active = true) as active_accounts,
  COUNT(*) FILTER (WHERE is_active = false) as disabled_accounts,
  COUNT(*) FILTER (WHERE is_active IS NULL) as null_accounts,
  COUNT(*) as total_accounts
FROM public.profiles;

-- Success message
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.profiles
  WHERE is_active = true;

  RAISE NOTICE '✅ All user accounts enabled';
  RAISE NOTICE '✅ Total active accounts: %', v_count;
END $$;
