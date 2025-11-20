-- ============================================================================
-- REACTIVATE ALL ACCOUNTS
-- ============================================================================
-- This script reactivates all user accounts by setting is_active = true
-- Use this if accounts were incorrectly marked as inactive
-- ============================================================================

-- Update all profiles to be active
UPDATE public.profiles
SET
  is_active = true,
  disabled_at = NULL
WHERE is_active = false;

-- Show results
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ ACCOUNTS REACTIVATED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Updated % account(s)', updated_count;
  RAISE NOTICE '';
  RAISE NOTICE 'All accounts are now active and users can log in.';
  RAISE NOTICE '============================================';
END $$;

-- Verify - show all account statuses
SELECT
  u.email,
  p.first_name,
  p.last_name,
  p.is_active,
  p.disabled_at,
  p.created_at
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
ORDER BY p.created_at DESC
LIMIT 10;
