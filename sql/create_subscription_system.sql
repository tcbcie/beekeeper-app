-- CREATE SUBSCRIPTION SYSTEM
-- This script extends the registration code system to support subscription management
-- with expiration tracking, renewal, and email notifications

-- Step 1: Add subscription columns to profiles table
DO $$
BEGIN
  -- Add subscription_expires_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_expires_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_expires_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added subscription_expires_at column to profiles table';
  ELSE
    RAISE NOTICE 'subscription_expires_at column already exists in profiles table';
  END IF;

  -- Add current_subscription_code_id column (tracks active subscription code)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'current_subscription_code_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN current_subscription_code_id UUID REFERENCES public.registration_codes(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added current_subscription_code_id column to profiles table';
  ELSE
    RAISE NOTICE 'current_subscription_code_id column already exists in profiles table';
  END IF;

  -- Add last_subscription_reminder_sent column (tracks when we last sent expiration reminder)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_subscription_reminder_sent'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_subscription_reminder_sent TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added last_subscription_reminder_sent column to profiles table';
  ELSE
    RAISE NOTICE 'last_subscription_reminder_sent column already exists in profiles table';
  END IF;
END $$;

-- Step 2: Add subscription_duration_days to registration_codes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registration_codes' AND column_name = 'subscription_duration_days'
  ) THEN
    ALTER TABLE public.registration_codes ADD COLUMN subscription_duration_days INTEGER DEFAULT 365;
    RAISE NOTICE 'Added subscription_duration_days column to registration_codes table';
  ELSE
    RAISE NOTICE 'subscription_duration_days column already exists in registration_codes table';
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN public.profiles.subscription_expires_at IS 'Date when user subscription expires - user loses access after this date';
COMMENT ON COLUMN public.profiles.current_subscription_code_id IS 'Current active subscription code - updated when user renews';
COMMENT ON COLUMN public.profiles.last_subscription_reminder_sent IS 'Last time we sent subscription expiration reminder email';
COMMENT ON COLUMN public.registration_codes.subscription_duration_days IS 'Number of days this code extends subscription (default 365 = 1 year)';

-- Step 3: Create subscription history table
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_id UUID NOT NULL REFERENCES public.registration_codes(id) ON DELETE SET NULL,
  code VARCHAR(50) NOT NULL,
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_days INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE public.subscription_history IS 'Historical record of all subscription activations and renewals';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON public.subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_expires_at ON public.subscription_history(expires_at);

-- Grant permissions
GRANT SELECT, INSERT ON public.subscription_history TO authenticated;

-- Step 4: Create function to activate/renew subscription
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
  -- If current subscription is still active, extend from expiry date
  -- If expired or null, start from today
  IF current_expiry IS NOT NULL AND current_expiry > NOW() THEN
    new_expiry := current_expiry + (code_record.subscription_duration_days || ' days')::INTERVAL;
  ELSE
    new_expiry := NOW() + (code_record.subscription_duration_days || ' days')::INTERVAL;
  END IF;

  -- Update user's subscription
  UPDATE public.profiles
  SET
    subscription_expires_at = new_expiry,
    current_subscription_code_id = code_record.id,
    last_subscription_reminder_sent = NULL
  WHERE id = current_user_id;

  -- Record in subscription history
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
    code_record.subscription_duration_days
  );

  -- Increment code usage if it's not already tracked by registration
  -- (This handles renewal codes that might be different from registration codes)
  UPDATE public.registration_codes
  SET current_uses = current_uses + 1
  WHERE id = code_record.id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Subscription activated successfully',
    'expires_at', new_expiry,
    'duration_days', code_record.subscription_duration_days
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_subscription(TEXT) TO authenticated;

