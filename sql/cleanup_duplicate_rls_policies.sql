-- ============================================================================
-- CLEANUP: REMOVE DUPLICATE RLS POLICIES
-- ============================================================================
-- This script removes all RLS policies from team-related tables
-- Then re-applies only the correct policies from enable_team_rls_policies.sql
--
-- IMPORTANT: Run diagnose_rls_policies.sql first to see what will be removed
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- ============================================================================

-- Teams table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'teams'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON teams';
  END LOOP;
END $$;

-- Team members table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'team_members'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON team_members';
  END LOOP;
END $$;

-- Team invitations table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'team_invitations'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON team_invitations';
  END LOOP;
END $$;

-- Team apiaries table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'team_apiaries'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON team_apiaries';
  END LOOP;
END $$;

-- Apiaries table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'apiaries'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON apiaries';
  END LOOP;
END $$;

-- Hives table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hives'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON hives';
  END LOOP;
END $$;

-- Queens table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'queens'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON queens';
  END LOOP;
END $$;

-- Inspections table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'inspections'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON inspections';
  END LOOP;
END $$;

-- Varroa treatments table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'varroa_treatments'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON varroa_treatments';
  END LOOP;
END $$;

-- Varroa checks table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'varroa_checks'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON varroa_checks';
  END LOOP;
END $$;

-- Feedings table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'feedings'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON feedings';
  END LOOP;
END $$;

-- Harvests table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'harvests'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON harvests';
  END LOOP;
END $$;

-- Rearing batches table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'rearing_batches'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON rearing_batches';
  END LOOP;
END $$;

-- ============================================================================
-- STEP 2: RE-APPLY CORRECT POLICIES
-- ============================================================================

-- Teams table policies
CREATE POLICY "Users can view their teams"
ON teams FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR is_team_member(id, auth.uid())
);

CREATE POLICY "Users can create teams"
ON teams FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can update their teams"
ON teams FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can delete their teams"
ON teams FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Team members table policies
CREATE POLICY "Users can view members of their teams"
ON team_members FOR SELECT
TO authenticated
USING (
  is_team_owner(team_id, auth.uid())
  OR user_id = auth.uid()
  OR is_team_member(team_id, auth.uid())
);

CREATE POLICY "Team owners can add members"
ON team_members FOR INSERT
TO authenticated
WITH CHECK (is_team_owner(team_id, auth.uid()));

CREATE POLICY "Team owners can update members"
ON team_members FOR UPDATE
TO authenticated
USING (is_team_owner(team_id, auth.uid()))
WITH CHECK (is_team_owner(team_id, auth.uid()));

CREATE POLICY "Team owners can remove members"
ON team_members FOR DELETE
TO authenticated
USING (
  is_team_owner(team_id, auth.uid())
  OR user_id = auth.uid()
);

-- Team invitations table policies
CREATE POLICY "Users can view their invitations"
ON team_invitations FOR SELECT
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR is_team_owner(team_id, auth.uid())
);

CREATE POLICY "Team owners can create invitations"
ON team_invitations FOR INSERT
TO authenticated
WITH CHECK (
  is_team_owner(team_id, auth.uid())
  AND invited_by = auth.uid()
);

CREATE POLICY "Team owners can update invitations"
ON team_invitations FOR UPDATE
TO authenticated
USING (is_team_owner(team_id, auth.uid()))
WITH CHECK (is_team_owner(team_id, auth.uid()));

CREATE POLICY "Invitees can update their invitations"
ON team_invitations FOR UPDATE
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Team owners can delete invitations"
ON team_invitations FOR DELETE
TO authenticated
USING (is_team_owner(team_id, auth.uid()));

