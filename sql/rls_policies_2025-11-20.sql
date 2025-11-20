-- ============================================================================
-- Beekeeper App Row Level Security (RLS) Policies Export
-- Generated: 2025-11-20
-- Source: Supabase Production Database
-- ============================================================================

-- NOTE: Before running these policies, ensure the following helper functions exist:
-- - can_access_apiary(apiary_id uuid, user_id uuid)
-- - can_access_hive(hive_id uuid, user_id uuid)
-- - can_access_queen(queen_id uuid, user_id uuid)
-- - is_admin()
-- - is_team_owner(team_id uuid, user_id uuid)
-- - is_team_member(team_id uuid, user_id uuid)

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT
    TO public
    USING (auth.uid() = id);

-- Users can view team member profiles
CREATE POLICY "Users can view team member profiles" ON public.profiles
    FOR SELECT
    TO public
    USING (EXISTS (
        SELECT 1
        FROM team_members tm1
        JOIN team_members tm2 ON tm1.team_id = tm2.team_id
        WHERE tm1.user_id = auth.uid()
        AND tm2.user_id = profiles.id
    ));

-- Allow anon to check deleted accounts
CREATE POLICY "Allow anon to check deleted accounts" ON public.profiles
    FOR SELECT
    TO anon
    USING (deleted_at IS NOT NULL);

-- Users can insert own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT
    TO public
    WITH CHECK (auth.uid() = id);

-- Allow new user profile creation
CREATE POLICY "Allow new user profile creation" ON public.profiles
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Users can update own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    TO public
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Prevent direct profile deletion
CREATE POLICY "Prevent direct profile deletion" ON public.profiles
    FOR DELETE
    TO authenticated
    USING (false);

-- ============================================================================
-- APIARIES TABLE POLICIES
-- ============================================================================

ALTER TABLE public.apiaries ENABLE ROW LEVEL SECURITY;

-- Users can view accessible apiaries
CREATE POLICY "Users can view accessible apiaries" ON public.apiaries
    FOR SELECT
    TO public
    USING (can_access_apiary(id, auth.uid()));

-- Users can insert their own apiaries
CREATE POLICY "Users can insert their own apiaries" ON public.apiaries
    FOR INSERT
    TO public
    WITH CHECK (user_id = auth.uid());

-- Users can update their own apiaries
CREATE POLICY "Users can update their own apiaries" ON public.apiaries
    FOR UPDATE
    TO public
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own apiaries
CREATE POLICY "Users can delete their own apiaries" ON public.apiaries
    FOR DELETE
    TO public
    USING (user_id = auth.uid());

-- ============================================================================
-- HIVES TABLE POLICIES
-- ============================================================================

ALTER TABLE public.hives ENABLE ROW LEVEL SECURITY;

-- Users can view accessible hives
CREATE POLICY "Users can view accessible hives" ON public.hives
    FOR SELECT
    TO public
    USING (can_access_hive(id, auth.uid()));

-- Users can insert their own hives
CREATE POLICY "Users can insert their own hives" ON public.hives
    FOR INSERT
    TO public
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM apiaries
            WHERE apiaries.id = hives.apiary_id
            AND apiaries.user_id = auth.uid()
        )
    );

-- Users can update accessible hives
CREATE POLICY "Users can update accessible hives" ON public.hives
    FOR UPDATE
    TO public
    USING (can_access_hive(id, auth.uid()))
    WITH CHECK (
        user_id = auth.uid()
        OR (can_access_hive(id, auth.uid()) AND user_id = user_id)
    );

-- Users can delete their own hives
CREATE POLICY "Users can delete their own hives" ON public.hives
    FOR DELETE
    TO public
    USING (user_id = auth.uid());

-- ============================================================================
-- QUEENS TABLE POLICIES
-- ============================================================================

ALTER TABLE public.queens ENABLE ROW LEVEL SECURITY;

-- Users can view accessible queens
CREATE POLICY "Users can view accessible queens" ON public.queens
    FOR SELECT
    TO public
    USING (can_access_queen(id, auth.uid()));

