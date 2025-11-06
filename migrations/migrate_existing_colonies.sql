-- =====================================================
-- Migrate Existing Hives to Colony Tracking System
-- Created: November 6, 2025
-- =====================================================
-- This script creates colony records for all existing hives
-- and backfills colony_id on historical records.
--
-- IMPORTANT: Run create_colony_tracking.sql FIRST!

-- =====================================================
-- PART 1: Create colonies for all existing active hives
-- =====================================================

DO $$
DECLARE
  hive_record RECORD;
  colony_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting colony migration...';

  -- For each active hive, create a corresponding colony
  FOR hive_record IN
    SELECT
      h.id as hive_id,
      h.user_id,
      h.hive_number,
      h.colony_established_date,
      h.created_at,
      h.queen_id
    FROM hives h
    WHERE h.status = 'active'
      AND h.colony_id IS NULL  -- Only process hives without colony already
    ORDER BY h.created_at
  LOOP
    -- Create colony for this hive
    INSERT INTO colonies (
      colony_number,
      user_id,
      origin_type,
      origin_date,
      status,
      notes,
      created_at
    ) VALUES (
      'COL-' || hive_record.hive_number,  -- Use hive number as basis for colony number
      hive_record.user_id,
      'other',  -- We don't know the actual origin, mark as 'other'
      COALESCE(hive_record.colony_established_date, hive_record.created_at::date, CURRENT_DATE),
      'active',
      'Colony auto-created from existing hive ' || hive_record.hive_number || ' during migration to colony tracking system.',
      hive_record.created_at
    )
    ON CONFLICT (colony_number) DO NOTHING  -- Skip if colony number already exists
    RETURNING id INTO hive_record;

    -- If insert succeeded, update the hive with the new colony_id
    IF FOUND THEN
      UPDATE hives
      SET colony_id = (
        SELECT id FROM colonies WHERE colony_number = 'COL-' || hive_record.hive_number
      )
      WHERE id = hive_record.hive_id;

      colony_count := colony_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '✓ Created % colonies from active hives', colony_count;
END $$;

-- =====================================================
-- PART 2: Backfill colony_id on historical records
-- =====================================================

DO $$
DECLARE
  inspections_updated INTEGER;
  treatments_updated INTEGER;
  checks_updated INTEGER;
  feedings_updated INTEGER;
  harvests_updated INTEGER;
BEGIN
  RAISE NOTICE 'Backfilling colony_id on historical records...';

  -- Update inspections
  UPDATE inspections i
  SET colony_id = h.colony_id
  FROM hives h
  WHERE i.hive_id = h.id
    AND h.colony_id IS NOT NULL
    AND i.colony_id IS NULL;

  GET DIAGNOSTICS inspections_updated = ROW_COUNT;
  RAISE NOTICE '→ Updated % inspection records', inspections_updated;

  -- Update varroa_treatments
  UPDATE varroa_treatments vt
  SET colony_id = h.colony_id
  FROM hives h
  WHERE vt.hive_id = h.id
    AND h.colony_id IS NOT NULL
    AND vt.colony_id IS NULL;

  GET DIAGNOSTICS treatments_updated = ROW_COUNT;
  RAISE NOTICE '→ Updated % varroa treatment records', treatments_updated;

  -- Update varroa_checks
  UPDATE varroa_checks vc
  SET colony_id = h.colony_id
  FROM hives h
  WHERE vc.hive_id = h.id
    AND h.colony_id IS NOT NULL
    AND vc.colony_id IS NULL;

  GET DIAGNOSTICS checks_updated = ROW_COUNT;
  RAISE NOTICE '→ Updated % varroa check records', checks_updated;

  -- Update feedings
  UPDATE feedings f
  SET colony_id = h.colony_id
  FROM hives h
  WHERE f.hive_id = h.id
    AND h.colony_id IS NOT NULL
    AND f.colony_id IS NULL;

  GET DIAGNOSTICS feedings_updated = ROW_COUNT;
  RAISE NOTICE '→ Updated % feeding records', feedings_updated;

  -- Update harvests
  UPDATE harvests ha
  SET colony_id = h.colony_id
  FROM hives h
  WHERE ha.hive_id = h.id
    AND h.colony_id IS NOT NULL
    AND ha.colony_id IS NULL;

  GET DIAGNOSTICS harvests_updated = ROW_COUNT;
  RAISE NOTICE '→ Updated % harvest records', harvests_updated;

  RAISE NOTICE '✓ Backfill complete';
