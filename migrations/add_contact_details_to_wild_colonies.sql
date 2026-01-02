-- Add contact details columns to wild_colonies table
ALTER TABLE public.wild_colonies
ADD COLUMN IF NOT EXISTS contact_name text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS share_contact_details boolean DEFAULT false;

COMMENT ON COLUMN public.wild_colonies.share_contact_details IS 'User consent to share contact details for review queries';