-- Users can insert their own queens
CREATE POLICY "Users can insert their own queens" ON public.queens
    FOR INSERT
    TO public
    WITH CHECK (user_id = auth.uid());

-- Users can update their own queens
CREATE POLICY "Users can update their own queens" ON public.queens
    FOR UPDATE
    TO public
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own queens
CREATE POLICY "Users can delete their own queens" ON public.queens
    FOR DELETE
    TO public
    USING (user_id = auth.uid());

-- ============================================================================
-- COLONIES TABLE POLICIES
-- ============================================================================

ALTER TABLE public.colonies ENABLE ROW LEVEL SECURITY;

-- Users can view their own colonies
CREATE POLICY "Users can view their own colonies" ON public.colonies
    FOR SELECT
    TO public
    USING (auth.uid() = user_id);

-- Users can insert their own colonies
CREATE POLICY "Users can insert their own colonies" ON public.colonies
    FOR INSERT
    TO public
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own colonies
CREATE POLICY "Users can update their own colonies" ON public.colonies
    FOR UPDATE
    TO public
    USING (auth.uid() = user_id);

-- Users can delete their own colonies
CREATE POLICY "Users can delete their own colonies" ON public.colonies
    FOR DELETE
    TO public
    USING (auth.uid() = user_id);

-- ============================================================================
-- COLONY_MOVEMENTS TABLE POLICIES
-- ============================================================================

ALTER TABLE public.colony_movements ENABLE ROW LEVEL SECURITY;

-- Users can view their own colony movements
CREATE POLICY "Users can view their own colony movements" ON public.colony_movements
    FOR SELECT
    TO public
    USING (auth.uid() = user_id);

-- Users can insert their own colony movements
CREATE POLICY "Users can insert their own colony movements" ON public.colony_movements
    FOR INSERT
    TO public
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own colony movements
CREATE POLICY "Users can update their own colony movements" ON public.colony_movements
    FOR UPDATE
    TO public
    USING (auth.uid() = user_id);

-- Users can delete their own colony movements
CREATE POLICY "Users can delete their own colony movements" ON public.colony_movements
    FOR DELETE
    TO public
    USING (auth.uid() = user_id);

-- ============================================================================
-- INSPECTIONS TABLE POLICIES
-- ============================================================================

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- Users can view accessible hive inspections
CREATE POLICY "Users can view accessible hive inspections" ON public.inspections
    FOR SELECT
    TO public
    USING (can_access_hive(hive_id, auth.uid()));

-- Users can insert inspections for accessible hives
CREATE POLICY "Users can insert inspections for accessible hives" ON public.inspections
    FOR INSERT
    TO public
    WITH CHECK (
        user_id = auth.uid()
        AND can_access_hive(hive_id, auth.uid())
    );

-- Users can update their own inspections
CREATE POLICY "Users can update their own inspections" ON public.inspections
    FOR UPDATE
    TO public
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own inspections
CREATE POLICY "Users can delete their own inspections" ON public.inspections
    FOR DELETE
    TO public
    USING (user_id = auth.uid());

-- ============================================================================
-- VARROA_CHECKS TABLE POLICIES
-- ============================================================================

ALTER TABLE public.varroa_checks ENABLE ROW LEVEL SECURITY;

-- Users can view accessible hive checks
CREATE POLICY "Users can view accessible hive checks" ON public.varroa_checks
    FOR SELECT
    TO public
    USING (can_access_hive(hive_id, auth.uid()));

-- Users can insert checks for accessible hives
CREATE POLICY "Users can insert checks for accessible hives" ON public.varroa_checks
    FOR INSERT
    TO public
    WITH CHECK (
        user_id = auth.uid()
        AND can_access_hive(hive_id, auth.uid())
    );

-- Users can update their own checks
CREATE POLICY "Users can update their own checks" ON public.varroa_checks
    FOR UPDATE
    TO public
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own checks
CREATE POLICY "Users can delete their own checks" ON public.varroa_checks
    FOR DELETE
    TO public
    USING (user_id = auth.uid());

-- ============================================================================
-- VARROA_TREATMENTS TABLE POLICIES
-- ============================================================================

ALTER TABLE public.varroa_treatments ENABLE ROW LEVEL SECURITY;

