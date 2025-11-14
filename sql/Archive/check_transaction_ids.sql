-- ============================================================================
-- CHECK TRANSACTION IDS IN DATABASE
-- ============================================================================
-- Verify if users have transaction IDs
-- ============================================================================

-- 1. Check if any users have credit_card subscription
SELECT
  id,
  email,
  subscription_type,
  subscription_expires_at
FROM public.profiles
WHERE subscription_type = 'credit_card'
  AND deleted_at IS NULL;

-- 2. Check subscription_history for credit card payments
SELECT
  user_id,
  code,
  stripe_payment_intent_id,
  activated_at,
  price_paid
FROM public.subscription_history
WHERE subscription_type = 'credit_card'
ORDER BY activated_at DESC;

-- 3. Test the get_users_with_email function
SELECT
  id,
  email,
  subscription_type,
  latest_transaction_id
FROM public.get_users_with_email()
WHERE subscription_type = 'credit_card';

-- 4. Summary
DO $$
DECLARE
  credit_card_users INTEGER;
  history_records INTEGER;
  users_with_tx_id INTEGER;
BEGIN
  SELECT COUNT(*) INTO credit_card_users
  FROM public.profiles
  WHERE subscription_type = 'credit_card' AND deleted_at IS NULL;

  SELECT COUNT(*) INTO history_records
  FROM public.subscription_history
  WHERE subscription_type = 'credit_card';

  SELECT COUNT(*) INTO users_with_tx_id
  FROM public.get_users_with_email()
  WHERE latest_transaction_id IS NOT NULL;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'TRANSACTION ID DIAGNOSTIC';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Users with credit_card subscription: %', credit_card_users;
  RAISE NOTICE 'Credit card records in history: %', history_records;
  RAISE NOTICE 'Users with transaction ID in function: %', users_with_tx_id;
  RAISE NOTICE '';

  IF credit_card_users = 0 THEN
    RAISE NOTICE '❌ No users have credit_card subscription type';
    RAISE NOTICE '   Transaction ID will only show for credit card subscribers';
  END IF;

  IF history_records = 0 THEN
    RAISE NOTICE '❌ No credit card payment records in subscription_history';
    RAISE NOTICE '   Make a test payment to see transaction IDs';
  END IF;

  IF users_with_tx_id = 0 AND history_records > 0 THEN
    RAISE NOTICE '⚠️  History has records but function returns no transaction IDs';
    RAISE NOTICE '   Check the LATERAL join in get_users_with_email()';
  END IF;

  IF users_with_tx_id > 0 THEN
    RAISE NOTICE '✅ Found % users with transaction IDs!', users_with_tx_id;
    RAISE NOTICE '   They should appear in user management';
  END IF;

  RAISE NOTICE '============================================';
END $$;
