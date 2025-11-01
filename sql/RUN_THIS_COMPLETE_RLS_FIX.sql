-- =============================================================================
-- COMPLETE RLS FIX FOR TEAM INVITATIONS AND TEAM MANAGEMENT
-- =============================================================================
-- This file combines all necessary RLS policy fixes for the team invitation system
-- Run this entire file in Supabase Dashboard → SQL Editor
--
-- What this fixes:
-- 1. Users can view/accept invitations sent to their email
-- 2. Users can add themselves to teams via valid invitations
-- 3. Users can view and manage their teams
--
-- =============================================================================

-- =============================================================================
-- PART 1: FIX TEAM_INVITATIONS RLS POLICIES
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view invitations they sent" ON team_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON team_invitations;
DROP POLICY IF EXISTS "Admins can view all invitations" ON team_invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Users can update invitations they sent" ON team_invitations;
DROP POLICY IF EXISTS "Users can update invitations sent to them" ON team_invitations;
DROP POLICY IF EXISTS "Users can delete invitations they sent" ON team_invitations;

-- Enable RLS
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Users can view invitations they sent"
  ON team_invitations FOR SELECT
  USING (auth.uid() = invited_by);

CREATE POLICY "Users can view invitations sent to them"
  ON team_invitations FOR SELECT
  USING (
    email = (SELECT email FROM user_profiles WHERE id = auth.uid())
    OR email = auth.email()
  );

CREATE POLICY "Admins can view all invitations"
  ON team_invitations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "Users can create invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM team_members WHERE team_id = team_invitations.team_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update invitations they sent"
  ON team_invitations FOR UPDATE
  USING (auth.uid() = invited_by);

CREATE POLICY "Users can update invitations sent to them"
  ON team_invitations FOR UPDATE
  USING (
    email = (SELECT email FROM user_profiles WHERE id = auth.uid())
    OR email = auth.email()
  );

CREATE POLICY "Users can delete invitations they sent"
  ON team_invitations FOR DELETE
  USING (auth.uid() = invited_by);

-- =============================================================================
-- PART 2: FIX TEAM_MEMBERS RLS POLICIES
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view team members of their teams" ON team_members;
DROP POLICY IF EXISTS "Team owners can manage members" ON team_members;
DROP POLICY IF EXISTS "Users can add themselves via invitation" ON team_members;
DROP POLICY IF EXISTS "Users can remove themselves from teams" ON team_members;
DROP POLICY IF EXISTS "Admins can view all team members" ON team_members;

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Create new policies
-- Simplified to avoid infinite recursion with teams table policies
CREATE POLICY "Users can view team members of their teams"
  ON team_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM teams
      WHERE id = team_members.team_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can manage members"
  ON team_members FOR ALL
  USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
  );

CREATE POLICY "Users can add themselves via invitation"
  ON team_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM team_invitations
      WHERE team_id = team_members.team_id
      AND (email = (SELECT email FROM user_profiles WHERE id = auth.uid()) OR email = auth.email())
      AND status = 'pending'
      AND expires_at > NOW()
    )
  );

CREATE POLICY "Users can remove themselves from teams"
  ON team_members FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all team members"
  ON team_members FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- =============================================================================
-- PART 3: FIX TEAMS RLS POLICIES
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own teams" ON teams;
DROP POLICY IF EXISTS "Users can view teams they are members of" ON teams;
DROP POLICY IF EXISTS "Users can create teams" ON teams;
DROP POLICY IF EXISTS "Team owners can update their teams" ON teams;
DROP POLICY IF EXISTS "Team owners can delete their teams" ON teams;
DROP POLICY IF EXISTS "Admins can view all teams" ON teams;

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Users can view their own teams"
  ON teams FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can view teams they are members of"
  ON teams FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM team_members WHERE team_id = teams.id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can update their teams"
  ON teams FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Team owners can delete their teams"
  ON teams FOR DELETE
  USING (owner_id = auth.uid());

CREATE POLICY "Admins can view all teams"
  ON teams FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- =============================================================================
-- RELOAD SCHEMA CACHE
-- =============================================================================
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- Uncomment and run these to verify the policies work:

-- Check your teams:
-- SELECT * FROM teams WHERE owner_id = auth.uid();

-- Check your team memberships:
-- SELECT * FROM team_members WHERE user_id = auth.uid();

-- Check invitations sent to you:
-- SELECT * FROM team_invitations WHERE email = (SELECT email FROM user_profiles WHERE id = auth.uid());

-- =============================================================================
-- ALL DONE!
-- =============================================================================
-- Your team invitation system should now work completely:
-- ✅ Users can create teams
-- ✅ Users can send invitations
-- ✅ Users can accept invitations
-- ✅ Users can view their teams
-- ✅ Users can manage team members
-- =============================================================================
