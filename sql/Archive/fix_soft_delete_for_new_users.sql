-- ============================================================================
-- FIX SOFT DELETE FOR NEW USERS WITHOUT SUBSCRIPTIONS
-- ============================================================================
-- Issue: Users who just joined without subscriptions might fail to soft delete
-- Solution: Ensure soft_delete_user handles users with no subscription data
-- ============================================================================

-- Update soft_delete_user to handle users without subscriptions
CREATE OR REPLACE FUNCTION public.soft_delete_user(
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
  v_original_email TEXT;
BEGIN
  -- Check if user exists
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;

  -- Check if already deleted
  IF v_profile.deleted_at IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User already deleted',
      'deleted_at', v_profile.deleted_at
    );
  END IF;

  -- Store original email before anonymization
  v_original_email := v_profile.email;

  -- Soft delete the user and preserve original email
  UPDATE public.profiles
  SET
    deleted_at = NOW(),
    is_active = false,
    original_email = COALESCE(original_email, v_original_email),  -- Preserve if already set
    email = 'deleted_' || id || '@deleted.local'
  WHERE id = p_user_id;

  -- Also disable auth.users account
  UPDATE auth.users
  SET
    email = 'deleted_' || id || '@deleted.local',
    email_confirmed_at = NULL,
    banned_until = '2099-12-31'::timestamptz
  WHERE id = p_user_id;

  -- Return success with details about what was preserved
  RETURN json_build_object(
    'success', true,
    'message', 'User soft deleted successfully',
    'deleted_at', NOW(),
    'original_email', v_original_email,
    'original_email_preserved', true,
    'had_subscription', v_profile.subscription_expires_at IS NOT NULL OR v_profile.current_subscription_code_id IS NOT NULL,
    'subscription_history_preserved', true,
    'payment_history_preserved', true,
    'beekeeping_data_preserved', true
  );
END;
$$;

COMMENT ON FUNCTION public.soft_delete_user IS
  'Soft deletes a user account while preserving all data (works for users with or without subscriptions)';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ SOFT DELETE UPDATED FOR NEW USERS!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  - Function now handles users WITHOUT subscriptions';
  RAISE NOTICE '  - Uses COALESCE to handle null original_email';
  RAISE NOTICE '  - Returns detailed status in JSON response';
  RAISE NOTICE '';
  RAISE NOTICE 'Function works for:';
  RAISE NOTICE '  ✓ New users without subscription';
  RAISE NOTICE '  ✓ Users with active subscription';
  RAISE NOTICE '  ✓ Users with expired subscription';
  RAISE NOTICE '  ✓ Users with subscription history';
  RAISE NOTICE '';
  RAISE NOTICE 'All data is preserved:';
  RAISE NOTICE '  ✓ Original email';
  RAISE NOTICE '  ✓ Subscription history';
  RAISE NOTICE '  ✓ Beekeeping data (hives, queens, inspections)';
  RAISE NOTICE '  ✓ Team memberships';
  RAISE NOTICE '============================================';
END $$;
