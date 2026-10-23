-- Batch 34: traceability weights.
--
-- 1. get_public_batch_info: origin percentages counted each harvest once per container
--    (a harvest split across several buckets of one batch was counted once per bucket) and
--    added pounds as if they were kilograms. Each harvest is now counted once per batch and
--    converted to kg. Return shape, SECURITY DEFINER, search_path and grants are unchanged
--    (CREATE OR REPLACE keeps the existing EXECUTE grants).
-- 2. Harvests saved with a blank unit: the new-harvest form started with unit '' while the
--    select showed "kg", so the blank was saved. Every calculation already treats a blank
--    as kg; set them to 'kg' to match what the form showed.

CREATE OR REPLACE FUNCTION public.get_public_batch_info(p_trace_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_batch RECORD;
  v_result JSONB;
  v_origins JSONB;
  v_floral_sources JSONB;
  v_beekeeper_name TEXT;
  v_apiary_image_url TEXT;
  v_jars JSONB;
BEGIN
  -- Find the batch by trace_code (must be public)
  SELECT br.*, p.first_name, p.full_name
  INTO v_batch
  FROM batch_runs br
  LEFT JOIN profiles p ON p.id = br.user_id
  WHERE br.trace_code = p_trace_code
    AND br.is_public = true;

  -- Return NULL if not found or not public
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Get beekeeper name (prefer first_name, fallback to full_name)
  v_beekeeper_name := COALESCE(v_batch.first_name, v_batch.full_name, 'Local Beekeeper');

  -- Get apiary image URL if show_apiary_image is enabled (use first linked apiary with an image)
  IF v_batch.show_apiary_image THEN
    SELECT a.image_url
    INTO v_apiary_image_url
    FROM batch_containers bc
    JOIN bulk_containers c ON c.id = bc.container_id
    JOIN container_harvests ch ON ch.container_id = c.id
    JOIN harvests h ON h.id = ch.harvest_id
    JOIN hives hv ON hv.id = h.hive_id
    JOIN apiaries a ON a.id = hv.apiary_id
    WHERE bc.batch_id = v_batch.id
      AND a.image_url IS NOT NULL
    LIMIT 1;
  END IF;

  -- Get origins with (approximate) location data. Each linked harvest counts once, in kg,
  -- however many of the batch's containers it was split across.
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'apiary_name', origin.apiary_name,
      'city', origin.city,
      'percentage', origin.percentage,
      'latitude', origin.latitude,
      'longitude', origin.longitude,
      'show_map', origin.latitude IS NOT NULL
    ) ORDER BY origin.percentage DESC
  ), '[]'::jsonb)
  INTO v_origins
  FROM (
    SELECT
      a.name as apiary_name,
      a.city,
      o.obfuscated_lat as latitude,
      o.obfuscated_lng as longitude,
      ROUND(
        (SUM(w.weight_kg) / NULLIF(SUM(SUM(w.weight_kg)) OVER (), 0) * 100)::numeric,
        0
      ) as percentage
    FROM (
      SELECT h.hive_id,
        COALESCE(h.honey_weight, 0) * CASE WHEN h.unit = 'lb' THEN 0.453592 ELSE 1 END AS weight_kg
      FROM harvests h
      WHERE h.id IN (
        SELECT ch.harvest_id
        FROM batch_containers bc
        JOIN container_harvests ch ON ch.container_id = bc.container_id
        WHERE bc.batch_id = v_batch.id
      )
    ) w
    JOIN hives hv ON hv.id = w.hive_id
    JOIN apiaries a ON a.id = hv.apiary_id
    LEFT JOIN LATERAL (
      SELECT ob.obfuscated_lat, ob.obfuscated_lng
      FROM obfuscate_coordinates(a.latitude::double precision, a.longitude::double precision,
                                 public.coord_obfuscation_seed(a.id), 5.0) ob
      WHERE a.share_location = true AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL
    ) o ON true
    GROUP BY a.id, a.name, a.city, o.obfuscated_lat, o.obfuscated_lng
  ) origin;

  -- Get unique floral sources from harvests
  SELECT COALESCE(jsonb_agg(DISTINCT h.floral_source), '[]'::jsonb)
  INTO v_floral_sources
  FROM batch_containers bc
  JOIN bulk_containers c ON c.id = bc.container_id
  JOIN container_harvests ch ON ch.container_id = c.id
  JOIN harvests h ON h.id = ch.harvest_id
  WHERE bc.batch_id = v_batch.id
    AND h.floral_source IS NOT NULL;

  -- Get jar sizes for this batch (ordered by size)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'jar_size_ml', bj.jar_size_ml,
      'jar_weight_g', bj.jar_weight_g,
      'jar_count', bj.jar_count
    ) ORDER BY bj.jar_size_ml
  ), '[]'::jsonb)
  INTO v_jars
  FROM batch_jars bj
  WHERE bj.batch_id = v_batch.id;

  -- Build result
  v_result := jsonb_build_object(
    'batch_code', v_batch.batch_code,
    'trace_code', v_batch.trace_code,
    'batch_date', v_batch.batch_date,
    'best_before_date', v_batch.best_before_date,
    'jar_size_ml', v_batch.jar_size_ml,
    'jar_weight_g', v_batch.jar_weight_g,
    'jars', v_jars,
    'beekeeper_name', v_beekeeper_name,
    'floral_sources', v_floral_sources,
    'origins', v_origins,
    'public_title', v_batch.public_title,
    'public_origin', v_batch.public_origin,
    'public_story', v_batch.public_story,
    'apiary_image_url', v_apiary_image_url,
    'show_feedback', COALESCE(v_batch.show_feedback, true)
  );

  RETURN v_result;
END;
$function$;

UPDATE public.harvests SET unit = 'kg' WHERE unit IS NULL OR btrim(unit) = '';
