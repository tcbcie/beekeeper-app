-- Check what views depend on the profiles view/table

SELECT
  dependent_ns.nspname as dependent_schema,
  dependent_view.relname as dependent_view,
  source_ns.nspname as source_schema,
  source_table.relname as source_table
FROM pg_depend
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid
JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid
JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
JOIN pg_namespace source_ns ON source_ns.oid = source_table.relnamespace
WHERE
  source_table.relname = 'profiles'
  AND dependent_view.relname != source_table.relname
  AND source_ns.nspname = 'public'
ORDER BY dependent_view.relname;

-- Also check the definition of the profiles view if it exists
SELECT
  'profiles view definition' as info,
  pg_get_viewdef('public.profiles'::regclass, true) as definition
WHERE EXISTS (
  SELECT 1 FROM information_schema.views
  WHERE table_schema = 'public' AND table_name = 'profiles'
);
