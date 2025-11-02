-- Force PostgREST to reload its schema cache
-- This is needed when tables/views/functions are added, removed, or modified

NOTIFY pgrst, 'reload schema';

-- Verify notification was sent
SELECT 'Schema cache reload notification sent' AS status;
