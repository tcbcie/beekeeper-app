-- ============================================================================
-- DIAGNOSE CREDIT CARD SUBSCRIPTION ISSUES
-- ============================================================================
-- Check function signature, subscription_history, and test the function
-- ============================================================================

-- 1. Check the current function signature
SELECT
  routine_name,
  routine_type,
  specific_name,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'activate_credit_card_subscription';

-- 2. Check function parameters
SELECT
  parameter_name,
  data_type,
  parameter_mode,
  ordinal_position
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND specific_name IN (
    SELECT specific_name
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'activate_credit_card_subscription'
  )
ORDER BY ordinal_position;

-- 3. Check subscription_history table
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'SUBSCRIPTION HISTORY CHECK';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total records: %', (SELECT COUNT(*) FROM public.subscription_history);
  RAISE NOTICE 'Credit card records: %', (SELECT COUNT(*) FROM public.subscription_history WHERE subscription_type = 'credit_card');
  RAISE NOTICE 'Records with code: %', (SELECT COUNT(*) FROM public.subscription_history WHERE code IS NOT NULL);
  RAISE NOTICE '';
  RAISE NOTICE 'Recent credit card subscriptions:';
END $$;

SELECT
  user_id,
  code,
  code_id,
  activated_at,
  expires_at,
  price_paid,
  stripe_payment_intent_id
FROM public.subscription_history
WHERE subscription_type = 'credit_card'
ORDER BY activated_at DESC
LIMIT 5;

-- 4. Check profiles with credit card subscriptions
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'PROFILES WITH CREDIT CARD SUBSCRIPTIONS';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total with credit card: %', (SELECT COUNT(*) FROM public.profiles WHERE subscription_type = 'credit_card');
  RAISE NOTICE 'With subscription_code_id: %', (SELECT COUNT(*) FROM public.profiles WHERE subscription_type = 'credit_card' AND current_subscription_code_id IS NOT NULL);
  RAISE NOTICE 'Without subscription_code_id: %', (SELECT COUNT(*) FROM public.profiles WHERE subscription_type = 'credit_card' AND current_subscription_code_id IS NULL);
END $$;

SELECT
  id,
  email,
  subscription_type,
  subscription_price,
  is_association_member,
  current_subscription_code_id,
  subscription_expires_at
FROM public.profiles
WHERE subscription_type = 'credit_card'
ORDER BY created_at DESC
LIMIT 5;

-- 5. Check if p_association_code parameter exists
DO $$
DECLARE
  param_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.parameters
    WHERE specific_schema = 'public'
      AND routine_name = 'activate_credit_card_subscription'
      AND parameter_name = 'p_association_code'
  ) INTO param_exists;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'PARAMETER CHECK';
  RAISE NOTICE '============================================';
  IF param_exists THEN
    RAISE NOTICE '✅ p_association_code parameter EXISTS';
  ELSE
    RAISE NOTICE '❌ p_association_code parameter MISSING';
    RAISE NOTICE 'You need to run: sql/fix_credit_card_preserve_association_code.sql';
  END IF;
END $$;

-- 6. Check subscription_codes table
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'SUBSCRIPTION CODES';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total codes: %', (SELECT COUNT(*) FROM public.subscription_codes);
  RAISE NOTICE 'Active codes: %', (SELECT COUNT(*) FROM public.subscription_codes WHERE is_active = TRUE);
END $$;

SELECT
  id,
  code,
  code_type,
  is_active,
  times_used,
  max_uses
FROM public.subscription_codes
WHERE is_active = TRUE
LIMIT 10;

-- 7. Summary
DO $$
DECLARE
  param_exists BOOLEAN;
  history_count INTEGER;
  codes_with_history INTEGER;
BEGIN
  -- Check parameter
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.parameters
    WHERE specific_schema = 'public'
      AND routine_name = 'activate_credit_card_subscription'
      AND parameter_name = 'p_association_code'
  ) INTO param_exists;

  -- Check history
  SELECT COUNT(*) INTO history_count
  FROM public.subscription_history
  WHERE subscription_type = 'credit_card';

  SELECT COUNT(*) INTO codes_with_history
  FROM public.subscription_history
  WHERE subscription_type = 'credit_card' AND code IS NOT NULL;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'SUMMARY';
  RAISE NOTICE '============================================';

  IF NOT param_exists THEN
    RAISE NOTICE '❌ PROBLEM: Function missing p_association_code parameter';
    RAISE NOTICE '   ACTION: Run sql/fix_credit_card_preserve_association_code.sql';
  ELSE
    RAISE NOTICE '✅ Function has p_association_code parameter';
  END IF;

  IF history_count = 0 THEN
    RAISE NOTICE '⚠️  WARNING: No credit card subscriptions in history';
    RAISE NOTICE '   This suggests subscriptions are not being logged';
  ELSE
    RAISE NOTICE '✅ Found % credit card subscriptions in history', history_count;
  END IF;

  IF codes_with_history = 0 AND history_count > 0 THEN
    RAISE NOTICE '⚠️  WARNING: Credit card subscriptions exist but none have codes';
    RAISE NOTICE '   Codes are not being stored';
  ELSIF codes_with_history > 0 THEN
    RAISE NOTICE '✅ Found % subscriptions with association codes', codes_with_history;
  END IF;

  RAISE NOTICE '============================================';
END $$;
