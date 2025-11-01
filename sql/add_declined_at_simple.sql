-- Simple version: Add declined_at column to team_invitations table
-- Run this in Supabase SQL Editor

-- Step 1: Add the column
ALTER TABLE public.team_invitations
ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;

-- Step 2: Update any existing declined invitations
UPDATE public.team_invitations
SET declined_at = NOW()
WHERE status = 'declined'
  AND declined_at IS NULL;

-- Step 3: CRITICAL - Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Step 4: Verify
SELECT
  'Column added successfully!' as message,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'team_invitations'
  AND column_name = 'declined_at';
