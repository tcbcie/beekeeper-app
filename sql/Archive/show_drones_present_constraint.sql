-- ============================================================================
-- SHOW DRONES_PRESENT CHECK CONSTRAINT
-- ============================================================================
-- Display the exact constraint definition
-- ============================================================================

SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'inspections'
  AND nsp.nspname = 'public'
  AND con.conname = 'inspections_drones_present_check';
