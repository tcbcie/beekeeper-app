-- ============================================================================
-- FIX USER DELETION POLICY
-- ============================================================================
-- Replace direct deletion with soft delete to prevent data loss
-- ============================================================================

-- Drop the current deletion policy that allows users to delete themselves
DROP POLICY IF EXISTS "Users can delete profiles" ON public.profiles;

-- Create new policy: Only allow soft delete (via function)
-- Users should NOT be able to directly DELETE from profiles table
CREATE POLICY "Prevent direct profile deletion"
ON public.profiles FOR DELETE
TO authenticated
USING (false);  -- Nobody can directly delete

COMMENT ON POLICY "Prevent direct profile deletion" ON public.profiles IS
  'Users must use soft_delete_user() function instead of direct DELETE to preserve subscription history';

-- Allow users to update their own profile (for soft delete function)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
);

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ USER DELETION POLICY UPDATED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  ❌ Removed: "Users can delete profiles" policy';
  RAISE NOTICE '  ✅ Added: "Prevent direct profile deletion" policy';
  RAISE NOTICE '';
  RAISE NOTICE 'How to delete users now:';
  RAISE NOTICE '  • Use soft_delete_user(user_id) function';
  RAISE NOTICE '  • Preserves subscription history';
  RAISE NOTICE '  • Allows account restoration';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Run add_soft_delete_for_users.sql first!';
  RAISE NOTICE '============================================';
END $$;
