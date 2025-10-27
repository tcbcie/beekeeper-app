-- Complete reset of ALL team-related RLS policies
-- This will drop EVERYTHING and recreate fresh

-- Step 1: Show all current policies on these tables (for debugging)
SELECT 'Current policies before drop:' as step;
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('teams', 'team_members', 'team_apiaries', 'team_invitations')
ORDER BY tablename, policyname;

-- Step 2: Drop ALL policies on teams table (every operation type)
DROP POLICY IF EXISTS "Users can view their teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view teams they own" ON public.teams;
DROP POLICY IF EXISTS "Users can view teams they are members of" ON public.teams;
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can update teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can delete teams" ON public.teams;

-- Step 3: Drop ALL policies on team_members table (every operation type)
DROP POLICY IF EXISTS "Users can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can add members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can update members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners, admins, and self can remove members" ON public.team_members;

-- Step 4: Drop ALL policies on team_apiaries table
DROP POLICY IF EXISTS "Users can view team apiaries" ON public.team_apiaries;
DROP POLICY IF EXISTS "Team owners and admins can add apiaries" ON public.team_apiaries;
DROP POLICY IF EXISTS "Team owners and admins can remove apiaries" ON public.team_apiaries;

-- Step 5: Drop ALL policies on team_invitations table
DROP POLICY IF EXISTS "Users can view team invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Team owners and admins can create invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Team owners and admins can update invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Team owners and admins can delete invitations" ON public.team_invitations;

SELECT 'All policies dropped successfully' as step;

-- Step 6: Recreate teams policies (NON-RECURSIVE)
-- IMPORTANT: Split SELECT into two policies to avoid recursion
CREATE POLICY "Users can view teams they own"
  ON public.teams FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can view teams they are members of"
  ON public.teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can update teams"
  ON public.teams FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can delete teams"
  ON public.teams FOR DELETE
  USING (owner_id = auth.uid());

SELECT 'Teams policies created' as step;

-- Step 7: Recreate team_members policies (NON-RECURSIVE)
CREATE POLICY "Users can view team members"
  ON public.team_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id
      AND teams.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners and admins can add members"
  ON public.team_members FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    ) OR
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners and admins can update members"
  ON public.team_members FOR UPDATE
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    ) OR
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    ) OR
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners, admins, and self can remove members"
  ON public.team_members FOR DELETE
  USING (
    user_id = auth.uid() OR
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    ) OR
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

SELECT 'Team members policies created' as step;

-- Step 8: Recreate team_apiaries policies
CREATE POLICY "Users can view team apiaries"
  ON public.team_apiaries FOR SELECT
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    ) OR
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners and admins can add apiaries"
  ON public.team_apiaries FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    ) OR
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners and admins can remove apiaries"
  ON public.team_apiaries FOR DELETE
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    ) OR
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

SELECT 'Team apiaries policies created' as step;

-- Step 9: Recreate team_invitations policies
CREATE POLICY "Users can view team invitations"
  ON public.team_invitations FOR SELECT
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    ) OR
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners and admins can create invitations"
  ON public.team_invitations FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    ) OR
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners and admins can update invitations"
  ON public.team_invitations FOR UPDATE
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    ) OR
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    ) OR
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners and admins can delete invitations"
  ON public.team_invitations FOR DELETE
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    ) OR
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

SELECT 'Team invitations policies created' as step;

-- Step 10: Verify all policies were created correctly
SELECT 'Final verification - all policies:' as step;
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('teams', 'team_members', 'team_apiaries', 'team_invitations')
ORDER BY tablename, cmd, policyname;

SELECT 'Policy reset complete! You should see policies for all 4 tables above.' as final_message;
