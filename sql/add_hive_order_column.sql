-- Add hive_order column to hives table
-- This column stores the physical order/position of hives at an apiary

-- Check if column exists before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'hives'
    AND column_name = 'hive_order'
  ) THEN
    -- Add the column
    ALTER TABLE hives
    ADD COLUMN hive_order INTEGER;

    -- Add comment for documentation
    COMMENT ON COLUMN hives.hive_order IS 'Physical order/position of hive at the apiary (optional)';
  END IF;
END $$;

-- Reload the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
