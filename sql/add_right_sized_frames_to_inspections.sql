-- Add Right-Sized frames field to inspections table
-- This allows tracking the number of frames that are right-sized during inspection

-- Add the column
ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS right_sized_frames INTEGER;

-- Add comment to describe the field
COMMENT ON COLUMN inspections.right_sized_frames IS 'Number of frames that are right-sized (similar to brood_frames tracking)';

-- Verification query
-- Run this to verify the column was added:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'inspections' AND column_name = 'right_sized_frames';
