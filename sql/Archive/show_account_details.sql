-- ============================================================================
-- SHOW ACCOUNT DETAILS
-- ============================================================================
-- Show detailed information about the account
-- ============================================================================

-- Show the active account details
SELECT
  id,
  email,
  role,
  is_active,
  subscription_expires_at,
  created_at
FROM public.profiles
WHERE is_active = true;

-- Show ALL accounts (to see if there are multiple)
SELECT
  id,
  email,
  role,
  is_active,
  created_at
FROM public.profiles
ORDER BY created_at;
