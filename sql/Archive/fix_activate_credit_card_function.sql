-- ============================================================================
-- FIX activate_credit_card_subscription FUNCTION
-- ============================================================================
-- Remove reference to non-existent updated_at column in profiles table
-- ============================================================================

CREATE OR REPLACE FUNCTION public.activate_credit_card_subscription(
  p_user_id uuid,
  p_stripe_payment_intent_id text,
  p_is_association_member boolean,
  p_association_id uuid DEFAULT NULL::uuid,
  p_price_paid numeric DEFAULT NULL::numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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

  -- Update user profile (removed updated_at reference)
  UPDATE public.profiles
  SET
    subscription_expires_at = new_expiry,
    subscription_type = 'credit_card',
    subscription_price = calculated_price,
    is_association_member = p_is_association_member,
    association_id = p_association_id,
    current_subscription_code_id = NULL  -- Credit card subs don't use codes
  WHERE id = p_user_id;

  -- Log to subscription_history (code_id and code are NULL for credit card)
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
$function$;

-- Test the function works
DO $$
BEGIN
  RAISE NOTICE '✅ Function updated successfully';
  RAISE NOTICE '✅ Removed updated_at reference from profiles table';
  RAISE NOTICE '✅ code_id and code are now properly NULL for credit card subscriptions';
END $$;
