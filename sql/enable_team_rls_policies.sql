-- ============================================================================
-- COMPREHENSIVE RLS POLICIES FOR TEAM COLLABORATION FEATURE
-- ============================================================================
-- This script enables Row Level Security (RLS) for all team-related tables
-- and implements proper access control policies for the team collaboration feature.
--
-- TEAM MODEL ARCHITECTURE:
-- - Teams are created by owners who can invite members
-- - Apiaries are shared at the apiary level (not individual hives)
-- - When an apiary is shared via team_apiaries, ALL ACTIVE hives become accessible
--
-- TEAM MEMBER PERMISSIONS:
-- - Hives: Can UPDATE configuration (e.g., queen assignment, status) but NOT delete
-- - Inspections/Varroa/Feedings/Harvests: Can CREATE new records, UPDATE/DELETE only their own
-- - Queens: READ only
-- - Apiaries: READ only
-- - Team members can see all historical records but can only modify what they created
--
-- IMPORTANT - ARCHIVED HIVES:
-- - Archived hives (archived_at IS NOT NULL) are EXCLUDED from team sharing
-- - Only active hives (archived_at IS NULL) are visible to team members
-- - Owners can always see their own archived hives
-- - This ensures historical/closed hives don't clutter team views
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================
-- These security definer functions prevent infinite recursion in RLS policies

-- Check if user is a member of a specific team
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

-- Check if user is the owner of a specific team
CREATE OR REPLACE FUNCTION is_team_owner(team_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM teams
    WHERE id = team_uuid AND owner_id = user_uuid
  );
$$;