-- Team apiaries table policies
CREATE POLICY "Users can view shared apiaries"
ON team_apiaries FOR SELECT
TO authenticated
USING (
  is_team_owner(team_id, auth.uid())
  OR is_team_member(team_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM apiaries
    WHERE id = apiary_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Apiary owners can share their apiaries"
ON team_apiaries FOR INSERT
TO authenticated
WITH CHECK (
  is_team_owner(team_id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM apiaries
    WHERE id = apiary_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Apiary owners can unshare their apiaries"
ON team_apiaries FOR DELETE
TO authenticated
USING (
  is_team_owner(team_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM apiaries
    WHERE id = apiary_id AND user_id = auth.uid()
  )
);

-- Apiaries table policies
CREATE POLICY "Users can view accessible apiaries"
ON apiaries FOR SELECT
TO authenticated
USING (can_access_apiary(id, auth.uid()));

CREATE POLICY "Users can insert their own apiaries"
ON apiaries FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own apiaries"
ON apiaries FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own apiaries"
ON apiaries FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Hives table policies
CREATE POLICY "Users can view accessible hives"
ON hives FOR SELECT
TO authenticated
USING (can_access_hive(id, auth.uid()));

CREATE POLICY "Users can insert their own hives"
ON hives FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM apiaries
    WHERE id = apiary_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update accessible hives"
ON hives FOR UPDATE
TO authenticated
USING (can_access_hive(id, auth.uid()))
WITH CHECK (
  user_id = auth.uid()
  OR (can_access_hive(id, auth.uid()) AND user_id = user_id)
);

CREATE POLICY "Users can delete their own hives"
ON hives FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Queens table policies
CREATE POLICY "Users can view accessible queens"
ON queens FOR SELECT
TO authenticated
USING (can_access_queen(id, auth.uid()));

CREATE POLICY "Users can insert their own queens"
ON queens FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own queens"
ON queens FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own queens"
ON queens FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Inspections table policies
CREATE POLICY "Users can view accessible hive inspections"
ON inspections FOR SELECT
TO authenticated
USING (can_access_hive(hive_id, auth.uid()));

CREATE POLICY "Users can insert inspections for accessible hives"
ON inspections FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND can_access_hive(hive_id, auth.uid())
);

CREATE POLICY "Users can update their own inspections"
ON inspections FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own inspections"
ON inspections FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Varroa treatments table policies
CREATE POLICY "Users can view accessible hive treatments"
ON varroa_treatments FOR SELECT
TO authenticated
USING (can_access_hive(hive_id, auth.uid()));

CREATE POLICY "Users can insert treatments for accessible hives"
ON varroa_treatments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND can_access_hive(hive_id, auth.uid())
);

CREATE POLICY "Users can update their own treatments"
ON varroa_treatments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own treatments"
ON varroa_treatments FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Varroa checks table policies
CREATE POLICY "Users can view accessible hive checks"
ON varroa_checks FOR SELECT
TO authenticated
USING (can_access_hive(hive_id, auth.uid()));

CREATE POLICY "Users can insert checks for accessible hives"
ON varroa_checks FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND can_access_hive(hive_id, auth.uid())
);

CREATE POLICY "Users can update their own checks"
ON varroa_checks FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own checks"
ON varroa_checks FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Feedings table policies
CREATE POLICY "Users can view accessible hive feedings"
ON feedings FOR SELECT
TO authenticated
USING (can_access_hive(hive_id, auth.uid()));

CREATE POLICY "Users can insert feedings for accessible hives"
ON feedings FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND can_access_hive(hive_id, auth.uid())
);

CREATE POLICY "Users can update their own feedings"
ON feedings FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own feedings"
ON feedings FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Harvests table policies
CREATE POLICY "Users can view accessible hive harvests"
ON harvests FOR SELECT
TO authenticated
USING (can_access_hive(hive_id, auth.uid()));

CREATE POLICY "Users can insert harvests for accessible hives"
ON harvests FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND can_access_hive(hive_id, auth.uid())
);

CREATE POLICY "Users can update their own harvests"
ON harvests FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own harvests"
ON harvests FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Rearing batches table policies
CREATE POLICY "Users can view their own rearing batches"
ON rearing_batches FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own rearing batches"
ON rearing_batches FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own rearing batches"
ON rearing_batches FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own rearing batches"
ON rearing_batches FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- RELOAD SCHEMA CACHE
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show final policy count
SELECT
  tablename,
  COUNT(*) as policy_count,
  COUNT(*) FILTER (WHERE cmd = 'SELECT') as select_count,
  COUNT(*) FILTER (WHERE cmd = 'INSERT') as insert_count,
  COUNT(*) FILTER (WHERE cmd = 'UPDATE') as update_count,
  COUNT(*) FILTER (WHERE cmd = 'DELETE') as delete_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'teams', 'team_members', 'team_apiaries', 'team_invitations',
    'apiaries', 'hives', 'queens', 'inspections',
    'varroa_checks', 'varroa_treatments', 'feedings', 'harvests',
    'rearing_batches'
  )
GROUP BY tablename
ORDER BY tablename;

-- Summary
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ CLEANUP COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'All duplicate policies have been removed.';
  RAISE NOTICE 'Expected policy counts:';
  RAISE NOTICE '  • teams: 4 policies';
  RAISE NOTICE '  • team_members: 4 policies';
  RAISE NOTICE '  • team_invitations: 5 policies (2 UPDATE)';
  RAISE NOTICE '  • team_apiaries: 3 policies';
  RAISE NOTICE '  • apiaries: 4 policies';
  RAISE NOTICE '  • hives: 4 policies';
  RAISE NOTICE '  • queens: 4 policies';
  RAISE NOTICE '  • inspections: 4 policies';
  RAISE NOTICE '  • varroa_treatments: 4 policies';
  RAISE NOTICE '  • varroa_checks: 4 policies';
  RAISE NOTICE '  • feedings: 4 policies';
  RAISE NOTICE '  • harvests: 4 policies';
  RAISE NOTICE '  • rearing_batches: 4 policies';
  RAISE NOTICE '============================================';
END $$;
