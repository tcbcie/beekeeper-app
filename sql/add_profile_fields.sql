-- Add profile fields to user_profiles table
-- Run this in Supabase SQL Editor

-- Add columns if they don't exist
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(50);

-- Ensure user_id is unique for upsert operations
-- First check if constraint exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_profiles_user_id_unique'
    ) THEN
        ALTER TABLE user_profiles
        ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id);
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN user_profiles.first_name IS 'User first name (optional)';
COMMENT ON COLUMN user_profiles.last_name IS 'User last name (optional)';
COMMENT ON COLUMN user_profiles.mobile_number IS 'User mobile phone number (optional)';

SELECT 'Profile fields added successfully!' as status;
