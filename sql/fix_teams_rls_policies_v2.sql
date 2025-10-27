-- Fix for infinite recursion in Teams RLS policies (Version 2)
-- This version handles existing policies properly

-- Drop ALL existing policies on teams table
DROP POLICY IF EXISTS "Users can view their teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view teams they own" ON public.teams;
DROP POLICY IF EXISTS "Users can view teams they are members of" ON public.teams;

-- Drop ALL existing SELECT policies on team_members table
DROP POLICY IF EXISTS "Users can view team members" ON public.team_members;

-- Recreate teams SELECT policy without recursion
-- Split into two separate policies to avoid circular reference
CREATE POLICY "Users can view teams they own"
  ON public.teams FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can view teams they are members of"
  ON public.teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
    )
  );

-- Recreate team_members SELECT policy without circular reference
CREATE POLICY "Users can view team members"
  ON public.team_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id
      AND teams.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
    )
  );

-- Verify the policies were created
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('teams', 'team_members')
AND cmd = 'SELECT'
ORDER BY tablename, policyname;
