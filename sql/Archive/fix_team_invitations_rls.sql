-- ============================================================================
-- FIX TEAM INVITATIONS RLS POLICIES
-- ============================================================================
-- This script fixes permission denied errors when team owners try to:
-- 1. View pending invitations for their teams
-- 2. Create new invitations
-- 3. Check for existing invitations
--
-- Problem:
-- - The current SELECT policy queries auth.users table which causes 403 errors
-- - Team owners need to view all invitations for their teams, not just ones sent to them
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team owners can view invitations for their teams" ON team_invitations;
DROP POLICY IF EXISTS "Team owners can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team owners can update invitations" ON team_invitations;
DROP POLICY IF EXISTS "Invitees can update their invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team owners can delete invitations" ON team_invitations;

-- Enable RLS
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- SELECT: Team owners can view all invitations for their teams
-- Invitees can view invitations sent to their email (using profile lookup instead of auth.users)
CREATE POLICY "Team owners and invitees can view invitations"
ON team_invitations FOR SELECT
TO authenticated
USING (
  -- Team owners can see all invitations for their teams
  is_team_owner(team_id, auth.uid())
  OR
  -- Invitees can see invitations sent to their email (using profiles table)
  email = (SELECT email FROM profiles WHERE id = auth.uid())
);

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
COMMENT ON TABLE team_invitations IS 'Team invitations with RLS policies - team owners can view/manage all invitations for their teams';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ TEAM INVITATIONS RLS POLICIES FIXED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Policies created:';
  RAISE NOTICE '  1. Team owners and invitees can view invitations (SELECT)';
  RAISE NOTICE '  2. Team owners can create invitations (INSERT)';
  RAISE NOTICE '  3. Team owners can update invitations (UPDATE)';
  RAISE NOTICE '  4. Invitees can update their invitations (UPDATE)';
  RAISE NOTICE '  5. Team owners can delete invitations (DELETE)';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed issues:';
  RAISE NOTICE '  • Removed auth.users query that caused 403 errors';
  RAISE NOTICE '  • Now uses profiles table for email lookup';
  RAISE NOTICE '  • Team owners can view all invitations for their teams';
  RAISE NOTICE '============================================';
END $$;
