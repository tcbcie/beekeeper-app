-- Add queen rearing progression tracking fields to rearing_batches table
-- Migration: Add grafts_accepted, queens_hatched, queens_mated fields
-- Created: 2025-10-26
-- Description: Adds fields to track the progression from grafts to accepted cells to hatched queens to mated queens

-- Add new columns to rearing_batches table
ALTER TABLE public.rearing_batches
ADD COLUMN IF NOT EXISTS grafts_accepted INTEGER,
ADD COLUMN IF NOT EXISTS queens_hatched INTEGER,
ADD COLUMN IF NOT EXISTS queens_mated INTEGER;

-- Add comments to document the new columns
COMMENT ON COLUMN public.rearing_batches.grafts_accepted
IS 'Number of grafts accepted by larvae (checked during acceptance check)';

COMMENT ON COLUMN public.rearing_batches.queens_hatched
IS 'Number of queens that successfully emerged/hatched from cells';

COMMENT ON COLUMN public.rearing_batches.queens_mated
IS 'Number of queens that successfully mated and began laying';

-- Note: These fields track the progression funnel:
-- cell_count (grafts made) -> grafts_accepted -> queens_hatched -> queens_mated
