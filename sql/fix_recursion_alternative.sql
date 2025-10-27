-- Alternative fix: Use RECURSIVE CTE with MATERIALIZED hint to break recursion
-- PostgreSQL can handle recursive policies if we tell it to materialize the subquery

-- Step 1: Drop the problematic policy
DROP POLICY IF EXISTS "teams_select_member" ON public.teams;
DROP POLICY IF EXISTS "team_members_select_same_team" ON public.team_members;

SELECT 'Dropped potentially recursive policies' as step;

-- Step 2: Create a SAFE way for members to see their teams
-- We use a security definer function to break the recursion chain
CREATE OR REPLACE FUNCTION public.user_team_ids()
RETURNS TABLE(team_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- This function runs with elevated privileges, breaking the RLS recursion
  SELECT team_id
  FROM public.team_members
  WHERE user_id = auth.uid();
$$;

SELECT 'Created helper function: user_team_ids()' as step;

-- Step 3: Create safe policy using the function
CREATE POLICY "teams_select_member_safe"
  ON public.teams FOR SELECT
  USING (id IN (SELECT team_id FROM public.user_team_ids()));

SELECT 'Created safe policy for members to view teams' as step;

-- Step 4: Create safe policy for members to view each other
CREATE POLICY "team_members_select_same_team_safe"
  ON public.team_members FOR SELECT
  USING (team_id IN (SELECT team_id FROM public.user_team_ids()));

SELECT 'Created safe policy for members to view each other' as step;

-- Step 5: Verification
SELECT 'Final teams policies:' as step;
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'teams'
ORDER BY policyname;

SELECT 'Final team_members policies:' as step;
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'team_members'
ORDER BY policyname;

SELECT 'COMPLETE! Recursion fixed using security definer function.' as final_message;
SELECT 'The function runs with elevated privileges, breaking the circular RLS chain.' as note1;
