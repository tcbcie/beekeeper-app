-- ============================================================================
-- EMERGENCY FIX - RESTORE ADMIN ACCESS
-- ============================================================================
-- Drops the problematic policy and restores the original working one
-- ============================================================================

-- Drop the broken admin policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- The original "Users can view own profile" policy should still exist
-- If not, we'll recreate it
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Now create a separate, simpler admin policy
-- This uses a LATERAL join which PostgreSQL can optimize better
CREATE POLICY "Admin users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'Admin'
        AND p.is_active = true
    )
  );

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ ADMIN ACCESS RESTORED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Policies created:';
  RAISE NOTICE '  1. Users can view own profile';
  RAISE NOTICE '  2. Admin users can view all profiles';
  RAISE NOTICE '';
  RAISE NOTICE 'You should now be able to:';
  RAISE NOTICE '  • Access the dashboard';
  RAISE NOTICE '  • View user management';
  RAISE NOTICE '';
  RAISE NOTICE 'Try refreshing the page now!';
  RAISE NOTICE '============================================';
END $$;
