-- Find all PostgreSQL functions that reference user_profiles
-- These might be causing the error even though the table doesn't exist

-- First, get a list of all functions in the public schema
SELECT
    p.proname AS function_name,
    CASE
        WHEN p.proname = ANY(ARRAY['array_agg', 'json_agg', 'jsonb_agg', 'string_agg'])
        THEN 'Built-in aggregate function'
        ELSE pg_get_functiondef(p.oid)
    END AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'  -- Only regular functions, not aggregates
ORDER BY p.proname;
