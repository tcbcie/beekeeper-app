-- Fix infinite recursion in team_members INSERT policy
-- The problem: INSERT policy checks if user is admin/owner by querying team_members
-- This creates recursion: INSERT -> check team_members -> triggers policies -> recursion

-- Step 1: Show current team_members policies
SELECT 'Current team_members policies:' as step;
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'team_members'
ORDER BY cmd, policyname;

-- Step 2: Drop all INSERT policies on team_members
DROP POLICY IF EXISTS "team_members_insert_team_owner" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert_admin" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can add members" ON public.team_members;

SELECT 'Dropped INSERT policies' as step;

-- Step 3: Recreate INSERT policies WITHOUT recursion
-- Only check teams table (not team_members)
CREATE POLICY "team_members_insert_owner"
  ON public.team_members FOR INSERT
  WITH CHECK (
    -- Only team OWNER can add members (check teams table only)
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    )
  );

SELECT 'Created: team_members_insert_owner policy' as step;

-- Step 4: Show updated policies
SELECT 'Updated team_members INSERT policies:' as step;
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'team_members' AND cmd = 'INSERT'
ORDER BY policyname;

SELECT 'FIXED! Only team OWNERS can add members now (no admin privilege yet).' as final_message;
SELECT 'This eliminates the recursion when inserting new team_members.' as note1;
