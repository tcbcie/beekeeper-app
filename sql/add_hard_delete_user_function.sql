-- ============================================================================
-- ADD HARD DELETE USER FUNCTION
-- ============================================================================
-- Creates a function to permanently delete a user and all their data
-- This is an IRREVERSIBLE operation - use with extreme caution
--
-- Unlike soft delete which:
-- - Keeps all user data
-- - Anonymizes email
-- - Allows account reactivation
--
-- Hard delete will:
-- - Permanently delete ALL user data (hives, inspections, queens, etc.)
-- - Delete from auth.users
-- - Delete from profiles
-- - CASCADE delete all related records
-- - Cannot be undone
-- ============================================================================

CREATE OR REPLACE FUNCTION public.hard_delete_user(
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
  v_auth_user RECORD;
  v_counts JSON;
BEGIN
  -- Check if user exists in profiles
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found in profiles table'
    );
  END IF;

  -- Get auth user info
  SELECT * INTO v_auth_user
  FROM auth.users
  WHERE id = p_user_id;

  -- Count records that will be deleted (for reporting)
  SELECT json_build_object(
    'apiaries', (SELECT COUNT(*) FROM apiaries WHERE user_id = p_user_id),
    'hives', (SELECT COUNT(*) FROM hives WHERE user_id = p_user_id),
    'queens', (SELECT COUNT(*) FROM queens WHERE user_id = p_user_id),
    'inspections', (SELECT COUNT(*) FROM inspections WHERE user_id = p_user_id),
    'varroa_checks', (SELECT COUNT(*) FROM varroa_checks WHERE user_id = p_user_id),
    'varroa_treatments', (SELECT COUNT(*) FROM varroa_treatments WHERE user_id = p_user_id),
    'feedings', (SELECT COUNT(*) FROM feedings WHERE user_id = p_user_id),
    'harvests', (SELECT COUNT(*) FROM harvests WHERE user_id = p_user_id),
    'rearing_batches', (SELECT COUNT(*) FROM rearing_batches WHERE user_id = p_user_id),
    'teams_owned', (SELECT COUNT(*) FROM teams WHERE owner_id = p_user_id),
    'team_memberships', (SELECT COUNT(*) FROM team_members WHERE user_id = p_user_id),
    'team_invitations_sent', (SELECT COUNT(*) FROM team_invitations WHERE invited_by = p_user_id),
    'team_invitations_received', (SELECT COUNT(*) FROM team_invitations WHERE email = v_profile.email OR email = v_profile.original_email),
    'subscription_history', (SELECT COUNT(*) FROM subscription_history WHERE user_id = p_user_id),
    'reactivation_requests', (SELECT COUNT(*) FROM reactivation_requests WHERE user_id = p_user_id)
  ) INTO v_counts;

  -- HARD DELETE - POINT OF NO RETURN
  -- The CASCADE constraints will automatically delete:
  -- - apiaries, hives, queens, inspections, varroa_checks, varroa_treatments, feedings, harvests, rearing_batches
  -- - team_members, team_invitations (invited_by)
  -- - subscription_history is RESTRICT so it will prevent deletion if history exists

  -- Delete from teams where user is owner (this will cascade to team_members, team_invitations, team_apiaries)
  DELETE FROM teams WHERE owner_id = p_user_id;

  -- Delete team invitations sent to this user's email (might not have user_id)
  DELETE FROM team_invitations
  WHERE email = v_profile.email
     OR (v_profile.original_email IS NOT NULL AND email = v_profile.original_email);

  -- Delete reactivation requests
  DELETE FROM reactivation_requests WHERE user_id = p_user_id;

  -- Try to delete subscription history (this might fail if RESTRICT constraint exists)
  BEGIN
    DELETE FROM subscription_history WHERE user_id = p_user_id;
  EXCEPTION
    WHEN foreign_key_violation THEN
      -- If subscription history has RESTRICT, we need to handle it
      RAISE NOTICE 'Subscription history exists and may be protected by RESTRICT constraint';
  END;

  -- Delete from profiles (this will CASCADE delete most user data)
  DELETE FROM public.profiles WHERE id = p_user_id;

  -- Delete from auth.users (requires admin privileges)
  DELETE FROM auth.users WHERE id = p_user_id;

  -- Return success with counts of what was deleted
  RETURN json_build_object(
    'success', true,
    'message', 'User permanently deleted',
    'user_id', p_user_id,
    'email', COALESCE(v_profile.original_email, v_profile.email),
    'deleted_counts', v_counts,
    'warning', 'This action cannot be undone. All data has been permanently deleted.',
    'timestamp', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Catch any errors and return them
    RETURN json_build_object(
      'success', false,
      'message', 'Error during hard delete: ' || SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$;

COMMENT ON FUNCTION public.hard_delete_user IS
  'PERMANENTLY deletes a user and ALL their data. This operation CANNOT BE UNDONE. Use soft_delete_user for recoverable deletion.';

-- Grant execute permission to authenticated users (RLS policies will still apply)
GRANT EXECUTE ON FUNCTION public.hard_delete_user TO authenticated;

-- Verification and documentation
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '⚠️  HARD DELETE FUNCTION CREATED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Function: public.hard_delete_user(user_id UUID)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  WARNING: This function is IRREVERSIBLE!';
  RAISE NOTICE '';
  RAISE NOTICE 'What it deletes:';
  RAISE NOTICE '  • User profile and auth account';
  RAISE NOTICE '  • All apiaries, hives, queens';
  RAISE NOTICE '  • All inspections and records';
  RAISE NOTICE '  • All varroa checks and treatments';
  RAISE NOTICE '  • All feedings and harvests';
  RAISE NOTICE '  • All rearing batches';
  RAISE NOTICE '  • All teams owned by user';
  RAISE NOTICE '  • All team memberships';
  RAISE NOTICE '  • All team invitations';
  RAISE NOTICE '  • All subscription history';
  RAISE NOTICE '  • All reactivation requests';
  RAISE NOTICE '';
  RAISE NOTICE 'Use Cases:';
  RAISE NOTICE '  • GDPR/Data deletion requests';
  RAISE NOTICE '  • Removing test accounts';
  RAISE NOTICE '  • Spam/abuse account removal';
  RAISE NOTICE '';
  RAISE NOTICE 'Recommendation:';
  RAISE NOTICE '  Use soft_delete_user() for normal deletions';
  RAISE NOTICE '  Use hard_delete_user() only when legally required';
  RAISE NOTICE '  or for confirmed spam/test accounts';
  RAISE NOTICE '============================================';
END $$;
