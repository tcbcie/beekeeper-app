-- =====================================================
-- Clean Up Unused Database Columns
-- Created: November 8, 2025
-- =====================================================

-- This migration removes unused columns from the registration_codes table
-- that are no longer referenced in the application code.

-- =====================================================
-- PART 1: Remove unused columns from registration_codes
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CLEANING UP UNUSED COLUMNS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Drop code_expires_at (not used in app, only in archived SQL)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registration_codes' AND column_name = 'code_expires_at'
  ) THEN
    ALTER TABLE public.registration_codes DROP COLUMN code_expires_at;
    RAISE NOTICE '✓ Removed code_expires_at column';
  ELSE
    RAISE NOTICE '→ code_expires_at column already removed';
  END IF;
END $$;

-- Drop issued_by_association_id (superseded by association_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registration_codes' AND column_name = 'issued_by_association_id'
  ) THEN
    -- First drop the foreign key constraint
    ALTER TABLE public.registration_codes
    DROP CONSTRAINT IF EXISTS registration_codes_issued_by_association_id_fkey;

    -- Then drop the column
    ALTER TABLE public.registration_codes DROP COLUMN issued_by_association_id;
    RAISE NOTICE '✓ Removed issued_by_association_id column and constraint';
  ELSE
    RAISE NOTICE '→ issued_by_association_id column already removed';
  END IF;
END $$;

-- Drop issued_by_name (not used in app)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registration_codes' AND column_name = 'issued_by_name'
  ) THEN
    ALTER TABLE public.registration_codes DROP COLUMN issued_by_name;
    RAISE NOTICE '✓ Removed issued_by_name column';
  ELSE
    RAISE NOTICE '→ issued_by_name column already removed';
  END IF;
END $$;

-- Drop price (pricing is hardcoded in Stripe routes, not database-driven)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registration_codes' AND column_name = 'price'
  ) THEN
    ALTER TABLE public.registration_codes DROP COLUMN price;
    RAISE NOTICE '✓ Removed price column';
  ELSE
    RAISE NOTICE '→ price column already removed';
  END IF;
END $$;

-- Drop subscription_type (has constraint but not used in app code)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registration_codes' AND column_name = 'subscription_type'
  ) THEN
    -- First drop the check constraint
    ALTER TABLE public.registration_codes
    DROP CONSTRAINT IF EXISTS registration_codes_subscription_type_check;

    -- Then drop the column
    ALTER TABLE public.registration_codes DROP COLUMN subscription_type;
    RAISE NOTICE '✓ Removed subscription_type column and constraint';
  ELSE
    RAISE NOTICE '→ subscription_type column already removed';
  END IF;
END $$;

-- Drop expires_at (redundant with subscription_expires_at, always set to far future)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registration_codes' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.registration_codes DROP COLUMN expires_at;
    RAISE NOTICE '✓ Removed expires_at column (redundant with subscription_expires_at)';
  ELSE
    RAISE NOTICE '→ expires_at column already removed';
  END IF;
END $$;

-- =====================================================
-- PART 2: Fix get_subscription_history function
-- =====================================================

-- Drop the existing function first (it may have a different signature)
DROP FUNCTION IF EXISTS get_subscription_history();

-- Recreate the function without references to removed columns
CREATE OR REPLACE FUNCTION get_subscription_history()
RETURNS TABLE (
  id UUID,
  code TEXT,
  activated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_current BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sh.id,
    sh.code::TEXT,  -- Explicit cast from varchar(50) to TEXT
    sh.activated_at,
    sh.expires_at,
    (p.current_subscription_code_id = sh.code_id) as is_current
  FROM subscription_history sh
  JOIN profiles p ON p.id = sh.user_id
  WHERE sh.user_id = auth.uid()
  ORDER BY sh.activated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_subscription_history IS
  'Returns subscription history for the current authenticated user';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_subscription_history TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✓ Recreated get_subscription_history function';
END $$;

-- =====================================================
-- Create function to increment code usage count
-- =====================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS increment_code_uses(TEXT);

-- Create function to safely increment current_uses
CREATE OR REPLACE FUNCTION increment_code_uses(p_code TEXT)
RETURNS void AS $$
BEGIN
  UPDATE registration_codes
  SET current_uses = current_uses + 1
  WHERE code = p_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_code_uses IS
  'Increments the current_uses counter for a registration code';

-- Grant execute permission to service role (used by webhook)
GRANT EXECUTE ON FUNCTION increment_code_uses TO service_role;

DO $$
BEGIN
  RAISE NOTICE '✓ Created increment_code_uses function';
END $$;

-- =====================================================
-- PART 3: Verification
-- =====================================================

DO $$
DECLARE
  remaining_columns TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION';
  RAISE NOTICE '========================================';

  -- List remaining columns in registration_codes
  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
  INTO remaining_columns
  FROM information_schema.columns
  WHERE table_name = 'registration_codes'
    AND table_schema = 'public';

  RAISE NOTICE 'Remaining columns in registration_codes:';
  RAISE NOTICE '  %', remaining_columns;
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- Final message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CLEANUP MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '';
  RAISE NOTICE 'Removed columns:';
  RAISE NOTICE '  • code_expires_at (unused)';
  RAISE NOTICE '  • issued_by_association_id (superseded by association_id)';
  RAISE NOTICE '  • issued_by_name (unused)';
  RAISE NOTICE '  • price (hardcoded in Stripe routes)';
  RAISE NOTICE '  • subscription_type (unused in app)';
  RAISE NOTICE '  • expires_at (redundant with subscription_expires_at)';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed/Created functions:';
  RAISE NOTICE '  • get_subscription_history() - fixed type mismatch (varchar → TEXT cast)';
  RAISE NOTICE '  • increment_code_uses() - tracks association code usage';
  RAISE NOTICE '';
  RAISE NOTICE 'Remaining columns provide:';
  RAISE NOTICE '  • Core code data (id, code, description)';
  RAISE NOTICE '  • Usage tracking (max_uses, current_uses, is_active)';
  RAISE NOTICE '  • Subscription info (subscription_expires_at)';
  RAISE NOTICE '  • Code types (code_type, association_id)';
  RAISE NOTICE '  • Audit trail (created_by, created_at, updated_at)';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
