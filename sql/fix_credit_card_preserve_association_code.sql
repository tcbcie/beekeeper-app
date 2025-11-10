-- ============================================================================
-- FIX CREDIT CARD SUBSCRIPTION TO PRESERVE ASSOCIATION CODE
-- ============================================================================
-- When a user with an association code pays with credit card, the code
-- should be stored in current_subscription_code_id and subscription_history
-- ============================================================================

CREATE OR REPLACE FUNCTION public.activate_credit_card_subscription(
  p_user_id UUID,
  p_stripe_payment_intent_id TEXT,
  p_is_association_member BOOLEAN,
  p_association_id UUID DEFAULT NULL,
  p_price_paid NUMERIC DEFAULT NULL,
  p_association_code TEXT DEFAULT NULL  -- NEW: Accept association code
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_expiry TIMESTAMPTZ;
  calculated_price NUMERIC;
  v_code_id UUID;  -- NEW: Store the code ID
BEGIN
  -- Calculate expiry (12 months from now)
  new_expiry := NOW() + INTERVAL '12 months';

  -- Calculate price if not provided
  IF p_price_paid IS NULL THEN
    calculated_price := CASE WHEN p_is_association_member THEN 12.00 ELSE 24.00 END;
  ELSE
    calculated_price := p_price_paid;
  END IF;

  -- NEW: Look up the code ID if association code was provided
  IF p_association_code IS NOT NULL THEN
    SELECT id INTO v_code_id
    FROM public.subscription_codes
    WHERE code = p_association_code;
  END IF;

  -- Update user profile
  UPDATE public.profiles
  SET
    subscription_expires_at = new_expiry,
    subscription_type = 'credit_card',
    subscription_price = calculated_price,
    is_association_member = p_is_association_member,
    association_id = p_association_id,
    current_subscription_code_id = v_code_id  -- CHANGED: Store the code ID instead of NULL
  WHERE id = p_user_id;

  -- Log to subscription_history with code information
  INSERT INTO public.subscription_history (
    user_id,
    code_id,
    code,
    activated_at,
    expires_at,
    subscription_type,
    price_paid,
    payment_method,
    stripe_payment_intent_id
  ) VALUES (
    p_user_id,
    v_code_id,                  -- CHANGED: Store code ID
    p_association_code,         -- CHANGED: Store code text
    NOW(),
    new_expiry,
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
    'is_association_member', p_is_association_member,
    'association_code', p_association_code,  -- NEW: Return code in response
    'code_id', v_code_id                     -- NEW: Return code ID
  );
END;
$$;

COMMENT ON FUNCTION public.activate_credit_card_subscription IS
'Activates a credit card subscription and preserves the association code if provided. Used by Stripe webhook.';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ CREDIT CARD SUBSCRIPTION CODE FIX APPLIED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Function: activate_credit_card_subscription';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  ✓ Added p_association_code parameter';
  RAISE NOTICE '  ✓ Looks up code ID from subscription_codes table';
  RAISE NOTICE '  ✓ Stores code ID in profiles.current_subscription_code_id';
  RAISE NOTICE '  ✓ Stores code and code ID in subscription_history';
  RAISE NOTICE '  ✓ Returns code information in response';
  RAISE NOTICE '';
  RAISE NOTICE 'Before:';
  RAISE NOTICE '  ❌ current_subscription_code_id = NULL (always)';
  RAISE NOTICE '  ❌ code_id = NULL in history';
  RAISE NOTICE '  ❌ code = NULL in history';
  RAISE NOTICE '';
  RAISE NOTICE 'After:';
  RAISE NOTICE '  ✅ current_subscription_code_id = code ID (if provided)';
  RAISE NOTICE '  ✅ code_id = code ID in history (if provided)';
  RAISE NOTICE '  ✅ code = association code in history (if provided)';
  RAISE NOTICE '';
  RAISE NOTICE 'Flow:';
  RAISE NOTICE '  1. User enters association code on signup';
  RAISE NOTICE '  2. Pays with credit card';
  RAISE NOTICE '  3. Stripe webhook passes code to function';
  RAISE NOTICE '  4. Function looks up code ID';
  RAISE NOTICE '  5. Stores both code and code ID';
  RAISE NOTICE '  6. Admin can see "Sub Code" in user management';
  RAISE NOTICE '============================================';
END $$;
