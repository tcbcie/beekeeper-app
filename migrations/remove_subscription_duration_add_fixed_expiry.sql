-- =====================================================
-- Remove Subscription Duration, Add Fixed Expiration Date
-- Created: November 8, 2025
-- =====================================================
-- This migration replaces subscription_duration_days with a fixed
-- subscription_expires_at date on registration codes.
-- This simplifies the system: codes now have a single expiration date
-- that applies to all users who activate them.

-- =====================================================
-- PART 1: Add new column to registration_codes
-- =====================================================

-- Add subscription_expires_at column (the date when subscriptions activated with this code will expire)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registration_codes' AND column_name = 'subscription_expires_at'
  ) THEN
    ALTER TABLE public.registration_codes
    ADD COLUMN subscription_expires_at TIMESTAMP WITH TIME ZONE;

    RAISE NOTICE '✓ Added subscription_expires_at column to registration_codes';
  ELSE
    RAISE NOTICE '→ subscription_expires_at column already exists';
  END IF;
END $$;

-- =====================================================
-- PART 2: Migrate existing data
-- =====================================================
-- Convert existing duration_days to fixed expiration dates
-- For existing codes, set expiration to NOW() + duration_days

DO $$
DECLARE
  codes_migrated INTEGER := 0;
BEGIN
  RAISE NOTICE 'Migrating existing duration_days to subscription_expires_at...';

  -- Update codes that have duration_days but no subscription_expires_at
  UPDATE registration_codes
  SET subscription_expires_at = CASE
    -- Lifetime codes (duration = 0) get expiration 100 years from now
    WHEN subscription_duration_days = 0 THEN NOW() + INTERVAL '100 years'
    -- Regular codes get expiration based on duration from now
    ELSE NOW() + (subscription_duration_days || ' days')::INTERVAL
  END
  WHERE subscription_expires_at IS NULL
    AND subscription_duration_days IS NOT NULL;

  GET DIAGNOSTICS codes_migrated = ROW_COUNT;
  RAISE NOTICE '→ Migrated % registration codes', codes_migrated;
END $$;

-- =====================================================
-- PART 3: Remove duration_days column from registration_codes
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registration_codes' AND column_name = 'subscription_duration_days'
  ) THEN
    ALTER TABLE public.registration_codes
    DROP COLUMN subscription_duration_days;

    RAISE NOTICE '✓ Removed subscription_duration_days column from registration_codes';
  ELSE
    RAISE NOTICE '→ subscription_duration_days column already removed';
  END IF;
END $$;

-- =====================================================
-- PART 4: Remove duration_days from subscription_history
-- =====================================================
-- subscription_history already has expires_at, so duration_days is redundant

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_history' AND column_name = 'duration_days'
  ) THEN
    ALTER TABLE public.subscription_history
    DROP COLUMN duration_days;

    RAISE NOTICE '✓ Removed duration_days column from subscription_history';
  ELSE
    RAISE NOTICE '→ duration_days column already removed from subscription_history';
  END IF;
END $$;

-- =====================================================
-- PART 5: Update comments and constraints
-- =====================================================

COMMENT ON COLUMN public.registration_codes.subscription_expires_at IS
  'Fixed expiration date for subscriptions activated with this code. All users activating this code will have their subscription expire on this date.';

COMMENT ON TABLE public.registration_codes IS
  'Subscription codes with fixed expiration dates. When a user activates a code, their subscription expires on the code''s subscription_expires_at date.';

-- =====================================================
-- PART 6: Verification
-- =====================================================

DO $$
DECLARE
  total_codes INTEGER;
  codes_with_expiry INTEGER;
  codes_without_expiry INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION VERIFICATION';
  RAISE NOTICE '========================================';

  -- Count total codes
  SELECT COUNT(*) INTO total_codes FROM registration_codes;
  RAISE NOTICE 'Total registration codes: %', total_codes;

  -- Count codes with expiration
  SELECT COUNT(*) INTO codes_with_expiry FROM registration_codes WHERE subscription_expires_at IS NOT NULL;
  RAISE NOTICE 'Codes with subscription_expires_at: %', codes_with_expiry;

  -- Count codes without expiration
  SELECT COUNT(*) INTO codes_without_expiry FROM registration_codes WHERE subscription_expires_at IS NULL;
  IF codes_without_expiry > 0 THEN
    RAISE NOTICE '⚠ Codes without subscription_expires_at: % (these need manual review)', codes_without_expiry;
  ELSE
    RAISE NOTICE '✓ All codes have subscription_expires_at set';
  END IF;

  -- Check if old columns still exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registration_codes' AND column_name = 'subscription_duration_days'
  ) THEN
    RAISE NOTICE '⚠ WARNING: subscription_duration_days still exists in registration_codes';
  ELSE
    RAISE NOTICE '✓ subscription_duration_days removed from registration_codes';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_history' AND column_name = 'duration_days'
  ) THEN
    RAISE NOTICE '⚠ WARNING: duration_days still exists in subscription_history';
  ELSE
    RAISE NOTICE '✓ duration_days removed from subscription_history';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Show sample of migrated codes
SELECT
  code,
  description,
  subscription_expires_at,
  CASE
    WHEN subscription_expires_at > NOW() + INTERVAL '50 years' THEN 'Lifetime (100 years)'
    WHEN subscription_expires_at > NOW() THEN 'Active until ' || TO_CHAR(subscription_expires_at, 'YYYY-MM-DD')
    ELSE 'Expired on ' || TO_CHAR(subscription_expires_at, 'YYYY-MM-DD')
  END as status,
  created_at
FROM registration_codes
ORDER BY subscription_expires_at DESC NULLS LAST
LIMIT 10;

-- Final message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  • Replaced subscription_duration_days with subscription_expires_at';
  RAISE NOTICE '  • All codes now have fixed expiration dates';
  RAISE NOTICE '  • Removed redundant duration_days columns';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Update frontend code to use subscription_expires_at';
  RAISE NOTICE '  2. Update code creation UI to set fixed expiration dates';
  RAISE NOTICE '  3. Test code activation with new schema';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
