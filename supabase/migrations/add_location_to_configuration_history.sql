-- Add location tracking to hive_configuration_history
-- This allows tracking when hives are moved between apiaries, rows, or positions

-- Add location fields to the history table
ALTER TABLE hive_configuration_history
ADD COLUMN apiary_id UUID REFERENCES apiaries(id),
ADD COLUMN row_in_apiary INTEGER,
ADD COLUMN order_in_apiary INTEGER;

-- Create index for efficient querying by apiary
CREATE INDEX idx_hive_config_history_apiary ON hive_configuration_history(apiary_id);

-- Update the trigger function to capture location changes
CREATE OR REPLACE FUNCTION track_hive_configuration_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert if configuration OR location has actually changed
  IF (
    NEW.configuration IS DISTINCT FROM OLD.configuration OR
    NEW.apiary_id IS DISTINCT FROM OLD.apiary_id OR
    NEW.row_in_apiary IS DISTINCT FROM OLD.row_in_apiary OR
    NEW.order_in_apiary IS DISTINCT FROM OLD.order_in_apiary
  ) THEN
    INSERT INTO hive_configuration_history (
      hive_id,
      changed_at,
      changed_by,
      configuration,
      apiary_id,
      row_in_apiary,
      order_in_apiary
    ) VALUES (
      NEW.id,
      NOW(),
      auth.uid(),
      NEW.configuration,
      NEW.apiary_id,
      NEW.row_in_apiary,
      NEW.order_in_apiary
    );

    -- Update the changed_at timestamp on the hive
    NEW.configuration_changed_at := NOW();
    NEW.configuration_changed_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger (if it exists, drop and recreate)
DROP TRIGGER IF EXISTS track_hive_config_changes ON hives;

CREATE TRIGGER track_hive_config_changes
AFTER UPDATE ON hives
FOR EACH ROW
WHEN (
  NEW.configuration IS DISTINCT FROM OLD.configuration OR
  NEW.apiary_id IS DISTINCT FROM OLD.apiary_id OR
  NEW.row_in_apiary IS DISTINCT FROM OLD.row_in_apiary OR
  NEW.order_in_apiary IS DISTINCT FROM OLD.order_in_apiary
)
EXECUTE FUNCTION track_hive_configuration_changes();

-- Create a helper view to get location change information with apiary names
CREATE OR REPLACE VIEW hive_configuration_history_with_location AS
SELECT
  hch.*,
  a.name as apiary_name
FROM hive_configuration_history hch
LEFT JOIN apiaries a ON hch.apiary_id = a.id;

-- Comment on the new columns
COMMENT ON COLUMN hive_configuration_history.apiary_id IS 'The apiary the hive was in at this point in history';
COMMENT ON COLUMN hive_configuration_history.row_in_apiary IS 'The row number within the apiary at this point in history';
COMMENT ON COLUMN hive_configuration_history.order_in_apiary IS 'The position within the row at this point in history';
