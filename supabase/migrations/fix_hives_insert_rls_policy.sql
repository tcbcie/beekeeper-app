-- Fix hives INSERT RLS policy to bypass apiaries RLS during ownership check
-- The issue is that the subquery to check apiary ownership is blocked by apiaries' own RLS policy

-- First, create a security definer function to check apiary ownership without RLS
CREATE OR REPLACE FUNCTION check_user_owns_apiary(apiary_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return true if apiary exists and belongs to user
  -- SECURITY DEFINER allows this to bypass RLS
  RETURN EXISTS (
    SELECT 1 FROM apiaries
    WHERE id = apiary_uuid
    AND user_id = user_uuid
  );
END;
$$;

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert their own hives" ON hives;

-- Recreate with the security definer function
CREATE POLICY "Users can insert their own hives"
ON hives
FOR INSERT
TO public
WITH CHECK (
  user_id = auth.uid()
  AND (
    -- Allow if no apiary (hive not placed yet)
    apiary_id IS NULL
    OR
    -- Allow if apiary belongs to user (using security definer function)
    check_user_owns_apiary(apiary_id, auth.uid())
  )
);

-- Add helpful comment
COMMENT ON FUNCTION check_user_owns_apiary IS 'Security definer function to check apiary ownership without triggering RLS policies';
