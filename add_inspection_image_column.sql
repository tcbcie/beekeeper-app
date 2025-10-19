-- Add image_url column to inspections table
ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment to the column
COMMENT ON COLUMN inspections.image_url IS 'URL to the inspection photo stored in Supabase Storage';
