-- Replace disease tracking from string to star ratings (1-5 severity scale)
-- This migration adds 6 new disease rating columns and will eventually deprecate disease_issues

-- Add new disease rating columns
ALTER TABLE public.inspections
ADD COLUMN IF NOT EXISTS afb_disease INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS efb_disease INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS chalkbrood_disease INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS nosemosis_disease INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dwv_disease INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS iapv_cbpv_disease INTEGER DEFAULT 0;

-- Add comments explaining each disease rating
COMMENT ON COLUMN public.inspections.afb_disease
IS 'American Foulbrood severity rating (0-5): 0=Not Recorded, 1-5=Severity scale from minimal to severe. Highly contagious bacterial disease requiring immediate reporting.';

COMMENT ON COLUMN public.inspections.efb_disease
IS 'European Foulbrood severity rating (0-5): 0=Not Recorded, 1-5=Severity scale from minimal to severe. Affects young larvae.';

COMMENT ON COLUMN public.inspections.chalkbrood_disease
IS 'Chalkbrood severity rating (0-5): 0=Not Recorded, 1-5=Severity scale from minimal to severe. Fungal disease creating hard mummies.';

COMMENT ON COLUMN public.inspections.nosemosis_disease
IS 'Nosemosis severity rating (0-5): 0=Not Recorded, 1-5=Severity scale from minimal to severe. Microsporidian parasite affecting digestion.';

COMMENT ON COLUMN public.inspections.dwv_disease
IS 'Deformed Wing Virus severity rating (0-5): 0=Not Recorded, 1-5=Severity scale from minimal to severe. Often indicates varroa mite issues.';

COMMENT ON COLUMN public.inspections.iapv_cbpv_disease
IS 'IAPV & CBPV severity rating (0-5): 0=Not Recorded, 1-5=Severity scale from minimal to severe. IAPV causes paralysis; CBPV causes trembling and hairless appearance.';

-- Note: disease_issues column is kept for backward compatibility but is no longer actively used
-- Future migration may remove it after data migration is confirmed
COMMENT ON COLUMN public.inspections.disease_issues
IS 'DEPRECATED: Legacy disease tracking field. Use individual disease rating columns instead (afb_disease, efb_disease, chalkbrood_disease, nosemosis_disease, dwv_disease, iapv_cbpv_disease).';
