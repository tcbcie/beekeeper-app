-- ============================================================================
-- CHANGE SUBSCRIPTION HISTORY CASCADE TO RESTRICT
-- ============================================================================
-- Prevents accidental deletion of users with subscription history
-- Forces use of soft_delete_user() function
-- ============================================================================

-- Drop the existing CASCADE foreign key constraint
ALTER TABLE public.subscription_history
  DROP CONSTRAINT IF EXISTS subscription_history_user_id_fkey;

-- Recreate with RESTRICT instead of CASCADE
-- This will PREVENT deletion of users who have subscription history
ALTER TABLE public.subscription_history
  ADD CONSTRAINT subscription_history_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;  -- Changed from CASCADE to RESTRICT

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ SUBSCRIPTION HISTORY CONSTRAINT UPDATED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Changed: ON DELETE CASCADE → ON DELETE RESTRICT';
  RAISE NOTICE '';
  RAISE NOTICE 'Effect:';
  RAISE NOTICE '  ❌ Cannot delete users with subscription history';
  RAISE NOTICE '  ✓ Must use soft_delete_user() function instead';
  RAISE NOTICE '  ✓ Preserves all payment records';
  RAISE NOTICE '  ✓ Prevents accidental data loss';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Run these first:';
  RAISE NOTICE '  1. sql/fix_user_deletion_policy.sql';
  RAISE NOTICE '  2. migrations/add_soft_delete_for_users.sql';
  RAISE NOTICE '============================================';
END $$;
