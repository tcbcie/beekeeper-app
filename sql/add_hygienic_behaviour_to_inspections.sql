-- Add Hygienic Behaviour fields to inspections table
-- These fields track varroa resistance traits and hygienic behaviors

ALTER TABLE public.inspections
ADD COLUMN IF NOT EXISTS recapping INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS vsh INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS smr INTEGER DEFAULT 3;

COMMENT ON COLUMN public.inspections.recapping
IS 'Recapping behavior rating (1-5): Bees uncapping and recapping cells to remove diseased or parasitized brood. 0=Not Recorded, 3=Default';

COMMENT ON COLUMN public.inspections.vsh
IS 'VSH (Varroa Sensitive Hygiene) rating (1-5): Ability to detect and remove brood infested with reproducing varroa mites. 0=Not Recorded, 3=Default';

COMMENT ON COLUMN public.inspections.smr
IS 'SMR (Suppressed Mite Reproduction) rating (1-5): Trait that limits varroa mite reproduction in capped brood cells. 0=Not Recorded, 3=Default';
