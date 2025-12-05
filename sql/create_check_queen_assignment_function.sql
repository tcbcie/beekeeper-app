-- Function to check if a queen is already assigned to any active hive
-- This bypasses RLS to check ALL hives in the system
-- Returns the hive details if queen is already assigned, NULL otherwise

CREATE OR REPLACE FUNCTION check_queen_assignment(
  p_queen_id UUID,
  p_exclude_hive_id UUID DEFAULT NULL
)
RETURNS TABLE (
  hive_id UUID,
  hive_number TEXT,
  apiary_name TEXT,
  hive_owner_id UUID
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id AS hive_id,
    h.hive_number,
    a.name AS apiary_name,
    h.user_id AS hive_owner_id
  FROM hives h
  LEFT JOIN apiaries a ON h.apiary_id = a.id
  WHERE h.queen_id = p_queen_id
    AND h.status = 'active'
    AND (p_exclude_hive_id IS NULL OR h.id != p_exclude_hive_id)
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_queen_assignment(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION check_queen_assignment IS 'Check if a queen is already assigned to any active hive in the system, bypassing RLS. Used for validation when assigning queens to hives.';
