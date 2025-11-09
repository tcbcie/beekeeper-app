-- FIX: Update activate_subscription to handle lifetime subscriptions
-- When subscription_duration_days = 0, set expiry to 100 years (lifetime)

CREATE OR REPLACE FUNCTION public.activate_subscription(
  sub_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  code_record RECORD;
  current_expiry TIMESTAMP WITH TIME ZONE;
  new_expiry TIMESTAMP WITH TIME ZONE;
  result JSON;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not authenticated'
    );
  END IF;

  -- Validate the subscription code
  SELECT * INTO code_record
  FROM public.registration_codes
  WHERE code = sub_code
    AND is_active = TRUE
    AND expires_at > NOW();

  -- Check if code is valid
  IF code_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid, expired, or inactive subscription code'
    );
  END IF;

  -- Check if code has usage limits
  IF code_record.max_uses IS NOT NULL AND code_record.current_uses >= code_record.max_uses THEN
    RETURN json_build_object(
      'success', false,
      'message', 'This subscription code has reached its maximum number of uses'
    );
  END IF;

  -- Get current subscription expiry
  SELECT subscription_expires_at INTO current_expiry
  FROM public.profiles
  WHERE id = current_user_id;

  -- Calculate new expiry date
  -- Handle lifetime subscriptions (duration = 0)
  IF code_record.subscription_duration_days = 0 THEN
    -- Lifetime subscription: 100 years from now
    new_expiry := NOW() + INTERVAL '100 years';
  ELSE
    -- Regular duration subscription
    -- If current subscription is still active, extend from expiry date
    -- If expired or null, start from today
    IF current_expiry IS NOT NULL AND current_expiry > NOW() THEN
      new_expiry := current_expiry + (code_record.subscription_duration_days || ' days')::INTERVAL;
    ELSE
      new_expiry := NOW() + (code_record.subscription_duration_days || ' days')::INTERVAL;
    END IF;
  END IF;

  -- Update user's subscription
  UPDATE public.profiles
  SET
    subscription_expires_at = new_expiry,
    current_subscription_code_id = code_record.id,
    last_subscription_reminder_sent = NULL
  WHERE id = current_user_id;

  -- Increment code usage
  UPDATE public.registration_codes
  SET current_uses = current_uses + 1
  WHERE id = code_record.id;

  -- Log subscription history
  INSERT INTO public.subscription_history (
    user_id,
    code_id,
    code,
    activated_at,
    expires_at,
    duration_days
  ) VALUES (
    current_user_id,
    code_record.id,
    code_record.code,
    NOW(),
    new_expiry,
    CASE
      WHEN code_record.subscription_duration_days = 0 THEN 36500
      ELSE code_record.subscription_duration_days
    END
  );

  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', CASE
      WHEN code_record.subscription_duration_days = 0 THEN 'Lifetime subscription activated successfully!'
      ELSE 'Subscription activated successfully!'
    END,
    'expires_at', new_expiry,
    'duration_days', CASE
      WHEN code_record.subscription_duration_days = 0 THEN 36500
      ELSE code_record.subscription_duration_days
    END,
    'code_description', code_record.description,
    'is_lifetime', code_record.subscription_duration_days = 0
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.activate_subscription(TEXT) TO authenticated;

-- Verification message
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'ACTIVATE_SUBSCRIPTION FUNCTION UPDATED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'What changed:';
  RAISE NOTICE '1. Now handles subscription_duration_days = 0 as LIFETIME';
  RAISE NOTICE '2. Lifetime codes set expiry to 100 years from activation';
  RAISE NOTICE '3. Regular codes work as before (extend or start from today)';
  RAISE NOTICE '4. Returns is_lifetime flag in response';
  RAISE NOTICE '============================================';
END $$;
