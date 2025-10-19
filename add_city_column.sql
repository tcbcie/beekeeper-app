-- Add city column to apiaries table
ALTER TABLE apiaries
ADD COLUMN city TEXT;

-- Optional: Add a comment to the column
COMMENT ON COLUMN apiaries.city IS 'City or town where the apiary is located';
