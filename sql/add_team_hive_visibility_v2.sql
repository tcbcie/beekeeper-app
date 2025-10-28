-- Add RLS policies so team members can see shared apiaries and hives
-- V2: Drops existing policies first to avoid "already exists" errors

-- Step 1: Show current apiaries policies
SELECT 'Current apiaries policies:' as step;
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'apiaries'
ORDER BY policyname;

-- Step 2: Drop existing team policies if they exist
DROP POLICY IF EXISTS "apiaries_select_team_shared" ON public.apiaries;
DROP POLICY IF EXISTS "hives_select_team_shared" ON public.hives;
DROP POLICY IF EXISTS "queens_select_team_shared" ON public.queens;
DROP POLICY IF EXISTS "inspections_select_team_shared" ON public.inspections;
DROP POLICY IF EXISTS "varroa_checks_select_team_shared" ON public.varroa_checks;
DROP POLICY IF EXISTS "varroa_treatments_select_team_shared" ON public.varroa_treatments;

SELECT 'Dropped existing team policies (if any)' as step;

-- Step 3: Add policy for team members to view shared apiaries
-- Uses same safe pattern: queries through user_team_ids() function
CREATE POLICY "apiaries_select_team_shared"
  ON public.apiaries FOR SELECT
  USING (
    id IN (
      SELECT apiary_id
      FROM public.team_apiaries
      WHERE team_id IN (SELECT team_id FROM public.user_team_ids())
    )
  );

SELECT 'Added: Team members can view shared apiaries' as step;

-- Step 4: Show current hives policies
SELECT 'Current hives policies:' as step;
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'hives'
ORDER BY policyname;

-- Step 5: Add policy for team members to view hives in shared apiaries
CREATE POLICY "hives_select_team_shared"
  ON public.hives FOR SELECT
  USING (
    apiary_id IN (
      SELECT apiary_id
      FROM public.team_apiaries
      WHERE team_id IN (SELECT team_id FROM public.user_team_ids())
    )
  );

SELECT 'Added: Team members can view hives in shared apiaries' as step;

-- Step 6: Add policy for team members to view queens in shared hives
-- Note: queens are linked via hives.queen_id, not queens.hive_id
SELECT 'Current queens policies:' as step;
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'queens'
ORDER BY policyname;

CREATE POLICY "queens_select_team_shared"
  ON public.queens FOR SELECT
  USING (
    id IN (
      SELECT queen_id
      FROM public.hives
      WHERE queen_id IS NOT NULL
        AND apiary_id IN (
          SELECT apiary_id
          FROM public.team_apiaries
          WHERE team_id IN (SELECT team_id FROM public.user_team_ids())
        )
    )
  );

SELECT 'Added: Team members can view queens in shared hives' as step;

-- Step 7: Add policy for team members to view inspections in shared hives
SELECT 'Current inspections policies:' as step;
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'inspections'
ORDER BY policyname;

CREATE POLICY "inspections_select_team_shared"
  ON public.inspections FOR SELECT
  USING (
    hive_id IN (
      SELECT id
      FROM public.hives
      WHERE apiary_id IN (
        SELECT apiary_id
        FROM public.team_apiaries
        WHERE team_id IN (SELECT team_id FROM public.user_team_ids())
      )
    )
  );

SELECT 'Added: Team members can view inspections in shared hives' as step;

-- Step 8: Add policy for team members to view varroa checks in shared hives
SELECT 'Current varroa_checks policies:' as step;
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'varroa_checks'
ORDER BY policyname;

CREATE POLICY "varroa_checks_select_team_shared"
  ON public.varroa_checks FOR SELECT
  USING (
    hive_id IN (
      SELECT id
      FROM public.hives
      WHERE apiary_id IN (
        SELECT apiary_id
        FROM public.team_apiaries
        WHERE team_id IN (SELECT team_id FROM public.user_team_ids())
      )
    )
  );

SELECT 'Added: Team members can view varroa checks in shared hives' as step;

-- Step 9: Add policy for team members to view varroa treatments in shared hives
SELECT 'Current varroa_treatments policies:' as step;
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'varroa_treatments'
ORDER BY policyname;

CREATE POLICY "varroa_treatments_select_team_shared"
  ON public.varroa_treatments FOR SELECT
  USING (
    hive_id IN (
      SELECT id
      FROM public.hives
      WHERE apiary_id IN (
        SELECT apiary_id
        FROM public.team_apiaries
        WHERE team_id IN (SELECT team_id FROM public.user_team_ids())
      )
    )
  );

SELECT 'Added: Team members can view varroa treatments in shared hives' as step;

-- Step 10: Final verification
SELECT 'Final verification - all team policies:' as step;
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE policyname LIKE '%team_shared%'
ORDER BY tablename, policyname;

-- Step 11: Final summary
SELECT 'COMPLETE! Team members can now view all data in shared apiaries.' as final_message;
SELECT 'Tables updated: apiaries, hives, queens, inspections, varroa_checks, varroa_treatments' as note1;
SELECT 'All policies use the safe user_team_ids() function (no recursion risk)' as note2;
SELECT 'NOTE: Team members have READ-ONLY access. Only admins and owners can modify data.' as note3;