-- Step 5: Create function to check subscription status
CREATE OR REPLACE FUNCTION public.get_subscription_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  expiry_date TIMESTAMP WITH TIME ZONE;
  current_code_id UUID;
  code_info RECORD;
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

  -- Get code information if available
  IF current_code_id IS NOT NULL THEN
    SELECT code, description INTO code_info
    FROM public.registration_codes
    WHERE id = current_code_id;
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

  -- Build result
  result := json_build_object(
    'is_active', is_active,
    'status', status,
    'expires_at', expiry_date,
    'days_remaining', days_remaining,
    'current_code', code_info.code,
    'code_description', code_info.description
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_subscription_status() TO authenticated;

-- Step 6: Create function to get subscription history
CREATE OR REPLACE FUNCTION public.get_subscription_history()
RETURNS TABLE (
  id UUID,
  code VARCHAR(50),
  activated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  duration_days INTEGER,
  is_current BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    sh.id,
    sh.code,
    sh.activated_at,
    sh.expires_at,
    sh.duration_days,
    (sh.expires_at > NOW() AND sh.expires_at = (
      SELECT MAX(sh2.expires_at)
      FROM public.subscription_history sh2
      WHERE sh2.user_id = current_user_id
    )) as is_current
  FROM public.subscription_history sh
  WHERE sh.user_id = current_user_id
  ORDER BY sh.activated_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_subscription_history() TO authenticated;

-- Step 7: Create view for users needing subscription reminders
CREATE OR REPLACE VIEW public.users_needing_subscription_reminder AS
SELECT
  p.id,
  p.email,
  p.subscription_expires_at,
  EXTRACT(DAY FROM (p.subscription_expires_at - NOW())) as days_until_expiry,
  p.last_subscription_reminder_sent,
  CASE
    WHEN EXTRACT(DAY FROM (p.subscription_expires_at - NOW())) <= 7 THEN '7_day'
    WHEN EXTRACT(DAY FROM (p.subscription_expires_at - NOW())) <= 30 THEN '30_day'
  END as reminder_type
FROM public.profiles p
WHERE p.subscription_expires_at IS NOT NULL
  AND p.subscription_expires_at > NOW()
  AND EXTRACT(DAY FROM (p.subscription_expires_at - NOW())) <= 30
  AND (
    p.last_subscription_reminder_sent IS NULL
    OR p.last_subscription_reminder_sent < NOW() - INTERVAL '7 days'
  )
ORDER BY p.subscription_expires_at ASC;

-- Grant permissions
GRANT SELECT ON public.users_needing_subscription_reminder TO authenticated;

-- Step 8: Create function to mark reminder as sent
CREATE OR REPLACE FUNCTION public.mark_subscription_reminder_sent(
  target_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET last_subscription_reminder_sent = NOW()
  WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_subscription_reminder_sent(UUID) TO authenticated;

-- Step 9: Update get_users_with_email to include subscription info
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
  subscription_status TEXT
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
    rc.code as registration_code,
    rc.description as code_description,
    p.subscription_expires_at,
    CASE
      WHEN p.subscription_expires_at IS NULL THEN 'No Subscription'
      WHEN p.subscription_expires_at > NOW() THEN 'Active'
      ELSE 'Expired'
    END as subscription_status
  FROM public.profiles p
  LEFT JOIN public.registration_codes rc ON p.used_registration_code_id = rc.id
  ORDER BY p.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated;

-- Step 10: Initialize subscription expiry for existing users
-- Set expiry to 1 year from registration date for existing users
UPDATE public.profiles
SET subscription_expires_at = created_at + INTERVAL '365 days',
    current_subscription_code_id = used_registration_code_id
WHERE subscription_expires_at IS NULL
  AND created_at IS NOT NULL;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'SUBSCRIPTION SYSTEM CREATED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Database changes:';
  RAISE NOTICE '1. Added subscription columns to profiles table';
  RAISE NOTICE '2. Added subscription_duration_days to registration_codes';
  RAISE NOTICE '3. Created subscription_history table';
  RAISE NOTICE '4. Created activate_subscription() function';
  RAISE NOTICE '5. Created get_subscription_status() function';
  RAISE NOTICE '6. Created get_subscription_history() function';
  RAISE NOTICE '7. Created users_needing_subscription_reminder view';
  RAISE NOTICE '8. Updated get_users_with_email() with subscription info';
  RAISE NOTICE '9. Initialized existing users with 1 year subscription';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '- Update frontend to show subscription status';
  RAISE NOTICE '- Implement renewal UI in profile page';
  RAISE NOTICE '- Set up email notification system';
  RAISE NOTICE '- Configure cron job for reminder emails';
  RAISE NOTICE '============================================';
END $$;

-- Test queries
SELECT * FROM get_subscription_status();
SELECT * FROM users_needing_subscription_reminder;
