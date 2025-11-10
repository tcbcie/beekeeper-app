-- ============================================================================
-- EMERGENCY: UNLOCK ALL USERS
-- ============================================================================
-- Restore original SELECT policies to allow users to log in
-- The deleted_at check in SELECT policy may be causing lockout
-- ============================================================================

-- IMMEDIATE FIX: Remove the deleted_at check from SELECT policy
-- Users need to be able to view their profile to log in

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own active profile" ON public.profiles;

-- Create policy WITHOUT deleted_at check (back to original behavior)
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

COMMENT ON POLICY "Users can view their own profile" ON public.profiles IS
  'Users can view their own profile';

-- Fix admin policy with case-insensitive role check
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles including deleted" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'Admin')  -- Accept both cases
  )
);

COMMENT ON POLICY "Admins can view all profiles" ON public.profiles IS
  'Admins can view all profiles';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '🚨 EMERGENCY FIX APPLIED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Removed deleted_at check from SELECT policy';
  RAISE NOTICE 'Users should be able to log in now';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: This means deleted users can still see their';
  RAISE NOTICE 'own profile, but they cannot log in (banned in auth)';
  RAISE NOTICE '============================================';
END $$;

-- Show current SELECT policies
SELECT
  policyname,
  cmd as command,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'profiles'
  AND schemaname = 'public'
  AND cmd = 'SELECT'
ORDER BY policyname;
