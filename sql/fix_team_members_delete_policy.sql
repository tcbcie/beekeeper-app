-- Fix infinite recursion in team_members DELETE policy
-- Error: "infinite recursion detected in policy for relation team_members"
-- Date: 2025-10-30

-- Drop all existing DELETE policies on team_members table
DROP POLICY IF EXISTS "Enable delete for team members based on user_id" ON team_members;
DROP POLICY IF EXISTS "team_members_delete_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_delete" ON team_members;

-- Create a safe DELETE policy that doesn't cause recursion
CREATE POLICY "team_members_delete_safe"
ON team_members
FOR DELETE
USING (
  -- Allow users to delete their own membership (leave team)
  auth.uid() = user_id
  OR
  -- Allow team owners to delete any membership (remove members)
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_members.team_id
    AND teams.owner_id = auth.uid()
  )
);

-- Add comment explaining the policy
COMMENT ON POLICY "team_members_delete_safe" ON team_members IS
'Allows users to leave teams (delete own membership) and team owners to remove any member.
Uses direct table lookup to avoid infinite recursion.';
