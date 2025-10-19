-- Add inspection_time column to inspections table
ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS inspection_time TIME;
