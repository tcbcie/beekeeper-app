-- Fix RLS policies on teams table to allow proper access
-- This allows users to view teams they own or are members of

-- First, create a security definer function to check team membership
-- This bypasses RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION is_team_member(team_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = team_uuid AND user_id = user_uuid
  );
$$;

-- Drop existing policies (if they exist)
DROP POLICY IF EXISTS "Users can view their own teams" ON teams;
DROP POLICY IF EXISTS "Users can view teams they are members of" ON teams;
DROP POLICY IF EXISTS "Users can view their teams" ON teams;
DROP POLICY IF EXISTS "Users can create teams" ON teams;
DROP POLICY IF EXISTS "Team owners can update their teams" ON teams;
DROP POLICY IF EXISTS "Team owners can delete their teams" ON teams;
DROP POLICY IF EXISTS "Admins can view all teams" ON teams;

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view teams they own or are members of
-- Use security definer function to avoid recursion with team_members table
CREATE POLICY "Users can view their teams"
  ON teams
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR is_team_member(id, auth.uid())
  );

-- Policy 3: Users can create teams (they become the owner)
CREATE POLICY "Users can create teams"
  ON teams
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Policy 4: Team owners can update their teams
CREATE POLICY "Team owners can update their teams"
  ON teams
  FOR UPDATE
  USING (owner_id = auth.uid());

-- Policy 5: Team owners can delete their teams
CREATE POLICY "Team owners can delete their teams"
  ON teams
  FOR DELETE
  USING (owner_id = auth.uid());

-- Policy 6: Admins can view all teams
CREATE POLICY "Admins can view all teams"
  ON teams
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
-- SELECT * FROM teams WHERE owner_id = auth.uid();
