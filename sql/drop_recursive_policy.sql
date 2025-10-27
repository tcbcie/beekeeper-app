-- Emergency fix: Drop the policy causing recursion
-- The "teams_select_member" policy creates circular reference

-- Show current problem
SELECT 'Current teams policies (one causes recursion):' as step;
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'teams'
ORDER BY policyname;

-- Drop the problematic policy
DROP POLICY IF EXISTS "teams_select_member" ON public.teams;

SELECT 'Dropped problematic policy: teams_select_member' as step;

-- Verify it's gone
SELECT 'Remaining teams policies (should be safe):' as step;
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'teams'
ORDER BY policyname;

SELECT 'FIXED! The circular reference has been removed.' as final_message;
SELECT 'Teams will work again, but members cannot yet see teams they belong to.' as note;
SELECT 'We need a different approach for member visibility.' as note2;
