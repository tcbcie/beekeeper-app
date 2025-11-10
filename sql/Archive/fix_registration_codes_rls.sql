-- Fix RLS policies for registration_codes table
-- The table has data but queries return empty results due to RLS blocking reads

-- Check current RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'registration_codes';

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'registration_codes';

-- Enable RLS if not already enabled
ALTER TABLE public.registration_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Allow authenticated users to read all codes" ON public.registration_codes;
DROP POLICY IF EXISTS "Allow admins to insert codes" ON public.registration_codes;
DROP POLICY IF EXISTS "Allow admins to update codes" ON public.registration_codes;
DROP POLICY IF EXISTS "Allow admins to delete codes" ON public.registration_codes;
DROP POLICY IF EXISTS "Allow power users to insert codes" ON public.registration_codes;
DROP POLICY IF EXISTS "Allow power users to update codes" ON public.registration_codes;
DROP POLICY IF EXISTS "Allow power users to delete codes" ON public.registration_codes;

-- Create policy to allow ALL authenticated users to READ registration codes
-- This is necessary for code validation during subscription renewal
CREATE POLICY "Allow authenticated users to read all codes"
ON public.registration_codes
FOR SELECT
TO authenticated
USING (true);  -- All authenticated users can read all codes

-- Create policy to allow ONLY admins to INSERT codes
CREATE POLICY "Allow admins to insert codes"
ON public.registration_codes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create policy to allow ONLY admins to UPDATE codes
CREATE POLICY "Allow admins to update codes"
ON public.registration_codes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create policy to allow ONLY admins to DELETE codes
CREATE POLICY "Allow admins to delete codes"
ON public.registration_codes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'registration_codes'
ORDER BY cmd, policyname;
