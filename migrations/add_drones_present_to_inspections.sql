-- Add drones columns to inspections table
-- Created: November 6, 2025

-- Drop the column if it exists as BOOLEAN and recreate as INTEGER
ALTER TABLE public.inspections
DROP COLUMN IF EXISTS drones_present;

ALTER TABLE public.inspections
ADD COLUMN drones_present INTEGER DEFAULT 0 CHECK (drones_present >= 0 AND drones_present <= 3);

ALTER TABLE public.inspections
ADD COLUMN IF NOT EXISTS drone_brood_present BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.inspections.drones_present IS 'Level of drones observed: 0=Low, 1=Medium, 2=High, 3=Extreme';
COMMENT ON COLUMN public.inspections.drone_brood_present IS 'Whether drone brood was observed during the inspection';
