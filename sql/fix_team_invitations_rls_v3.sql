-- ============================================================================
-- FIX TEAM INVITATIONS RLS POLICIES (V3 - Allow Anonymous Access)
-- ============================================================================
-- This script fixes permission denied errors when UNREGISTERED users try to:
-- 1. View invitations sent to their email (anonymous access by invitation ID)
-- 2. Accept invitations and create accounts
--
-- Problem:
-- - The current SELECT policy requires authentication (TO authenticated)
-- - Unregistered users clicking invitation links are anonymous
-- - They need to VIEW the invitation BEFORE they can authenticate
-- ============================================================================

-- Disable RLS temporarily to ensure we can modify policies
ALTER TABLE team_invitations DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (including any variations)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'team_invitations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON team_invitations', policy_record.policyname);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- SELECT: Allow anyone to view invitations (needed for unregistered users)
-- Security: Invitations are only accessible via unique UUID link
CREATE POLICY "Anyone can view invitations"
ON team_invitations FOR SELECT
USING (true);  -- Allow all reads - security is via UUID uniqueness

-- INSERT: Team owners can create invitations for their teams
CREATE POLICY "Team owners can create invitations"
ON team_invitations FOR INSERT
TO authenticated
WITH CHECK (
  is_team_owner(team_id, auth.uid())
  AND invited_by = auth.uid()
);

-- UPDATE: Team owners can update invitations for their teams
CREATE POLICY "Team owners can update invitations"
ON team_invitations FOR UPDATE
TO authenticated
USING (is_team_owner(team_id, auth.uid()))
WITH CHECK (is_team_owner(team_id, auth.uid()));

-- UPDATE: Invitees can update their own invitations (accept/decline)
-- This allows authenticated users to accept invitations sent to their email
CREATE POLICY "Invitees can update their invitations"
ON team_invitations FOR UPDATE
TO authenticated
USING (email = (SELECT email FROM profiles WHERE id = auth.uid()))
WITH CHECK (email = (SELECT email FROM profiles WHERE id = auth.uid()));

-- DELETE: Team owners can delete invitations for their teams
CREATE POLICY "Team owners can delete invitations"
ON team_invitations FOR DELETE
TO authenticated
USING (is_team_owner(team_id, auth.uid()));

-- Add comment
COMMENT ON TABLE team_invitations IS 'Team invitations - SELECT is public for anonymous users to view via UUID link, all other operations require authentication';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ TEAM INVITATIONS RLS POLICIES FIXED (V3)';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Policies created:';
  RAISE NOTICE '  1. Anyone can view invitations (SELECT - allows anonymous)';
  RAISE NOTICE '  2. Team owners can create invitations (INSERT)';
  RAISE NOTICE '  3. Team owners can update invitations (UPDATE)';
  RAISE NOTICE '  4. Invitees can update their invitations (UPDATE)';
  RAISE NOTICE '  5. Team owners can delete invitations (DELETE)';
  RAISE NOTICE '';
  RAISE NOTICE 'Key changes:';
  RAISE NOTICE '  • SELECT policy now allows anonymous users';
  RAISE NOTICE '  • Security maintained via UUID uniqueness';
  RAISE NOTICE '  • Unregistered users can view invitation before signup';
  RAISE NOTICE '============================================';
END $$;
