-- Fix RLS policies on team_invitations table to allow users to view invitations sent to their email
-- This allows the accept-invitation page to work for new users

-- Drop existing policies (if they exist)
DROP POLICY IF EXISTS "Users can view invitations they sent" ON team_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON team_invitations;
DROP POLICY IF EXISTS "Admins can view all invitations" ON team_invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Users can update invitations they sent" ON team_invitations;
DROP POLICY IF EXISTS "Users can update invitations sent to them" ON team_invitations;
DROP POLICY IF EXISTS "Users can delete invitations they sent" ON team_invitations;

-- Enable RLS
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view invitations they sent
CREATE POLICY "Users can view invitations they sent"
  ON team_invitations
  FOR SELECT
  USING (auth.uid() = invited_by);

-- Policy 2: Users can view invitations sent to their email (CRITICAL FOR ACCEPTING INVITATIONS)
CREATE POLICY "Users can view invitations sent to them"
  ON team_invitations
  FOR SELECT
  USING (
    email = (SELECT email FROM user_profiles WHERE id = auth.uid())
    OR
    email = auth.email()
  );

-- Policy 3: Admins can view all invitations
CREATE POLICY "Admins can view all invitations"
  ON team_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Policy 4: Users can create invitations for teams they own or are members of
CREATE POLICY "Users can create invitations"
  ON team_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE id = team_id AND owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = team_invitations.team_id AND user_id = auth.uid()
    )
  );

-- Policy 5: Users can update invitations they sent (e.g., to cancel them)
CREATE POLICY "Users can update invitations they sent"
  ON team_invitations
  FOR UPDATE
  USING (auth.uid() = invited_by);

-- Policy 6: Users can update invitations sent to their email (to accept/decline)
CREATE POLICY "Users can update invitations sent to them"
  ON team_invitations
  FOR UPDATE
  USING (
    email = (SELECT email FROM user_profiles WHERE id = auth.uid())
    OR
    email = auth.email()
  );

-- Policy 7: Users can delete invitations they sent
CREATE POLICY "Users can delete invitations they sent"
  ON team_invitations
  FOR DELETE
  USING (auth.uid() = invited_by);

-- Reload the schema cache
NOTIFY pgrst, 'reload schema';

-- Verification query (run this to test)
-- SELECT * FROM team_invitations WHERE email = '<your-email>';
