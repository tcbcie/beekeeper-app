-- Migration: Create execute_safe_query function for AI chat SQL queries
-- This function safely executes SELECT queries and returns results as JSON

CREATE OR REPLACE FUNCTION execute_safe_query(query_text TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  normalized_query TEXT;
BEGIN
  -- Normalize and validate query
  normalized_query := UPPER(TRIM(query_text));

  -- Only allow SELECT queries
  IF NOT normalized_query LIKE 'SELECT%' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  -- Block dangerous keywords
  IF normalized_query ~ '(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|EXECUTE|INTO)' THEN
    RAISE EXCEPTION 'Query contains forbidden operations';
  END IF;

  -- Execute the query and return as JSON
  EXECUTE 'SELECT COALESCE(json_agg(row_to_json(t)), ''[]''::json) FROM (' || query_text || ') t'
  INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_safe_query(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_safe_query(TEXT) TO service_role;

COMMENT ON FUNCTION execute_safe_query IS 'Safely executes SELECT queries for AI chat feature. Only allows SELECT statements and blocks dangerous operations.';
