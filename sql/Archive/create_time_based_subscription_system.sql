-- ============================================================================
-- TIME-BASED SUBSCRIPTION SYSTEM WITH ASSOCIATIONS
-- ============================================================================
-- This migration adds support for:
-- 1. Irish Beekeeping Associations database
-- 2. Time-based subscription codes (expire on fixed date)
-- 3. Credit card subscriptions via Stripe
-- 4. Member vs non-member pricing
-- ============================================================================

-- ============================================================================
-- 1. CREATE ASSOCIATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.beekeeping_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  jurisdiction TEXT CHECK (jurisdiction IN ('NI', 'ROI')),
  county_area TEXT,
  affiliation TEXT,
  source TEXT,
  website TEXT,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_associations_jurisdiction ON public.beekeeping_associations(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_associations_name ON public.beekeeping_associations(name);
CREATE INDEX IF NOT EXISTS idx_associations_active ON public.beekeeping_associations(is_active);

-- Enable RLS
ALTER TABLE public.beekeeping_associations ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read active associations
CREATE POLICY "Anyone can view active associations"
ON public.beekeeping_associations
FOR SELECT
USING (is_active = true);

-- Policy: Only admins can modify
CREATE POLICY "Only admins can modify associations"
ON public.beekeeping_associations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'Admin'
  )
);

-- ============================================================================
-- 2. UPDATE REGISTRATION_CODES TABLE (rename to subscription_codes)
-- ============================================================================

-- Add new columns for time-based subscriptions
ALTER TABLE public.registration_codes
ADD COLUMN IF NOT EXISTS code_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'code',
ADD COLUMN IF NOT EXISTS issued_by_association_id UUID REFERENCES public.beekeeping_associations(id),
ADD COLUMN IF NOT EXISTS issued_by_name TEXT,
ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);

-- Add constraint for subscription_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'registration_codes_subscription_type_check'
  ) THEN
    ALTER TABLE public.registration_codes
    ADD CONSTRAINT registration_codes_subscription_type_check
    CHECK (subscription_type IN ('code', 'credit_card'));
  END IF;
END $$;

-- Add comment explaining the two expiry models
COMMENT ON COLUMN public.registration_codes.code_expires_at IS
'For time-based codes: Fixed expiration date (e.g., club membership expiry).
When NULL, uses duration-based logic (subscription_duration_days).';

COMMENT ON COLUMN public.registration_codes.subscription_duration_days IS
'For duration-based codes: Days added from activation date.
When code_expires_at is set, this field is ignored.';

-- ============================================================================
-- 3. UPDATE PROFILES TABLE
-- ============================================================================

-- Add association membership tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_type TEXT,
ADD COLUMN IF NOT EXISTS subscription_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS is_association_member BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS association_id UUID REFERENCES public.beekeeping_associations(id),
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add constraint for subscription_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_subscription_type_check'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_subscription_type_check
    CHECK (subscription_type IN ('code', 'credit_card', 'none') OR subscription_type IS NULL);
  END IF;
END $$;

-- Add index for association lookups
CREATE INDEX IF NOT EXISTS idx_profiles_association_id ON public.profiles(association_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);

-- ============================================================================
-- 4. UPDATE SUBSCRIPTION_HISTORY TABLE
-- ============================================================================

-- Add tracking for subscription type and pricing
ALTER TABLE public.subscription_history
ADD COLUMN IF NOT EXISTS subscription_type TEXT,
ADD COLUMN IF NOT EXISTS price_paid NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS code_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Add index for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_subscription_history_stripe_payment ON public.subscription_history(stripe_payment_intent_id);

