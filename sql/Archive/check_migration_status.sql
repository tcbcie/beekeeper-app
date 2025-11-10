-- ============================================================================
-- CHECK IF MIGRATION RAN SUCCESSFULLY
-- ============================================================================
-- Run this to verify the subscription system fix was applied
-- ============================================================================

-- Check if functions exist and their signatures
SELECT
  routine_name,
  routine_type,
  data_type as return_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'activate_subscription',
    'activate_credit_card_subscription',
    'get_subscription_history',
    'increment_code_uses'
  )
ORDER BY routine_name;

-- Check subscription_history table schema
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'subscription_history'
ORDER BY ordinal_position;

-- Check if duration_days column exists (should NOT exist)
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'subscription_history'
        AND column_name = 'duration_days'
    ) THEN '❌ MIGRATION NOT RUN - duration_days still exists!'
    ELSE '✅ Migration ran - duration_days removed'
  END as migration_status;

-- Check indexes were created
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('subscription_history', 'registration_codes', 'profiles')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Test activate_subscription function with a dummy code
-- This will fail gracefully if code doesn't exist
SELECT activate_subscription('TEST_CODE_DOES_NOT_EXIST');
