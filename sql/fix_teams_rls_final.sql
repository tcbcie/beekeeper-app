-- FINAL FIX: Complete reset with ZERO circular references
-- This version eliminates ALL recursive policy lookups

-- Step 1: Show current policies (for debugging)
SELECT 'Current policies:' as step;
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename IN ('teams', 'team_members', 'team_apiaries', 'team_invitations')
ORDER BY tablename, policyname;

-- Step 2: Drop ALL policies (no exceptions)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename, policyname
        FROM pg_policies
        WHERE tablename IN ('teams', 'team_members', 'team_apiaries', 'team_invitations')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

SELECT 'All policies dropped' as step;

-- Step 3: Recreate teams policies (SIMPLE, NO CROSS-TABLE REFERENCES)
-- Only owner-based for now to test basic functionality
CREATE POLICY "teams_select_owner"
  ON public.teams FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "teams_insert"
  ON public.teams FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "teams_update_owner"
  ON public.teams FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "teams_delete_owner"
  ON public.teams FOR DELETE
  USING (owner_id = auth.uid());

SELECT 'Teams policies created (owner only)' as step;

-- Step 4: Recreate team_members policies (SIMPLE, DIRECT REFERENCES ONLY)
CREATE POLICY "team_members_select_self"
  ON public.team_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "team_members_select_team_owner"
  ON public.team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id
      AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "team_members_insert_team_owner"
  ON public.team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id
      AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "team_members_update_team_owner"
  ON public.team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id
      AND t.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id
      AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "team_members_delete_self"
  ON public.team_members FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "team_members_delete_team_owner"
  ON public.team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id
      AND t.owner_id = auth.uid()
    )
  );

SELECT 'Team members policies created' as step;

-- Step 5: Recreate team_apiaries policies (SIMPLE)
CREATE POLICY "team_apiaries_select_team_owner"
  ON public.team_apiaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_apiaries.team_id
      AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "team_apiaries_insert_team_owner"
  ON public.team_apiaries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id
      AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "team_apiaries_delete_team_owner"
  ON public.team_apiaries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_apiaries.team_id
      AND t.owner_id = auth.uid()
    )
  );

SELECT 'Team apiaries policies created' as step;

-- Step 6: Recreate team_invitations policies (SIMPLE)
CREATE POLICY "team_invitations_select_team_owner"
  ON public.team_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_invitations.team_id
      AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "team_invitations_insert_team_owner"
  ON public.team_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id
      AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "team_invitations_update_team_owner"
  ON public.team_invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_invitations.team_id
      AND t.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id
      AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "team_invitations_delete_team_owner"
  ON public.team_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_invitations.team_id
      AND t.owner_id = auth.uid()
    )
  );

SELECT 'Team invitations policies created' as step;

-- Step 7: Verification
SELECT 'Final policy list:' as step;
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename IN ('teams', 'team_members', 'team_apiaries', 'team_invitations')
ORDER BY tablename, cmd, policyname;

SELECT 'COMPLETE! All policies recreated with zero circular references.' as final_message;
SELECT 'NOTE: This simplified version only supports team OWNERS managing teams.' as note1;
SELECT 'Team admins/members cannot manage teams yet - we can add that after basic functionality works.' as note2;
