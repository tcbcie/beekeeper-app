-- ============================================================================
-- FIX ADMIN UPDATE USER ROLE
-- ============================================================================
-- Allow admins to update other users' roles in the profiles table
-- ============================================================================

-- Drop existing policies that might be blocking role updates
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Recreate policies with correct permissions
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Users cannot change their own role
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ ADMIN ROLE UPDATE FIX APPLIED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Policies updated:';
  RAISE NOTICE '  ✓ Users can update own profile (except role)';
  RAISE NOTICE '  ✓ Admins can update any user''s profile (including role)';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  • Users cannot change their own role';
  RAISE NOTICE '  • Admins can change any user''s role';
  RAISE NOTICE '  • Role updates now work in user management';
  RAISE NOTICE '============================================';
END $$;