-- Users can view accessible hive treatments
CREATE POLICY "Users can view accessible hive treatments" ON public.varroa_treatments
    FOR SELECT
    TO public
    USING (can_access_hive(hive_id, auth.uid()));

-- Users can insert treatments for accessible hives
CREATE POLICY "Users can insert treatments for accessible hives" ON public.varroa_treatments
    FOR INSERT
    TO public
    WITH CHECK (
        user_id = auth.uid()
        AND can_access_hive(hive_id, auth.uid())
    );

-- Users can update their own treatments
CREATE POLICY "Users can update their own treatments" ON public.varroa_treatments
    FOR UPDATE
    TO public
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own treatments
CREATE POLICY "Users can delete their own treatments" ON public.varroa_treatments
    FOR DELETE
    TO public
    USING (user_id = auth.uid());

-- ============================================================================
-- FEEDINGS TABLE POLICIES
-- ============================================================================

ALTER TABLE public.feedings ENABLE ROW LEVEL SECURITY;

-- Users can view accessible hive feedings
CREATE POLICY "Users can view accessible hive feedings" ON public.feedings
    FOR SELECT
    TO public
    USING (can_access_hive(hive_id, auth.uid()));

-- Users can insert feedings for accessible hives
CREATE POLICY "Users can insert feedings for accessible hives" ON public.feedings
    FOR INSERT
    TO public
    WITH CHECK (
        user_id = auth.uid()
        AND can_access_hive(hive_id, auth.uid())
    );

-- Users can update their own feedings
CREATE POLICY "Users can update their own feedings" ON public.feedings
    FOR UPDATE
    TO public
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own feedings
CREATE POLICY "Users can delete their own feedings" ON public.feedings
    FOR DELETE
    TO public
    USING (user_id = auth.uid());

-- ============================================================================
-- HARVESTS TABLE POLICIES
-- ============================================================================

ALTER TABLE public.harvests ENABLE ROW LEVEL SECURITY;

-- Users can view accessible hive harvests
CREATE POLICY "Users can view accessible hive harvests" ON public.harvests
    FOR SELECT
    TO public
    USING (can_access_hive(hive_id, auth.uid()));

-- Users can insert harvests for accessible hives
CREATE POLICY "Users can insert harvests for accessible hives" ON public.harvests
    FOR INSERT
    TO public
    WITH CHECK (
        user_id = auth.uid()
        AND can_access_hive(hive_id, auth.uid())
    );

-- Users can update their own harvests
CREATE POLICY "Users can update their own harvests" ON public.harvests
    FOR UPDATE
    TO public
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own harvests
CREATE POLICY "Users can delete their own harvests" ON public.harvests
    FOR DELETE
    TO public
    USING (user_id = auth.uid());

-- ============================================================================
-- REARING_BATCHES TABLE POLICIES
-- ============================================================================

ALTER TABLE public.rearing_batches ENABLE ROW LEVEL SECURITY;

-- Users can view their own rearing batches
CREATE POLICY "Users can view their own rearing batches" ON public.rearing_batches
    FOR SELECT
    TO public
    USING (user_id = auth.uid());

-- Users can insert their own rearing batches
CREATE POLICY "Users can insert their own rearing batches" ON public.rearing_batches
    FOR INSERT
    TO public
    WITH CHECK (user_id = auth.uid());

-- Users can update their own rearing batches
CREATE POLICY "Users can update their own rearing batches" ON public.rearing_batches
    FOR UPDATE
    TO public
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own rearing batches
CREATE POLICY "Users can delete their own rearing batches" ON public.rearing_batches
    FOR DELETE
    TO public
    USING (user_id = auth.uid());

-- ============================================================================
-- TEAMS TABLE POLICIES
-- ============================================================================

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Users can view their teams
CREATE POLICY "Users can view their teams" ON public.teams
    FOR SELECT
    TO public
    USING (
        owner_id = auth.uid()
        OR is_team_member(id, auth.uid())
    );

-- Users can create teams
CREATE POLICY "Users can create teams" ON public.teams
    FOR INSERT
    TO public
    WITH CHECK (owner_id = auth.uid());

