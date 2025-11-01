-- Create function to delete users from auth.users table
-- This function allows admin users to completely remove a user including their auth account

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS delete_user(UUID);

-- Create function to delete user from auth.users
-- SECURITY DEFINER allows this function to bypass RLS and delete from auth schema
CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admin users to delete auth accounts
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Only admin users can delete auth accounts';
  END IF;

  -- Prevent users from deleting their own auth account
  IF user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own auth account';
  END IF;

  -- Delete from auth.users (this will cascade to auth.identities and other auth tables)
  DELETE FROM auth.users WHERE id = user_id;

  -- Log the deletion (optional - you can remove this if you don't want logging)
  RAISE NOTICE 'Auth user % deleted by admin %', user_id, auth.uid();
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION delete_user(UUID) IS 'Deletes a user from auth.users table. Only callable by admin users. Prevents self-deletion.';

-- Grant execute permission to authenticated users (function will check if they are admin)
GRANT EXECUTE ON FUNCTION delete_user(UUID) TO authenticated;

-- Example usage (for testing):
-- SELECT delete_user('user-id-here');
