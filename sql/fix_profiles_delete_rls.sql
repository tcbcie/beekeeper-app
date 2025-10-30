-- Fix profiles table RLS to allow admins to delete users
-- Date: 2025-10-30
-- Issue: Admins cannot delete user profiles - no DELETE policy exists

-- Diagnostic showed these existing policies:
-- - Users can insert own profile (INSERT)
-- - Users can update own profile (UPDATE)
-- - Users can view all profiles (SELECT)
-- - NO DELETE POLICY EXISTS

-- Create a DELETE policy that allows:
-- 1. Users to delete their own profile (id = auth.uid())
-- 2. Admins to delete any profile (check role in user_profiles table)
CREATE POLICY "Users can delete profiles"
ON profiles
FOR DELETE
USING (
  -- Allow users to delete their own profile
  id = auth.uid()
  OR
  -- Allow admins to delete any profile
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'Admin'
  )
);

COMMENT ON POLICY "Users can delete profiles" ON profiles IS
'Allows users to delete their own profile or admins to delete any profile. Enables admin user deletion functionality.';