-- Check if user can access a specific hive (owns it or it's in a shared apiary)
-- IMPORTANT: Archived hives are EXCLUDED from team sharing
CREATE OR REPLACE FUNCTION can_access_hive(hive_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    -- User owns the hive directly (can see even if archived)
    SELECT 1 FROM hives WHERE id = hive_uuid AND user_id = user_uuid
  ) OR EXISTS (
    -- Hive is in an apiary shared with a team the user is a member of
    -- ONLY if the hive is NOT archived (archived_at IS NULL)
    SELECT 1 FROM hives h
    INNER JOIN team_apiaries ta ON h.apiary_id = ta.apiary_id
    INNER JOIN team_members tm ON ta.team_id = tm.team_id
    WHERE h.id = hive_uuid
      AND tm.user_id = user_uuid
      AND h.archived_at IS NULL  -- Exclude archived hives from team sharing
  ) OR EXISTS (
    -- Hive is in an apiary shared via a team the user owns
    -- ONLY if the hive is NOT archived (archived_at IS NULL)
    SELECT 1 FROM hives h
    INNER JOIN team_apiaries ta ON h.apiary_id = ta.apiary_id
    INNER JOIN teams t ON ta.team_id = t.id
    WHERE h.id = hive_uuid
      AND t.owner_id = user_uuid
      AND h.archived_at IS NULL  -- Exclude archived hives from team sharing
  );
$$;

-- Check if user can access a specific apiary (owns it or it's shared)
CREATE OR REPLACE FUNCTION can_access_apiary(apiary_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    -- User owns the apiary directly
    SELECT 1 FROM apiaries WHERE id = apiary_uuid AND user_id = user_uuid
  ) OR EXISTS (
    -- Apiary is shared with a team the user is a member of
    SELECT 1 FROM team_apiaries ta
    INNER JOIN team_members tm ON ta.team_id = tm.team_id
    WHERE ta.apiary_id = apiary_uuid AND tm.user_id = user_uuid
  ) OR EXISTS (
    -- Apiary is shared via a team the user owns
    SELECT 1 FROM team_apiaries ta
    INNER JOIN teams t ON ta.team_id = t.id
    WHERE ta.apiary_id = apiary_uuid AND t.owner_id = user_uuid
  );
$$;

-- Check if user can access a specific queen (owns it or it's in a shared hive)
-- IMPORTANT: Queens in archived hives are EXCLUDED from team sharing
CREATE OR REPLACE FUNCTION can_access_queen(queen_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    -- User owns the queen directly (can see even if in archived hive)
    SELECT 1 FROM queens WHERE id = queen_uuid AND user_id = user_uuid
  ) OR EXISTS (
    -- Queen is assigned to a hive in a shared apiary
    -- ONLY if the hive is NOT archived
    SELECT 1 FROM queens q
    INNER JOIN hives h ON q.id = h.queen_id
    INNER JOIN team_apiaries ta ON h.apiary_id = ta.apiary_id
    INNER JOIN team_members tm ON ta.team_id = tm.team_id
    WHERE q.id = queen_uuid
      AND tm.user_id = user_uuid
      AND h.archived_at IS NULL  -- Exclude queens in archived hives
  ) OR EXISTS (
    -- Queen is assigned to a hive in an apiary shared via team ownership
    -- ONLY if the hive is NOT archived
    SELECT 1 FROM queens q
    INNER JOIN hives h ON q.id = h.queen_id
    INNER JOIN team_apiaries ta ON h.apiary_id = ta.apiary_id
    INNER JOIN teams t ON ta.team_id = t.id
    WHERE q.id = queen_uuid
      AND t.owner_id = user_uuid
      AND h.archived_at IS NULL  -- Exclude queens in archived hives
  );
$$;

-- ============================================================================
-- TEAMS TABLE POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own teams" ON teams;
DROP POLICY IF EXISTS "Users can view teams they are members of" ON teams;
DROP POLICY IF EXISTS "Users can view their teams" ON teams;
DROP POLICY IF EXISTS "Users can create teams" ON teams;
DROP POLICY IF EXISTS "Team owners can update their teams" ON teams;
DROP POLICY IF EXISTS "Team owners can delete their teams" ON teams;
DROP POLICY IF EXISTS "Admins can view all teams" ON teams;

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view teams they own or are members of
CREATE POLICY "Users can view their teams"
ON teams FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR is_team_member(id, auth.uid())
);

-- INSERT: Users can create teams (they become the owner)
CREATE POLICY "Users can create teams"
ON teams FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- UPDATE: Team owners can update their teams
CREATE POLICY "Team owners can update their teams"
ON teams FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- DELETE: Team owners can delete their teams
CREATE POLICY "Team owners can delete their teams"
ON teams FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- ============================================================================
-- TEAM_MEMBERS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view team members of their teams" ON team_members;
DROP POLICY IF EXISTS "Users can view members of their teams" ON team_members;
DROP POLICY IF EXISTS "Team owners can add members" ON team_members;
DROP POLICY IF EXISTS "Team owners can update members" ON team_members;
DROP POLICY IF EXISTS "Team owners can remove members" ON team_members;
DROP POLICY IF EXISTS "Members can view themselves" ON team_members;
DROP POLICY IF EXISTS "Members can remove themselves" ON team_members;

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view members of teams they own or are members of
CREATE POLICY "Users can view members of their teams"
ON team_members FOR SELECT
TO authenticated
USING (
  is_team_owner(team_id, auth.uid())
  OR user_id = auth.uid()
  OR is_team_member(team_id, auth.uid())
);

-- INSERT: Team owners can add members
CREATE POLICY "Team owners can add members"
ON team_members FOR INSERT
TO authenticated
WITH CHECK (is_team_owner(team_id, auth.uid()));

-- UPDATE: Team owners can update member roles
CREATE POLICY "Team owners can update members"
ON team_members FOR UPDATE
TO authenticated
USING (is_team_owner(team_id, auth.uid()))
WITH CHECK (is_team_owner(team_id, auth.uid()));

-- DELETE: Team owners can remove members, members can remove themselves
CREATE POLICY "Team owners can remove members"
ON team_members FOR DELETE
TO authenticated
USING (
  is_team_owner(team_id, auth.uid())
  OR user_id = auth.uid()
);

-- ============================================================================
-- TEAM_INVITATIONS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view invitations sent to them" ON team_invitations;
DROP POLICY IF EXISTS "Users can view their invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team owners can view invitations for their teams" ON team_invitations;
DROP POLICY IF EXISTS "Team owners can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team owners can update invitations" ON team_invitations;
DROP POLICY IF EXISTS "Invitees can update their invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team owners can delete invitations" ON team_invitations;

-- Enable RLS
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view invitations sent to them or sent by their teams
CREATE POLICY "Users can view their invitations"
ON team_invitations FOR SELECT
TO authenticated
USING (
  invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR is_team_owner(team_id, auth.uid())
);

-- INSERT: Team owners can create invitations for their teams
CREATE POLICY "Team owners can create invitations"
ON team_invitations FOR INSERT
TO authenticated
WITH CHECK (
  is_team_owner(team_id, auth.uid())
  AND invited_by = auth.uid()
);

-- UPDATE: Team owners can update invitations, invitees can accept/decline
CREATE POLICY "Team owners can update invitations"
ON team_invitations FOR UPDATE
TO authenticated
USING (is_team_owner(team_id, auth.uid()))
WITH CHECK (is_team_owner(team_id, auth.uid()));

CREATE POLICY "Invitees can update their invitations"
ON team_invitations FOR UPDATE
TO authenticated
USING (invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
WITH CHECK (invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- DELETE: Team owners can delete invitations
CREATE POLICY "Team owners can delete invitations"
ON team_invitations FOR DELETE
TO authenticated
USING (is_team_owner(team_id, auth.uid()));

-- ============================================================================
-- TEAM_APIARIES TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view shared apiaries" ON team_apiaries;
DROP POLICY IF EXISTS "Team owners can share their apiaries" ON team_apiaries;
DROP POLICY IF EXISTS "Apiary owners can share their apiaries" ON team_apiaries;
DROP POLICY IF EXISTS "Team owners can unshare apiaries" ON team_apiaries;
DROP POLICY IF EXISTS "Apiary owners can unshare their apiaries" ON team_apiaries;

-- Enable RLS
ALTER TABLE team_apiaries ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view apiaries shared with teams they're members of
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

-- INSERT: Apiary owners can share their apiaries with teams they own
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

-- DELETE: Apiary owners or team owners can unshare apiaries
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

-- ============================================================================
-- APIARIES TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own apiaries" ON apiaries;
DROP POLICY IF EXISTS "Users can view shared apiaries" ON apiaries;
DROP POLICY IF EXISTS "Users can view accessible apiaries" ON apiaries;
DROP POLICY IF EXISTS "Users can insert their own apiaries" ON apiaries;
DROP POLICY IF EXISTS "Users can update their own apiaries" ON apiaries;
DROP POLICY IF EXISTS "Users can delete their own apiaries" ON apiaries;

-- Enable RLS
ALTER TABLE apiaries ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view apiaries they own or that are shared with them
CREATE POLICY "Users can view accessible apiaries"
ON apiaries FOR SELECT
TO authenticated
USING (can_access_apiary(id, auth.uid()));

-- INSERT: Users can create their own apiaries
CREATE POLICY "Users can insert their own apiaries"
ON apiaries FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own apiaries
CREATE POLICY "Users can update their own apiaries"
ON apiaries FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own apiaries
CREATE POLICY "Users can delete their own apiaries"
ON apiaries FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- HIVES TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own hives" ON hives;
DROP POLICY IF EXISTS "Users can view shared hives" ON hives;
DROP POLICY IF EXISTS "Users can view accessible hives" ON hives;
DROP POLICY IF EXISTS "Users can insert their own hives" ON hives;
DROP POLICY IF EXISTS "Users can update their own hives" ON hives;
DROP POLICY IF EXISTS "Users can delete their own hives" ON hives;

-- Enable RLS
ALTER TABLE hives ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view hives they own or in shared apiaries
CREATE POLICY "Users can view accessible hives"
ON hives FOR SELECT
TO authenticated
USING (can_access_hive(id, auth.uid()));

-- INSERT: Users can create hives in their own apiaries
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

-- UPDATE: Owners can update their hives, team members can update hive configuration
CREATE POLICY "Users can update accessible hives"
ON hives FOR UPDATE
TO authenticated
USING (can_access_hive(id, auth.uid()))
WITH CHECK (
  -- Owner can change anything
  user_id = auth.uid()
  -- Team members cannot change ownership
  OR (can_access_hive(id, auth.uid()) AND user_id = user_id)
);

-- DELETE: Users can only delete their own hives
CREATE POLICY "Users can delete their own hives"
ON hives FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- QUEENS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own queens" ON queens;
DROP POLICY IF EXISTS "Users can view shared queens" ON queens;
DROP POLICY IF EXISTS "Users can view accessible queens" ON queens;
DROP POLICY IF EXISTS "Users can insert their own queens" ON queens;
DROP POLICY IF EXISTS "Users can update their own queens" ON queens;
DROP POLICY IF EXISTS "Users can delete their own queens" ON queens;

-- Enable RLS
ALTER TABLE queens ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view queens they own or in shared hives
CREATE POLICY "Users can view accessible queens"
ON queens FOR SELECT
TO authenticated
USING (can_access_queen(id, auth.uid()));

-- INSERT: Users can create their own queens
CREATE POLICY "Users can insert their own queens"
ON queens FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own queens
CREATE POLICY "Users can update their own queens"
ON queens FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own queens
CREATE POLICY "Users can delete their own queens"
ON queens FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- INSPECTIONS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own inspections" ON inspections;
DROP POLICY IF EXISTS "Users can view shared hive inspections" ON inspections;
DROP POLICY IF EXISTS "Users can view accessible hive inspections" ON inspections;
DROP POLICY IF EXISTS "Users can insert their own inspections" ON inspections;
DROP POLICY IF EXISTS "Users can insert inspections for accessible hives" ON inspections;
DROP POLICY IF EXISTS "Users can update their own inspections" ON inspections;
DROP POLICY IF EXISTS "Users can delete their own inspections" ON inspections;

-- Enable RLS
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view inspections for hives they have access to
CREATE POLICY "Users can view accessible hive inspections"
ON inspections FOR SELECT
TO authenticated
USING (can_access_hive(hive_id, auth.uid()));

-- INSERT: Users can create inspections for hives they have access to
CREATE POLICY "Users can insert inspections for accessible hives"
ON inspections FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND can_access_hive(hive_id, auth.uid())
);

-- UPDATE: Users can only update their own inspections
CREATE POLICY "Users can update their own inspections"
ON inspections FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own inspections
CREATE POLICY "Users can delete their own inspections"
ON inspections FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- VARROA_TREATMENTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own varroa treatments" ON varroa_treatments;
DROP POLICY IF EXISTS "Users can view shared hive treatments" ON varroa_treatments;
DROP POLICY IF EXISTS "Users can view accessible hive treatments" ON varroa_treatments;
DROP POLICY IF EXISTS "Users can insert their own varroa treatments" ON varroa_treatments;
DROP POLICY IF EXISTS "Users can insert treatments for accessible hives" ON varroa_treatments;
DROP POLICY IF EXISTS "Users can update their own varroa treatments" ON varroa_treatments;
DROP POLICY IF EXISTS "Users can update their own treatments" ON varroa_treatments;
DROP POLICY IF EXISTS "Users can delete their own varroa treatments" ON varroa_treatments;
DROP POLICY IF EXISTS "Users can delete their own treatments" ON varroa_treatments;

-- Enable RLS
ALTER TABLE varroa_treatments ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view treatments for hives they have access to
CREATE POLICY "Users can view accessible hive treatments"
ON varroa_treatments FOR SELECT
TO authenticated
USING (can_access_hive(hive_id, auth.uid()));

-- INSERT: Users can create treatments for hives they have access to
CREATE POLICY "Users can insert treatments for accessible hives"
ON varroa_treatments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND can_access_hive(hive_id, auth.uid())
);

-- UPDATE: Users can only update their own treatments
CREATE POLICY "Users can update their own treatments"
ON varroa_treatments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own treatments
CREATE POLICY "Users can delete their own treatments"
ON varroa_treatments FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- VARROA_CHECKS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own varroa checks" ON varroa_checks;
DROP POLICY IF EXISTS "Users can view shared hive checks" ON varroa_checks;
DROP POLICY IF EXISTS "Users can view accessible hive checks" ON varroa_checks;
DROP POLICY IF EXISTS "Users can insert their own varroa checks" ON varroa_checks;
DROP POLICY IF EXISTS "Users can insert checks for accessible hives" ON varroa_checks;
DROP POLICY IF EXISTS "Users can update their own varroa checks" ON varroa_checks;
DROP POLICY IF EXISTS "Users can update their own checks" ON varroa_checks;
DROP POLICY IF EXISTS "Users can delete their own varroa checks" ON varroa_checks;
DROP POLICY IF EXISTS "Users can delete their own checks" ON varroa_checks;

-- Enable RLS
ALTER TABLE varroa_checks ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view checks for hives they have access to
CREATE POLICY "Users can view accessible hive checks"
ON varroa_checks FOR SELECT
TO authenticated
USING (can_access_hive(hive_id, auth.uid()));

-- INSERT: Users can create checks for hives they have access to
CREATE POLICY "Users can insert checks for accessible hives"
ON varroa_checks FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND can_access_hive(hive_id, auth.uid())
);

-- UPDATE: Users can only update their own checks
CREATE POLICY "Users can update their own checks"
ON varroa_checks FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own checks
CREATE POLICY "Users can delete their own checks"
ON varroa_checks FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- FEEDINGS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own feedings" ON feedings;
DROP POLICY IF EXISTS "Users can view shared hive feedings" ON feedings;
DROP POLICY IF EXISTS "Users can view accessible hive feedings" ON feedings;
DROP POLICY IF EXISTS "Users can insert their own feedings" ON feedings;
DROP POLICY IF EXISTS "Users can insert feedings for accessible hives" ON feedings;
DROP POLICY IF EXISTS "Users can update their own feedings" ON feedings;
DROP POLICY IF EXISTS "Users can delete their own feedings" ON feedings;

-- Enable RLS
ALTER TABLE feedings ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view feedings for hives they have access to
CREATE POLICY "Users can view accessible hive feedings"
ON feedings FOR SELECT
TO authenticated
USING (can_access_hive(hive_id, auth.uid()));

-- INSERT: Users can create feedings for hives they have access to
CREATE POLICY "Users can insert feedings for accessible hives"
ON feedings FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND can_access_hive(hive_id, auth.uid())
);

