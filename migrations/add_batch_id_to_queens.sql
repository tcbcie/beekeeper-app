-- Add batch_id column to queens table
-- Created: December 29, 2025

ALTER TABLE public.queens
ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.rearing_batches(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.queens.batch_id IS 'The rearing batch this queen originated from';
