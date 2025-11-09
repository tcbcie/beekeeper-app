-- ============================================================================
-- VERIFY SUBSCRIPTION SCHEMA
-- ============================================================================
-- Check actual table structure vs what functions expect
-- ============================================================================

-- Check subscription_history table columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'subscription_history'
ORDER BY ordinal_position;

-- Check if these specific columns exist (what our function uses)
SELECT
  column_name,
  CASE
    WHEN column_name = 'user_id' THEN '✓ Required for function'
    WHEN column_name = 'code_id' THEN '✓ Required for function (nullable)'
    WHEN column_name = 'code' THEN '✓ Required for function (nullable)'
    WHEN column_name = 'activated_at' THEN '✓ Required for function'
    WHEN column_name = 'expires_at' THEN '✓ Required for function'
    WHEN column_name = 'subscription_type' THEN '✓ Required for function'
    WHEN column_name = 'price_paid' THEN '✓ Required for function'
    WHEN column_name = 'payment_method' THEN '✓ Required for function'
    WHEN column_name = 'stripe_payment_intent_id' THEN '○ Optional for credit card'
    WHEN column_name = 'duration_days' THEN '❌ SHOULD NOT EXIST'
    ELSE '○ Other column'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'subscription_history'
ORDER BY ordinal_position;

-- Check registration_codes columns
SELECT
  column_name,
  CASE
    WHEN column_name = 'subscription_expires_at' THEN '✓ Required (fixed expiry)'
    WHEN column_name = 'subscription_duration_days' THEN '❌ SHOULD NOT EXIST'
    ELSE '○ Other column'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'registration_codes'
  AND column_name IN ('subscription_expires_at', 'subscription_duration_days')
ORDER BY column_name;

-- Test if the function exists and can be called
SELECT
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'activate_subscription';
