-- ============================================================================
-- CHECK YOUR ACCOUNT STATUS
-- ============================================================================
-- Run this as postgres/service role to see your account details
-- ============================================================================

-- Check your account (run this in SQL editor which uses service role)
SELECT
  id,
  email,
  role,
  is_active,
  deleted_at,
  created_at
FROM public.profiles
WHERE email LIKE '%rico%' OR email LIKE '%zmarzly%'
ORDER BY created_at DESC;

-- If that doesn't work, show all profiles
SELECT
  id,
  email,
  role,
  is_active,
  deleted_at
FROM public.profiles
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;
