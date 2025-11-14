-- Check subscription_history payment methods
SELECT
  id,
  user_id,
  subscription_type,
  payment_method,
  stripe_payment_intent_id,
  activated_at
FROM public.subscription_history
ORDER BY activated_at DESC
LIMIT 10;

-- Check distinct payment methods
SELECT DISTINCT payment_method, COUNT(*) as count
FROM public.subscription_history
GROUP BY payment_method;

-- Check subscription_type values
SELECT DISTINCT subscription_type, COUNT(*) as count
FROM public.subscription_history
GROUP BY subscription_type;
