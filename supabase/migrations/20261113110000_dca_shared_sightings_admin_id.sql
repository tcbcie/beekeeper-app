-- Moderation: Admins can take a shared DCA sighting off the shared map. To say which one, the
-- function hands the row id to Admins only; everyone else gets NULL there, as before nothing
-- identifies the row or its owner. The return type changes, so the function is recreated.
DROP FUNCTION public.get_shared_dca_sightings();

CREATE FUNCTION public.get_shared_dca_sightings()
RETURNS TABLE(latitude double precision, longitude double precision, observation_year integer, id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  v_is_admin := coalesce(is_admin(), false);
  RETURN QUERY
  SELECT
    round((c.latitude::double precision + (d.dist_km * cos(d.angle)) / 111.0)::numeric, 4)::double precision,
    round((c.longitude::double precision
           + (d.dist_km * sin(d.angle)) / (111.0 * cos(radians(c.latitude::double precision))))::numeric, 4)::double precision,
    extract(year FROM c.observation_date)::integer,
    CASE WHEN v_is_admin THEN c.id END
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
