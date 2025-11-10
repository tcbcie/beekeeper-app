-- ============================================================================
-- FIX GET_USERS_WITH_EMAIL TO EXCLUDE DELETED USERS
-- ============================================================================
-- Update the function to only return active users (deleted_at IS NULL)
-- ============================================================================

-- Drop and recreate the function to exclude soft-deleted users
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
  WHERE p.deleted_at IS NULL  -- Only return active (non-deleted) users
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated;

-- Verification
DO $$
DECLARE
  active_count INTEGER;
  deleted_count INTEGER;
BEGIN
  -- Count active users
  SELECT COUNT(*) INTO active_count FROM public.profiles WHERE deleted_at IS NULL;

  -- Count deleted users
  SELECT COUNT(*) INTO deleted_count FROM public.profiles WHERE deleted_at IS NOT NULL;

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ GET_USERS_WITH_EMAIL FIXED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Function now excludes soft-deleted users';
  RAISE NOTICE '';
  RAISE NOTICE 'User counts:';
  RAISE NOTICE '  Active users: %', active_count;
  RAISE NOTICE '  Deleted users: %', deleted_count;
  RAISE NOTICE '';
  RAISE NOTICE 'The function will only return the % active users.', active_count;
  RAISE NOTICE 'Deleted users are accessible via deleted_profiles view.';
  RAISE NOTICE '============================================';
END $$;

-- Test the function
SELECT
  email,
  role,
  is_active,
  registration_code,
  subscription_status
FROM get_users_with_email()
ORDER BY created_at DESC
LIMIT 10;
