-- Add acceptance check date to rearing_batches table
-- Migration: Add acceptance_check_date field for tracking when grafts are checked for acceptance
-- Created: 2025-10-26
-- Description: Adds an optional date field to track acceptance checks (typically graft_date + 1 day)

-- Add new column to rearing_batches table
ALTER TABLE public.rearing_batches
ADD COLUMN IF NOT EXISTS acceptance_check_date DATE;

-- Add comment to document the new column
COMMENT ON COLUMN public.rearing_batches.acceptance_check_date
IS 'Date when acceptance check was performed (typically graft_date + 1 day). Optional field to track when grafts were checked for acceptance.';
