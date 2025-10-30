-- Final fix for team_members DELETE policy infinite recursion
-- Based on diagnostic output showing multiple DELETE policies with recursion
-- Date: 2025-10-30

-- PROBLEM IDENTIFIED:
-- Multiple DELETE policies exist, some reference team_members table causing recursion:
-- - team_members_delete_admin (RECURSIVE - references team_members)
-- - team_members_delete_safe (RECURSIVE - references team_members.team_id)
-- - team_members_delete_self (OK - simple user_id check)
-- - team_members_delete_team_owner (RECURSIVE - references team_members.team_id)

-- SOLUTION: Drop all DELETE policies and create ONE safe policy

-- Step 1: Drop ALL DELETE policies
DROP POLICY IF EXISTS "team_members_delete_admin" ON team_members;
DROP POLICY IF EXISTS "team_members_delete_safe" ON team_members;
DROP POLICY IF EXISTS "team_members_delete_self" ON team_members;
DROP POLICY IF EXISTS "team_members_delete_team_owner" ON team_members;

-- Step 2: Create ONE comprehensive DELETE policy that doesn't reference team_members
CREATE POLICY "team_members_delete_final"
ON team_members
FOR DELETE
USING (
  -- Allow users to delete their own membership (leave team)
  user_id = auth.uid()
  OR
  -- Allow team owners to delete any membership (remove members)
  -- This references TEAMS table only, not team_members, avoiding recursion
  team_id IN (
    SELECT id FROM teams WHERE owner_id = auth.uid()
  )
);

-- Step 3: Add explanatory comment
COMMENT ON POLICY "team_members_delete_final" ON team_members IS
'Safe DELETE policy that avoids infinite recursion. Allows users to leave teams (user_id = auth.uid()) and team owners to remove members (via teams.owner_id lookup). Does not reference team_members table in USING clause.';

-- Step 4: Verify the fix
SELECT
  policyname,
  cmd,
  CASE
    WHEN qual::text LIKE '%team_members%' THEN '⚠️  WARNING: Still references team_members!'
    ELSE '✅ OK: No recursion risk'
  END as status,
  qual::text as using_clause
FROM pg_policies
WHERE tablename = 'team_members'
  AND cmd = 'DELETE'
ORDER BY policyname;
