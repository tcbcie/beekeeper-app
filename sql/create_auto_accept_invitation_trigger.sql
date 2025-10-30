-- Create trigger to auto-accept team invitations when user signs up
-- Date: 2025-10-30
-- Purpose: Automatically add users to teams they were invited to when they create an account

-- Step 1: Create function to auto-accept pending invitations
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
  -- Get the new user's email from auth.users
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
'Automatically accepts pending team invitations when a user signs up with a matching email address. Runs as trigger on auth.users insert.';

SELECT '✅ Created function: auto_accept_team_invitations()' as step;

-- Step 2: Create trigger on auth.users table
-- Note: This requires elevated permissions to create triggers on auth schema
-- If this fails, you may need to run it as a database admin

DROP TRIGGER IF EXISTS on_auth_user_created_auto_accept_invitations ON auth.users;

CREATE TRIGGER on_auth_user_created_auto_accept_invitations
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_accept_team_invitations();

COMMENT ON TRIGGER on_auth_user_created_auto_accept_invitations ON auth.users IS
'Automatically accepts team invitations when a new user signs up with an invited email address.';

SELECT '✅ Created trigger: on_auth_user_created_auto_accept_invitations' as step;

-- Step 3: Grant execute permissions
GRANT EXECUTE ON FUNCTION public.auto_accept_team_invitations() TO postgres, authenticated, anon;

SELECT '✅ Granted permissions on auto_accept_team_invitations()' as step;

-- Step 4: Test setup
SELECT 'Testing auto-accept setup...' as step;

-- Check if function exists
SELECT EXISTS (
  SELECT 1 FROM pg_proc
  WHERE proname = 'auto_accept_team_invitations'
) as function_exists;

-- Check if trigger exists
SELECT EXISTS (
  SELECT 1 FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE t.tgname = 'on_auth_user_created_auto_accept_invitations'
    AND c.relname = 'users'
) as trigger_exists;

-- Show sample of pending invitations that would be auto-accepted
SELECT
  'Sample pending invitations:' as step;

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
✅ SETUP COMPLETE!

Auto-accept trigger is now active. When a new user signs up:
1. Their email is checked against pending team invitations
2. Valid (non-expired) invitations are automatically accepted
3. User is added to team_members with role="member"
4. Invitation status is updated to "accepted"

How it works:
- Trigger: on_auth_user_created_auto_accept_invitations
- Fires: AFTER INSERT on auth.users
- Function: auto_accept_team_invitations()
- Permissions: SECURITY DEFINER (runs with elevated permissions)

Testing:
1. Create a pending invitation for test@example.com
2. Sign up a new user with that email
3. Check team_members table - user should be added automatically
4. Check team_invitations - status should be "accepted"

Logs:
- Check Supabase Dashboard → Database → Logs
- Look for NOTICE messages with 🔔 ✅ 🎉 emojis

Next steps:
- Test with a real signup
- Verify team_members and team_invitations tables
- Optionally: Send welcome email to user after auto-accept

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
' as final_message;
