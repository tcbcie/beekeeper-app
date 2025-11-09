-- ============================================================================
-- TEST CREDIT CARD SUBSCRIPTION ACTIVATION
-- ============================================================================
-- This script tests the activate_credit_card_subscription function
-- ============================================================================

-- 1. Check if function exists
SELECT
  routine_name,
  routine_type,
  specific_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'activate_credit_card_subscription';

-- 2. Check function signature
SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'activate_credit_card_subscription';

-- 3. Check if profiles table has required columns
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN (
    'subscription_type',
    'subscription_price',
    'subscription_expires_at',
    'is_association_member',
    'association_id',
    'stripe_customer_id'
  )
ORDER BY column_name;

-- 4. Check if subscription_history table has required columns
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'subscription_history'
  AND column_name IN (
    'subscription_type',
    'price_paid',
    'payment_method',
    'stripe_payment_intent_id'
  )
ORDER BY column_name;

-- 5. Test function with a real user (replace with actual user ID)
-- UNCOMMENT AND RUN THIS WITH A REAL USER ID TO TEST:
/*
SELECT public.activate_credit_card_subscription(
  p_user_id := 'YOUR_USER_ID_HERE'::uuid,
  p_stripe_payment_intent_id := 'pi_test_12345',
  p_is_association_member := true,
  p_association_id := (SELECT id FROM public.beekeeping_associations LIMIT 1),
  p_price_paid := 12.00
);
*/

-- 6. Check recent subscription history entries
SELECT
  user_id,
  activated_at,
  expires_at,
  subscription_type,
  price_paid,
  payment_method,
  stripe_payment_intent_id,
  created_at
FROM public.subscription_history
ORDER BY created_at DESC
LIMIT 5;

-- 7. Check profiles with credit card subscriptions
SELECT
  id,
  email,
  subscription_type,
  subscription_price,
  subscription_expires_at,
  is_association_member,
  stripe_customer_id,
  created_at
FROM public.profiles
WHERE subscription_type = 'credit_card'
ORDER BY created_at DESC
LIMIT 5;
