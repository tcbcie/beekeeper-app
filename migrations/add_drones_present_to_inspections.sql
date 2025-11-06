-- Add drones_present column to inspections table
-- Created: November 6, 2025

ALTER TABLE public.inspections
ADD COLUMN IF NOT EXISTS drones_present BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.inspections.drones_present IS 'Whether drones were observed during the inspection';
