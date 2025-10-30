-- Alternative Auto-Accept Solution: Works Without auth.users Trigger Access
-- Date: 2025-10-30
-- Issue: Cannot create trigger on auth.users due to permission restrictions
-- Solution: Use profiles table trigger instead (profiles is created automatically on signup)

-- BACKGROUND:
-- Supabase automatically creates a profiles record when a user signs up
-- We can trigger on that INSERT instead of auth.users

-- Step 1: Verify profiles table has a trigger-friendly structure
SELECT 'Checking profiles table structure...' as step;

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Step 2: Create function to auto-accept pending invitations
-- This is the same function, just will be called by different trigger
CREATE OR REPLACE FUNCTION public.auto_accept_team_invitations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email TEXT;
  v_invitation RECORD;
  v_accepted_count INTEGER := 0;
BEGIN
  -- Get the new user's email from auth.users using the profile's ID
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = NEW.id;

  IF v_user_email IS NULL THEN
    RAISE WARNING 'Could not find email for user %', NEW.id;
    RETURN NEW;
  END IF;

  RAISE NOTICE '🔔 New user signup detected: % (ID: %)', v_user_email, NEW.id;

  -- Find all pending invitations for this email
  FOR v_invitation IN
    SELECT
      id,
      team_id,
      email,
      invited_by,
      expires_at
    FROM public.team_invitations
    WHERE LOWER(email) = LOWER(v_user_email)
      AND status = 'pending'
      AND expires_at > NOW()
  LOOP
    RAISE NOTICE '✅ Auto-accepting invitation to team % for %', v_invitation.team_id, v_user_email;

    -- Check if user is already a member (safety check)
    IF NOT EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = v_invitation.team_id
        AND user_id = NEW.id
    ) THEN
      -- Add user to team_members
      INSERT INTO public.team_members (team_id, user_id, role)
      VALUES (v_invitation.team_id, NEW.id, 'member');

      -- Update invitation status to accepted
      UPDATE public.team_invitations
      SET status = 'accepted',
          accepted_at = NOW()
      WHERE id = v_invitation.id;

      v_accepted_count := v_accepted_count + 1;

      RAISE NOTICE '✅ User % added to team %', NEW.id, v_invitation.team_id;
    ELSE
      RAISE NOTICE '⚠️ User % already member of team %', NEW.id, v_invitation.team_id;
    END IF;
  END LOOP;

  IF v_accepted_count > 0 THEN
    RAISE NOTICE '🎉 Auto-accepted % team invitation(s) for %', v_accepted_count, v_user_email;
  ELSE
    RAISE NOTICE 'ℹ️ No pending invitations found for %', v_user_email;
  END IF;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail user creation if invitation acceptance fails
    RAISE WARNING '❌ Error auto-accepting invitations for %: %', v_user_email, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_accept_team_invitations() IS
'Automatically accepts pending team invitations when a user signs up. Triggered on profiles table INSERT.';

SELECT '✅ Created function: auto_accept_team_invitations()' as step;

-- Step 3: Create trigger on PUBLIC.profiles table (not auth.users)
-- This table is accessible and automatically populated on user signup

DROP TRIGGER IF EXISTS on_profile_created_auto_accept_invitations ON public.profiles;

CREATE TRIGGER on_profile_created_auto_accept_invitations
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_accept_team_invitations();

COMMENT ON TRIGGER on_profile_created_auto_accept_invitations ON public.profiles IS
'Automatically accepts team invitations when a new user signs up and their profile is created.';

SELECT '✅ Created trigger: on_profile_created_auto_accept_invitations on public.profiles' as step;

-- Step 4: Grant execute permissions
GRANT EXECUTE ON FUNCTION public.auto_accept_team_invitations() TO postgres, authenticated, anon;

SELECT '✅ Granted permissions on auto_accept_team_invitations()' as step;

-- Step 5: Verify setup
SELECT 'Verifying trigger setup...' as step;

-- Check if function exists
SELECT EXISTS (
  SELECT 1 FROM pg_proc
  WHERE proname = 'auto_accept_team_invitations'
) as function_exists;

-- Check if trigger exists on profiles table
SELECT EXISTS (
  SELECT 1 FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE t.tgname = 'on_profile_created_auto_accept_invitations'
    AND c.relname = 'profiles'
    AND n.nspname = 'public'
) as trigger_exists;

-- Show sample of pending invitations that would be auto-accepted
SELECT 'Sample pending invitations:' as step;

SELECT
  email,
  team_id,
  invited_at,
  expires_at,
  CASE
    WHEN expires_at > NOW() THEN 'Will auto-accept ✅'
    ELSE 'Expired ❌'
  END as status
FROM public.team_invitations
WHERE status = 'pending'
ORDER BY invited_at DESC
LIMIT 5;

-- Final message
SELECT '
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SETUP COMPLETE! (Alternative Method)

Auto-accept trigger is now active on the PROFILES table.
When a new user signs up:
1. Supabase creates auth.users record
2. Supabase creates profiles record (this triggers our function)
3. Function checks for pending invitations matching email
4. Valid invitations are automatically accepted
5. User is added to team_members with role="member"

How it works:
- Trigger: on_profile_created_auto_accept_invitations
- Fires: AFTER INSERT on public.profiles (not auth.users)
- Function: auto_accept_team_invitations()
- Permissions: SECURITY DEFINER (runs with elevated permissions)

Why this approach:
- Cannot create triggers on auth.users (permission denied)
- Supabase auto-creates profiles record on signup
- Profiles table is in public schema (we have access)
- Same functionality, different trigger point

Testing:
1. Create a pending invitation for test@example.com
2. Sign up a new user with that email
3. Profile will be created → Trigger fires
4. Check team_members table - user should be added automatically
5. Check team_invitations - status should be "accepted"

Logs:
- Check Supabase Dashboard → Database → Logs
- Look for NOTICE messages with 🔔 ✅ 🎉 emojis

IMPORTANT NOTE:
- If your Supabase project does NOT auto-create profiles, see ALTERNATIVE 2 below
- Most Supabase projects have a profiles table and auto-create on signup

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTERNATIVE 2: If profiles table doesn''t exist or isn''t auto-populated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If the above doesn''t work, use Edge Function approach:
1. Create Edge Function that runs on user signup (webhook)
2. Configure Supabase Auth webhook to call function
3. Function checks and accepts invitations
4. See: supabase/functions/auto-accept-invitations/ (to be created)

Contact Supabase support if you need help with auth.users trigger access.
Or use the Edge Function webhook approach for guaranteed compatibility.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
' as final_message;
