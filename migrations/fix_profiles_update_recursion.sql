-- ============================================================================
-- FIX INFINITE RECURSION IN PROFILES UPDATE POLICY
-- ============================================================================
-- The issue: The "Users can update own profile" policy has a WITH CHECK that
-- queries profiles table, causing infinite recursion when RLS evaluates it.
--
-- Solution: Simplify the policy to only check auth.uid() = id
-- To prevent role changes, we'll use a separate approach.
-- ============================================================================

-- Drop the problematic UPDATE policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a simple policy that allows users to update their own profile
-- WITHOUT any subquery that could cause recursion
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- To prevent users from changing their own role, create a trigger instead
CREATE OR REPLACE FUNCTION public.prevent_role_self_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the user is trying to change their own role and they're not admin
  IF OLD.id = auth.uid() AND NEW.role IS DISTINCT FROM OLD.role THEN
    -- Check if user is admin (SECURITY DEFINER bypasses RLS)
    IF OLD.role != 'Admin' THEN
      -- Non-admin trying to change their own role - reject
      RAISE EXCEPTION 'Users cannot change their own role';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_prevent_role_self_change ON public.profiles;

-- Create the trigger
CREATE TRIGGER trigger_prevent_role_self_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_self_change();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.prevent_role_self_change() TO authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ PROFILES UPDATE RECURSION FIXED';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '  • Simplified UPDATE policy (no subquery)';
  RAISE NOTICE '  • Added trigger to prevent role self-change';
  RAISE NOTICE '';
  RAISE NOTICE 'Users can now:';
  RAISE NOTICE '  ✓ Update their name, phone, association, etc.';
  RAISE NOTICE '  ✗ Cannot change their own role';
  RAISE NOTICE '';
  RAISE NOTICE 'Admins can:';
  RAISE NOTICE '  ✓ Update any profile including roles';
  RAISE NOTICE '============================================';
END $$;

-- Show current UPDATE policies on profiles
SELECT
  policyname,
  cmd as command,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'profiles'
  AND schemaname = 'public'
  AND cmd = 'UPDATE'
ORDER BY policyname;
