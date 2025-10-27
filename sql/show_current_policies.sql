-- Show all current policies on team tables with their full definitions
-- This helps us see exactly what policies exist and identify recursion issues

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('teams', 'team_members', 'team_apiaries', 'team_invitations')
ORDER BY tablename, cmd, policyname;
