-- ============================================================================
-- FIX REACTIVATE USER ACCOUNT FUNCTION
-- ============================================================================
-- Fixes the 409 conflict error by properly handling email restoration
-- and adding better error handling
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reactivate_user_account(
  p_request_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_profile RECORD;
  v_original_email TEXT;
  v_email_conflict BOOLEAN;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'Admin'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Only administrators can reactivate accounts'
    );
  END IF;

  -- Get request details
  SELECT * INTO v_request
  FROM public.reactivation_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Reactivation request not found'
    );
  END IF;

  IF v_request.status != 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Request has already been processed',
      'status', v_request.status
    );
  END IF;

  -- Get user profile
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_request.user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User profile not found'
    );
  END IF;

  v_original_email := v_profile.original_email;

  -- Check if the original email is already in use by another auth.users account
  SELECT EXISTS(
    SELECT 1 FROM auth.users
    WHERE email = v_original_email
      AND id != v_request.user_id
  ) INTO v_email_conflict;

  IF v_email_conflict THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Cannot reactivate: Email address is already in use by another account',
      'email', v_original_email
    );
  END IF;

  -- Restore the account in profiles table
  UPDATE public.profiles
  SET
    deleted_at = NULL,
    is_active = true,
    email = v_original_email
  WHERE id = v_request.user_id;

  -- Restore auth.users account
  UPDATE auth.users
  SET
    email = v_original_email,
    email_confirmed_at = NOW(),
    banned_until = NULL
  WHERE id = v_request.user_id;

  -- Mark request as approved
  UPDATE public.reactivation_requests
  SET
    status = 'approved',
    processed_at = NOW(),
    processed_by = auth.uid(),
    admin_notes = p_admin_notes
  WHERE id = p_request_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Account reactivated successfully',
    'user_id', v_request.user_id,
    'email', v_original_email
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Cannot reactivate: Email address conflict. The email may be in use by another account.',
      'error_code', 'unique_violation'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error reactivating account: ' || SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- Update comment
COMMENT ON FUNCTION public.reactivate_user_account(UUID, TEXT) IS
'Reactivates a soft-deleted user account. Checks for email conflicts and handles errors gracefully. Admin only.';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ REACTIVATE USER ACCOUNT FUNCTION FIXED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Improvements:';
  RAISE NOTICE '  ✓ Checks for email conflicts before reactivation';
  RAISE NOTICE '  ✓ Better error handling with EXCEPTION block';
  RAISE NOTICE '  ✓ Returns clear error messages';
  RAISE NOTICE '  ✓ Prevents 409 conflicts';
  RAISE NOTICE '';
  RAISE NOTICE 'Error handling:';
  RAISE NOTICE '  → Email already in use: Clear message';
  RAISE NOTICE '  → Unique violation: Handled gracefully';
  RAISE NOTICE '  → Other errors: Returns error details';
  RAISE NOTICE '============================================';
END $$;
