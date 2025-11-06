-- Add queen cells columns to inspections table
-- Created: November 6, 2025

ALTER TABLE public.inspections
ADD COLUMN IF NOT EXISTS queen_cups BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS queen_cups_number INTEGER DEFAULT 0 CHECK (queen_cups_number >= 0),
ADD COLUMN IF NOT EXISTS queen_cups_removed_all BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS swarm_cells BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS swarm_cells_number INTEGER DEFAULT 0 CHECK (swarm_cells_number >= 0),
ADD COLUMN IF NOT EXISTS swarm_cells_removed_all BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS supercedure_cells BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS supercedure_cells_number INTEGER DEFAULT 0 CHECK (supercedure_cells_number >= 0),
ADD COLUMN IF NOT EXISTS supercedure_cells_removed_all BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS emergency_cells BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS emergency_cells_number INTEGER DEFAULT 0 CHECK (emergency_cells_number >= 0),
ADD COLUMN IF NOT EXISTS emergency_cells_removed_all BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS removed_cells INTEGER DEFAULT 0 CHECK (removed_cells >= 0),
ADD COLUMN IF NOT EXISTS remaining_cells INTEGER DEFAULT 0 CHECK (remaining_cells >= 0),
ADD COLUMN IF NOT EXISTS queen_cells_notes TEXT DEFAULT '';

COMMENT ON COLUMN public.inspections.queen_cups IS 'Whether queen cups were observed';
COMMENT ON COLUMN public.inspections.queen_cups_number IS 'Number of queen cups';
COMMENT ON COLUMN public.inspections.queen_cups_removed_all IS 'Whether all queen cups were removed';
COMMENT ON COLUMN public.inspections.swarm_cells IS 'Whether swarm cells were observed';
COMMENT ON COLUMN public.inspections.swarm_cells_number IS 'Number of swarm cells';
COMMENT ON COLUMN public.inspections.swarm_cells_removed_all IS 'Whether all swarm cells were removed';
COMMENT ON COLUMN public.inspections.supercedure_cells IS 'Whether supercedure cells were observed';
COMMENT ON COLUMN public.inspections.supercedure_cells_number IS 'Number of supercedure cells';
COMMENT ON COLUMN public.inspections.supercedure_cells_removed_all IS 'Whether all supercedure cells were removed';
COMMENT ON COLUMN public.inspections.emergency_cells IS 'Whether emergency cells were observed';
COMMENT ON COLUMN public.inspections.emergency_cells_number IS 'Number of emergency cells';
COMMENT ON COLUMN public.inspections.emergency_cells_removed_all IS 'Whether all emergency cells were removed';
COMMENT ON COLUMN public.inspections.removed_cells IS 'Total number of queen cells removed';
COMMENT ON COLUMN public.inspections.remaining_cells IS 'Total number of queen cells remaining';
COMMENT ON COLUMN public.inspections.queen_cells_notes IS 'Additional notes about queen cells';
