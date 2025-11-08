-- ADD is_active column to profiles table if it doesn't exist
-- Run this if the diagnostic shows is_active column is missing

DO $$
BEGIN
  -- Check if is_active column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
      AND column_name = 'is_active'
      AND table_schema = 'public'
  ) THEN
    -- Add the column
    ALTER TABLE public.profiles
    ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL;

    RAISE NOTICE 'Added is_active column to profiles table';
  ELSE
    RAISE NOTICE 'is_active column already exists';
  END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name = 'is_active'
  AND table_schema = 'public';
