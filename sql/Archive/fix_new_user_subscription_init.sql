-- FIX: Auto-initialize subscription for new users
-- This trigger ensures new users automatically get their subscription set up
-- when they register with a registration code

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.initialize_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code_duration INTEGER;
BEGIN
  -- Only initialize if user has a registration code but no subscription yet
  IF NEW.used_registration_code_id IS NOT NULL AND NEW.subscription_expires_at IS NULL THEN

    -- Get the subscription duration from the registration code
    SELECT subscription_duration_days INTO code_duration
    FROM public.registration_codes
    WHERE id = NEW.used_registration_code_id;

    -- If we found a duration, initialize the subscription
    IF code_duration IS NOT NULL THEN
      NEW.subscription_expires_at := NOW() + (code_duration || ' days')::INTERVAL;
      NEW.current_subscription_code_id := NEW.used_registration_code_id;

      RAISE NOTICE 'Initialized subscription for new user % with % days', NEW.id, code_duration;
    ELSE
      -- Fallback to 365 days if no duration specified
      NEW.subscription_expires_at := NOW() + INTERVAL '365 days';
      NEW.current_subscription_code_id := NEW.used_registration_code_id;

      RAISE NOTICE 'Initialized subscription for new user % with default 365 days', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_initialize_new_user_subscription ON public.profiles;

-- Create the trigger on INSERT
CREATE TRIGGER trigger_initialize_new_user_subscription
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_new_user_subscription();

-- Also create an UPDATE trigger for cases where registration code is added after profile creation
DROP TRIGGER IF EXISTS trigger_initialize_subscription_on_code_update ON public.profiles;

CREATE TRIGGER trigger_initialize_subscription_on_code_update
  BEFORE UPDATE OF used_registration_code_id ON public.profiles
  FOR EACH ROW
  WHEN (OLD.used_registration_code_id IS NULL AND NEW.used_registration_code_id IS NOT NULL AND NEW.subscription_expires_at IS NULL)
  EXECUTE FUNCTION public.initialize_new_user_subscription();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.initialize_new_user_subscription() TO authenticated;

-- Verification message
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'NEW USER SUBSCRIPTION TRIGGER CREATED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'What this does:';
  RAISE NOTICE '1. Automatically initializes subscription when new user registers';
  RAISE NOTICE '2. Uses the subscription_duration_days from their registration code';
  RAISE NOTICE '3. Triggers on INSERT (new user) and UPDATE (code added later)';
  RAISE NOTICE '';
  RAISE NOTICE 'Now new users will automatically get:';
  RAISE NOTICE '- subscription_expires_at = NOW() + code duration';
  RAISE NOTICE '- current_subscription_code_id = their registration code';
  RAISE NOTICE '============================================';
END $$;

-- Fix existing user who doesn't have subscription initialized
-- This will catch the user you just created (rickneefe65@gmail.com)
UPDATE public.profiles
SET
  subscription_expires_at = NOW() + (
    SELECT subscription_duration_days::TEXT || ' days'
    FROM public.registration_codes
    WHERE id = profiles.used_registration_code_id
  )::INTERVAL,
  current_subscription_code_id = used_registration_code_id
WHERE used_registration_code_id IS NOT NULL
  AND subscription_expires_at IS NULL;

-- Show what was fixed
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM public.profiles
  WHERE used_registration_code_id IS NOT NULL
    AND subscription_expires_at IS NOT NULL
    AND current_subscription_code_id IS NOT NULL;

  RAISE NOTICE '';
  RAISE NOTICE 'Fixed % existing users who had registration codes but no subscription', fixed_count;
  RAISE NOTICE '============================================';
END $$;
