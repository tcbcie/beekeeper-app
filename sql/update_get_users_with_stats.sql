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
  deleted_at TIMESTAMPTZ,
  latest_transaction_id TEXT,
  apiaries_count BIGINT,
  hives_count BIGINT,
  last_sign_in_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.role,
    p.created_at,
    p.created_at AS updated_at,
    au.email,
    p.first_name,
    p.last_name,
    p.mobile_number,
    p.is_active,
    rc.code AS registration_code,
    rc.description AS code_description,
    p.subscription_type,
    p.subscription_expires_at,
    CASE
      WHEN p.subscription_expires_at IS NULL THEN 'no_subscription'::TEXT
      WHEN p.subscription_expires_at < NOW() THEN 'expired'::TEXT
      WHEN p.subscription_expires_at < NOW() + INTERVAL '7 days' THEN 'expiring_very_soon'::TEXT
      WHEN p.subscription_expires_at < NOW() + INTERVAL '30 days' THEN 'expiring_soon'::TEXT
      ELSE 'active'::TEXT
    END AS subscription_status,
    CASE
      WHEN p.subscription_expires_at IS NULL THEN NULL
      ELSE EXTRACT(DAY FROM (p.subscription_expires_at - NOW()))::INTEGER
    END AS days_remaining,
    p.deleted_at,
    sh.stripe_payment_intent_id AS latest_transaction_id,
    -- Count of apiaries for this user
    (SELECT COUNT(*)::BIGINT FROM apiaries WHERE user_id = p.id) AS apiaries_count,
    -- Count of hives for this user
    (SELECT COUNT(*)::BIGINT FROM hives WHERE user_id = p.id) AS hives_count,
    -- Last sign-in from auth.users
    au.last_sign_in_at
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  LEFT JOIN public.registration_codes rc ON p.current_subscription_code_id = rc.id
  LEFT JOIN LATERAL (
    SELECT stripe_payment_intent_id
    FROM public.subscription_history
    WHERE user_id = p.id
      AND subscription_type = 'credit_card'
      AND stripe_payment_intent_id IS NOT NULL
    ORDER BY activated_at DESC
    LIMIT 1
  ) sh ON TRUE
  WHERE p.deleted_at IS NULL
  ORDER BY p.created_at DESC;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO anon;
GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO service_role;

-- Set owner
ALTER FUNCTION public.get_users_with_email() OWNER TO postgres;

-- Add comment
COMMENT ON FUNCTION public.get_users_with_email IS
'Returns all active users with email addresses, apiaries count, hives count, and last sign-in time.';

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
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ GET_USERS FUNCTION UPDATED WITH STATS';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'New fields added:';
  RAISE NOTICE '  • apiaries_count: Number of apiaries per user';
  RAISE NOTICE '  • hives_count: Number of hives per user';
  RAISE NOTICE '  • last_sign_in_at: Last login timestamp';
  RAISE NOTICE '';
  RAISE NOTICE 'Try user management page again!';
  RAISE NOTICE '============================================';
END $$;

-- Test the function
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO test_count FROM public.get_users_with_email();
  RAISE NOTICE '✅ Function test successful! Found % users', test_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Function test failed: %', SQLERRM;
END $$;
