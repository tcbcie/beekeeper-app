-- Add queen tracking to hive_configuration_history
-- This allows tracking when queens are changed or queen status is updated

-- Add queen tracking fields to the history table
ALTER TABLE hive_configuration_history
ADD COLUMN IF NOT EXISTS queen_id UUID REFERENCES queens(id),
ADD COLUMN IF NOT EXISTS queen_marked BOOLEAN,
ADD COLUMN IF NOT EXISTS queen_marking_color TEXT,
ADD COLUMN IF NOT EXISTS queen_mated BOOLEAN,
ADD COLUMN IF NOT EXISTS queen_clipped BOOLEAN;

-- Create index for efficient querying by queen
CREATE INDEX IF NOT EXISTS idx_hive_config_history_queen ON hive_configuration_history(queen_id);

-- Update the trigger function to capture queen changes
CREATE OR REPLACE FUNCTION track_hive_configuration_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert if configuration, location, OR queen info has actually changed
  IF (
    NEW.configuration IS DISTINCT FROM OLD.configuration OR
    NEW.apiary_id IS DISTINCT FROM OLD.apiary_id OR
    NEW.row_in_apiary IS DISTINCT FROM OLD.row_in_apiary OR
    NEW.order_in_apiary IS DISTINCT FROM OLD.order_in_apiary OR
    NEW.queen_id IS DISTINCT FROM OLD.queen_id OR
    NEW.queen_marked IS DISTINCT FROM OLD.queen_marked OR
    NEW.queen_marking_color IS DISTINCT FROM OLD.queen_marking_color OR
    NEW.queen_mated IS DISTINCT FROM OLD.queen_mated OR
    NEW.queen_clipped IS DISTINCT FROM OLD.queen_clipped
  ) THEN
    INSERT INTO hive_configuration_history (
      hive_id,
      changed_at,
      changed_by,
      configuration,
      apiary_id,
      row_in_apiary,
      order_in_apiary,
      queen_id,
      queen_marked,
      queen_marking_color,
      queen_mated,
      queen_clipped
    ) VALUES (
      NEW.id,
      NOW(),
      auth.uid(),
      NEW.configuration,
      NEW.apiary_id,
      NEW.row_in_apiary,
      NEW.order_in_apiary,
      NEW.queen_id,
      NEW.queen_marked,
      NEW.queen_marking_color,
      NEW.queen_mated,
      NEW.queen_clipped
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
  NEW.order_in_apiary IS DISTINCT FROM OLD.order_in_apiary OR
  NEW.queen_id IS DISTINCT FROM OLD.queen_id OR
  NEW.queen_marked IS DISTINCT FROM OLD.queen_marked OR
  NEW.queen_marking_color IS DISTINCT FROM OLD.queen_marking_color OR
  NEW.queen_mated IS DISTINCT FROM OLD.queen_mated OR
  NEW.queen_clipped IS DISTINCT FROM OLD.queen_clipped
)
EXECUTE FUNCTION track_hive_configuration_changes();

-- Comment on the new columns
COMMENT ON COLUMN hive_configuration_history.queen_id IS 'The queen assigned to the hive at this point in history';
COMMENT ON COLUMN hive_configuration_history.queen_marked IS 'Whether the queen was marked (when no specific queen assigned)';
COMMENT ON COLUMN hive_configuration_history.queen_marking_color IS 'Color of queen marking at this point in history';
COMMENT ON COLUMN hive_configuration_history.queen_mated IS 'Whether the queen was mated (when no specific queen assigned)';
COMMENT ON COLUMN hive_configuration_history.queen_clipped IS 'Whether the queen had clipped wings at this point in history';
