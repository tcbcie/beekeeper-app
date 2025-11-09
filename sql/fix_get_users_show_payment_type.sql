-- ============================================================================
-- FIX get_users_with_email TO SHOW PAYMENT TYPE
-- ============================================================================
-- Update function to show "Credit Card" for credit card payments instead of "None"
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_users_with_email();

CREATE OR REPLACE FUNCTION public.get_users_with_email()
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  registration_code TEXT,
  code_description TEXT,
  subscription_expires_at TIMESTAMPTZ,
  subscription_status TEXT,
  days_remaining INTEGER
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.email,
    p.role::TEXT,
    COALESCE(p.is_active, true) as is_active,
    p.created_at,
    -- Show current subscription code OR payment method
    CASE
      WHEN current_rc.code IS NOT NULL THEN current_rc.code
      WHEN p.subscription_type = 'credit_card' AND p.is_association_member AND assoc.name IS NOT NULL THEN
        'Credit Card (via ' || assoc.name || ')'
      WHEN p.subscription_type = 'credit_card' THEN 'Credit Card'
      ELSE NULL
    END as registration_code,
    -- Show code description OR payment details
    CASE
      WHEN current_rc.description IS NOT NULL THEN current_rc.description
      WHEN p.subscription_type = 'credit_card' AND p.is_association_member THEN
        'Association Member - €12/year'
      WHEN p.subscription_type = 'credit_card' THEN
        'Standard - €24/year'
      ELSE NULL
    END as code_description,
    p.subscription_expires_at,
    -- Calculate subscription status
    CASE
      WHEN p.subscription_expires_at IS NULL THEN 'no_subscription'
      WHEN p.subscription_expires_at > NOW() THEN
        CASE
          WHEN p.subscription_expires_at > NOW() + INTERVAL '30 days' THEN 'active'
          WHEN p.subscription_expires_at > NOW() + INTERVAL '7 days' THEN 'expiring_soon'
          ELSE 'expiring_very_soon'
        END
      ELSE 'expired'
    END as subscription_status,
    -- Calculate days remaining
    CASE
      WHEN p.subscription_expires_at IS NULL THEN 0
      WHEN p.subscription_expires_at > NOW() THEN EXTRACT(DAY FROM (p.subscription_expires_at - NOW()))::INTEGER
      ELSE 0
    END as days_remaining
  FROM public.profiles p
  -- Join with current subscription code (NULL for credit card payments)
  LEFT JOIN public.registration_codes current_rc ON p.current_subscription_code_id = current_rc.id
  -- Join with beekeeping association (for credit card association member payments)
  LEFT JOIN public.beekeeping_associations assoc ON p.association_id = assoc.id
  ORDER BY p.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ GET_USERS_WITH_EMAIL FUNCTION UPDATED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '• Code column: Shows "Credit Card" for card payments';
  RAISE NOTICE '• Description: Shows "Association Member (€12/year)" or "Standard (€24/year)"';
  RAISE NOTICE '• Works for both code-based and credit card subscriptions';
  RAISE NOTICE '============================================';
END $$;
