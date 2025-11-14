-- ============================================================================
-- UPDATE DELETE_OWN_ACCOUNT TO USE SOFT DELETE
-- ============================================================================
-- Changes the delete_own_account function from hard delete to soft delete
-- This makes it consistent with admin-initiated deletions and allows for
-- account reactivation if users change their mind.
-- ============================================================================

-- Drop the old hard-delete version
DROP FUNCTION IF EXISTS public.delete_own_account();

-- Create new soft-delete version
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  v_profile RECORD;
  v_original_email TEXT;
  data_counts json;
BEGIN
  -- Get the current user's ID
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user profile
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = current_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Check if already deleted
  IF v_profile.deleted_at IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Account is already deleted',
      'deleted_at', v_profile.deleted_at
    );
  END IF;

  -- Count all data that will be preserved (for confirmation)
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

  -- Store original email before anonymization
  v_original_email := v_profile.email;

  -- Soft delete the user account (preserve all data)
  UPDATE public.profiles
  SET
    deleted_at = NOW(),
    is_active = false,
    original_email = COALESCE(original_email, v_original_email),
    email = 'deleted_' || id || '@deleted.local'
  WHERE id = current_user_id;

  -- Disable auth.users account (but don't delete it)
  UPDATE auth.users
  SET
    email = 'deleted_' || id || '@deleted.local',
    email_confirmed_at = NULL,
    banned_until = '2099-12-31'::timestamptz
  WHERE id = current_user_id;

  -- Return summary
  RETURN json_build_object(
    'success', true,
    'user_id', current_user_id,
    'original_email', v_original_email,
    'deleted_at', NOW(),
    'data_preserved', data_counts,
    'message', 'Account deactivated successfully. All your data has been preserved and your account can be reactivated by contacting an administrator.',
    'reactivation_available', true
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deactivating account: %', SQLERRM;
END;
$$;

-- Update comment for documentation
COMMENT ON FUNCTION public.delete_own_account() IS 'Allows a user to soft-delete their own account. All data is preserved and the account can be reactivated via the reactivation system.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ SELF-SERVICE SOFT DELETE UPDATED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Function: delete_own_account()';
  RAISE NOTICE 'Purpose: Soft-delete user account (preserves data)';
  RAISE NOTICE 'Security: SECURITY DEFINER (has elevated privileges)';
  RAISE NOTICE 'Returns: JSON summary of preserved data';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes from old version:';
  RAISE NOTICE '  ❌ OLD: Hard delete (permanent data loss)';
  RAISE NOTICE '  ✅ NEW: Soft delete (data preserved)';
  RAISE NOTICE '';
  RAISE NOTICE 'What happens:';
  RAISE NOTICE '  ✓ Sets deleted_at timestamp';
  RAISE NOTICE '  ✓ Sets is_active = false';
  RAISE NOTICE '  ✓ Preserves original_email';
  RAISE NOTICE '  ✓ Changes email to deleted_xxx@deleted.local';
  RAISE NOTICE '  ✓ Bans auth account until 2099-12-31';
  RAISE NOTICE '  ✓ ALL DATA PRESERVED (can be reactivated)';
  RAISE NOTICE '';
  RAISE NOTICE 'What is preserved:';
  RAISE NOTICE '  ✓ All apiaries and hives';
  RAISE NOTICE '  ✓ All queens and inspections';
  RAISE NOTICE '  ✓ All varroa checks and treatments';
  RAISE NOTICE '  ✓ All feedings and harvests';
  RAISE NOTICE '  ✓ All tasks and events';
  RAISE NOTICE '  ✓ All team memberships';
  RAISE NOTICE '  ✓ All subscription history';
  RAISE NOTICE '  ✓ User profile';
  RAISE NOTICE '';
  RAISE NOTICE 'Reactivation:';
  RAISE NOTICE '  → User visits /reactivate';
  RAISE NOTICE '  → Enters original email';
  RAISE NOTICE '  → Admin approves request';
  RAISE NOTICE '  → Account fully restored';
  RAISE NOTICE '============================================';
END $$;