END $$;

-- =====================================================
-- PART 3: Create initial colony movement records
-- =====================================================

DO $$
DECLARE
  movement_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Creating initial colony movement records...';

  -- Create a "new_colony" movement for each colony
  INSERT INTO colony_movements (
    colony_id,
    user_id,
    to_hive_id,
    movement_date,
    movement_type,
    notes
  )
  SELECT
    c.id,
    c.user_id,
    h.id,
    c.origin_date,
    'new_colony',
    'Initial placement (migrated from legacy data)'
  FROM colonies c
  JOIN hives h ON h.colony_id = c.id
  WHERE NOT EXISTS (
    SELECT 1 FROM colony_movements cm WHERE cm.colony_id = c.id
  );

  GET DIAGNOSTICS movement_count = ROW_COUNT;
  RAISE NOTICE '→ Created % movement records', movement_count;
  RAISE NOTICE '✓ Movement records created';
END $$;

-- =====================================================
-- PART 4: Verification queries
-- =====================================================

-- Show summary of migration
DO $$
DECLARE
  total_colonies INTEGER;
  total_hives_with_colonies INTEGER;
  total_movements INTEGER;
  orphaned_records INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION SUMMARY';
  RAISE NOTICE '========================================';

  -- Count colonies
  SELECT COUNT(*) INTO total_colonies FROM colonies;
  RAISE NOTICE 'Total colonies created: %', total_colonies;

  -- Count hives with colonies
  SELECT COUNT(*) INTO total_hives_with_colonies FROM hives WHERE colony_id IS NOT NULL;
  RAISE NOTICE 'Hives with colonies assigned: %', total_hives_with_colonies;

  -- Count movements
  SELECT COUNT(*) INTO total_movements FROM colony_movements;
  RAISE NOTICE 'Colony movements tracked: %', total_movements;

  -- Check for orphaned records (records without colony_id)
  SELECT
    COUNT(*) INTO orphaned_records
  FROM (
    SELECT hive_id FROM inspections WHERE colony_id IS NULL
    UNION ALL
    SELECT hive_id FROM varroa_treatments WHERE colony_id IS NULL
    UNION ALL
    SELECT hive_id FROM varroa_checks WHERE colony_id IS NULL
    UNION ALL
    SELECT hive_id FROM feedings WHERE colony_id IS NULL
    UNION ALL
    SELECT hive_id FROM harvests WHERE colony_id IS NULL
  ) orphans;

  IF orphaned_records > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠ WARNING: % records without colony_id', orphaned_records;
    RAISE NOTICE 'These may be from inactive hives or hives without colonies.';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✓ All records have colony_id assigned';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Show breakdown by user
SELECT
  'Colonies per user' as metric,
  user_id,
  COUNT(*) as count
FROM colonies
GROUP BY user_id
ORDER BY count DESC;

-- Show colonies with their current hives
SELECT
  c.colony_number,
  c.origin_type,
  c.origin_date,
  c.status,
  h.hive_number as current_hive,
  a.name as apiary
FROM colonies c
LEFT JOIN hives h ON h.colony_id = c.id
LEFT JOIN apiaries a ON h.apiary_id = a.id
ORDER BY c.user_id, c.created_at;

-- Show any hives without colonies (should investigate these)
SELECT
  h.hive_number,
  h.status,
  h.colony_established_date,
  a.name as apiary,
  (SELECT COUNT(*) FROM inspections WHERE hive_id = h.id) as inspection_count
FROM hives h
LEFT JOIN apiaries a ON h.apiary_id = a.id
WHERE h.colony_id IS NULL
ORDER BY h.created_at DESC;

-- Final message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Review the summary above';
  RAISE NOTICE '2. Check any hives without colonies';
  RAISE NOTICE '3. Update frontend code to use colony tracking';
  RAISE NOTICE '4. Test colony movement functionality';
  RAISE NOTICE '';
END $$;
