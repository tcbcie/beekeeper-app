-- ============================================================================
-- FIX REACTIVATION REQUESTS UNIQUE CONSTRAINT
-- ============================================================================
-- The UNIQUE(user_id, status) constraint is too restrictive - it prevents
-- multiple rejected or approved requests for the same user. We only want to
-- prevent multiple PENDING requests.
-- ============================================================================

-- Drop the old constraint
ALTER TABLE public.reactivation_requests
  DROP CONSTRAINT IF EXISTS reactivation_requests_user_id_status_key;

-- Create a partial unique index that only applies to pending requests
-- This allows multiple approved/rejected requests but only one pending request per user
CREATE UNIQUE INDEX IF NOT EXISTS reactivation_requests_user_pending_idx
  ON public.reactivation_requests(user_id)
  WHERE status = 'pending';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ REACTIVATION UNIQUE CONSTRAINT FIXED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Old constraint: UNIQUE(user_id, status)';
  RAISE NOTICE '  Problem: Prevented multiple rejected/approved requests';
  RAISE NOTICE '';
  RAISE NOTICE 'New constraint: Partial unique index on (user_id) WHERE status = pending';
  RAISE NOTICE '  ✓ Only one pending request per user allowed';
  RAISE NOTICE '  ✓ Multiple approved requests allowed';
  RAISE NOTICE '  ✓ Multiple rejected requests allowed';
  RAISE NOTICE '';
  RAISE NOTICE 'This allows:';
  RAISE NOTICE '  ✓ User requests reactivation → pending';
  RAISE NOTICE '  ✓ Admin rejects → rejected';
  RAISE NOTICE '  ✓ User requests again → pending (no conflict)';
  RAISE NOTICE '  ✓ Admin approves → approved';
  RAISE NOTICE '  ✓ User deactivates again and requests → pending (no conflict)';
  RAISE NOTICE '============================================';
END $$;
