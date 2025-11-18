-- ============================================================================
-- ADD TEAM PROFILE VISIBILITY
-- ============================================================================
-- This script adds an RLS policy to allow users to view profiles of other
-- users in their teams. This is needed for displaying names of team members
-- who made changes to shared hives.
--
-- Background:
-- - The current "Users can view their own profile" policy only allows auth.uid() = id
-- - When joining hives.configuration_changed_by with profiles, the RLS policy blocks
--   viewing other team members' profiles
-- - This causes configuration tracking to show only timestamps, not names
--
-- Solution:
-- - Add a policy that allows viewing profiles of users in the same team
-- ============================================================================

-- Drop existing team profile visibility policy if it exists
DROP POLICY IF EXISTS "Users can view team member profiles" ON public.profiles;

-- Create policy to allow viewing team member profiles
CREATE POLICY "Users can view team member profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- User is viewing a profile of someone in their team
    EXISTS (
      SELECT 1
      FROM team_members tm1
      INNER JOIN team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = auth.uid()
        AND tm2.user_id = profiles.id
    )
  );

COMMENT ON POLICY "Users can view team member profiles" ON public.profiles IS
  'Users can view profiles of other users in their teams for collaboration features';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ TEAM PROFILE VISIBILITY ENABLED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Policy created: "Users can view team member profiles"';
  RAISE NOTICE '';
  RAISE NOTICE 'Users can now see:';
  RAISE NOTICE '  • Their own profile (existing policy)';
  RAISE NOTICE '  • Profiles of users in their teams (new policy)';
  RAISE NOTICE '';
  RAISE NOTICE 'This enables:';
  RAISE NOTICE '  • Configuration tracking showing team member names';
  RAISE NOTICE '  • Inspection records showing who created them';
  RAISE NOTICE '  • Other collaboration features requiring user identification';
  RAISE NOTICE '============================================';
END $$;
