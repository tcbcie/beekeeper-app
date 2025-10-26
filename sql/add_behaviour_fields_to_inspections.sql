-- Add behaviour fields to inspections table
ALTER TABLE public.inspections
ADD COLUMN IF NOT EXISTS swarming_tendency INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS calmness INTEGER DEFAULT 3;

COMMENT ON COLUMN public.inspections.swarming_tendency
IS 'Swarming tendency rating (1-5): 1=Very Low, 2=Low, 3=Moderate, 4=High, 5=Very High. Monitor to prevent colony loss.';

COMMENT ON COLUMN public.inspections.calmness
IS 'Calmness rating (1-5): 1=Very Nervous, 2=Nervous, 3=Average, 4=Calm, 5=Very Calm. Calm bees make inspections easier.';
