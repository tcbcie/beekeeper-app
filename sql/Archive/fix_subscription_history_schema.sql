-- ============================================================================
-- FIX SUBSCRIPTION_HISTORY SCHEMA FOR CREDIT CARD SUBSCRIPTIONS
-- ============================================================================
-- Make code_id and code nullable since credit card subscriptions don't use codes
-- ============================================================================

-- 1. Drop the NOT NULL constraint on code_id
ALTER TABLE public.subscription_history
ALTER COLUMN code_id DROP NOT NULL;

-- 2. Drop the NOT NULL constraint on code (if it exists)
ALTER TABLE public.subscription_history
ALTER COLUMN code DROP NOT NULL;

-- Verify changes
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'subscription_history'
  AND column_name IN ('code_id', 'code')
ORDER BY column_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ subscription_history schema updated';
  RAISE NOTICE '✅ code_id and code are now nullable';
  RAISE NOTICE '✅ Credit card subscriptions can now be recorded properly';
END $$;
