-- Add RLS policies so team members can see shared apiaries and hives

-- Step 1: Show current apiaries policies
SELECT 'Current apiaries policies:' as step;
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'apiaries'
ORDER BY policyname;

-- Step 2: Add policy for team members to view shared apiaries
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

-- Step 3: Show current hives policies
SELECT 'Current hives policies:' as step;
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'hives'
ORDER BY policyname;

-- Step 4: Add policy for team members to view hives in shared apiaries
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

-- Step 5: Add policy for team members to view queens in shared hives
SELECT 'Current queens policies:' as step;
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'queens'
ORDER BY policyname;

CREATE POLICY "queens_select_team_shared"
  ON public.queens FOR SELECT
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

SELECT 'Added: Team members can view queens in shared hives' as step;

-- Step 6: Add policy for team members to view inspections in shared hives
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

-- Step 7: Add policy for team members to view varroa checks in shared hives
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

-- Step 8: Add policy for team members to view varroa treatments in shared hives
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

-- Step 9: Final summary
SELECT 'COMPLETE! Team members can now view all data in shared apiaries.' as final_message;
SELECT 'Tables updated: apiaries, hives, queens, inspections, varroa_checks, varroa_treatments' as note1;
SELECT 'All policies use the safe user_team_ids() function (no recursion risk)' as note2;
SELECT 'NOTE: Team members have READ-ONLY access. Only admins and owners can modify data.' as note3;
