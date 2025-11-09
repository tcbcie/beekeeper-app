-- =====================================================
-- Add Subscription Code Types (Individual vs Association)
-- SIMPLIFIED VERSION - Assumes subscription_expires_at already exists
-- Created: November 8, 2025
-- =====================================================

-- This migration adds support for two types of subscription codes:
-- 1. Individual: For direct user subscriptions (current functionality)
-- 2. Association: For beekeeping association member codes

-- =====================================================
-- PART 1: Add code_type column to registration_codes
-- =====================================================

-- Add code_type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_code_type') THEN
    CREATE TYPE subscription_code_type AS ENUM ('individual', 'association');
    RAISE NOTICE '✓ Created subscription_code_type enum';
  ELSE
    RAISE NOTICE '→ subscription_code_type enum already exists';
  END IF;
END $$;

-- Add code_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registration_codes' AND column_name = 'code_type'
  ) THEN
    ALTER TABLE public.registration_codes
    ADD COLUMN code_type subscription_code_type DEFAULT 'individual' NOT NULL;

    RAISE NOTICE '✓ Added code_type column to registration_codes';
  ELSE
    RAISE NOTICE '→ code_type column already exists';
  END IF;
END $$;

-- =====================================================
-- PART 2: Add association_id column to registration_codes
-- =====================================================

-- Add association_id (nullable, only for association codes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registration_codes' AND column_name = 'association_id'
  ) THEN
    ALTER TABLE public.registration_codes
    ADD COLUMN association_id UUID REFERENCES public.beekeeping_associations(id) ON DELETE SET NULL;

    RAISE NOTICE '✓ Added association_id column to registration_codes';
  ELSE
    RAISE NOTICE '→ association_id column already exists';
  END IF;
END $$;

-- Create index for association lookups
CREATE INDEX IF NOT EXISTS idx_registration_codes_association_id
ON public.registration_codes(association_id)
WHERE association_id IS NOT NULL;

-- =====================================================
-- PART 3: Add association_id to profiles table
-- =====================================================
-- When user activates an association code, link them to that association

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'association_id'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN association_id UUID REFERENCES public.beekeeping_associations(id) ON DELETE SET NULL;

    RAISE NOTICE '✓ Added association_id column to profiles';
  ELSE
    RAISE NOTICE '→ association_id column already exists in profiles';
  END IF;
END $$;

-- Add is_association_member flag (for quick queries)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_association_member'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN is_association_member BOOLEAN DEFAULT false;

    -- Set existing association members
    UPDATE public.profiles
    SET is_association_member = true
    WHERE association_id IS NOT NULL;

    RAISE NOTICE '✓ Added is_association_member column to profiles';
  ELSE
    RAISE NOTICE '→ is_association_member column already exists in profiles';
  END IF;
END $$;

-- Create index for association member queries
CREATE INDEX IF NOT EXISTS idx_profiles_association_id
ON public.profiles(association_id)
WHERE association_id IS NOT NULL;

-- =====================================================
-- PART 4: Add check constraint
-- =====================================================
-- Ensure association codes have association_id set

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_association_code_has_association'
  ) THEN
    ALTER TABLE public.registration_codes
    ADD CONSTRAINT chk_association_code_has_association
    CHECK (
      (code_type = 'individual' AND association_id IS NULL) OR
      (code_type = 'association' AND association_id IS NOT NULL)
    );

    RAISE NOTICE '✓ Added check constraint for association codes';
  ELSE
    RAISE NOTICE '→ Check constraint already exists';
  END IF;
END $$;

-- =====================================================
-- PART 5: Update comments
-- =====================================================

COMMENT ON COLUMN public.registration_codes.code_type IS
  'Type of subscription code: individual (direct user) or association (beekeeping association member)';

COMMENT ON COLUMN public.registration_codes.association_id IS
  'For association codes: links to the beekeeping association. NULL for individual codes.';

COMMENT ON COLUMN public.profiles.association_id IS
  'Beekeeping association this user is a member of (set when activating association code)';

COMMENT ON COLUMN public.profiles.is_association_member IS
  'Quick flag indicating if user is an association member (has association_id set)';

-- =====================================================
-- PART 6: Create function to activate association code
-- =====================================================

CREATE OR REPLACE FUNCTION activate_association_subscription_code(
  p_user_id UUID,
  p_code TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  association_name TEXT
) AS $$
DECLARE
  v_code_record RECORD;
  v_association_name TEXT;
