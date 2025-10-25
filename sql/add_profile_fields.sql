-- Add profile fields to user_profiles table
-- Migration: Add first_name, last_name, and mobile_number fields
-- Created: 2025-10-25
-- Description: Adds optional personal information fields to the user_profiles table

-- Add new columns to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(50);

-- Add comments to document the new columns
COMMENT ON COLUMN user_profiles.first_name IS 'User''s first name (optional)';
COMMENT ON COLUMN user_profiles.last_name IS 'User''s last name (optional)';
COMMENT ON COLUMN user_profiles.mobile_number IS 'User''s mobile phone number (optional)';

-- Note: These fields are intentionally nullable to allow users to opt-in to providing this information
-- The application will handle null values appropriately in the UI
