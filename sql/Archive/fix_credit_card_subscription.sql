-- ============================================================================
-- FIX CREDIT CARD SUBSCRIPTION
-- ============================================================================
-- This script fixes a user whose credit card payment succeeded but subscription
-- wasn't properly updated
-- ============================================================================

-- Step 1: Check if activate_credit_card_subscription function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'activate_credit_card_subscription'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE NOTICE '❌ Function activate_credit_card_subscription does NOT exist!';
    RAISE NOTICE '⚠️  You need to run: sql/create_time_based_subscription_system.sql';
  ELSE
    RAISE NOTICE '✅ Function activate_credit_card_subscription exists';
  END IF;
END $$;

-- Step 2: Manually fix the user's subscription
-- Replace USER_ID with actual user ID: 0c0dcdd3-9667-4171-a953-297315eae1f5

DO $$
DECLARE
  v_user_id UUID := '0c0dcdd3-9667-4171-a953-297315eae1f5';
  v_price NUMERIC := 24.00;  -- Change to 12.00 if association member
  v_is_member BOOLEAN := false;  -- Change to true if association member
  v_association_id UUID := NULL;  -- Set to association UUID if member
BEGIN
  -- Update the user's profile
  UPDATE public.profiles
  SET
    subscription_expires_at = NOW() + INTERVAL '12 months',
    subscription_type = 'credit_card',
    subscription_price = v_price,
    is_association_member = v_is_member,
    association_id = v_association_id,
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Update the subscription_history entry
  UPDATE public.subscription_history
  SET
    expires_at = NOW() + INTERVAL '12 months',
    subscription_type = 'credit_card',
    price_paid = v_price,
    payment_method = 'stripe',
    stripe_payment_intent_id = 'manual_fix_' || NOW()::text
  WHERE user_id = v_user_id
    AND activated_at::date = CURRENT_DATE
  ORDER BY activated_at DESC
  LIMIT 1;

  RAISE NOTICE '✅ Fixed subscription for user %', v_user_id;
  RAISE NOTICE '📅 New expiry: %', NOW() + INTERVAL '12 months';
END $$;

-- Step 3: Verify the fix
SELECT
  id,
  email,
  subscription_expires_at,
  subscription_type,
  subscription_price,
  is_association_member
FROM public.profiles
WHERE id = '0c0dcdd3-9667-4171-a953-297315eae1f5';

-- Check subscription history
SELECT
  activated_at,
  expires_at,
  subscription_type,
  price_paid,
  payment_method,
  stripe_payment_intent_id
FROM public.subscription_history
WHERE user_id = '0c0dcdd3-9667-4171-a953-297315eae1f5'
ORDER BY activated_at DESC
LIMIT 1;
