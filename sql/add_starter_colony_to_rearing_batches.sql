-- Add starter_colony_hive_id to rearing_batches table
ALTER TABLE public.rearing_batches
ADD COLUMN IF NOT EXISTS starter_colony_hive_id UUID REFERENCES public.hives(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.rearing_batches.starter_colony_hive_id
IS 'Reference to the hive used as the starter colony for this queen rearing batch';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rearing_batches_starter_colony_hive_id
ON public.rearing_batches(starter_colony_hive_id);