-- Team owners can update their teams
CREATE POLICY "Team owners can update their teams" ON public.teams
    FOR UPDATE
    TO public
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Team owners can delete their teams
CREATE POLICY "Team owners can delete their teams" ON public.teams
    FOR DELETE
    TO public
    USING (owner_id = auth.uid());

-- ============================================================================
-- TEAM_MEMBERS TABLE POLICIES
-- ============================================================================

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Users can view members of their teams
CREATE POLICY "Users can view members of their teams" ON public.team_members
    FOR SELECT
    TO public
    USING (
        is_team_owner(team_id, auth.uid())
        OR user_id = auth.uid()
        OR is_team_member(team_id, auth.uid())
    );

-- Team owners can add members
CREATE POLICY "Team owners can add members" ON public.team_members
    FOR INSERT
    TO public
    WITH CHECK (is_team_owner(team_id, auth.uid()));

-- Team owners can update members
CREATE POLICY "Team owners can update members" ON public.team_members
    FOR UPDATE
    TO public
    USING (is_team_owner(team_id, auth.uid()))
    WITH CHECK (is_team_owner(team_id, auth.uid()));

-- Team owners can remove members
CREATE POLICY "Team owners can remove members" ON public.team_members
    FOR DELETE
    TO public
    USING (
        is_team_owner(team_id, auth.uid())
        OR user_id = auth.uid()
    );

-- ============================================================================
-- TEAM_APIARIES TABLE POLICIES
-- ============================================================================

ALTER TABLE public.team_apiaries ENABLE ROW LEVEL SECURITY;

-- Users can view shared apiaries
CREATE POLICY "Users can view shared apiaries" ON public.team_apiaries
    FOR SELECT
    TO public
    USING (
        is_team_owner(team_id, auth.uid())
        OR is_team_member(team_id, auth.uid())
        OR EXISTS (
            SELECT 1
            FROM apiaries
            WHERE apiaries.id = team_apiaries.apiary_id
            AND apiaries.user_id = auth.uid()
        )
    );

-- Apiary owners can share their apiaries
CREATE POLICY "Apiary owners can share their apiaries" ON public.team_apiaries
    FOR INSERT
    TO public
    WITH CHECK (
        is_team_owner(team_id, auth.uid())
        AND EXISTS (
            SELECT 1
            FROM apiaries
            WHERE apiaries.id = team_apiaries.apiary_id
            AND apiaries.user_id = auth.uid()
        )
    );

-- Apiary owners can unshare their apiaries
CREATE POLICY "Apiary owners can unshare their apiaries" ON public.team_apiaries
    FOR DELETE
    TO public
    USING (
        is_team_owner(team_id, auth.uid())
        OR EXISTS (
            SELECT 1
            FROM apiaries
            WHERE apiaries.id = team_apiaries.apiary_id
            AND apiaries.user_id = auth.uid()
        )
    );

-- ============================================================================
-- TEAM_INVITATIONS TABLE POLICIES
-- ============================================================================

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Anyone can view invitations
CREATE POLICY "Anyone can view invitations" ON public.team_invitations
    FOR SELECT
    TO public
    USING (true);

-- Team owners can create invitations
CREATE POLICY "Team owners can create invitations" ON public.team_invitations
    FOR INSERT
    TO public
    WITH CHECK (
        is_team_owner(team_id, auth.uid())
        AND invited_by = auth.uid()
    );

-- Team owners can update invitations
CREATE POLICY "Team owners can update invitations" ON public.team_invitations
    FOR UPDATE
    TO public
    USING (is_team_owner(team_id, auth.uid()))
    WITH CHECK (is_team_owner(team_id, auth.uid()));

-- Invitees can update their invitations
CREATE POLICY "Invitees can update their invitations" ON public.team_invitations
    FOR UPDATE
    TO public
    USING (
        email::text = (
            SELECT profiles.email
            FROM profiles
            WHERE profiles.id = auth.uid()
        )
    )
    WITH CHECK (
        email::text = (
            SELECT profiles.email
            FROM profiles
            WHERE profiles.id = auth.uid()
        )
    );

