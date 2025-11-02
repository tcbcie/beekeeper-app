-- EMERGENCY: Temporarily disable RLS to restore access
-- Run this immediately to restore functionality

ALTER TABLE public.inspections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.varroa_treatments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.varroa_checks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.harvests DISABLE ROW LEVEL SECURITY;

-- Reload the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
