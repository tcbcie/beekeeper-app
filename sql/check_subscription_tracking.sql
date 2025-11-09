-- ============================================================================
-- CHECK SUBSCRIPTION TRACKING FOR CREDIT CARD PURCHASES
-- ============================================================================
-- Investigate how credit card subscriptions are stored vs code-based
-- ============================================================================

-- 1. Check profiles table columns related to subscriptions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name LIKE '%subscription%'
     OR column_name LIKE '%code%'
ORDER BY ordinal_position;

-- 2. Check sample users with different subscription types
SELECT
  id,
  email,
  subscription_type,
  current_subscription_code_id,
  subscription_expires_at,
  CASE
    WHEN current_subscription_code_id IS NOT NULL THEN 'Code-based'
    WHEN subscription_expires_at IS NOT NULL THEN 'Credit Card'
    ELSE 'No subscription'
  END as subscription_method
FROM public.profiles
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check subscription_history for credit card purchases
SELECT
  sh.user_id,
  p.email,
  sh.subscription_type,
  sh.payment_method,
  sh.amount,
  sh.currency,
  sh.activated_at,
  sh.expires_at
FROM public.subscription_history sh
JOIN public.profiles p ON sh.user_id = p.id
WHERE sh.payment_method = 'credit_card'
ORDER BY sh.activated_at DESC
LIMIT 5;

-- 4. Show the issue: users with credit card subscriptions have NULL code
SELECT
  p.email,
  p.subscription_type,
  p.subscription_expires_at,
  p.current_subscription_code_id,
  CASE
    WHEN p.current_subscription_code_id IS NULL AND p.subscription_expires_at IS NOT NULL
    THEN '⚠️ Credit card subscription - no code ID'
    WHEN p.current_subscription_code_id IS NOT NULL
    THEN '✓ Code-based subscription'
    ELSE 'No subscription'
  END as status
FROM public.profiles p
WHERE p.subscription_expires_at IS NOT NULL
ORDER BY p.created_at DESC;

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'SUBSCRIPTION TRACKING ANALYSIS';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Issue: Credit card subscriptions have NULL current_subscription_code_id';
  RAISE NOTICE 'Solution: Update get_users_with_email to show subscription_type instead';
  RAISE NOTICE '============================================';
END $$;
