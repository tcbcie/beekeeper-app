-- Create function for users to delete their own account
-- This allows users to self-service delete their account and all associated data

CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  data_counts json;
BEGIN
  -- Get the current user's ID
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Count all data that will be deleted (for confirmation)
  SELECT json_build_object(
    'apiaries', (SELECT COUNT(*) FROM apiaries WHERE user_id = current_user_id),
    'hives', (SELECT COUNT(*) FROM hives WHERE user_id = current_user_id),
    'queens', (SELECT COUNT(*) FROM queens WHERE user_id = current_user_id),
    'inspections', (SELECT COUNT(*) FROM inspections WHERE user_id = current_user_id),
    'varroa_checks', (SELECT COUNT(*) FROM varroa_checks WHERE user_id = current_user_id),
    'varroa_treatments', (SELECT COUNT(*) FROM varroa_treatments WHERE user_id = current_user_id),
    'feedings', (SELECT COUNT(*) FROM feedings WHERE user_id = current_user_id),
    'harvests', (SELECT COUNT(*) FROM harvests WHERE user_id = current_user_id),
    'tasks_events', (SELECT COUNT(*) FROM tasks_events WHERE user_id = current_user_id)
  ) INTO data_counts;

  -- Delete all user data (due to ON DELETE CASCADE, this will cascade through relationships)
  -- Order matters: delete dependent records first

  -- Delete tasks/events
  DELETE FROM tasks_events WHERE user_id = current_user_id;

  -- Delete harvests
  DELETE FROM harvests WHERE user_id = current_user_id;

  -- Delete feedings
  DELETE FROM feedings WHERE user_id = current_user_id;

  -- Delete varroa treatments
  DELETE FROM varroa_treatments WHERE user_id = current_user_id;

  -- Delete varroa checks
  DELETE FROM varroa_checks WHERE user_id = current_user_id;

  -- Delete inspections
  DELETE FROM inspections WHERE user_id = current_user_id;

  -- Delete queens
  DELETE FROM queens WHERE user_id = current_user_id;

  -- Delete hives
  DELETE FROM hives WHERE user_id = current_user_id;

  -- Delete apiaries
  DELETE FROM apiaries WHERE user_id = current_user_id;

  -- Remove from any team memberships
  DELETE FROM team_members WHERE user_id = current_user_id;

  -- Delete teams owned by this user (cascades to team_members, team_invitations, team_apiaries)
  DELETE FROM teams WHERE owner_id = current_user_id;

  -- Delete profile
  DELETE FROM profiles WHERE id = current_user_id;

  -- Finally, delete the auth account
  -- This will cascade to auth.identities and other auth tables
  DELETE FROM auth.users WHERE id = current_user_id;

  -- Return summary of what was deleted
  RETURN json_build_object(
    'success', true,
    'user_id', current_user_id,
    'deleted_counts', data_counts,
    'message', 'Account and all associated data have been permanently deleted'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting account: %', SQLERRM;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION delete_own_account() IS 'Allows a user to permanently delete their own account and all associated data. Returns a summary of deleted records.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_own_account() TO authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'SELF-SERVICE ACCOUNT DELETION FUNCTION CREATED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Function: delete_own_account()';
  RAISE NOTICE 'Purpose: Allows users to delete their own account';
  RAISE NOTICE 'Security: SECURITY DEFINER (has elevated privileges)';
  RAISE NOTICE 'Returns: JSON summary of deleted data';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'What gets deleted:';
  RAISE NOTICE '  - All apiaries and hives';
  RAISE NOTICE '  - All queens and inspections';
  RAISE NOTICE '  - All varroa checks and treatments';
  RAISE NOTICE '  - All feedings and harvests';
  RAISE NOTICE '  - All tasks and events';
  RAISE NOTICE '  - All team memberships';
  RAISE NOTICE '  - All owned teams (and their data)';
  RAISE NOTICE '  - User profile';
  RAISE NOTICE '  - Auth account (cannot be undone)';
  RAISE NOTICE '============================================';
END $$;
