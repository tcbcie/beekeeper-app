-- Fix right_sized_broodbox inconsistency
-- This script ensures right_sized_broodbox is ONLY stored in the configuration JSONB object
-- and removes the standalone column that was causing conflicts

-- STEP 1: Migrate any data from the standalone column into configuration JSONB
-- This ensures we don't lose any data before dropping the column
UPDATE hives
SET configuration = jsonb_set(
  COALESCE(configuration, '{}'::jsonb),
  '{right_sized_broodbox}',
  CASE
    WHEN right_sized_broodbox = true THEN 'true'::jsonb
    ELSE 'false'::jsonb
  END
)
WHERE right_sized_broodbox IS NOT NULL;

-- STEP 2: For any hives that don't have configuration.right_sized_broodbox set, default to false
UPDATE hives
SET configuration = jsonb_set(
  COALESCE(configuration, '{}'::jsonb),
  '{right_sized_broodbox}',
  'false'::jsonb
)
WHERE configuration->>'right_sized_broodbox' IS NULL;

-- STEP 3: Drop the standalone column to prevent future conflicts
ALTER TABLE hives
DROP COLUMN IF EXISTS right_sized_broodbox;

-- STEP 4: Verification - Check that all hives now have right_sized_broodbox in their configuration
SELECT
  hive_number,
  configuration->>'right_sized_broodbox' as right_sized_broodbox,
  configuration->'right_sized_broodbox' as raw_value,
  jsonb_typeof(configuration->'right_sized_broodbox') as value_type,
  configuration
FROM hives
ORDER BY hive_number;

-- STEP 5: Check for any NULL configurations (should be none after the updates)
SELECT COUNT(*) as hives_with_null_config
FROM hives
WHERE configuration IS NULL;

SELECT COUNT(*) as hives_with_right_sized_broodbox
FROM hives
WHERE configuration->>'right_sized_broodbox' IS NOT NULL;
