-- Fix RLS Policies for User Profiles - Admin Access
-- Run this if you've already run add_roles_system.sql and need to add admin access policies

-- IMPORTANT: First, remove any existing conflicting policies if they exist
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;

-- This script adds RLS policies that allow admins to:
-- 1. View all user profiles (not just their own)
-- 2. Update any user profile (for role management)

-- Create a helper function to check admin status WITHOUT causing RLS recursion
-- Uses SECURITY DEFINER to bypass RLS when checking role
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR(50);
BEGIN
  SELECT role INTO user_role
  FROM public.user_profiles
  WHERE id = auth.uid()
  LIMIT 1;

  RETURN COALESCE(user_role = 'Admin', FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 1: Add policy for admins to view all profiles
-- Uses the helper function which bypasses RLS
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_current_user_admin());

-- Step 2: Add policy for admins to update any profile
-- Uses the helper function which bypasses RLS
CREATE POLICY "Admins can update any profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- Step 3: Create a FUNCTION instead of a view to fetch users with emails
-- Functions with SECURITY DEFINER can bypass RLS to join with auth.users
CREATE OR REPLACE FUNCTION public.get_users_with_email()
RETURNS TABLE (
  id UUID,
  role VARCHAR(50),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  email TEXT
) AS $$
BEGIN
  -- Check if current user is admin
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

-- Verification queries
-- Run these to verify everything was created correctly:

-- 1. Check helper function exists
-- SELECT proname FROM pg_proc WHERE proname = 'is_current_user_admin';

-- 2. Check the get_users_with_email function exists
-- SELECT proname FROM pg_proc WHERE proname = 'get_users_with_email';

-- 3. Check all RLS policies on user_profiles
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'user_profiles';

-- 4. Test the get_users_with_email function (run as admin user)
-- SELECT * FROM public.get_users_with_email();

-- 5. Test admin can update other profiles (replace UUIDs with actual values)
-- UPDATE user_profiles SET role = 'User' WHERE id = 'some-user-uuid';