-- Team owners can delete invitations
CREATE POLICY "Team owners can delete invitations" ON public.team_invitations
    FOR DELETE
    TO public
    USING (is_team_owner(team_id, auth.uid()));

-- ============================================================================
-- TASKS_EVENTS TABLE POLICIES
-- ============================================================================

ALTER TABLE public.tasks_events ENABLE ROW LEVEL SECURITY;

-- Users can view their tasks and team tasks
CREATE POLICY "Users can view their tasks and team tasks" ON public.tasks_events
    FOR SELECT
    TO public
    USING (
        user_id = auth.uid()
        OR (hive_id IS NOT NULL AND can_access_hive(hive_id, auth.uid()))
        OR (apiary_id IS NOT NULL AND can_access_apiary(apiary_id, auth.uid()))
    );

-- Users can create tasks for accessible hives
CREATE POLICY "Users can create tasks for accessible hives" ON public.tasks_events
    FOR INSERT
    TO public
    WITH CHECK (
        user_id = auth.uid()
        AND (
            (hive_id IS NULL AND apiary_id IS NULL)
            OR (hive_id IS NOT NULL AND can_access_hive(hive_id, auth.uid()))
            OR (apiary_id IS NOT NULL AND can_access_apiary(apiary_id, auth.uid()))
        )
    );

-- Users can update their own tasks and team tasks
CREATE POLICY "Users can update their own tasks and team tasks" ON public.tasks_events
    FOR UPDATE
    TO public
    USING (
        user_id = auth.uid()
        OR (hive_id IS NOT NULL AND can_access_hive(hive_id, auth.uid()))
        OR (apiary_id IS NOT NULL AND can_access_apiary(apiary_id, auth.uid()))
    )
    WITH CHECK (
        user_id = auth.uid()
        AND (
            (hive_id IS NULL AND apiary_id IS NULL)
            OR (hive_id IS NOT NULL AND can_access_hive(hive_id, auth.uid()))
            OR (apiary_id IS NOT NULL AND can_access_apiary(apiary_id, auth.uid()))
        )
    );

-- Users can delete their own tasks
CREATE POLICY "Users can delete their own tasks" ON public.tasks_events
    FOR DELETE
    TO public
    USING (user_id = auth.uid());

-- ============================================================================
-- DROPDOWN_CATEGORIES TABLE POLICIES
-- ============================================================================

ALTER TABLE public.dropdown_categories ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view dropdown categories
CREATE POLICY "Authenticated users can view dropdown categories" ON public.dropdown_categories
    FOR SELECT
    TO authenticated
    USING (true);

-- Authenticated users can insert dropdown categories
CREATE POLICY "Authenticated users can insert dropdown categories" ON public.dropdown_categories
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Authenticated users can update dropdown categories
CREATE POLICY "Authenticated users can update dropdown categories" ON public.dropdown_categories
    FOR UPDATE
    TO authenticated
    USING (true);

-- Authenticated users can delete dropdown categories
CREATE POLICY "Authenticated users can delete dropdown categories" ON public.dropdown_categories
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================================
-- DROPDOWN_VALUES TABLE POLICIES
-- ============================================================================

ALTER TABLE public.dropdown_values ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view dropdown values
CREATE POLICY "Authenticated users can view dropdown values" ON public.dropdown_values
    FOR SELECT
    TO authenticated
    USING (true);

-- Authenticated users can insert dropdown values
CREATE POLICY "Authenticated users can insert dropdown values" ON public.dropdown_values
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Authenticated users can update dropdown values
CREATE POLICY "Authenticated users can update dropdown values" ON public.dropdown_values
    FOR UPDATE
    TO authenticated
    USING (true);

-- Authenticated users can delete dropdown values
CREATE POLICY "Authenticated users can delete dropdown values" ON public.dropdown_values
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================================
-- REGISTRATION_CODES TABLE POLICIES
-- ============================================================================

ALTER TABLE public.registration_codes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all codes
CREATE POLICY "Allow authenticated users to read all codes" ON public.registration_codes
    FOR SELECT
    TO authenticated
    USING (true);

