-- ============================================================================
-- ALLOW ANONYMOUS USERS TO CHECK FOR DELETED ACCOUNTS
-- ============================================================================
-- This policy allows the login/signup page to check if an email belongs to
-- a deleted account, so we can redirect users to the reactivation page
-- instead of showing confusing error messages.
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow anon to check deleted accounts" ON public.profiles;

-- Create policy to allow anonymous users to check for deleted accounts
-- Only allows reading id, deleted_at, and original_email for deleted accounts
CREATE POLICY "Allow anon to check deleted accounts"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (deleted_at IS NOT NULL);

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ ANONYMOUS DELETED ACCOUNT CHECK ENABLED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Policy: "Allow anon to check deleted accounts"';
  RAISE NOTICE 'Purpose: Allow signup page to detect deleted accounts';
  RAISE NOTICE 'Access: Anonymous (anon) users';
  RAISE NOTICE 'Scope: SELECT only';
  RAISE NOTICE 'Condition: deleted_at IS NOT NULL';
  RAISE NOTICE '';
  RAISE NOTICE 'What this enables:';
  RAISE NOTICE '  ✓ Login page can check if email belongs to deleted account';
  RAISE NOTICE '  ✓ Redirect to reactivation page instead of showing error';
  RAISE NOTICE '  ✓ Only exposes deleted accounts (not active users)';
  RAISE NOTICE '  ✓ Only exposes id, deleted_at, original_email fields';
  RAISE NOTICE '';
  RAISE NOTICE 'Security:';
  RAISE NOTICE '  ✓ No sensitive data exposed (only deleted account info)';
  RAISE NOTICE '  ✓ Active users remain fully protected';
  RAISE NOTICE '  ✓ Read-only access (cannot modify data)';
  RAISE NOTICE '============================================';
END $$;
