-- Simple RLS policies that definitely work
-- This is a conservative approach that ensures users can see their own data

-- Enable RLS on all tables
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.varroa_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.varroa_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harvests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- INSPECTIONS POLICIES - Simple version
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can view shared hive inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can view accessible hive inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can insert their own inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can insert inspections for accessible hives" ON public.inspections;
DROP POLICY IF EXISTS "Users can update their own inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can delete their own inspections" ON public.inspections;

-- SELECT: Users can see their own inspections + inspections for hives they own
CREATE POLICY "Users can view their own inspections"
ON public.inspections FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM hives
    WHERE hives.id = inspections.hive_id
    AND hives.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM hives
    INNER JOIN apiaries ON hives.apiary_id = apiaries.id
    WHERE hives.id = inspections.hive_id
    AND apiaries.user_id = auth.uid()
  )
);

-- INSERT: Users can create inspections for hives they own
CREATE POLICY "Users can insert their own inspections"
ON public.inspections FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM hives
      WHERE hives.id = hive_id
      AND hives.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM hives
      INNER JOIN apiaries ON hives.apiary_id = apiaries.id
      WHERE hives.id = hive_id
      AND apiaries.user_id = auth.uid()
    )
  )
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
-- VARROA TREATMENTS POLICIES - Simple version
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own varroa treatments" ON public.varroa_treatments;
DROP POLICY IF EXISTS "Users can view shared hive treatments" ON public.varroa_treatments;
DROP POLICY IF EXISTS "Users can view accessible hive treatments" ON public.varroa_treatments;
DROP POLICY IF EXISTS "Users can insert their own varroa treatments" ON public.varroa_treatments;
DROP POLICY IF EXISTS "Users can insert treatments for accessible hives" ON public.varroa_treatments;
DROP POLICY IF EXISTS "Users can update their own varroa treatments" ON public.varroa_treatments;
DROP POLICY IF EXISTS "Users can update their own treatments" ON public.varroa_treatments;
DROP POLICY IF EXISTS "Users can delete their own varroa treatments" ON public.varroa_treatments;
DROP POLICY IF EXISTS "Users can delete their own treatments" ON public.varroa_treatments;

CREATE POLICY "Users can view their own varroa treatments"
ON public.varroa_treatments FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM hives
    WHERE hives.id = varroa_treatments.hive_id
    AND hives.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM hives
    INNER JOIN apiaries ON hives.apiary_id = apiaries.id
    WHERE hives.id = varroa_treatments.hive_id
    AND apiaries.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own varroa treatments"
ON public.varroa_treatments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own varroa treatments"
ON public.varroa_treatments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own varroa treatments"
ON public.varroa_treatments FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- VARROA CHECKS POLICIES - Simple version
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own varroa checks" ON public.varroa_checks;
DROP POLICY IF EXISTS "Users can view shared hive checks" ON public.varroa_checks;
DROP POLICY IF EXISTS "Users can view accessible hive checks" ON public.varroa_checks;
DROP POLICY IF EXISTS "Users can insert their own varroa checks" ON public.varroa_checks;
DROP POLICY IF EXISTS "Users can insert checks for accessible hives" ON public.varroa_checks;
DROP POLICY IF EXISTS "Users can update their own varroa checks" ON public.varroa_checks;
DROP POLICY IF EXISTS "Users can update their own checks" ON public.varroa_checks;
DROP POLICY IF EXISTS "Users can delete their own varroa checks" ON public.varroa_checks;
DROP POLICY IF EXISTS "Users can delete their own checks" ON public.varroa_checks;

CREATE POLICY "Users can view their own varroa checks"
ON public.varroa_checks FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM hives
    WHERE hives.id = varroa_checks.hive_id
    AND hives.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM hives
    INNER JOIN apiaries ON hives.apiary_id = apiaries.id
    WHERE hives.id = varroa_checks.hive_id
    AND apiaries.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own varroa checks"
ON public.varroa_checks FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own varroa checks"
ON public.varroa_checks FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own varroa checks"
ON public.varroa_checks FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- FEEDINGS POLICIES - Simple version
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own feedings" ON public.feedings;
DROP POLICY IF EXISTS "Users can view shared hive feedings" ON public.feedings;
DROP POLICY IF EXISTS "Users can view accessible hive feedings" ON public.feedings;
DROP POLICY IF EXISTS "Users can insert their own feedings" ON public.feedings;
DROP POLICY IF EXISTS "Users can insert feedings for accessible hives" ON public.feedings;
DROP POLICY IF EXISTS "Users can update their own feedings" ON public.feedings;
DROP POLICY IF EXISTS "Users can delete their own feedings" ON public.feedings;

CREATE POLICY "Users can view their own feedings"
ON public.feedings FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM hives
    WHERE hives.id = feedings.hive_id
    AND hives.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM hives
    INNER JOIN apiaries ON hives.apiary_id = apiaries.id
    WHERE hives.id = feedings.hive_id
    AND apiaries.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own feedings"
ON public.feedings FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

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
-- HARVESTS POLICIES - Simple version
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own harvests" ON public.harvests;
DROP POLICY IF EXISTS "Users can view shared hive harvests" ON public.harvests;
DROP POLICY IF EXISTS "Users can view accessible hive harvests" ON public.harvests;
DROP POLICY IF EXISTS "Users can insert their own harvests" ON public.harvests;
DROP POLICY IF EXISTS "Users can insert harvests for accessible hives" ON public.harvests;
DROP POLICY IF EXISTS "Users can update their own harvests" ON public.harvests;
DROP POLICY IF EXISTS "Users can delete their own harvests" ON public.harvests;

CREATE POLICY "Users can view their own harvests"
ON public.harvests FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM hives
    WHERE hives.id = harvests.hive_id
    AND hives.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM hives
    INNER JOIN apiaries ON hives.apiary_id = apiaries.id
    WHERE hives.id = harvests.hive_id
    AND apiaries.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own harvests"
ON public.harvests FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

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
