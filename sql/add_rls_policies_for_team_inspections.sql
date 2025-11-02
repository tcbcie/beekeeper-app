-- Add RLS policies to allow team owners to see team member records for shared hives
-- This enables team collaboration for inspections, varroa treatments, checks, feedings, and harvests

-- First, create helper functions if they don't exist (from previous RLS fixes)
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

-- Create a helper function to check if a hive belongs to a shared apiary for the user
CREATE OR REPLACE FUNCTION can_access_hive(hive_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    -- User owns the hive directly
    SELECT 1 FROM hives WHERE id = hive_uuid AND user_id = user_uuid
  ) OR EXISTS (
    -- Hive is in an apiary shared with a team the user is part of
    SELECT 1 FROM hives h
    INNER JOIN team_apiaries ta ON h.apiary_id = ta.apiary_id
    INNER JOIN team_members tm ON ta.team_id = tm.team_id
    WHERE h.id = hive_uuid AND tm.user_id = user_uuid
  ) OR EXISTS (
    -- Hive is in an apiary owned by a team the user owns
    SELECT 1 FROM hives h
    INNER JOIN team_apiaries ta ON h.apiary_id = ta.apiary_id
    INNER JOIN teams t ON ta.team_id = t.id
    WHERE h.id = hive_uuid AND t.owner_id = user_uuid
  );
$$;

-- Enable RLS on all relevant tables
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.varroa_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.varroa_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harvests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- INSPECTIONS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can view shared hive inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can insert their own inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can update their own inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can delete their own inspections" ON public.inspections;

-- SELECT: Users can view inspections for hives they have access to
CREATE POLICY "Users can view accessible hive inspections"
ON public.inspections FOR SELECT
TO authenticated
USING (can_access_hive(hive_id, auth.uid()));

-- INSERT: Users can create inspections for hives they have access to
CREATE POLICY "Users can insert inspections for accessible hives"
ON public.inspections FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  can_access_hive(hive_id, auth.uid())
);

-- UPDATE: Users can only update their own inspections
CREATE POLICY "Users can update their own inspections"
ON public.inspections FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own inspections
CREATE POLICY "Users can delete their own inspections"
ON public.inspections FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- VARROA TREATMENTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own varroa treatments" ON public.varroa_treatments;
DROP POLICY IF EXISTS "Users can view shared hive treatments" ON public.varroa_treatments;
DROP POLICY IF EXISTS "Users can insert their own varroa treatments" ON public.varroa_treatments;
DROP POLICY IF EXISTS "Users can update their own varroa treatments" ON public.varroa_treatments;
DROP POLICY IF EXISTS "Users can delete their own varroa treatments" ON public.varroa_treatments;

CREATE POLICY "Users can view accessible hive treatments"
ON public.varroa_treatments FOR SELECT
TO authenticated
USING (can_access_hive(hive_id, auth.uid()));

CREATE POLICY "Users can insert treatments for accessible hives"
ON public.varroa_treatments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  can_access_hive(hive_id, auth.uid())
);

CREATE POLICY "Users can update their own treatments"
ON public.varroa_treatments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own treatments"
ON public.varroa_treatments FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- VARROA CHECKS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own varroa checks" ON public.varroa_checks;
DROP POLICY IF EXISTS "Users can view shared hive checks" ON public.varroa_checks;
DROP POLICY IF EXISTS "Users can insert their own varroa checks" ON public.varroa_checks;
DROP POLICY IF EXISTS "Users can update their own varroa checks" ON public.varroa_checks;
DROP POLICY IF EXISTS "Users can delete their own varroa checks" ON public.varroa_checks;

CREATE POLICY "Users can view accessible hive checks"
ON public.varroa_checks FOR SELECT
TO authenticated
USING (can_access_hive(hive_id, auth.uid()));

CREATE POLICY "Users can insert checks for accessible hives"
ON public.varroa_checks FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  can_access_hive(hive_id, auth.uid())
);

CREATE POLICY "Users can update their own checks"
ON public.varroa_checks FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own checks"
ON public.varroa_checks FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- FEEDINGS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own feedings" ON public.feedings;
DROP POLICY IF EXISTS "Users can view shared hive feedings" ON public.feedings;
DROP POLICY IF EXISTS "Users can insert their own feedings" ON public.feedings;
DROP POLICY IF EXISTS "Users can update their own feedings" ON public.feedings;
DROP POLICY IF EXISTS "Users can delete their own feedings" ON public.feedings;

CREATE POLICY "Users can view accessible hive feedings"
ON public.feedings FOR SELECT
TO authenticated
USING (can_access_hive(hive_id, auth.uid()));

CREATE POLICY "Users can insert feedings for accessible hives"
ON public.feedings FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  can_access_hive(hive_id, auth.uid())
);

CREATE POLICY "Users can update their own feedings"
ON public.feedings FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own feedings"
ON public.feedings FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- HARVESTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own harvests" ON public.harvests;
DROP POLICY IF EXISTS "Users can view shared hive harvests" ON public.harvests;
DROP POLICY IF EXISTS "Users can insert their own harvests" ON public.harvests;
DROP POLICY IF EXISTS "Users can update their own harvests" ON public.harvests;
DROP POLICY IF EXISTS "Users can delete their own harvests" ON public.harvests;

CREATE POLICY "Users can view accessible hive harvests"
ON public.harvests FOR SELECT
TO authenticated
USING (can_access_hive(hive_id, auth.uid()));

CREATE POLICY "Users can insert harvests for accessible hives"
ON public.harvests FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  can_access_hive(hive_id, auth.uid())
);

CREATE POLICY "Users can update their own harvests"
ON public.harvests FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own harvests"
ON public.harvests FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Reload the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
