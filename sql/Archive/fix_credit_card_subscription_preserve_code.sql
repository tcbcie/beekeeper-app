-- ============================================================================
-- FIX: Preserve association code when user pays with credit card
-- ============================================================================
-- Update activate_credit_card_subscription to accept and store the code
-- This ensures users who have an association code maintain that connection
-- even when they switch to credit card payment
-- ============================================================================

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS public.activate_credit_card_subscription(uuid, text, boolean, uuid, numeric);
DROP FUNCTION IF EXISTS public.activate_credit_card_subscription(uuid, text, boolean, uuid, numeric, text);

-- Create the new version with association code support
CREATE OR REPLACE FUNCTION public.activate_credit_card_subscription(
  p_user_id uuid,
  p_stripe_payment_intent_id text,
  p_is_association_member boolean,
  p_association_id uuid DEFAULT NULL::uuid,
  p_price_paid numeric DEFAULT NULL::numeric,
  p_association_code text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  new_expiry TIMESTAMPTZ;
  calculated_price NUMERIC;
  code_id_var UUID;
BEGIN
  -- Calculate expiry (12 months from now)
  new_expiry := NOW() + INTERVAL '12 months';

  -- Calculate price if not provided
  IF p_price_paid IS NULL THEN
  calculated_price := CASE WHEN p_is_association_member THEN 12.00 ELSE 24.00 END;
  ELSE
    calculated_price := p_price_paid;
  END IF;

  -- If association code is provided, look up its ID
  IF p_association_code IS NOT NULL THEN
    SELECT id INTO code_id_var
    FROM public.registration_codes
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
    current_subscription_code_id = code_id_var  -- Preserve the code if provided
  WHERE id = p_user_id;

  -- Log to subscription_history
  INSERT INTO public.subscription_history (
    user_id,
    code_id,
    code,
    activated_at,
    expires_at,
    duration_days,
    subscription_type,
    price_paid,
    payment_method,
    stripe_payment_intent_id
  ) VALUES (
    p_user_id,
    code_id_var,  -- Link to code if provided
    p_association_code,  -- Store the actual code string
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
    'is_association_member', p_is_association_member,
    'association_code', p_association_code
  );
END;
$function$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.activate_credit_card_subscription TO service_role;

-- Test message
DO $$
BEGIN
  RAISE NOTICE '✅ Function updated successfully';
  RAISE NOTICE '✅ Now accepts p_association_code parameter';
  RAISE NOTICE '✅ Preserves association code in profile and history';
  RAISE NOTICE '✅ Granted service_role permission';
END $$;
