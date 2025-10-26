-- Add cage date fields to rearing_batches table
ALTER TABLE public.rearing_batches
ADD COLUMN IF NOT EXISTS first_option_to_cage_date DATE,
ADD COLUMN IF NOT EXISTS second_option_to_cage_date DATE;

COMMENT ON COLUMN public.rearing_batches.first_option_to_cage_date
IS 'Date for first option to cage queen cells (typically graft_date + 5 days)';

COMMENT ON COLUMN public.rearing_batches.second_option_to_cage_date
IS 'Date for second option to cage queen cells (typically graft_date + 10 days)';
