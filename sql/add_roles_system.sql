-- Role-Based Access Control Migration
-- This migration adds a roles system to the application
-- Roles: 'User' (default), 'Admin'

-- Step 1: Create user_profiles table to store role information
-- We use a separate table because we cannot directly modify auth.users
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'User',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_role CHECK (role IN ('User', 'Admin'))
);

-- Step 2: Create index on role for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Step 3: Enable RLS on user_profiles table
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 3.5: Create helper function to check admin status WITHOUT RLS recursion
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

-- Step 4: Create RLS policies for user_profiles
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Admins can view all profiles (uses helper function to avoid RLS recursion)
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_current_user_admin());

-- Users can insert their own profile (for new user registration)
CREATE POLICY "Users can create own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any user profile (uses helper function to avoid RLS recursion)
CREATE POLICY "Admins can update any profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- Step 5: Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role)
  VALUES (NEW.id, 'User');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create trigger to call the function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 7: Create profiles for existing users with default 'User' role
INSERT INTO user_profiles (id, role)
SELECT id, 'User'
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;

-- Step 8: Assign Admin role to specific user
UPDATE user_profiles
SET role = 'Admin', updated_at = NOW()
WHERE id = '08e38bd9-30b0-4183-92c2-fc3b7600a46a';

-- Step 9: Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id AND role = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Create helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  user_role VARCHAR(50);
BEGIN
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = user_id;

  RETURN COALESCE(user_role, 'User');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Create function to fetch user profiles with emails
-- This function joins user_profiles with auth.users to show emails in the User Management UI
-- Uses SECURITY DEFINER to bypass RLS and access auth.users
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
-- Run these to verify the migration worked correctly:

-- 1. Check all user profiles
-- SELECT id, role, created_at FROM user_profiles ORDER BY created_at;

-- 2. Verify admin user
-- SELECT id, role FROM user_profiles WHERE id = '08e38bd9-30b0-4183-92c2-fc3b7600a46a';

-- 3. Test helper functions
-- SELECT is_admin('08e38bd9-30b0-4183-92c2-fc3b7600a46a');
-- SELECT get_user_role('08e38bd9-30b0-4183-92c2-fc3b7600a46a');
