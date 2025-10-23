-- Create a function that combines user_profiles with email from auth.users
-- This allows the User Management UI to display email addresses
-- Uses a function instead of a view to properly handle RLS and auth.users access

CREATE OR REPLACE FUNCTION public.get_users_with_email()
RETURNS TABLE (
  id UUID,
  role VARCHAR(50),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  email TEXT
) AS $$
BEGIN
  -- Check if current user is admin using the helper function
  IF NOT public.is_current_user_admin() THEN
    -- Non-admins can only see their own profile
    RETURN QUERY
    SELECT
      up.id,
      up.role,
      up.created_at,
      up.updated_at,
      au.email::TEXT
    FROM public.user_profiles up
    LEFT JOIN auth.users au ON up.id = au.id
    WHERE up.id = auth.uid();
  ELSE
    -- Admins can see all profiles
    RETURN QUERY
    SELECT
      up.id,
      up.role,
      up.created_at,
      up.updated_at,
      au.email::TEXT
    FROM public.user_profiles up
    LEFT JOIN auth.users au ON up.id = au.id
    ORDER BY up.created_at DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: SECURITY DEFINER allows the function to:
-- - Access auth.users (which requires elevated permissions)
-- - Bypass RLS to perform the join
-- - Still enforces admin checks internally
-- - Regular users can only see their own profile
-- - Admins can see all profiles

-- Verification queries
-- Run these to verify the function works correctly:

-- 1. Check the function exists
-- SELECT proname FROM pg_proc WHERE proname = 'get_users_with_email';

-- 2. Test calling the function (run as admin user)
-- SELECT * FROM public.get_users_with_email();

-- 3. Test as regular user - should only see own profile
-- SELECT * FROM public.get_users_with_email();
