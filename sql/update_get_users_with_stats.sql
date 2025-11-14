-- ============================================================================
-- UPDATE GET_USERS_WITH_EMAIL FUNCTION TO INCLUDE USER STATS
-- ============================================================================
-- Adds apiary count, hive count, and last sign-in time to user management
-- ============================================================================

-- Drop existing function first (required when changing return type)
DROP FUNCTION IF EXISTS public.get_users_with_email();

CREATE OR REPLACE FUNCTION public.get_users_with_email()
RETURNS TABLE (
  id UUID,
  role TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  mobile_number TEXT,
  is_active BOOLEAN,
  registration_code TEXT,
  code_description TEXT,
  subscription_type TEXT,
  subscription_expires_at TIMESTAMPTZ,
  subscription_status TEXT,
  days_remaining INTEGER,
  latest_transaction_id TEXT,
  apiaries_count BIGINT,
  hives_count BIGINT,
  last_sign_in_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.id,
    up.role,
    up.created_at,
    up.updated_at,
    au.email,
    up.first_name,
    up.last_name,
    up.mobile_number,
    up.is_active,
    up.registration_code,
    rc.description AS code_description,
    up.subscription_type,
    up.subscription_expires_at,
    CASE
      WHEN up.subscription_expires_at IS NULL THEN 'no_subscription'
      WHEN up.subscription_expires_at < NOW() THEN 'expired'
      WHEN up.subscription_expires_at < NOW() + INTERVAL '3 days' THEN 'expiring_very_soon'
      WHEN up.subscription_expires_at < NOW() + INTERVAL '7 days' THEN 'expiring_soon'
      ELSE 'active'
    END AS subscription_status,
    CASE
      WHEN up.subscription_expires_at IS NOT NULL THEN
        EXTRACT(DAY FROM (up.subscription_expires_at - NOW()))::INTEGER
      ELSE NULL
    END AS days_remaining,
    up.latest_transaction_id,
    -- Count of apiaries for this user
    (SELECT COUNT(*) FROM apiaries WHERE user_id = up.id)::BIGINT AS apiaries_count,
    -- Count of hives for this user
    (SELECT COUNT(*) FROM hives WHERE user_id = up.id)::BIGINT AS hives_count,
    -- Last sign-in from auth.users
    au.last_sign_in_at
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.id = au.id
  LEFT JOIN registration_codes rc ON up.registration_code = rc.code
  WHERE up.deleted_at IS NULL
  ORDER BY up.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users (admin check happens in RLS)
GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated;

-- Verify the update
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_users_with_email';

-- Summary
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Updated get_users_with_email Function!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'New fields added:';
  RAISE NOTICE '  - apiaries_count: Number of apiaries per user';
  RAISE NOTICE '  - hives_count: Number of hives per user';
  RAISE NOTICE '  - last_sign_in_at: Last login timestamp';
  RAISE NOTICE '========================================';
END $$;
