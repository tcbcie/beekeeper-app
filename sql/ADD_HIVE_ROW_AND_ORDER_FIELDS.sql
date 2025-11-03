-- Add row_in_apiary field and rename hive_order to order_in_apiary
-- These fields help organize hives spatially within an apiary
-- Both fields should be unique per apiary

-- Step 1: Rename existing hive_order column to order_in_apiary
ALTER TABLE hives
RENAME COLUMN hive_order TO order_in_apiary;

-- Step 2: Fix duplicate order_in_apiary values within each apiary
-- This reassigns order values sequentially for each apiary
WITH ordered_hives AS (
  SELECT
    id,
    apiary_id,
    ROW_NUMBER() OVER (PARTITION BY apiary_id ORDER BY order_in_apiary NULLS LAST, created_at) as new_order
  FROM hives
  WHERE apiary_id IS NOT NULL
)
UPDATE hives
SET order_in_apiary = ordered_hives.new_order
FROM ordered_hives
WHERE hives.id = ordered_hives.id;

-- Step 3: Add the row_in_apiary column
ALTER TABLE hives
ADD COLUMN IF NOT EXISTS row_in_apiary INTEGER;

-- Step 4: Add unique constraints to ensure no duplicate row or order values within the same apiary
-- Drop constraints if they exist (in case of re-running)
ALTER TABLE hives DROP CONSTRAINT IF EXISTS unique_hive_row_per_apiary;
ALTER TABLE hives DROP CONSTRAINT IF EXISTS unique_hive_order_per_apiary;

-- Add new constraints
ALTER TABLE hives
ADD CONSTRAINT unique_hive_row_per_apiary
  UNIQUE (apiary_id, row_in_apiary);

ALTER TABLE hives
ADD CONSTRAINT unique_hive_order_per_apiary
  UNIQUE (apiary_id, order_in_apiary);

-- Step 5: Add comments to document the fields
COMMENT ON COLUMN hives.row_in_apiary IS 'Physical row number where the hive is located in the apiary. Must be unique within each apiary.';
COMMENT ON COLUMN hives.order_in_apiary IS 'Display order position of the hive within the apiary. Must be unique within each apiary.';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Summary
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Hive organization fields updated!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  - Renamed: hive_order -> order_in_apiary';
  RAISE NOTICE '  - Fixed: Duplicate order values reassigned';
  RAISE NOTICE '  - Added: row_in_apiary';
  RAISE NOTICE '';
  RAISE NOTICE 'Constraints:';
  RAISE NOTICE '  - unique_hive_row_per_apiary';
  RAISE NOTICE '  - unique_hive_order_per_apiary';
  RAISE NOTICE '';
  RAISE NOTICE 'Both fields are unique per apiary_id';
  RAISE NOTICE '========================================';
END $$;

-- Show any duplicates that were fixed
WITH duplicate_check AS (
  SELECT
    apiary_id,
    order_in_apiary,
    COUNT(*) as count
  FROM hives
  WHERE apiary_id IS NOT NULL
  GROUP BY apiary_id, order_in_apiary
  HAVING COUNT(*) > 1
)
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM duplicate_check)
    THEN 'WARNING: Duplicates still exist!'
    ELSE 'SUCCESS: No duplicates found'
  END as status;

-- Show the updated table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'hives'
  AND column_name IN ('row_in_apiary', 'order_in_apiary')
ORDER BY ordinal_position;
