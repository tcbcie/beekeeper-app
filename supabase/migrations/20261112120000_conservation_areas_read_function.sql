-- Community map batch 4.1, step 1 of 2: conservation areas are read through a function.
--
-- conservation_areas is readable row-by-row by every signed-in user, and an apiary-declared
-- row carries its owner's user_id and the apiary's id. The map only needs what it draws, so
-- it now reads this function, which returns the display columns and nothing that names the owner.
--
-- Step 2 narrows the table's SELECT policy (SQL in docs/features/conservation-areas.md). It
-- is applied only once the app version that calls this function is live: the previous
-- version reads the table directly and would show no conservation areas.

CREATE OR REPLACE FUNCTION public.get_conservation_areas()
RETURNS TABLE(
  id uuid,
  name text,
  type text,
  description text,
  latitude numeric,
  longitude numeric,
  radius_km numeric,
  county text,
  country text,
  nihbs_url text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT ca.id, ca.name, ca.type, ca.description, ca.latitude, ca.longitude,
         ca.radius_km, ca.county, ca.country, ca.nihbs_url
  FROM conservation_areas ca
  WHERE ca.is_active = true;
END $$;

REVOKE EXECUTE ON FUNCTION public.get_conservation_areas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_conservation_areas() TO authenticated;
