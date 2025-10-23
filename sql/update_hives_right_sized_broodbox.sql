-- Update all hives to enable right_sized_broodbox in their configuration
-- This updates the JSONB configuration field to set right_sized_broodbox to true

-- For hives that already have a configuration object, update it
UPDATE hives
SET configuration = jsonb_set(
  COALESCE(configuration, '{}'::jsonb),
  '{right_sized_broodbox}',
  'true'::jsonb
)
WHERE configuration IS NOT NULL;

-- For hives with null configuration, create a new configuration object
UPDATE hives
SET configuration = jsonb_build_object(
  'brood_boxes', 1,
  'honey_supers', 0,
  'queen_excluder', false,
  'feeder', false,
  'feeder_type', '',
  'entrance_reducer', false,
  'varroa_mesh_floor', 'closed',
  'right_sized_broodbox', true
)
WHERE configuration IS NULL;

-- Verification query - check all hives and their right_sized_broodbox setting
SELECT
  id,
  hive_number,
  configuration->>'right_sized_broodbox' as right_sized_broodbox,
  configuration
FROM hives
ORDER BY hive_number;
