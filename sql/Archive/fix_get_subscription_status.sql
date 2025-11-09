-- FIX: get_subscription_status function error when code_info is NULL
-- Error: "record 'code_info' is not assigned yet"
-- This happens when user has no subscription code

CREATE OR REPLACE FUNCTION public.get_subscription_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  expiry_date TIMESTAMP WITH TIME ZONE;
  current_code_id UUID;
  code_text VARCHAR(50);
  code_desc TEXT;
  days_remaining INTEGER;
  is_active BOOLEAN;
  status TEXT;
  result JSON;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN json_build_object('error', 'User not authenticated');
  END IF;

  -- Get subscription info
  SELECT
    subscription_expires_at,
    current_subscription_code_id
  INTO expiry_date, current_code_id
  FROM public.profiles
  WHERE id = current_user_id;

  -- Get code information if available (using separate variables instead of RECORD)
  IF current_code_id IS NOT NULL THEN
    SELECT code, description INTO code_text, code_desc
    FROM public.registration_codes
    WHERE id = current_code_id;
  ELSE
    code_text := NULL;
    code_desc := NULL;
  END IF;

  -- Calculate status
  IF expiry_date IS NULL THEN
    is_active := false;
    status := 'no_subscription';
    days_remaining := 0;
  ELSIF expiry_date > NOW() THEN
    is_active := true;
    days_remaining := EXTRACT(DAY FROM (expiry_date - NOW()));

    IF days_remaining > 30 THEN
      status := 'active';
    ELSIF days_remaining > 7 THEN
      status := 'expiring_soon';
    ELSE
      status := 'expiring_very_soon';
    END IF;
  ELSE
    is_active := false;
    status := 'expired';
    days_remaining := 0;
  END IF;

  -- Build result (now using separate variables)
  result := json_build_object(
    'is_active', is_active,
    'status', status,
    'expires_at', expiry_date,
    'days_remaining', days_remaining,
    'current_code', code_text,
    'code_description', code_desc
  );

  RETURN result;
END;
$$;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'FIXED get_subscription_status() FUNCTION!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'What was fixed:';
  RAISE NOTICE '- Changed from RECORD type to separate VARCHAR/TEXT variables';
  RAISE NOTICE '- Now properly handles NULL code_id without errors';
  RAISE NOTICE '- Function will work for users with or without subscriptions';
  RAISE NOTICE '';
  RAISE NOTICE 'The function now returns proper JSON even when:';
  RAISE NOTICE '- User has no subscription code';
  RAISE NOTICE '- User has expired subscription';
  RAISE NOTICE '- User is newly registered';
  RAISE NOTICE '============================================';
END $$;
