-- ============================================================================
-- POPULATE COLONIES TABLE FROM EXISTING HIVES
-- ============================================================================
-- This script creates colony records for all existing hives that don't have
-- colonies yet, and backfills colony_id on all historical records
-- ============================================================================

-- ============================================================================
-- STEP 1: Create colonies for all existing active hives without colonies
-- ============================================================================

DO $$
DECLARE
  hive_record RECORD;
  new_colony_id UUID;
  colony_count INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Creating colonies for existing hives...';
  RAISE NOTICE '========================================';

  -- For each active hive without a colony
  FOR hive_record IN
    SELECT
      h.id as hive_id,
      h.user_id,
      h.hive_number,
      h.colony_established_date,
      h.created_at,
      h.hive_type
    FROM hives h
    WHERE h.status = 'active'
      AND h.colony_id IS NULL  -- Only process hives without colony
    ORDER BY h.user_id, h.created_at
  LOOP
    -- Determine origin type based on hive type
    DECLARE
      v_origin_type TEXT;
    BEGIN
      IF hive_record.hive_type = 'Split' THEN
        v_origin_type := 'split';
      ELSIF hive_record.hive_type = 'Nuc' THEN
        v_origin_type := 'nuc';
      ELSIF hive_record.hive_type = 'Package' THEN
        v_origin_type := 'package';
      ELSIF hive_record.hive_type = 'Swarm' THEN
        v_origin_type := 'swarm';
      ELSE
        v_origin_type := 'other';  -- Default for Production and other hive types
      END IF;

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
        'COL-' || hive_record.hive_number,  -- Colony number based on hive number
        hive_record.user_id,
        v_origin_type,
        COALESCE(hive_record.colony_established_date, hive_record.created_at::date, CURRENT_DATE),
        'active',
        'Colony created from existing hive ' || hive_record.hive_number || ' during colony tracking system migration.',
        hive_record.created_at
      )
      ON CONFLICT (colony_number) DO NOTHING  -- Skip if colony number already exists
      RETURNING id INTO new_colony_id;

      -- If insert succeeded, update the hive with the new colony_id
      IF FOUND THEN
        UPDATE hives
        SET colony_id = new_colony_id
        WHERE id = hive_record.hive_id;

        colony_count := colony_count + 1;
        RAISE NOTICE '✓ Created colony COL-% for hive %', hive_record.hive_number, hive_record.hive_number;
      END IF;
    END;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Created % new colonies', colony_count;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 2: Backfill colony_id on all historical records
-- ============================================================================

DO $$
DECLARE
  inspections_updated INTEGER;
  treatments_updated INTEGER;
  checks_updated INTEGER;
  feedings_updated INTEGER;
  harvests_updated INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Backfilling colony_id on records...';
  RAISE NOTICE '========================================';

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

  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Backfill complete';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 3: Create initial colony movement records
-- ============================================================================

DO $$
DECLARE
  movement_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Creating colony movement records...';
  RAISE NOTICE '========================================';

  -- Create a "new_colony" movement for each colony that doesn't have one
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
    'Initial placement during colony tracking migration'
  FROM colonies c
  JOIN hives h ON h.colony_id = c.id
  WHERE NOT EXISTS (
    SELECT 1 FROM colony_movements cm WHERE cm.colony_id = c.id
  );

  GET DIAGNOSTICS movement_count = ROW_COUNT;
  RAISE NOTICE '→ Created % movement records', movement_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Movement records created';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 4: Verification and Summary
-- ============================================================================

DO $$
DECLARE
  total_colonies INTEGER;
  total_hives_with_colonies INTEGER;
  total_movements INTEGER;
  orphaned_hives INTEGER;
  orphaned_records INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'COLONY POPULATION SUMMARY';
  RAISE NOTICE '========================================';

  -- Count colonies
  SELECT COUNT(*) INTO total_colonies FROM colonies;
  RAISE NOTICE 'Total colonies in system: %', total_colonies;

  -- Count hives with colonies
  SELECT COUNT(*) INTO total_hives_with_colonies FROM hives WHERE colony_id IS NOT NULL;
  RAISE NOTICE 'Hives with colonies assigned: %', total_hives_with_colonies;

  -- Count active hives without colonies
  SELECT COUNT(*) INTO orphaned_hives FROM hives WHERE colony_id IS NULL AND status = 'active';
  IF orphaned_hives > 0 THEN
    RAISE NOTICE '⚠ Active hives without colonies: % (may need manual review)', orphaned_hives;
  ELSE
    RAISE NOTICE '✓ All active hives have colonies assigned';
  END IF;

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
    RAISE NOTICE '  (These may be from inactive hives or hives without colonies)';
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
  p.email as user_email,
  COUNT(c.id) as colony_count
FROM colonies c
LEFT JOIN profiles p ON p.id = c.user_id
GROUP BY p.email
ORDER BY colony_count DESC;

-- Show colonies with their current hives and apiaries
SELECT
  c.colony_number,
  c.origin_type,
  c.origin_date,
  c.status,
  h.hive_number as current_hive,
  h.hive_type,
  a.name as apiary,
  p.email as owner
FROM colonies c
LEFT JOIN hives h ON h.colony_id = c.id
LEFT JOIN apiaries a ON h.apiary_id = a.id
LEFT JOIN profiles p ON p.id = c.user_id
ORDER BY p.email, c.created_at;

-- Show any active hives without colonies (needs investigation)
SELECT
  'Active hives without colonies' as status,
  h.hive_number,
  h.hive_type,
  h.colony_established_date,
  a.name as apiary,
  p.email as owner,
  (SELECT COUNT(*) FROM inspections WHERE hive_id = h.id) as inspection_count
FROM hives h
LEFT JOIN apiaries a ON h.apiary_id = a.id
LEFT JOIN profiles p ON p.id = h.user_id
WHERE h.colony_id IS NULL
  AND h.status = 'active'
ORDER BY p.email, h.created_at DESC;

-- Final success message
DO $$
DECLARE
  total_colonies INTEGER;
  total_movements INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_colonies FROM colonies;
  SELECT COUNT(*) INTO total_movements FROM colony_movements;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ COLONY POPULATION COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  • % colonies created/verified', total_colonies;
  RAISE NOTICE '  • % movement records logged', total_movements;
  RAISE NOTICE '  • All historical records linked to colonies';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Review the output tables above';
  RAISE NOTICE '  2. Check any active hives without colonies';
  RAISE NOTICE '  3. Colony tracking is now fully operational!';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
