-- Diagnose why credit card subscription activation failed
-- Run this to check the current state and identify the issue

-- 1. Check subscription_history table schema
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'subscription_history'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check profiles table schema (subscription-related columns)
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND table_schema = 'public'
  AND column_name IN (
    'subscription_expires_at',
    'subscription_type',
    'subscription_price',
    'is_association_member',
    'association_id',
    'current_subscription_code_id'
  )
ORDER BY ordinal_position;

-- 3. Check if activate_credit_card_subscription function exists
SELECT
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'activate_credit_card_subscription';

-- 4. Check for recent Stripe payment intents (to verify webhook was called)
-- Look for the most recent subscription_history entries
SELECT
  id,
  user_id,
  code_id,
  code,
  activated_at,
  expires_at,
  subscription_type,
  price_paid,
  payment_method,
  stripe_payment_intent_id,
  created_at
FROM subscription_history
ORDER BY created_at DESC
LIMIT 5;

-- 5. Check the user's current profile status
-- Replace 'YOUR-USER-ID' with the actual user ID who made the payment
/*
SELECT
  id,
  email,
  subscription_expires_at,
  subscription_type,
  subscription_price,
  is_association_member,
  association_id,
  current_subscription_code_id
FROM profiles
WHERE id = 'YOUR-USER-ID';
*/
