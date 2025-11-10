-- ============================================================================
-- FIX PAYMENT METHOD VALUES IN SUBSCRIPTION HISTORY
-- ============================================================================
-- The payment_method column was using 'stripe' but should use 'credit_card'
-- to match the UI filter values
-- ============================================================================

-- Update existing records that have 'stripe' to 'credit_card'
UPDATE public.subscription_history
SET payment_method = 'credit_card'
WHERE payment_method = 'stripe';

-- Verify the fix
SELECT
  payment_method,
  COUNT(*) as record_count
FROM public.subscription_history
GROUP BY payment_method
ORDER BY payment_method;

-- Show sample of updated records
SELECT
  user_id,
  subscription_type,
  payment_method,
  stripe_payment_intent_id,
  activated_at
FROM public.subscription_history
WHERE stripe_payment_intent_id IS NOT NULL
ORDER BY activated_at DESC
LIMIT 5;

-- Verification message
DO $$
DECLARE
  stripe_count INTEGER;
  credit_card_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO stripe_count
  FROM public.subscription_history
  WHERE payment_method = 'stripe';

  SELECT COUNT(*) INTO credit_card_count
  FROM public.subscription_history
  WHERE payment_method = 'credit_card';

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ PAYMENT METHOD VALUES UPDATED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Records with payment_method = ''stripe'': %', stripe_count;
  RAISE NOTICE 'Records with payment_method = ''credit_card'': %', credit_card_count;
  RAISE NOTICE '';
  RAISE NOTICE 'All credit card payments now show as payment_method = ''credit_card''';
  RAISE NOTICE '============================================';
END $$;