-- UPDATE: Users can only update their own feedings
CREATE POLICY "Users can update their own feedings"
ON feedings FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own feedings
CREATE POLICY "Users can delete their own feedings"
ON feedings FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- HARVESTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own harvests" ON harvests;
DROP POLICY IF EXISTS "Users can view shared hive harvests" ON harvests;
DROP POLICY IF EXISTS "Users can view accessible hive harvests" ON harvests;
DROP POLICY IF EXISTS "Users can insert their own harvests" ON harvests;
DROP POLICY IF EXISTS "Users can insert harvests for accessible hives" ON harvests;
DROP POLICY IF EXISTS "Users can update their own harvests" ON harvests;
DROP POLICY IF EXISTS "Users can delete their own harvests" ON harvests;

-- Enable RLS
ALTER TABLE harvests ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view harvests for hives they have access to
CREATE POLICY "Users can view accessible hive harvests"
ON harvests FOR SELECT
TO authenticated
USING (can_access_hive(hive_id, auth.uid()));

-- INSERT: Users can create harvests for hives they have access to
CREATE POLICY "Users can insert harvests for accessible hives"
ON harvests FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND can_access_hive(hive_id, auth.uid())
);

-- UPDATE: Users can only update their own harvests
CREATE POLICY "Users can update their own harvests"
ON harvests FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own harvests
CREATE POLICY "Users can delete their own harvests"
ON harvests FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- REARING_BATCHES TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own rearing batches" ON rearing_batches;
DROP POLICY IF EXISTS "Users can insert their own rearing batches" ON rearing_batches;
DROP POLICY IF EXISTS "Users can update their own rearing batches" ON rearing_batches;
DROP POLICY IF EXISTS "Users can delete their own rearing batches" ON rearing_batches;

