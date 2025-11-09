-- ============================================================================
-- IMMEDIATE FIX FOR USER 0c0dcdd3-9667-4171-a953-297315eae1f5
-- ============================================================================
-- This user paid via Stripe but got a 30-day code subscription instead
-- Fix: Update to proper 12-month credit card subscription
-- ============================================================================

-- Variables (adjust if needed)
-- If user is an association member, change these:
-- v_price := 12.00
-- v_is_member := true
-- v_association_id := (get UUID from beekeeping_associations table)

DO $$
DECLARE
  v_user_id UUID := '0c0dcdd3-9667-4171-a953-297315eae1f5';
  v_price NUMERIC := 24.00;  -- €24 for non-member (change to 12.00 if member)
  v_is_member BOOLEAN := false;  -- Change to true if association member
  v_association_id UUID := NULL;  -- Set association UUID if member
  v_new_expiry TIMESTAMPTZ;
BEGIN
  -- Calculate 12 months from now
  v_new_expiry := NOW() + INTERVAL '12 months';

  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE 'FIXING CREDIT CARD SUBSCRIPTION';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Price: €%', v_price;
  RAISE NOTICE 'Association Member: %', v_is_member;
  RAISE NOTICE 'New Expiry: %', v_new_expiry;
  RAISE NOTICE '════════════════════════════════════════════════';

  -- 1. Update user profile
  UPDATE public.profiles
  SET
    subscription_expires_at = v_new_expiry,
    subscription_type = 'credit_card',
    subscription_price = v_price,
    is_association_member = v_is_member,
    association_id = v_association_id,
    current_subscription_code_id = NULL  -- Remove code reference
  WHERE id = v_user_id;

  RAISE NOTICE '✅ Updated profile';

  -- 2. Delete the incorrect code-based subscription history entry
  DELETE FROM public.subscription_history
  WHERE user_id = v_user_id
    AND activated_at::date = CURRENT_DATE
    AND code_id IS NOT NULL;

  RAISE NOTICE '✅ Removed incorrect code-based history entry';

  -- 3. Create correct credit card subscription history entry
  -- Note: code_id and code are NULL for credit card subscriptions (no code used)
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
    v_user_id,
    NULL,  -- No code for credit card subscriptions
    NULL,  -- No code for credit card subscriptions
    NOW(),
    v_new_expiry,
    365,
    'credit_card',
    v_price,
    'stripe',
    'manual_fix_' || NOW()::text
  );

  RAISE NOTICE '✅ Created credit card subscription history entry';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE 'FIX COMPLETE!';
  RAISE NOTICE '════════════════════════════════════════════════';
END $$;

-- Verify the fix
SELECT
  '══════ UPDATED PROFILE ══════' AS section,
  id,
  email,
  subscription_expires_at,
  subscription_type,
  subscription_price,
  is_association_member,
  current_subscription_code_id
FROM public.profiles
WHERE id = '0c0dcdd3-9667-4171-a953-297315eae1f5';

-- Show updated subscription history
SELECT
  '══════ SUBSCRIPTION HISTORY ══════' AS section,
  activated_at,
  expires_at,
  subscription_type,
  price_paid,
  payment_method,
  stripe_payment_intent_id,
  code_id
FROM public.subscription_history
WHERE user_id = '0c0dcdd3-9667-4171-a953-297315eae1f5'
ORDER BY activated_at DESC
LIMIT 2;
