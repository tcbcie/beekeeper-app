-- Add Given/Taken fields to inspections table
-- These fields track frames/supers added or removed during inspections

ALTER TABLE public.inspections
ADD COLUMN IF NOT EXISTS frames_foundation INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS frames_brood INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS frames_drawn INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS honey_supers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS drone_frames INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS store_frames INTEGER DEFAULT 0;

COMMENT ON COLUMN public.inspections.frames_foundation
IS 'Number of foundation frames added (+) or removed (-) during inspection';

COMMENT ON COLUMN public.inspections.frames_brood
IS 'Number of brood frames added (+) or removed (-) during inspection';

COMMENT ON COLUMN public.inspections.frames_drawn
IS 'Number of drawn frames added (+) or removed (-) during inspection';

COMMENT ON COLUMN public.inspections.honey_supers
IS 'Number of honey supers added (+) or removed (-) during inspection';

COMMENT ON COLUMN public.inspections.drone_frames
IS 'Number of drone frames added (+) or removed (-) during inspection';

COMMENT ON COLUMN public.inspections.store_frames
IS 'Number of store frames added (+) or removed (-) during inspection';
