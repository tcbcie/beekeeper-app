-- ============================================================================
-- QUICK TABLE COUNTS
-- ============================================================================
-- Get row counts for all critical tables
-- ============================================================================

SELECT 'auth.users' as table_name, COUNT(*) as row_count FROM auth.users
UNION ALL
SELECT 'profiles', COUNT(*) FROM public.profiles
UNION ALL
SELECT 'hives', COUNT(*) FROM public.hives
UNION ALL
SELECT 'apiaries', COUNT(*) FROM public.apiaries
UNION ALL
SELECT 'beekeeping_associations', COUNT(*) FROM public.beekeeping_associations
UNION ALL
SELECT 'subscription_history', COUNT(*) FROM public.subscription_history
UNION ALL
SELECT 'registration_codes', COUNT(*) FROM public.registration_codes
UNION ALL
SELECT 'varroa_treatments', COUNT(*) FROM public.varroa_treatments
ORDER BY table_name;
