-- Add declined_at column to team_invitations table
-- This column tracks when a team invitation was declined

-- Add the column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'team_invitations'
    AND column_name = 'declined_at'
  ) THEN
    ALTER TABLE team_invitations
    ADD COLUMN declined_at TIMESTAMPTZ;

    RAISE NOTICE 'Column declined_at added to team_invitations table';
  ELSE
    RAISE NOTICE 'Column declined_at already exists in team_invitations table';
  END IF;
END $$;

-- Update existing declined invitations to have a declined_at timestamp
-- (if any exist with status='declined' but no declined_at)
-- Use current timestamp since we don't track when they were actually declined
UPDATE team_invitations
SET declined_at = NOW()
WHERE status = 'declined'
  AND declined_at IS NULL;

-- Verify the change
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'team_invitations'
  AND column_name = 'declined_at';

-- IMPORTANT: Reload the PostgREST schema cache
-- This is critical to make the new column available to the API immediately
NOTIFY pgrst, 'reload schema';
