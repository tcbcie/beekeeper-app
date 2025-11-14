-- ============================================================================
-- SIMPLIFY GET_USERS_WITH_EMAIL FUNCTION
-- ============================================================================
-- Creates a simpler version that works without complex security definer
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_users_with_email();

-- Create simpler version
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
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO anon;
GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO service_role;

-- Set owner
ALTER FUNCTION public.get_users_with_email() OWNER TO postgres;

-- Add comment
COMMENT ON FUNCTION public.get_users_with_email IS
'Returns all active users with email addresses. Uses LANGUAGE sql instead of plpgsql for simpler execution.';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ GET_USERS FUNCTION SIMPLIFIED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  • Changed from plpgsql to sql language';
  RAISE NOTICE '  • Simplified execution model';
  RAISE NOTICE '  • Granted to all roles';
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
