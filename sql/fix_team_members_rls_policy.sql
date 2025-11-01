-- Fix RLS policies on team_members table to allow users to join teams via invitation
-- This allows users to add themselves to teams when accepting invitations

-- Drop existing policies (if they exist)
DROP POLICY IF EXISTS "Users can view team members of their teams" ON team_members;
DROP POLICY IF EXISTS "Team owners can manage members" ON team_members;
DROP POLICY IF EXISTS "Users can add themselves via invitation" ON team_members;
DROP POLICY IF EXISTS "Users can remove themselves from teams" ON team_members;
DROP POLICY IF EXISTS "Admins can view all team members" ON team_members;

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view team members of teams they belong to
CREATE POLICY "Users can view team members of their teams"
  ON team_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM teams
      WHERE id = team_id AND owner_id = auth.uid()
    )
  );

-- Policy 2: Team owners can manage (insert/update/delete) members
CREATE POLICY "Team owners can manage members"
  ON team_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE id = team_id AND owner_id = auth.uid()
    )
  );

-- Policy 3: Users can add themselves to teams if they have a valid pending invitation
-- THIS IS CRITICAL FOR ACCEPTING INVITATIONS
CREATE POLICY "Users can add themselves via invitation"
  ON team_members
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM team_invitations
      WHERE team_id = team_members.team_id
      AND (
        email = (SELECT email FROM user_profiles WHERE id = auth.uid())
        OR
        email = auth.email()
      )
      AND status = 'pending'
      AND expires_at > NOW()
    )
  );

-- Policy 4: Users can remove themselves from teams (leave team)
CREATE POLICY "Users can remove themselves from teams"
  ON team_members
  FOR DELETE
  USING (user_id = auth.uid());

-- Policy 5: Admins can view all team members
CREATE POLICY "Admins can view all team members"
  ON team_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Reload the schema cache
NOTIFY pgrst, 'reload schema';

-- Verification query (run this to test)
-- SELECT * FROM team_members WHERE user_id = auth.uid();
