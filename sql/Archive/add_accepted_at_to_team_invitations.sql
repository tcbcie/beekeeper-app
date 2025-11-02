-- Add accepted_at column to team_invitations table if it doesn't exist
-- This column tracks when a team invitation was accepted

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'team_invitations'
    AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE team_invitations
    ADD COLUMN accepted_at TIMESTAMP WITH TIME ZONE;

    COMMENT ON COLUMN team_invitations.accepted_at IS 'Timestamp when the invitation was accepted';
  END IF;
END $$;

-- Reload the schema cache so PostgREST recognizes the new column
NOTIFY pgrst, 'reload schema';
