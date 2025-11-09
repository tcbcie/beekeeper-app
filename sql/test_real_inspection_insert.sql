-- ============================================================================
-- TEST REAL INSPECTION INSERT WITH ALL COLUMNS
-- ============================================================================
-- Try to insert exactly what the frontend is sending
-- ============================================================================

DO $$
DECLARE
  test_user_id UUID;
  test_hive_id UUID;
  test_inspection_id UUID;
BEGIN
  -- Get first user
  SELECT id INTO test_user_id FROM profiles LIMIT 1;

  -- Get first hive for that user
  SELECT id INTO test_hive_id FROM hives WHERE user_id = test_user_id LIMIT 1;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'TEST REAL INSPECTION INSERT';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'User: %', test_user_id;
  RAISE NOTICE 'Hive: %', test_hive_id;
  RAISE NOTICE '';

  IF test_user_id IS NULL OR test_hive_id IS NULL THEN
    RAISE NOTICE '❌ No user/hive found for testing';
    RETURN;
  END IF;

  -- Try to insert with ALL the columns from the frontend
  BEGIN
    INSERT INTO inspections (
      hive_id,
      inspection_date,
      inspection_time,
      weight,
      queen_seen,
      eggs_present,
      drones_present,
      drone_brood_present,
      brood_frames,
      right_sized_frames,
      brood_pattern_rating,
      temperament_rating,
      population_strength,
      swarming_tendency,
      calmness,
      frames_foundation,
      frames_brood,
      frames_drawn,
      honey_supers,
      drone_frames,
      store_frames,
      recapping,
      vsh,
      smr,
      afb_disease,
      efb_disease,
      chalkbrood_disease,
      nosemosis_disease,
      dwv_disease,
      iapv_cbpv_disease,
      notes,
      image_url,
      weather_temp,
      weather_condition,
      weather_humidity,
      weather_wind_speed,
      user_id
    ) VALUES (
      test_hive_id,              -- hive_id
      CURRENT_DATE,               -- inspection_date (REQUIRED)
      CURRENT_TIME,               -- inspection_time
      NULL,                       -- weight
      false,                      -- queen_seen
      false,                      -- eggs_present
      -1,                         -- drones_present
      NULL,                       -- drone_brood_present
      NULL,                       -- brood_frames
      NULL,                       -- right_sized_frames
      3,                          -- brood_pattern_rating
      3,                          -- temperament_rating
      3,                          -- population_strength
      3,                          -- swarming_tendency
      3,                          -- calmness
      0,                          -- frames_foundation
      0,                          -- frames_brood
      0,                          -- frames_drawn
      0,                          -- honey_supers
      0,                          -- drone_frames
      0,                          -- store_frames
      0,                          -- recapping
      0,                          -- vsh
      0,                          -- smr
      0,                          -- afb_disease
      0,                          -- efb_disease
      0,                          -- chalkbrood_disease
      0,                          -- nosemosis_disease
      0,                          -- dwv_disease
      0,                          -- iapv_cbpv_disease
      '',                         -- notes
      NULL,                       -- image_url
      NULL,                       -- weather_temp
      NULL,                       -- weather_condition
      NULL,                       -- weather_humidity
      NULL,                       -- weather_wind_speed
      test_user_id                -- user_id
    ) RETURNING id INTO test_inspection_id;

    RAISE NOTICE '✅ INSERT SUCCESSFUL!';
    RAISE NOTICE 'Inspection ID: %', test_inspection_id;
    RAISE NOTICE '';
    RAISE NOTICE 'This means the database can accept inspections.';
    RAISE NOTICE 'The issue is likely:';
    RAISE NOTICE '  1. RLS policy blocking the frontend';
    RAISE NOTICE '  2. Frontend sending invalid data';
    RAISE NOTICE '  3. Supabase client configuration issue';

    -- Clean up
    DELETE FROM inspections WHERE id = test_inspection_id;
    RAISE NOTICE '';
    RAISE NOTICE 'Test data cleaned up.';

  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ INSERT FAILED!';
      RAISE NOTICE 'Error Code: %', SQLSTATE;
      RAISE NOTICE 'Error Message: %', SQLERRM;
      RAISE NOTICE '';
      RAISE NOTICE 'This reveals the actual database error.';
  END;

  RAISE NOTICE '============================================';
END $$;

-- Also check if authenticated role has INSERT permission
SELECT
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'inspections'
  AND table_schema = 'public'
  AND grantee = 'authenticated';
