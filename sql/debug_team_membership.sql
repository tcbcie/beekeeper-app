-- Debug script to check team membership and permissions
-- Run this to see why invited users don't see teams

-- Step 1: Show all teams
SELECT 'All teams in database:' as step;
SELECT id, name, owner_id, created_at
FROM public.teams
ORDER BY created_at DESC;

-- Step 2: Show all team members
SELECT 'All team members:' as step;
SELECT
  tm.id,
  tm.team_id,
  t.name as team_name,
  tm.user_id,
  tm.role,
  tm.joined_at
FROM public.team_members tm
LEFT JOIN public.teams t ON t.id = tm.team_id
ORDER BY tm.joined_at DESC;

-- Step 3: Show all invitations
SELECT 'All team invitations:' as step;
SELECT
  ti.id,
  ti.team_id,
  t.name as team_name,
  ti.email,
  ti.status,
  ti.invited_by,
  ti.created_at,
  ti.expires_at,
  CASE
    WHEN ti.expires_at < NOW() THEN 'EXPIRED'
    ELSE 'VALID'
  END as validity
FROM public.team_invitations ti
LEFT JOIN public.teams t ON t.id = ti.team_id
ORDER BY ti.created_at DESC;

-- Step 4: Show team apiaries
SELECT 'Team apiaries (shared apiaries):' as step;
SELECT
  ta.id,
  ta.team_id,
  t.name as team_name,
  ta.apiary_id,
  a.name as apiary_name,
  ta.added_at
FROM public.team_apiaries ta
LEFT JOIN public.teams t ON t.id = ta.team_id
LEFT JOIN public.apiaries a ON a.id = ta.apiary_id
ORDER BY ta.added_at DESC;

-- Step 5: Check current user's auth ID
SELECT 'Current authenticated user:' as step;
SELECT auth.uid() as current_user_id;

-- Step 6: Check what teams current user should see
SELECT 'Teams current user should see (via ownership):' as step;
SELECT id, name, 'owner' as reason
FROM public.teams
WHERE owner_id = auth.uid();

SELECT 'Teams current user should see (via membership):' as step;
SELECT t.id, t.name, tm.role as reason
FROM public.teams t
INNER JOIN public.team_members tm ON tm.team_id = t.id
WHERE tm.user_id = auth.uid();

SELECT 'DIAGNOSTIC COMPLETE' as final_message;
