-- REMOVE: Auto-initialization of subscriptions for new users
-- Users now register without subscriptions
-- Subscriptions are activated later via Profile page with subscription codes

-- Drop the triggers that auto-initialize subscriptions
DROP TRIGGER IF EXISTS trigger_initialize_new_user_subscription ON public.profiles;
DROP TRIGGER IF EXISTS trigger_initialize_subscription_on_code_update ON public.profiles;

-- Optionally drop the function (or keep it for potential future use)
-- Commenting out to keep the function available, but triggers are removed
-- DROP FUNCTION IF EXISTS public.initialize_new_user_subscription();

-- Verification message
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'SUBSCRIPTION AUTO-INITIALIZATION REMOVED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'What changed:';
  RAISE NOTICE '1. New users no longer get subscriptions automatically';
  RAISE NOTICE '2. Subscriptions are activated via Profile page with codes';
  RAISE NOTICE '3. Registration codes are now optional (for subscriptions only)';
  RAISE NOTICE '';
  RAISE NOTICE 'User Registration Flow:';
  RAISE NOTICE '- Users can sign up freely without codes';
  RAISE NOTICE '- Email/password signup: no code required';
  RAISE NOTICE '- Google OAuth signup: no code required';
  RAISE NOTICE '';
  RAISE NOTICE 'Subscription Activation Flow:';
  RAISE NOTICE '- Users go to Profile page';
  RAISE NOTICE '- Click "Renew Subscription" button';
  RAISE NOTICE '- Enter subscription code';
  RAISE NOTICE '- Subscription activated via activate_subscription() function';
  RAISE NOTICE '';
  RAISE NOTICE 'Database State:';
  RAISE NOTICE '- New users: used_registration_code_id = NULL';
  RAISE NOTICE '- New users: current_subscription_code_id = NULL';
  RAISE NOTICE '- New users: subscription_expires_at = NULL';
  RAISE NOTICE '============================================';
END $$;

-- Verify triggers were dropped
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name IN (
    'trigger_initialize_new_user_subscription',
    'trigger_initialize_subscription_on_code_update'
  );

  IF trigger_count = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✓ Triggers successfully removed';
    RAISE NOTICE '✓ New users will NOT get automatic subscriptions';
    RAISE NOTICE '✓ Users must activate subscriptions manually via Profile page';
  ELSE
    RAISE WARNING 'Some triggers still exist! Count: %', trigger_count;
  END IF;

  RAISE NOTICE '============================================';
END $$;
