-- ============================================================================
-- ADD TRANSACTION ID TO USER MANAGEMENT
-- ============================================================================
-- Updates get_users_with_email to include the latest Stripe transaction ID
-- for users who paid with credit card
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
  latest_transaction_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
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

COMMENT ON FUNCTION public.get_users_with_email IS
'Returns all active users with email addresses and their latest credit card transaction ID from subscription_history';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ TRANSACTION ID ADDED TO USER MANAGEMENT';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Function: get_users_with_email';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  ✓ Added latest_transaction_id to return columns';
  RAISE NOTICE '  ✓ Joins with subscription_history to get latest Stripe payment intent ID';
  RAISE NOTICE '  ✓ Only includes credit card transactions';
  RAISE NOTICE '  ✓ Orders by activated_at DESC to get most recent';
  RAISE NOTICE '';
  RAISE NOTICE 'Display:';
  RAISE NOTICE '  • Shows in user management table';
  RAISE NOTICE '  • Only for users who paid with credit card';
  RAISE NOTICE '  • Format: pi_3AbCdEfGhIjKlMnO1234567890';
  RAISE NOTICE '  • Can be used to look up transaction in Stripe';
  RAISE NOTICE '============================================';
END $$;
