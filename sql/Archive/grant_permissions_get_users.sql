-- ============================================================================
-- GRANT PERMISSIONS FOR GET_USERS_WITH_EMAIL
-- ============================================================================
-- Grants execute permissions on get_users_with_email to authenticated users
-- Required after dropping and recreating the function
-- ============================================================================

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated;

-- Grant usage on auth schema (needed to join with auth.users)
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ PERMISSIONS GRANTED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Function: get_users_with_email()';
  RAISE NOTICE '';
  RAISE NOTICE 'Permissions:';
  RAISE NOTICE '  ✓ EXECUTE granted to authenticated users';
  RAISE NOTICE '  ✓ USAGE granted on auth schema';
  RAISE NOTICE '';
  RAISE NOTICE 'Admins can now call this function via RPC';
  RAISE NOTICE '============================================';
END $$;
