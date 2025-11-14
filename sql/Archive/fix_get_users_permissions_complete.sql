-- ============================================================================
-- FIX GET_USERS_WITH_EMAIL PERMISSIONS - COMPLETE FIX
-- ============================================================================
-- Recreates the function with proper security definer settings and grants
-- ============================================================================

-- Drop and recreate with proper permissions
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
  latest_transaction_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.role,
    p.created_at,
    p.updated_at,
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
    sh.stripe_payment_intent_id AS latest_transaction_id
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
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated;

-- Grant execute to service_role as well
GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO service_role;

-- Ensure the function owner has proper permissions
ALTER FUNCTION public.get_users_with_email() OWNER TO postgres;

-- Add comment
COMMENT ON FUNCTION public.get_users_with_email IS
'Returns all active users with email addresses and their latest credit card transaction ID from subscription_history. SECURITY DEFINER allows access to auth.users table.';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ GET_USERS_WITH_EMAIL FIX COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Function: get_users_with_email()';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  ✓ Recreated with SECURITY DEFINER';
  RAISE NOTICE '  ✓ Added search_path for auth schema';
  RAISE NOTICE '  ✓ Granted EXECUTE to authenticated';
  RAISE NOTICE '  ✓ Granted EXECUTE to service_role';
  RAISE NOTICE '  ✓ Set owner to postgres';
  RAISE NOTICE '  ✓ Added transaction_id column';
  RAISE NOTICE '';
  RAISE NOTICE 'The function should now work for admin users';
  RAISE NOTICE 'Try refreshing the user management page';
  RAISE NOTICE '============================================';
END $$;

-- Test the function (will show if there are any errors)
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
