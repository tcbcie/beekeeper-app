-- FIX: Update get_users_with_email to show current subscription code
-- The function was showing used_registration_code_id instead of current_subscription_code_id
-- This caused the Subscription Code column to not update after users activated subscriptions

-- Drop the old function first since we're changing the return type
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
    -- Show CURRENT subscription code (not registration code)
    current_rc.code as registration_code,
    current_rc.description as code_description,
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
  -- Join with CURRENT subscription code, not registration code
  LEFT JOIN public.registration_codes current_rc ON p.current_subscription_code_id = current_rc.id
  ORDER BY p.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated;

-- Verification message
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'GET_USERS_WITH_EMAIL FUNCTION UPDATED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'What changed:';
  RAISE NOTICE '1. Now shows current_subscription_code_id instead of used_registration_code_id';
  RAISE NOTICE '2. Added subscription_status calculation';
  RAISE NOTICE '3. Added days_remaining calculation';
  RAISE NOTICE '';
  RAISE NOTICE 'This fixes the User Management table to show:';
  RAISE NOTICE '- Current subscription code (updates when users activate)';
  RAISE NOTICE '- Subscription status (active/expiring/expired/none)';
  RAISE NOTICE '- Days remaining until expiration';
  RAISE NOTICE '============================================';
END $$;
