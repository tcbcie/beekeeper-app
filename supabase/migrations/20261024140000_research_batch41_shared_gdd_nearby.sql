-- Batch 41 (24/10/2026), C7b-22: get_shared_gdd_records filters in the database.
--
-- It used to return every shared bloom record in the country, with each owner's user_id, and the
-- browser dropped the caller's own records and kept those within 20 km of one of their apiaries.
-- Now the database does both filters and no longer returns user_id. The location stays blurred
-- by obfuscate_coordinates (batch 4). Same name and no arguments, so the two callers
-- (GDDDataTab, ApiaryWeatherRow) need no change beyond dropping user_id from their row types.
--
-- Removing a column changes the return type, so the function is dropped and recreated.

DROP FUNCTION IF EXISTS public.get_shared_gdd_records();

CREATE FUNCTION public.get_shared_gdd_records()
RETURNS TABLE(
  id uuid,
  vegetation_type_id uuid,
  year integer,
  start_date date,
  end_date date,
  gdd_value numeric,
  vegetation_name text,
  city text,
  latitude double precision,
  longitude double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT gr.id, gr.vegetation_type_id, gr.year, gr.start_date, gr.end_date, gr.gdd_value,
         dv.value::TEXT, a.city::TEXT, o.obfuscated_lat, o.obfuscated_lng
  FROM gdd_records gr
  JOIN apiaries a ON gr.apiary_id = a.id
  LEFT JOIN dropdown_values dv ON gr.vegetation_type_id = dv.id
  CROSS JOIN LATERAL obfuscate_coordinates(a.latitude::double precision, a.longitude::double precision,
                                           public.coord_obfuscation_seed(a.id), 5.0) o
  WHERE gr.is_shared = true
    AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL
    -- Other beekeepers' records only
    AND gr.user_id <> auth.uid()
    -- Within 20 km (of the blurred point, as before) of at least one of the caller's own apiaries
    AND EXISTS (
      SELECT 1 FROM apiaries mine
      WHERE mine.user_id = auth.uid()
        AND mine.latitude IS NOT NULL AND mine.longitude IS NOT NULL
        AND public.calculate_distance_km(mine.latitude::double precision, mine.longitude::double precision,
                                         o.obfuscated_lat, o.obfuscated_lng) <= 20
    );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_shared_gdd_records() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_shared_gdd_records() TO authenticated, service_role;
