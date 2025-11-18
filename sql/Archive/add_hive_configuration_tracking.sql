-- Add configuration change tracking to hives table
-- This tracks when and by whom the hive configuration was last changed

-- Add columns for tracking configuration changes
ALTER TABLE hives
ADD COLUMN IF NOT EXISTS configuration_changed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS configuration_changed_by UUID REFERENCES profiles(id);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_hives_configuration_changed_at ON hives(configuration_changed_at);
CREATE INDEX IF NOT EXISTS idx_hives_configuration_changed_by ON hives(configuration_changed_by);

-- Add comment to document the purpose
COMMENT ON COLUMN hives.configuration_changed_at IS 'Timestamp when the hive configuration (brood boxes, supers, etc.) was last modified';
COMMENT ON COLUMN hives.configuration_changed_by IS 'User ID of the person who last modified the hive configuration';
