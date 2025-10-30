-- Comprehensive fix for team_members RLS policies
-- Error: "infinite recursion detected in policy for relation team_members"
-- Date: 2025-10-30

-- STEP 1: Check existing policies (run this first to see what policies exist)
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'team_members';

-- STEP 2: Drop ALL existing policies on team_members
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'team_members')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON team_members';
    END LOOP;
END $$;

-- STEP 3: Create clean, safe policies from scratch

-- SELECT policy (no recursion risk)
CREATE POLICY "team_members_select_safe"
ON team_members
FOR SELECT
USING (
  -- Users can see memberships for teams they own
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_members.team_id
    AND teams.owner_id = auth.uid()
  )
  OR
  -- Users can see their own memberships
  auth.uid() = user_id
  OR
  -- Users can see other members of teams they belong to
  team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.user_id = auth.uid()
  )
);

-- INSERT policy (no recursion risk)
CREATE POLICY "team_members_insert_safe"
ON team_members
FOR INSERT
WITH CHECK (
  -- Only team owners can add members
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_members.team_id
    AND teams.owner_id = auth.uid()
  )
);

-- UPDATE policy (no recursion risk)
CREATE POLICY "team_members_update_safe"
ON team_members
FOR UPDATE
USING (
  -- Only team owners can update memberships
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_members.team_id
    AND teams.owner_id = auth.uid()
  )
)
WITH CHECK (
  -- Same check for the updated row
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_members.team_id
    AND teams.owner_id = auth.uid()
  )
);

-- DELETE policy (CRITICAL - this was causing the recursion)
CREATE POLICY "team_members_delete_safe"
ON team_members
FOR DELETE
USING (
  -- Users can delete their own membership (leave team)
  auth.uid() = user_id
  OR
  -- Team owners can delete any membership (remove members)
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_members.team_id
    AND teams.owner_id = auth.uid()
  )
);

-- STEP 4: Add comments
COMMENT ON POLICY "team_members_select_safe" ON team_members IS
'Allows users to see team memberships for teams they own, their own memberships, and other members of teams they belong to.';

COMMENT ON POLICY "team_members_insert_safe" ON team_members IS
'Only team owners can add new members to their teams.';

COMMENT ON POLICY "team_members_update_safe" ON team_members IS
'Only team owners can update team membership roles.';

COMMENT ON POLICY "team_members_delete_safe" ON team_members IS
'Allows users to leave teams (delete own membership) and team owners to remove any member. Uses direct teams table lookup to avoid infinite recursion.';

-- STEP 5: Verify policies were created
SELECT
  policyname,
  cmd as operation,
  CASE
    WHEN qual IS NOT NULL THEN 'USING clause set'
    ELSE 'No USING clause'
  END as using_status,
  CASE
    WHEN with_check IS NOT NULL THEN 'WITH CHECK clause set'
    ELSE 'No WITH CHECK clause'
  END as check_status
FROM pg_policies
WHERE tablename = 'team_members'
ORDER BY cmd, policyname;
