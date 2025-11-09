-- ============================================================================
-- CHECK ACCOUNT STATUS
-- ============================================================================
-- Check the is_active status for all accounts
-- ============================================================================

-- Show all accounts with their is_active status
SELECT
  id,
  email,
  role,
  is_active,
  pg_typeof(is_active) as is_active_type,
  CASE
    WHEN is_active IS NULL THEN 'NULL'
    WHEN is_active = true THEN 'TRUE'
    WHEN is_active = false THEN 'FALSE'
    ELSE 'OTHER: ' || is_active::text
  END as is_active_status,
  created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 10;

-- Count by status
SELECT
  CASE
    WHEN is_active IS NULL THEN 'NULL'
    WHEN is_active = true THEN 'TRUE'
    WHEN is_active = false THEN 'FALSE'
    ELSE 'OTHER'
  END as status,
  COUNT(*) as count
FROM public.profiles
GROUP BY
  CASE
    WHEN is_active IS NULL THEN 'NULL'
    WHEN is_active = true THEN 'TRUE'
    WHEN is_active = false THEN 'FALSE'
    ELSE 'OTHER'
  END;
