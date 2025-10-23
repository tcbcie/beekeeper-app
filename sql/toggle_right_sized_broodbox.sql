-- Toggle right_sized_broodbox for specific hives
-- This script provides examples for enabling/disabling the feature

-- EXAMPLE 1: Enable right_sized_broodbox for a specific hive by hive_number
-- Replace 'H001' with your actual hive number
/*
UPDATE hives
SET configuration = jsonb_set(
  COALESCE(configuration, '{}'::jsonb),
  '{right_sized_broodbox}',
  'true'::jsonb
)
WHERE hive_number = 'H001';
*/

-- EXAMPLE 2: Disable right_sized_broodbox for a specific hive by hive_number
-- Replace 'H002' with your actual hive number
/*
UPDATE hives
SET configuration = jsonb_set(
  COALESCE(configuration, '{}'::jsonb),
  '{right_sized_broodbox}',
  'false'::jsonb
)
WHERE hive_number = 'H002';
*/

-- EXAMPLE 3: Enable for ALL hives
UPDATE hives
SET configuration = jsonb_set(
  COALESCE(configuration, '{}'::jsonb),
  '{right_sized_broodbox}',
  'true'::jsonb
);

-- EXAMPLE 4: Disable for ALL hives
/*
UPDATE hives
SET configuration = jsonb_set(
  COALESCE(configuration, '{}'::jsonb),
  '{right_sized_broodbox}',
  'false'::jsonb
);
*/

-- Verification query - check all hives and their right_sized_broodbox setting
SELECT
  hive_number,
  configuration->>'right_sized_broodbox' as right_sized_enabled,
  configuration
FROM hives
ORDER BY hive_number;
