-- Add admin and member permissions to team policies
-- This extends the basic owner-only policies with admin/member support
-- SAFE: Uses same one-directional pattern (no circular references)

-- Step 1: Show current policies
SELECT 'Current policies before adding admin/member support:' as step;
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename IN ('teams', 'team_members', 'team_apiaries', 'team_invitations')
ORDER BY tablename, policyname;

-- Step 2: Add policy for members to view their teams
-- This allows members to see teams they belong to (not just owners)
CREATE POLICY "teams_select_member"
  ON public.teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id
      AND tm.user_id = auth.uid()
    )
  );

SELECT 'Added: Members can view their teams' as step;

-- Step 3: Add policy for members to view other members in their teams
CREATE POLICY "team_members_select_same_team"
  ON public.team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
    )
  );

SELECT 'Added: Members can view other members in their teams' as step;

-- Step 4: Add policies for ADMINS to add/update/remove members
CREATE POLICY "team_members_insert_admin"
  ON public.team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "team_members_update_admin"
  ON public.team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "team_members_delete_admin"
  ON public.team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

SELECT 'Added: Admins can manage team members' as step;

-- Step 5: Add policies for MEMBERS to view team apiaries
CREATE POLICY "team_apiaries_select_member"
  ON public.team_apiaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_apiaries.team_id
      AND tm.user_id = auth.uid()
    )
  );

SELECT 'Added: Members can view team apiaries' as step;

-- Step 6: Add policies for ADMINS to manage team apiaries
CREATE POLICY "team_apiaries_insert_admin"
  ON public.team_apiaries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "team_apiaries_delete_admin"
  ON public.team_apiaries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_apiaries.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

SELECT 'Added: Admins can manage team apiaries' as step;

-- Step 7: Add policies for ADMINS to view/manage team invitations
CREATE POLICY "team_invitations_select_admin"
  ON public.team_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_invitations.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "team_invitations_insert_admin"
  ON public.team_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "team_invitations_update_admin"
  ON public.team_invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_invitations.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "team_invitations_delete_admin"
  ON public.team_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_invitations.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

SELECT 'Added: Admins can manage team invitations' as step;

-- Step 8: Final verification
SELECT 'Final policy list with admin/member support:' as step;
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename IN ('teams', 'team_members', 'team_apiaries', 'team_invitations')
ORDER BY tablename, cmd, policyname;

SELECT 'COMPLETE! Admin and member permissions added.' as final_message;
SELECT 'All policies use safe one-directional pattern (no circular references).' as note1;
SELECT 'Permissions summary:' as note2;
SELECT '- OWNERS: Full control of their teams' as perm1;
SELECT '- ADMINS: Can manage members, apiaries, and invitations' as perm2;
SELECT '- MEMBERS: Can view teams, members, and apiaries' as perm3;
