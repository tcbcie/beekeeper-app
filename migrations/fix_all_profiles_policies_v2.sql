-- ============================================================================
-- COMPREHENSIVE FIX FOR ALL PROFILES UPDATE POLICIES
-- ============================================================================
-- This addresses ALL potential sources of infinite recursion in profiles RLS
-- ============================================================================

-- Step 1: Drop ALL existing UPDATE policies on profiles
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'DROPPING ALL EXISTING UPDATE POLICIES';
  RAISE NOTICE '============================================';
END $$;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Step 2: Create simple user update policy (no subqueries)
DO $$
BEGIN
  RAISE NOTICE 'Creating user update policy...';
END $$;

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Step 3: Create admin update policy WITHOUT subquery
-- Instead of checking role via subquery, we'll use a function with SECURITY DEFINER
DO $$
BEGIN
  RAISE NOTICE 'Creating admin check function...';
END $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'Admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Step 4: Create admin policy using the SECURITY DEFINER function
DO $$
BEGIN
  RAISE NOTICE 'Creating admin update policy...';
END $$;

CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Step 5: Create trigger to prevent role self-change
DO $$
BEGIN
  RAISE NOTICE 'Creating role change prevention trigger...';
END $$;

CREATE OR REPLACE FUNCTION public.prevent_role_self_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the user is trying to change their own role
  IF OLD.id = auth.uid() AND NEW.role IS DISTINCT FROM OLD.role THEN
    -- Check if user is admin (SECURITY DEFINER bypasses RLS)
    IF OLD.role != 'Admin' THEN
      RAISE EXCEPTION 'Users cannot change their own role';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_role_self_change ON public.profiles;

CREATE TRIGGER trigger_prevent_role_self_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_self_change();

GRANT EXECUTE ON FUNCTION public.prevent_role_self_change() TO authenticated;

-- Step 6: Verification
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'profiles'
    AND schemaname = 'public'
    AND cmd = 'UPDATE';

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ PROFILES POLICIES FIXED';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Created % UPDATE policies:', policy_count;
  RAISE NOTICE '  1. Users can update own profile';
  RAISE NOTICE '     - Simple check: auth.uid() = id';
  RAISE NOTICE '     - NO subqueries (no recursion risk)';
  RAISE NOTICE '';
  RAISE NOTICE '  2. Admins can update any profile';
  RAISE NOTICE '     - Uses SECURITY DEFINER function';
  RAISE NOTICE '     - NO recursion (function bypasses RLS)';
  RAISE NOTICE '';
  RAISE NOTICE 'Added trigger: prevent_role_self_change';
  RAISE NOTICE '  - Non-admins cannot change their own role';
  RAISE NOTICE '';
  RAISE NOTICE 'Users can now update profiles without recursion!';
  RAISE NOTICE '============================================';
END $$;

-- Show the final policies
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
