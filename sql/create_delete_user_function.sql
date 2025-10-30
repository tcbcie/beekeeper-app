-- Optional: Create RPC function to delete users from auth.users
-- This function allows admins to delete Supabase Auth users from the client
-- Date: 2025-10-30

-- IMPORTANT: This function requires elevated permissions
-- Only create this if you want to allow complete user deletion including auth accounts

-- Create the function
CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated permissions
AS $$
BEGIN
  -- Delete from auth.users table
  -- This will cascade to auth.identities and other auth tables
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
-- NOTE: You may want to restrict this to only admin role users
GRANT EXECUTE ON FUNCTION delete_user(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION delete_user(UUID) IS
'Allows deletion of users from auth.users table. SECURITY DEFINER means it runs with elevated permissions. Should only be called by admins after deleting all user data from public tables.';

-- Optional: Add RLS check to ensure only admins can call this
-- You would need to modify the function to check user role first:
/*
CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  calling_user_role TEXT;
BEGIN
  -- Check if calling user is admin
  SELECT role INTO calling_user_role
  FROM user_profiles
  WHERE id = auth.uid();

  IF calling_user_role != 'Admin' THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Delete from auth.users table
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;
*/
