-- ============================================================================
-- ADD ASSOCIATION MEMBERSHIP FIELDS TO USER PROFILES
-- ============================================================================
-- Add fields to track user's local beekeeping association membership
-- and membership in national organizations (FIBKA, IBA, NIHBS)
-- ============================================================================

-- Add association_id column (foreign key to beekeeping_associations table)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS association_id UUID REFERENCES public.beekeeping_associations(id) ON DELETE SET NULL;

-- Add national organization membership flags
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS member_fibka BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS member_iba BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS member_nihbs BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.association_id IS 'Reference to local beekeeping association (if member of one)';
COMMENT ON COLUMN public.profiles.member_fibka IS 'Member of Federation of Irish Beekeepers Associations (FIBKA)';
COMMENT ON COLUMN public.profiles.member_iba IS 'Member of Irish Beekeepers Association (IBA)';
COMMENT ON COLUMN public.profiles.member_nihbs IS 'Member of Native Irish Honey Bee Society (NIHBS)';

-- Verification
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('association_id', 'member_fibka', 'member_iba', 'member_nihbs')
ORDER BY column_name;
