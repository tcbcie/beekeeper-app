-- Add order_direction field to hives table
-- This field specifies whether hive numbering in a row goes left-to-right
-- when looking at the entrances or the backs of the hives

-- Step 1: Add the order_direction column with a default value
ALTER TABLE hives
ADD COLUMN IF NOT EXISTS order_direction TEXT DEFAULT 'entrances'
CHECK (order_direction IN ('entrances', 'backs'));

-- Step 2: Update any existing NULL values to the default
UPDATE hives
SET order_direction = 'entrances'
WHERE order_direction IS NULL;

-- Step 3: Add a comment to document the field
COMMENT ON COLUMN hives.order_direction IS 'Specifies whether left-to-right hive ordering in a row is from the perspective of looking at the entrances or the backs. Values: entrances, backs. Default: entrances.';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Summary
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Hive order direction field added!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'New column:';
  RAISE NOTICE '  - order_direction: TEXT (entrances/backs)';
  RAISE NOTICE '  - Default: entrances';
  RAISE NOTICE '  - CHECK constraint ensures valid values';
  RAISE NOTICE '';
  RAISE NOTICE 'All existing hives set to "entrances"';
  RAISE NOTICE '========================================';
END $$;

-- Show the updated table structure
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'hives'
  AND column_name = 'order_direction'
ORDER BY ordinal_position;
