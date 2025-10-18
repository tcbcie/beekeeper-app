-- ============================================================================
-- DISABLE RLS FOR TESTING (TEMPORARY)
-- ============================================================================
-- Use this script temporarily if you need to test without RLS
-- WARNING: This removes security restrictions - use only for development!
-- ============================================================================

-- Disable RLS on varroa tables
ALTER TABLE varroa_treatments DISABLE ROW LEVEL SECURITY;
ALTER TABLE varroa_checks DISABLE ROW LEVEL SECURITY;

-- Optional: Also disable on hives if it's enabled
-- ALTER TABLE hives DISABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '⚠ RLS DISABLED for varroa tables';
    RAISE NOTICE '⚠ This is for TESTING ONLY - re-enable for production!';
    RAISE NOTICE 'To re-enable, run: enable_rls_for_varroa.sql';
END $$;