BEGIN
  -- Find and validate the code
  SELECT
    rc.id,
    rc.code,
    rc.code_type,
    rc.association_id,
    rc.subscription_expires_at,
    rc.max_uses,
    rc.current_uses,
    rc.is_active,
    ba.name as assoc_name
  INTO v_code_record
  FROM registration_codes rc
  LEFT JOIN beekeeping_associations ba ON ba.id = rc.association_id
  WHERE UPPER(rc.code) = UPPER(p_code)
    AND rc.code_type = 'association';

  -- Code not found or not association type
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid association code'::TEXT, NULL::TIMESTAMP WITH TIME ZONE, NULL::TEXT;
    RETURN;
  END IF;

  -- Check if code is active
  IF NOT v_code_record.is_active THEN
    RETURN QUERY SELECT false, 'This code has been disabled'::TEXT, NULL::TIMESTAMP WITH TIME ZONE, NULL::TEXT;
    RETURN;
  END IF;

  -- Check max uses
  IF v_code_record.max_uses IS NOT NULL AND v_code_record.current_uses >= v_code_record.max_uses THEN
    RETURN QUERY SELECT false, 'This code has reached its maximum number of uses'::TEXT, NULL::TIMESTAMP WITH TIME ZONE, NULL::TEXT;
    RETURN;
  END IF;

  -- Update user profile with association membership
  UPDATE profiles
  SET
    subscription_expires_at = v_code_record.subscription_expires_at,
    current_subscription_code_id = v_code_record.id,
    association_id = v_code_record.association_id,
    is_association_member = true,
    subscription_type = 'code'
  WHERE id = p_user_id;

  -- Increment code usage count
  UPDATE registration_codes
  SET current_uses = current_uses + 1
  WHERE id = v_code_record.id;

  -- Add to subscription history
  INSERT INTO subscription_history (
    user_id,
    code_id,
    code,
    activated_at,
    expires_at,
    subscription_type
  ) VALUES (
    p_user_id,
    v_code_record.id,
    v_code_record.code,
    NOW(),
    v_code_record.subscription_expires_at,
    'code'
  );

  -- Return success
  RETURN QUERY SELECT
    true,
    'Association membership activated successfully!'::TEXT,
    v_code_record.subscription_expires_at,
    v_code_record.assoc_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION activate_association_subscription_code IS
  'Activates an association subscription code and links user to the beekeeping association';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION activate_association_subscription_code TO authenticated;

-- =====================================================
-- PART 7: Verification
-- =====================================================

DO $$
DECLARE
  total_codes INTEGER;
  individual_codes INTEGER;
  association_codes INTEGER;
  associations_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION VERIFICATION';
  RAISE NOTICE '========================================';

  -- Count codes by type
  SELECT COUNT(*) INTO total_codes FROM registration_codes;
  SELECT COUNT(*) INTO individual_codes FROM registration_codes WHERE code_type = 'individual';
  SELECT COUNT(*) INTO association_codes FROM registration_codes WHERE code_type = 'association';

  RAISE NOTICE 'Total registration codes: %', total_codes;
  RAISE NOTICE 'Individual codes: %', individual_codes;
  RAISE NOTICE 'Association codes: %', association_codes;

  -- Count associations
  SELECT COUNT(*) INTO associations_count FROM beekeeping_associations;
  RAISE NOTICE 'Beekeeping associations: %', associations_count;

  -- Verify constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_association_code_has_association'
  ) THEN
    RAISE NOTICE '✓ Association code constraint verified';
  ELSE
    RAISE NOTICE '⚠ WARNING: Association code constraint missing';
  END IF;

  -- Check for orphaned association codes
  DECLARE
    orphaned_codes INTEGER;
  BEGIN
    SELECT COUNT(*) INTO orphaned_codes
    FROM registration_codes rc
    WHERE rc.code_type = 'association'
      AND NOT EXISTS (
        SELECT 1 FROM beekeeping_associations ba WHERE ba.id = rc.association_id
      );

    IF orphaned_codes > 0 THEN
      RAISE NOTICE '⚠ WARNING: % association codes reference non-existent associations', orphaned_codes;
    ELSE
      RAISE NOTICE '✓ All association codes have valid associations';
    END IF;
  END;

  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Show sample codes by type
SELECT
  'Code Types Summary' as summary,
  code_type,
  COUNT(*) as count,
  COUNT(DISTINCT association_id) FILTER (WHERE code_type = 'association') as distinct_associations
FROM registration_codes
GROUP BY code_type;

-- Show association codes with their associations (if any exist)
SELECT
  rc.code,
  rc.code_type,
  ba.name as association,
  ba.jurisdiction,
  rc.subscription_expires_at,
  rc.current_uses,
  rc.max_uses
FROM registration_codes rc
LEFT JOIN beekeeping_associations ba ON ba.id = rc.association_id
WHERE rc.code_type = 'association'
ORDER BY ba.name
LIMIT 10;

-- Final message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SUBSCRIPTION CODE TYPES MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  • Added code_type (individual/association)';
  RAISE NOTICE '  • Added association_id to registration_codes';
  RAISE NOTICE '  • Added association_id to profiles';
  RAISE NOTICE '  • Created activate_association_subscription_code function';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Frontend already updated to support both code types';
  RAISE NOTICE '  2. Test creating individual and association codes';
  RAISE NOTICE '  3. Test association code activation';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
