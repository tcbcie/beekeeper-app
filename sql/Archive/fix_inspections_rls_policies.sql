-- ============================================================================
-- FIX INSPECTIONS RLS POLICIES
-- ============================================================================
-- Allow users to insert, update, delete their own inspections
-- ============================================================================

-- Check current policies
SELECT
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'inspections'
  AND schemaname = 'public';

-- Drop all existing policies on inspections
DROP POLICY IF EXISTS "Users can view own inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can insert own inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can update own inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can delete own inspections" ON public.inspections;

-- Create new policies

-- SELECT: Users can view their own inspections
CREATE POLICY "Users can view own inspections"
ON public.inspections FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: Users can insert their own inspections
CREATE POLICY "Users can insert own inspections"
ON public.inspections FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own inspections
CREATE POLICY "Users can update own inspections"
ON public.inspections FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own inspections
CREATE POLICY "Users can delete own inspections"
ON public.inspections FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ INSPECTIONS RLS POLICIES UPDATED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Policies created:';
  RAISE NOTICE '  ✓ Users can view own inspections (SELECT)';
  RAISE NOTICE '  ✓ Users can insert own inspections (INSERT)';
  RAISE NOTICE '  ✓ Users can update own inspections (UPDATE)';
  RAISE NOTICE '  ✓ Users can delete own inspections (DELETE)';
  RAISE NOTICE '';
  RAISE NOTICE 'Users can now save hive inspections.';
  RAISE NOTICE '============================================';
END $$;

-- Show updated policies
SELECT
  policyname,
  cmd as command,
  permissive,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'inspections'
  AND schemaname = 'public'
ORDER BY cmd, policyname;
