-- Add is_uk_ni column to apiaries table
ALTER TABLE apiaries
ADD COLUMN IF NOT EXISTS is_uk_ni BOOLEAN DEFAULT FALSE;

-- Add comment to explain the column
COMMENT ON COLUMN apiaries.is_uk_ni IS 'Indicates if the postcode is a UK/NI postcode (true) or Irish Eircode (false)';