-- Admins can manage registration codes
CREATE POLICY "Admins can manage registration codes" ON public.registration_codes
    FOR ALL
    TO public
    USING (EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'Admin'::text
    ));

-- ============================================================================
-- BEEKEEPING_ASSOCIATIONS TABLE POLICIES
-- ============================================================================

ALTER TABLE public.beekeeping_associations ENABLE ROW LEVEL SECURITY;

-- Anyone can view active associations
CREATE POLICY "Anyone can view active associations" ON public.beekeeping_associations
    FOR SELECT
    TO public
    USING (is_active = true);

-- Only admins can modify associations
CREATE POLICY "Only admins can modify associations" ON public.beekeeping_associations
    FOR ALL
    TO public
    USING (EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'Admin'::text
    ));

-- ============================================================================
-- SUPPORT_TICKETS TABLE POLICIES
-- ============================================================================

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can view their own tickets
CREATE POLICY "Users can view their own tickets" ON public.support_tickets
    FOR SELECT
    TO public
    USING (auth.uid() = user_id);

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets" ON public.support_tickets
    FOR SELECT
    TO public
    USING (EXISTS (
        SELECT 1
        FROM del_user_profiles
        WHERE del_user_profiles.id = auth.uid()
        AND del_user_profiles.role::text = 'Admin'::text
    ));

-- Users can insert their own tickets
CREATE POLICY "Users can insert their own tickets" ON public.support_tickets
    FOR INSERT
    TO public
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own tickets
CREATE POLICY "Users can update their own tickets" ON public.support_tickets
    FOR UPDATE
    TO public
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Admins can update all tickets
CREATE POLICY "Admins can update all tickets" ON public.support_tickets
    FOR UPDATE
    TO public
    USING (EXISTS (
        SELECT 1
        FROM del_user_profiles
        WHERE del_user_profiles.id = auth.uid()
        AND del_user_profiles.role::text = 'Admin'::text
    ));

-- Admins can delete tickets
CREATE POLICY "Admins can delete tickets" ON public.support_tickets
    FOR DELETE
    TO public
    USING (EXISTS (
        SELECT 1
        FROM del_user_profiles
        WHERE del_user_profiles.id = auth.uid()
        AND del_user_profiles.role::text = 'Admin'::text
    ));

-- ============================================================================
-- REACTIVATION_REQUESTS TABLE POLICIES
-- ============================================================================

ALTER TABLE public.reactivation_requests ENABLE ROW LEVEL SECURITY;

-- Users can view own reactivation requests
CREATE POLICY "Users can view own reactivation requests" ON public.reactivation_requests
    FOR SELECT
    TO public
    USING (user_id = auth.uid());

-- Admins can view all reactivation requests
CREATE POLICY "Admins can view all reactivation requests" ON public.reactivation_requests
    FOR SELECT
    TO public
    USING (EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'Admin'::text
    ));

-- Users can create own reactivation requests
CREATE POLICY "Users can create own reactivation requests" ON public.reactivation_requests
    FOR INSERT
    TO public
    WITH CHECK (user_id = auth.uid());

-- Admins can update reactivation requests
CREATE POLICY "Admins can update reactivation requests" ON public.reactivation_requests
    FOR UPDATE
    TO public
    USING (EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'Admin'::text
    ));

-- ============================================================================
-- VARROA_TREATMENT_PRODUCTS TABLE POLICIES
-- ============================================================================

ALTER TABLE public.varroa_treatment_products ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read varroa treatment products
CREATE POLICY "Allow authenticated users to read varroa treatment products" ON public.varroa_treatment_products
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow admins to manage varroa treatment products
CREATE POLICY "Allow admins to manage varroa treatment products" ON public.varroa_treatment_products
    FOR ALL
    TO public
    USING (EXISTS (
        SELECT 1
        FROM del_user_profiles
        WHERE del_user_profiles.id = auth.uid()
        AND del_user_profiles.role::text = 'Admin'::text
    ));

-- ============================================================================
-- SUBSCRIPTION_HISTORY TABLE POLICIES
-- ============================================================================

-- Note: subscription_history table has RLS disabled in production
-- ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- END OF RLS POLICIES
-- ============================================================================