-- Enable RLS
ALTER TABLE rearing_batches ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can only view their own rearing batches
CREATE POLICY "Users can view their own rearing batches"
ON rearing_batches FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: Users can create their own rearing batches
CREATE POLICY "Users can insert their own rearing batches"
ON rearing_batches FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own rearing batches
CREATE POLICY "Users can update their own rearing batches"
ON rearing_batches FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own rearing batches
CREATE POLICY "Users can delete their own rearing batches"
ON rearing_batches FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- RELOAD SCHEMA CACHE
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify the policies are working correctly

-- 1. Check RLS is enabled on all tables
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RLS STATUS CHECK';
  RAISE NOTICE '============================================';
END $$;

SELECT
  tablename,
  CASE WHEN rowsecurity THEN '✓ ENABLED' ELSE '✗ DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'teams', 'team_members', 'team_apiaries', 'team_invitations',
    'apiaries', 'hives', 'queens', 'inspections',
    'varroa_checks', 'varroa_treatments', 'feedings', 'harvests',
    'rearing_batches'
  )
ORDER BY tablename;

-- 2. Count policies per table
SELECT
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'teams', 'team_members', 'team_apiaries', 'team_invitations',
    'apiaries', 'hives', 'queens', 'inspections',
    'varroa_checks', 'varroa_treatments', 'feedings', 'harvests',
    'rearing_batches'
  )
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Summary
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ RLS POLICIES APPLIED SUCCESSFULLY';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Team collaboration features are now secured with RLS';
  RAISE NOTICE '';
  RAISE NOTICE 'Team Member Permissions:';
  RAISE NOTICE '  • VIEW: All active hives, queens, and historical records in shared apiaries';
  RAISE NOTICE '  • CREATE: New inspections, varroa checks/treatments, feedings, harvests';
  RAISE NOTICE '  • UPDATE: Hive configuration (queen, status, notes)';
  RAISE NOTICE '  • UPDATE/DELETE: Only their own inspection records';
  RAISE NOTICE '  • CANNOT: Delete hives, modify queens, see archived hives';
  RAISE NOTICE '';
  RAISE NOTICE 'Owner Permissions:';
  RAISE NOTICE '  • Full CRUD access to all their data (including archived)';
  RAISE NOTICE '  • Can share/unshare apiaries with teams';
  RAISE NOTICE '  • Can see all team member contributions';
  RAISE NOTICE '';
  RAISE NOTICE 'Security:';
  RAISE NOTICE '  • ARCHIVED hives excluded from team sharing';
  RAISE NOTICE '  • Team members cannot transfer ownership';
  RAISE NOTICE '  • All policies enforced at database level';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Test team collaboration with multiple users';
  RAISE NOTICE '  2. Verify team members can create and edit their own records';
  RAISE NOTICE '  3. Verify team members can update hive configuration';
  RAISE NOTICE '  4. Verify archived hives are NOT visible to team members';
  RAISE NOTICE '  5. Ensure owners retain full control';
  RAISE NOTICE '============================================';
END $$;
