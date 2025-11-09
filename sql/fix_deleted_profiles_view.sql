-- ============================================================================
-- FIX DELETED_PROFILES VIEW TO INCLUDE ALL USER DETAILS
-- ============================================================================
-- Update the view to show all fields needed for user restoration
-- ============================================================================

-- Drop and recreate the view with all necessary fields
DROP VIEW IF EXISTS public.deleted_profiles;

CREATE VIEW public.deleted_profiles AS
SELECT
  p.id,
  p.email,
  p.role,
  p.first_name,
  p.last_name,
  p.mobile_number,
  p.is_active,
  p.created_at,
  p.deleted_at,
  p.current_subscription_code_id,
  p.subscription_type,
  p.subscription_expires_at,
  -- Show registration code if exists
  (SELECT rc.code FROM public.registration_codes rc WHERE rc.id = p.current_subscription_code_id) as registration_code,
  -- Show code description or subscription type
  COALESCE(
    (SELECT rc.description FROM public.registration_codes rc WHERE rc.id = p.current_subscription_code_id),
    CASE
      WHEN p.subscription_type IS NOT NULL THEN 'Credit Card: ' || p.subscription_type
      ELSE NULL
    END
  ) as code_description,
  -- Calculate subscription status
  CASE
    WHEN p.subscription_expires_at IS NULL THEN 'no_subscription'
    WHEN p.subscription_expires_at > NOW() + INTERVAL '30 days' THEN 'active'
    WHEN p.subscription_expires_at > NOW() + INTERVAL '7 days' THEN 'expiring_soon'
    WHEN p.subscription_expires_at > NOW() THEN 'expiring_very_soon'
    ELSE 'expired'
  END as subscription_status,
  -- Calculate days remaining
  CASE
    WHEN p.subscription_expires_at IS NULL THEN NULL
    ELSE EXTRACT(DAY FROM (p.subscription_expires_at - NOW()))::INTEGER
  END as days_remaining
FROM public.profiles p
WHERE p.deleted_at IS NOT NULL
ORDER BY p.deleted_at DESC;

-- Grant permissions
GRANT SELECT ON public.deleted_profiles TO authenticated;

-- Verification
DO $$
DECLARE
  deleted_count INTEGER;
  view_count INTEGER;
BEGIN
  -- Count deleted users in profiles table
  SELECT COUNT(*) INTO deleted_count FROM public.profiles WHERE deleted_at IS NOT NULL;

  -- Count users in deleted_profiles view
  SELECT COUNT(*) INTO view_count FROM public.deleted_profiles;

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ DELETED_PROFILES VIEW UPDATED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'View now includes all user details for restoration:';
  RAISE NOTICE '  - Email';
  RAISE NOTICE '  - Name (first_name, last_name)';
  RAISE NOTICE '  - Mobile number';
  RAISE NOTICE '  - Role';
  RAISE NOTICE '  - Subscription details';
  RAISE NOTICE '  - Registration code';
  RAISE NOTICE '  - Deleted timestamp';
  RAISE NOTICE '';
  RAISE NOTICE 'Total deleted users: %', deleted_count;
  RAISE NOTICE 'Users in view: %', view_count;
  RAISE NOTICE '';

  IF deleted_count = view_count THEN
    RAISE NOTICE '✓ View count matches deleted users count';
  ELSE
    RAISE NOTICE '⚠ View count does not match!';
  END IF;

  RAISE NOTICE '============================================';
END $$;

-- Show sample deleted users
SELECT
  email,
  first_name,
  last_name,
  role,
  registration_code,
  subscription_status,
  deleted_at
FROM public.deleted_profiles
ORDER BY deleted_at DESC
LIMIT 5;
