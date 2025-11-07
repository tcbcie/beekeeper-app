-- FIX toggle_user_account FUNCTION
-- Remove updated_at reference from profiles table

CREATE OR REPLACE FUNCTION public.toggle_user_account(
  target_user_id UUID,
  enable_account BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_admin_id UUID;
BEGIN
  -- Get current user ID
  current_admin_id := auth.uid();

  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = current_admin_id AND role = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can enable/disable user accounts';
  END IF;

  -- Prevent admin from disabling their own account
  IF target_user_id = current_admin_id THEN
    RAISE EXCEPTION 'Cannot disable your own admin account';
  END IF;

  -- Update the user's is_active status
  UPDATE public.profiles
  SET is_active = enable_account
  WHERE id = target_user_id;

  RETURN json_build_object(
    'success', true,
    'user_id', target_user_id,
    'is_active', enable_account,
    'message', CASE
      WHEN enable_account THEN 'User account enabled successfully'
      ELSE 'User account disabled successfully'
    END
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.toggle_user_account(UUID, BOOLEAN) TO authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'toggle_user_account function has been updated successfully!';
  RAISE NOTICE 'The function no longer tries to update the non-existent updated_at column.';
END $$;