-- ============================================================================
-- 5. UPDATE activate_subscription FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.activate_subscription(sub_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code_record RECORD;
  current_user_id UUID;
  current_expiry TIMESTAMPTZ;
  new_expiry TIMESTAMPTZ;
  subscription_message TEXT;
BEGIN
  -- Get current user
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'You must be logged in to activate a subscription'
    );
  END IF;

  -- Validate and get code
  SELECT * INTO code_record
  FROM public.registration_codes
  WHERE code = sub_code
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid or inactive subscription code'
    );
  END IF;

  -- Check if code itself has expired (for time-based codes)
  IF code_record.code_expires_at IS NOT NULL
     AND code_record.code_expires_at < NOW() THEN
    RETURN json_build_object(
      'success', false,
      'message', 'This code expired on ' || to_char(code_record.code_expires_at, 'DD Mon YYYY')
    );
  END IF;

  -- Check max uses
  IF code_record.max_uses IS NOT NULL
     AND code_record.current_uses >= code_record.max_uses THEN
    RETURN json_build_object(
      'success', false,
      'message', 'This code has reached its maximum number of uses'
    );
  END IF;

  -- Get current subscription expiry
  SELECT subscription_expires_at INTO current_expiry
  FROM public.profiles
  WHERE id = current_user_id;

  -- Calculate new expiry based on code type
  IF code_record.code_expires_at IS NOT NULL THEN
    -- TIME-BASED CODE: Use code's fixed expiration date
    new_expiry := code_record.code_expires_at;
    subscription_message := 'Subscription activated! Valid until ' ||
                           to_char(new_expiry, 'DD Mon YYYY');

  ELSIF code_record.subscription_duration_days = 0 THEN
    -- LIFETIME CODE: 100 years from now
    new_expiry := NOW() + INTERVAL '100 years';
    subscription_message := 'Lifetime subscription activated!';

  ELSE
    -- DURATION-BASED CODE: Add duration to current expiry or now
    IF current_expiry IS NOT NULL AND current_expiry > NOW() THEN
      -- Extend from current expiry
      new_expiry := current_expiry + (code_record.subscription_duration_days || ' days')::INTERVAL;
      subscription_message := code_record.subscription_duration_days || ' days added to your subscription!';
    ELSE
      -- Start from now
      new_expiry := NOW() + (code_record.subscription_duration_days || ' days')::INTERVAL;
      subscription_message := 'Subscription activated for ' || code_record.subscription_duration_days || ' days!';
    END IF;
  END IF;

  -- Update user profile
  UPDATE public.profiles
  SET
    subscription_expires_at = new_expiry,
    current_subscription_code_id = code_record.id,
    subscription_type = COALESCE(code_record.subscription_type, 'code'),
    subscription_price = code_record.price,
    updated_at = NOW()
  WHERE id = current_user_id;

  -- Increment code usage
  UPDATE public.registration_codes
  SET current_uses = current_uses + 1,
      updated_at = NOW()
  WHERE id = code_record.id;

  -- Log subscription history
  INSERT INTO public.subscription_history (
    user_id,
    code_id,
    code,
    activated_at,
    expires_at,
    duration_days,
    subscription_type,
    code_expires_at,
    price_paid,
    payment_method
  ) VALUES (
    current_user_id,
    code_record.id,
    code_record.code,
    NOW(),
    new_expiry,
    code_record.subscription_duration_days,
    COALESCE(code_record.subscription_type, 'code'),
    code_record.code_expires_at,
    code_record.price,
    'code'
  );

  -- Return success with details
  RETURN json_build_object(
    'success', true,
    'message', subscription_message,
    'expires_at', new_expiry,
    'subscription_type', COALESCE(code_record.subscription_type, 'code'),
    'is_time_based', code_record.code_expires_at IS NOT NULL,
    'duration_days', CASE
      WHEN code_record.subscription_duration_days = 0 THEN 36500
      ELSE code_record.subscription_duration_days
    END
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.activate_subscription(TEXT) TO authenticated;

-- ============================================================================
-- 6. CREATE FUNCTION TO ACTIVATE CREDIT CARD SUBSCRIPTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.activate_credit_card_subscription(
  p_user_id UUID,
  p_stripe_payment_intent_id TEXT,
  p_is_association_member BOOLEAN,
  p_association_id UUID DEFAULT NULL,
  p_price_paid NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_expiry TIMESTAMPTZ;
  calculated_price NUMERIC;
BEGIN
  -- Calculate expiry (12 months from now)
  new_expiry := NOW() + INTERVAL '12 months';

  -- Calculate price if not provided
  IF p_price_paid IS NULL THEN
    calculated_price := CASE WHEN p_is_association_member THEN 12.00 ELSE 24.00 END;
  ELSE
    calculated_price := p_price_paid;
  END IF;

  -- Update user profile
  UPDATE public.profiles
  SET
    subscription_expires_at = new_expiry,
    subscription_type = 'credit_card',
    subscription_price = calculated_price,
    is_association_member = p_is_association_member,
    association_id = p_association_id,
    current_subscription_code_id = NULL,  -- Credit card subs don't use codes
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Log to subscription_history
  INSERT INTO public.subscription_history (
    user_id,
    activated_at,
    expires_at,
    duration_days,
    subscription_type,
    price_paid,
    payment_method,
    stripe_payment_intent_id
  ) VALUES (
    p_user_id,
    NOW(),
    new_expiry,
    365,
    'credit_card',
    calculated_price,
    'stripe',
    p_stripe_payment_intent_id
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Credit card subscription activated successfully!',
    'expires_at', new_expiry,
    'price_paid', calculated_price,
    'is_association_member', p_is_association_member
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.activate_credit_card_subscription(UUID, TEXT, BOOLEAN, UUID, NUMERIC) TO authenticated;

-- ============================================================================
-- 7. VERIFICATION QUERIES
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'TIME-BASED SUBSCRIPTION SYSTEM CREATED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Tables updated:';
  RAISE NOTICE '  ✓ beekeeping_associations (new)';
  RAISE NOTICE '  ✓ registration_codes (updated)';
  RAISE NOTICE '  ✓ profiles (updated)';
  RAISE NOTICE '  ✓ subscription_history (updated)';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created/updated:';
  RAISE NOTICE '  ✓ activate_subscription(TEXT)';
  RAISE NOTICE '  ✓ activate_credit_card_subscription(...)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Import associations data';
  RAISE NOTICE '  2. Test code activation (time-based and duration-based)';
  RAISE NOTICE '  3. Implement Stripe webhook handler';
  RAISE NOTICE '  4. Update admin UI for code creation';
  RAISE NOTICE '  5. Update user UI for association selection';
  RAISE NOTICE '============================================';
END $$;
