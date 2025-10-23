-- Add mated_at_eircode field to queens table
-- This field stores the Eircode (Irish postcode) where the queen was mated

ALTER TABLE queens ADD COLUMN IF NOT EXISTS mated_at_eircode VARCHAR(10);

COMMENT ON COLUMN queens.mated_at_eircode IS 'Eircode (Irish postcode) where the queen was mated';
