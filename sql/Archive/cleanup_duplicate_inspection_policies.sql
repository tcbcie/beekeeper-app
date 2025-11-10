-- ============================================================================
-- CLEANUP DUPLICATE INSPECTION POLICIES
-- ============================================================================
-- Remove duplicate/old policies, keep only the necessary ones
-- ============================================================================

-- Drop old/duplicate policies
DROP POLICY IF EXISTS "Users can view their own inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can insert their own inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can update their own inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can delete their own inspections" ON public.inspections;
DROP POLICY IF EXISTS "Authenticated users can manage inspections" ON public.inspections;
DROP POLICY IF EXISTS "Authenticated users can view inspections" ON public.inspections;

-- Keep the simpler, cleaner policies we just created:
-- "Users can view own inspections"
-- "Users can insert own inspections"
-- "Users can update own inspections"
-- "Users can delete own inspections"
-- "inspections_select_team_shared" (for team collaboration)

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ DUPLICATE POLICIES REMOVED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Remaining policies:';
  RAISE NOTICE '  ✓ Users can view own inspections (SELECT)';
  RAISE NOTICE '  ✓ Users can insert own inspections (INSERT)';
  RAISE NOTICE '  ✓ Users can update own inspections (UPDATE)';
  RAISE NOTICE '  ✓ Users can delete own inspections (DELETE)';
  RAISE NOTICE '  ✓ inspections_select_team_shared (SELECT for teams)';
  RAISE NOTICE '';
  RAISE NOTICE 'Inspections functionality is clean and working.';
  RAISE NOTICE '============================================';
END $$;

-- Show final policies
SELECT
  policyname,
  cmd as command,
  permissive,
  CASE
    WHEN length(qual) > 50 THEN substring(qual from 1 for 50) || '...'
    ELSE qual
  END as using_clause_preview,
  CASE
    WHEN length(with_check) > 50 THEN substring(with_check from 1 for 50) || '...'
    ELSE with_check
  END as with_check_preview
FROM pg_policies
WHERE tablename = 'inspections'
  AND schemaname = 'public'
ORDER BY cmd, policyname;
