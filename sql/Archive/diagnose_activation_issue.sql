-- ============================================================================
-- DIAGNOSE SUBSCRIPTION ACTIVATION ISSUE
-- ============================================================================
-- This script identifies which functions exist and what they do
-- ============================================================================

-- 1. List ALL subscription-related functions
SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type,
  p.prosrc AS source_code_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%subscription%'
ORDER BY p.proname;

-- 2. Check specifically for activate_credit_card_subscription
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc
      WHERE proname = 'activate_credit_card_subscription'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN '✅ Function activate_credit_card_subscription EXISTS'
    ELSE '❌ Function activate_credit_card_subscription DOES NOT EXIST - Need to run migration!'
  END AS status;

-- 3. Get full definition of activate_subscription (the old function)
SELECT '=== ACTIVATE_SUBSCRIPTION FUNCTION (OLD) ===' AS section;
SELECT pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'activate_subscription'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4. Get full definition of activate_credit_card_subscription (new function)
SELECT '=== ACTIVATE_CREDIT_CARD_SUBSCRIPTION FUNCTION (NEW) ===' AS section;
SELECT pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'activate_credit_card_subscription'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 5. Check what columns exist in subscription_history
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'subscription_history'
ORDER BY ordinal_position;

-- 6. Show the recent subscription that failed
SELECT
  'RECENT FAILED SUBSCRIPTION' AS info,
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
FROM public.subscription_history
WHERE user_id = '0c0dcdd3-9667-4171-a953-297315eae1f5'
ORDER BY activated_at DESC
LIMIT 1;

-- 7. Show user's current profile
SELECT
  'USER PROFILE' AS info,
  id,
  email,
  subscription_expires_at,
  subscription_type,
  subscription_price,
  is_association_member,
  association_id,
  current_subscription_code_id
FROM public.profiles
WHERE id = '0c0dcdd3-9667-4171-a953-297315eae1f5';
