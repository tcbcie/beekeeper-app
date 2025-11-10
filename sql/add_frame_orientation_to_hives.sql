-- ============================================================================
-- ADD FRAME ORIENTATION TO HIVE CONFIGURATION
-- ============================================================================
-- Adds frame_orientation field to track whether frames are oriented warm way
-- (parallel to entrance) or cold way (perpendicular to entrance)
-- ============================================================================

-- The configuration column is JSONB, so we don't need to add a column
-- We just need to document the new field for reference

-- Frame orientation options:
-- 'warm' - Warm way: frames/comb parallel to the entrance
-- 'cold' - Cold way: frames/comb perpendicular to the entrance
-- null - Not specified

-- Example query to set frame orientation for a hive:
-- UPDATE hives
-- SET configuration = jsonb_set(
--   COALESCE(configuration, '{}'::jsonb),
--   '{frame_orientation}',
--   '"warm"'
-- )
-- WHERE id = 'your-hive-id';

-- Example query to get hives with specific frame orientation:
-- SELECT id, hive_number, configuration->>'frame_orientation' as frame_orientation
-- FROM hives
-- WHERE configuration->>'frame_orientation' = 'warm';

-- Verification message
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ FRAME ORIENTATION FIELD DOCUMENTED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Field: configuration.frame_orientation';
  RAISE NOTICE 'Type: TEXT (stored in JSONB)';
  RAISE NOTICE 'Values: ''warm'', ''cold'', or null';
  RAISE NOTICE '';
  RAISE NOTICE 'Warm Way: Frames parallel to entrance';
  RAISE NOTICE 'Cold Way: Frames perpendicular to entrance';
  RAISE NOTICE '';
  RAISE NOTICE 'This field is now part of hive configuration';
  RAISE NOTICE 'and can be set when creating or editing hives.';
  RAISE NOTICE '============================================';
END $$;
