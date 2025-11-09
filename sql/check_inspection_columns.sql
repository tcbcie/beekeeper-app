-- ============================================================================
-- CHECK INSPECTION TABLE COLUMNS
-- ============================================================================
-- Verify all columns exist and their types match what frontend is sending
-- ============================================================================

-- List all columns in inspections table
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'inspections'
ORDER BY ordinal_position;

-- Check which columns are required (NOT NULL without default)
SELECT
  column_name,
  data_type,
  'REQUIRED' as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'inspections'
  AND is_nullable = 'NO'
  AND column_default IS NULL
ORDER BY column_name;

-- Check the exact columns the frontend is trying to insert
-- Based on the error URL, these columns are being sent:
-- hive_id, inspection_date, inspection_time, weight, queen_seen, eggs_present,
-- drones_present, drone_brood_present, brood_frames, right_sized_frames,
-- brood_pattern_rating, temperament_rating, population_strength,
-- swarming_tendency, calmness, frames_foundation, frames_brood, frames_drawn,
-- honey_supers, drone_frames, store_frames, recapping, vsh, smr,
-- afb_disease, efb_disease, chalkbrood_disease, nosemosis_disease,
-- dwv_disease, iapv_cbpv_disease, notes, image_url, weather_temp,
-- weather_condition, weather_humidity, weather_wind_speed, user_id

-- Check if all these columns exist
DO $$
DECLARE
  missing_columns TEXT[] := ARRAY[]::TEXT[];
  col TEXT;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'CHECKING COLUMNS FROM FRONTEND REQUEST';
  RAISE NOTICE '============================================';

  -- Check each column from the URL
  FOREACH col IN ARRAY ARRAY[
    'hive_id', 'inspection_date', 'inspection_time', 'weight', 'queen_seen',
    'eggs_present', 'drones_present', 'drone_brood_present', 'brood_frames',
    'right_sized_frames', 'brood_pattern_rating', 'temperament_rating',
    'population_strength', 'swarming_tendency', 'calmness', 'frames_foundation',
    'frames_brood', 'frames_drawn', 'honey_supers', 'drone_frames',
    'store_frames', 'recapping', 'vsh', 'smr', 'afb_disease', 'efb_disease',
    'chalkbrood_disease', 'nosemosis_disease', 'dwv_disease', 'iapv_cbpv_disease',
    'notes', 'image_url', 'weather_temp', 'weather_condition', 'weather_humidity',
    'weather_wind_speed', 'user_id'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'inspections'
        AND column_name = col
    ) THEN
      missing_columns := array_append(missing_columns, col);
      RAISE NOTICE '❌ Missing column: %', col;
    END IF;
  END LOOP;

  IF array_length(missing_columns, 1) IS NULL THEN
    RAISE NOTICE '✅ All frontend columns exist in database';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  MISSING COLUMNS: %', array_to_string(missing_columns, ', ');
  END IF;

  RAISE NOTICE '============================================';
END $$;
