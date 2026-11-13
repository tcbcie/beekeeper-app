-- Shared DCA sightings are moved by up to 1 km instead of 5 km, so the place can still be found.
-- The offset is worked out here rather than with obfuscate_coordinates(), which rounds to two
-- decimal places (about 1.1 km) and would by itself move a point further than the offset.
CREATE OR REPLACE FUNCTION public.get_shared_dca_sightings()
RETURNS TABLE(latitude double precision, longitude double precision, observation_year integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT
    round((c.latitude::double precision + (d.dist_km * cos(d.angle)) / 111.0)::numeric, 4)::double precision,
    round((c.longitude::double precision
           + (d.dist_km * sin(d.angle)) / (111.0 * cos(radians(c.latitude::double precision))))::numeric, 4)::double precision,
    extract(year FROM c.observation_date)::integer
  FROM dca_confirmations c
  CROSS JOIN LATERAL (SELECT public.coord_obfuscation_seed(c.id) AS seed) s
  CROSS JOIN LATERAL (
    -- A fixed direction and distance per sighting (salted, so it cannot be undone); the square
    -- root spreads the points evenly over the 1 km circle
    SELECT seeded_random(s.seed || '_angle') * 2 * pi() AS angle,
           sqrt(seeded_random(s.seed || '_distance')) * 1.0 AS dist_km
  ) d
  WHERE c.is_shared AND c.confirmed AND c.user_id <> auth.uid();
END $$;

REVOKE EXECUTE ON FUNCTION public.get_shared_dca_sightings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_shared_dca_sightings() TO authenticated;
