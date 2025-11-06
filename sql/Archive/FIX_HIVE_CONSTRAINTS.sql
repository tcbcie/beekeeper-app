-- Fix hive constraints: Change from individual to combined uniqueness
-- Multiple hives can share the same row or order, but the combination must be unique

-- Step 1: Drop the incorrect individual constraints
ALTER TABLE hives DROP CONSTRAINT IF EXISTS unique_hive_row_per_apiary;
ALTER TABLE hives DROP CONSTRAINT IF EXISTS unique_hive_order_per_apiary;

-- Step 2: Add a combined unique constraint on (apiary_id, row_in_apiary, order_in_apiary)
-- This allows multiple hives in the same row, and multiple hives with the same order
-- but prevents duplicate row+order combinations within the same apiary
ALTER TABLE hives DROP CONSTRAINT IF EXISTS unique_hive_position_per_apiary;
ALTER TABLE hives
ADD CONSTRAINT unique_hive_position_per_apiary
  UNIQUE (apiary_id, row_in_apiary, order_in_apiary);

-- Step 3: Update comments to reflect the new constraint behavior
COMMENT ON COLUMN hives.row_in_apiary IS 'Physical row number where the hive is located in the apiary. The combination of row and order must be unique within each apiary.';
COMMENT ON COLUMN hives.order_in_apiary IS 'Position of the hive within its row. The combination of row and order must be unique within each apiary.';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Summary
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Hive constraints updated!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  - Removed: unique_hive_row_per_apiary';
  RAISE NOTICE '  - Removed: unique_hive_order_per_apiary';
  RAISE NOTICE '  - Added: unique_hive_position_per_apiary';
  RAISE NOTICE '';
  RAISE NOTICE 'New behavior:';
  RAISE NOTICE '  - Multiple hives CAN be in the same row';
  RAISE NOTICE '  - Multiple hives CAN have the same order';
  RAISE NOTICE '  - Row + Order combination must be unique per apiary';
  RAISE NOTICE '';
  RAISE NOTICE 'Example: Valid';
  RAISE NOTICE '  - Hive A: Row 1, Order 1';
  RAISE NOTICE '  - Hive B: Row 1, Order 2  (same row, different order)';
  RAISE NOTICE '  - Hive C: Row 2, Order 1  (same order, different row)';
  RAISE NOTICE '';
  RAISE NOTICE 'Example: Invalid';
  RAISE NOTICE '  - Hive A: Row 1, Order 1';
  RAISE NOTICE '  - Hive B: Row 1, Order 1  (duplicate position!)';
  RAISE NOTICE '========================================';
END $$;

-- Check for any existing violations of the new constraint
WITH position_duplicates AS (
  SELECT
    apiary_id,
    row_in_apiary,
    order_in_apiary,
    COUNT(*) as count,
    STRING_AGG(hive_number, ', ') as hive_numbers
  FROM hives
  WHERE apiary_id IS NOT NULL
    AND row_in_apiary IS NOT NULL
    AND order_in_apiary IS NOT NULL
  GROUP BY apiary_id, row_in_apiary, order_in_apiary
  HAVING COUNT(*) > 1
)
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM position_duplicates)
    THEN 'WARNING: Duplicate positions exist! Check the query below.'
    ELSE 'SUCCESS: No duplicate positions found'
  END as status;

-- Show any duplicates if they exist
SELECT
  apiary_id,
  row_in_apiary,
  order_in_apiary,
  count as duplicate_count,
  hive_numbers
FROM (
  SELECT
    apiary_id,
    row_in_apiary,
    order_in_apiary,
    COUNT(*) as count,
    STRING_AGG(hive_number, ', ') as hive_numbers
  FROM hives
  WHERE apiary_id IS NOT NULL
    AND row_in_apiary IS NOT NULL
    AND order_in_apiary IS NOT NULL
  GROUP BY apiary_id, row_in_apiary, order_in_apiary
  HAVING COUNT(*) > 1
) duplicates;
