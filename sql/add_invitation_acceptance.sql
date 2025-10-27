-- Add policies and functionality for users to accept team invitations

-- Step 1: Add policy for users to see their own invitations (by email)
-- Current policies only allow team owners/admins to see invitations
CREATE POLICY "team_invitations_select_by_email"
  ON public.team_invitations FOR SELECT
  USING (
    email = (
      SELECT email
      FROM auth.users
      WHERE id = auth.uid()
    )
  );

SELECT 'Added: Users can view invitations sent to their email' as step;

-- Step 2: Add policy for users to update their own invitations (to accept)
CREATE POLICY "team_invitations_update_by_email"
  ON public.team_invitations FOR UPDATE
  USING (
    email = (
      SELECT email
      FROM auth.users
      WHERE id = auth.uid()
    )
    AND status = 'pending'
  )
  WITH CHECK (
    email = (
      SELECT email
      FROM auth.users
      WHERE id = auth.uid()
    )
  );

SELECT 'Added: Users can update their own pending invitations' as step;

-- Step 3: Create a function to accept an invitation
-- This function handles the complex logic of accepting an invitation atomically
CREATE OR REPLACE FUNCTION public.accept_team_invitation(invitation_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
  v_user_email TEXT;
  v_result JSON;
BEGIN
  -- Get current user info
  v_user_id := auth.uid();

  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  -- Get invitation details
  SELECT * INTO v_invitation
  FROM public.team_invitations
  WHERE id = invitation_id
    AND email = v_user_email
    AND status = 'pending'
    AND expires_at > NOW();

  -- Check if invitation exists and is valid
  IF v_invitation IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invitation not found, already used, or expired'
    );
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = v_invitation.team_id
      AND user_id = v_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You are already a member of this team'
    );
  END IF;

  -- Add user to team_members
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_invitation.team_id, v_user_id, 'member');

  -- Update invitation status
  UPDATE public.team_invitations
  SET status = 'accepted',
      accepted_at = NOW()
  WHERE id = invitation_id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'team_id', v_invitation.team_id,
    'team_name', (SELECT name FROM public.teams WHERE id = v_invitation.team_id)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

SELECT 'Created: accept_team_invitation() function' as step;

-- Step 4: Create a function to decline an invitation
CREATE OR REPLACE FUNCTION public.decline_team_invitation(invitation_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email TEXT;
  v_result JSON;
BEGIN
  -- Get current user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Update invitation status
  UPDATE public.team_invitations
  SET status = 'declined',
      accepted_at = NOW()  -- Store decline timestamp
  WHERE id = invitation_id
    AND email = v_user_email
    AND status = 'pending';

  -- Check if update was successful
  IF FOUND THEN
    RETURN json_build_object('success', true);
  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'Invitation not found or already processed'
    );
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

SELECT 'Created: decline_team_invitation() function' as step;

-- Step 5: Verification
SELECT 'Current team_invitations policies:' as step;
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'team_invitations'
ORDER BY policyname;

SELECT 'COMPLETE! Users can now view and accept/decline invitations.' as final_message;
SELECT 'Next: Update Profile page UI to show pending invitations and accept/decline buttons.' as next_step;
