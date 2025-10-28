-- Add profile fields to user_profiles table
-- Run this in Supabase SQL Editor

-- Note: The user_profiles table uses 'id' column (not 'user_id') as the primary key
-- which references auth.users(id)

-- Add columns if they don't exist (they might already exist from schema)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS mobile_number TEXT;

-- The 'id' column should already be the primary key, which makes it unique
-- So we don't need to add a UNIQUE constraint

-- Add comments
COMMENT ON COLUMN user_profiles.first_name IS 'User first name (optional)';
COMMENT ON COLUMN user_profiles.last_name IS 'User last name (optional)';
COMMENT ON COLUMN user_profiles.mobile_number IS 'User mobile phone number (optional)';

SELECT 'Profile fields verified successfully!' as status;
SELECT 'Note: The table uses "id" column (not "user_id") as the primary key' as note;
