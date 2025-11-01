-- Add weight column to inspections table
-- This allows users to record hive weight during inspections

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'weight'
  ) THEN
    ALTER TABLE inspections ADD COLUMN weight DECIMAL(6,2);
    COMMENT ON COLUMN inspections.weight IS 'Hive weight in kilograms';
  END IF;
END $$;

-- Reload the schema cache so PostgREST picks up the new column
NOTIFY pgrst, 'reload schema';
