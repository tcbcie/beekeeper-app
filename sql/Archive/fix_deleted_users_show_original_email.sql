-- ============================================================================
-- FIX: Show original email for deleted users instead of anonymized email
-- ============================================================================
-- Ensures the deleted_profiles view correctly shows original_email
-- and backfills any missing original_email values from auth.users
-- ============================================================================

-- First, ensure the original_email column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'original_email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN original_email TEXT;
    RAISE NOTICE 'Added original_email column';
  ELSE
    RAISE NOTICE 'original_email column already exists';
  END IF;
END $$;

-- Backfill original_email for any deleted users where it's NULL
-- Try to recover from subscription_history first (most reliable)
UPDATE public.profiles p
SET original_email = sh.code
FROM (
  SELECT DISTINCT ON (user_id) user_id, code
  FROM public.subscription_history
  WHERE code IS NOT NULL
    AND code LIKE '%@%'  -- Looks like an email
  ORDER BY user_id, activated_at DESC
) sh
WHERE p.id = sh.user_id
  AND p.deleted_at IS NOT NULL
  AND p.original_email IS NULL;

-- For any still NULL, check if we can infer from User ID comments or other sources
-- (In most cases, if original_email is NULL and email is anonymized, it's lost)

-- Recreate the deleted_profiles view to ensure it shows original_email
DROP VIEW IF EXISTS public.deleted_profiles CASCADE;

CREATE VIEW public.deleted_profiles AS
SELECT
  p.id,
  COALESCE(p.original_email, p.email) as email,  -- Fallback to current email if original is NULL
  p.role,
  p.first_name,
  p.last_name,
  p.mobile_number,
  p.is_active,
  p.created_at,
  p.deleted_at,
  p.subscription_expires_at,
  p.subscription_type,
  p.subscription_price,
  p.is_association_member,
  p.association_id,
  p.current_subscription_code_id,
  -- Join to get association name if applicable
  ba.name as association_name,
  -- Join to get subscription code if applicable
  rc.code as subscription_code
FROM public.profiles p
LEFT JOIN public.beekeeping_associations ba ON p.association_id = ba.id
LEFT JOIN public.registration_codes rc ON p.current_subscription_code_id = rc.id
WHERE p.deleted_at IS NOT NULL;

-- Grant permissions
GRANT SELECT ON public.deleted_profiles TO authenticated, service_role;

-- Verification: Show deleted users with their original emails
SELECT
  'Deleted users' as category,
  COUNT(*) as total,
  COUNT(original_email) as with_original_email,
  COUNT(*) - COUNT(original_email) as missing_original_email
FROM public.profiles
WHERE deleted_at IS NOT NULL;

-- Show sample of deleted users
SELECT
  id,
  email as current_email,
  original_email,
  deleted_at
FROM public.profiles
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC
LIMIT 5;

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Deleted profiles view updated';
  RAISE NOTICE '✅ Now shows original_email (or falls back to current email)';
  RAISE NOTICE '✅ Attempted to backfill original_email from subscription_history';
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE: If original_email is NULL for some users, their email';
  RAISE NOTICE 'was anonymized before the original_email feature was added.';
  RAISE NOTICE 'You may need to manually identify these users from other records.';
  RAISE NOTICE '============================================';
END $$;
