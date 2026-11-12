-- Community map batch 4.6: a beekeeper can choose, sighting by sighting, to share a confirmed
-- DCA with other beekeepers. Nothing is shared unless they tick it.

ALTER TABLE public.dca_confirmations
  ADD COLUMN is_shared boolean NOT NULL DEFAULT false;

-- Only a "drones seen" sighting can be shared; a "no drones" answer stays private.
ALTER TABLE public.dca_confirmations
  ADD CONSTRAINT dca_confirmations_shared_needs_confirmed CHECK (NOT is_shared OR confirmed);

CREATE INDEX idx_dca_confirmations_shared ON public.dca_confirmations (id) WHERE is_shared;

-- Other beekeepers' shared sightings: moved by up to 5 km (the same salted offset as shared
-- apiaries), with the year only. No owner, no note, no row id, and never the caller's own.
CREATE OR REPLACE FUNCTION public.get_shared_dca_sightings()
RETURNS TABLE(latitude double precision, longitude double precision, observation_year integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT o.obfuscated_lat, o.obfuscated_lng, extract(year FROM c.observation_date)::integer
  FROM dca_confirmations c
  CROSS JOIN LATERAL obfuscate_coordinates(c.latitude::double precision, c.longitude::double precision,
                                           public.coord_obfuscation_seed(c.id), 5.0) o
  WHERE c.is_shared AND c.confirmed AND c.user_id <> auth.uid();
END $$;

REVOKE EXECUTE ON FUNCTION public.get_shared_dca_sightings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_shared_dca_sightings() TO authenticated;
