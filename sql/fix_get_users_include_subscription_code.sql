-- ============================================================================
-- FIX GET_USERS_WITH_EMAIL TO INCLUDE SUBSCRIPTION CODE
-- ============================================================================
-- Update the function to return subscription code information
-- ============================================================================

-- Drop and recreate the function with all required fields
DROP FUNCTION IF EXISTS public.get_users_with_email();

CREATE OR REPLACE FUNCTION public.get_users_with_email()
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  registration_code TEXT,
  code_description TEXT,
  subscription_type TEXT,
  subscription_expires_at TIMESTAMPTZ,
  subscription_status TEXT,
  days_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.role::TEXT,
    COALESCE(p.is_active, true) as is_active,
    p.created_at,
    p.created_at as updated_at,
    -- Show registration code if exists, otherwise show subscription type
    COALESCE(
      (SELECT rc.code::TEXT FROM public.registration_codes rc WHERE rc.id = p.current_subscription_code_id),
      NULL
    ) as registration_code,
    -- Show code description or subscription type
    COALESCE(
      (SELECT rc.description::TEXT FROM public.registration_codes rc WHERE rc.id = p.current_subscription_code_id),
      CASE
        WHEN p.subscription_type IS NOT NULL THEN 'Credit Card: ' || p.subscription_type
        ELSE NULL
      END
    ) as code_description,
    p.subscription_type::TEXT,
    p.subscription_expires_at,
    -- Calculate subscription status
    CASE
      WHEN p.subscription_expires_at IS NULL THEN 'no_subscription'
      WHEN p.subscription_expires_at > NOW() + INTERVAL '30 days' THEN 'active'
      WHEN p.subscription_expires_at > NOW() + INTERVAL '7 days' THEN 'expiring_soon'
      WHEN p.subscription_expires_at > NOW() THEN 'expiring_very_soon'
      ELSE 'expired'
    END::TEXT as subscription_status,
    -- Calculate days remaining
    CASE
      WHEN p.subscription_expires_at IS NULL THEN NULL
      ELSE EXTRACT(DAY FROM (p.subscription_expires_at - NOW()))::INTEGER
    END as days_remaining
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ GET_USERS_WITH_EMAIL UPDATED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Function now returns:';
  RAISE NOTICE '  - registration_code';
  RAISE NOTICE '  - code_description (from registration_codes table)';
  RAISE NOTICE '  - subscription_expires_at';
  RAISE NOTICE '  - subscription_status';
  RAISE NOTICE '  - days_remaining';
  RAISE NOTICE '';
  RAISE NOTICE 'User management will now show subscription codes.';
  RAISE NOTICE '============================================';
END $$;

-- Test the function
SELECT
  email,
  registration_code,
  code_description,
  subscription_status,
  days_remaining
FROM get_users_with_email()
WHERE registration_code IS NOT NULL
LIMIT 5;
