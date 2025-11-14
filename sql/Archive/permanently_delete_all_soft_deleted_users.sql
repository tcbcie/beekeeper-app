-- ============================================================================
-- PERMANENTLY DELETE ALL SOFT-DELETED USERS AND THEIR DATA
-- ============================================================================
-- ⚠️ WARNING: THIS IS IRREVERSIBLE! ⚠️
-- This script will PERMANENTLY DELETE:
-- - All soft-deleted users (deleted_at IS NOT NULL)
-- - ALL their beekeeping data (hives, inspections, queens, etc.)
-- - ALL their subscription history
-- - ALL their team memberships
-- - Auth accounts
-- ============================================================================
-- IMPORTANT: Review the list of users AND their data before proceeding!
-- ============================================================================

-- First, show what will be deleted
DO $$
DECLARE
  user_record RECORD;
  user_count INTEGER;
  total_hives INTEGER := 0;
  total_inspections INTEGER := 0;
  total_queens INTEGER := 0;
  total_apiaries INTEGER := 0;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '⚠️  DATA TO BE PERMANENTLY DELETED';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';

  -- Count users
  SELECT COUNT(*) INTO user_count
  FROM public.profiles
  WHERE deleted_at IS NOT NULL;

  IF user_count = 0 THEN
    RAISE NOTICE 'No soft-deleted users found. Nothing to delete.';
    RAISE NOTICE '============================================';
    RETURN;
  END IF;

  -- Get totals
  SELECT
    COALESCE(SUM((SELECT COUNT(*) FROM hives WHERE user_id = p.id)), 0),
    COALESCE(SUM((SELECT COUNT(*) FROM inspections WHERE user_id = p.id)), 0),
    COALESCE(SUM((SELECT COUNT(*) FROM queens WHERE user_id = p.id)), 0),
    COALESCE(SUM((SELECT COUNT(*) FROM apiaries WHERE user_id = p.id)), 0)
  INTO total_hives, total_inspections, total_queens, total_apiaries
  FROM profiles p
  WHERE p.deleted_at IS NOT NULL;

  RAISE NOTICE 'Found % soft-deleted user(s) with:', user_count;
  RAISE NOTICE '  Total apiaries: %', total_apiaries;
  RAISE NOTICE '  Total hives: %', total_hives;
  RAISE NOTICE '  Total inspections: %', total_inspections;
  RAISE NOTICE '  Total queens: %', total_queens;
  RAISE NOTICE '';

  -- List each user and their data
  FOR user_record IN
    SELECT
      p.id,
      COALESCE(p.original_email, p.email) as email,
      p.first_name,
      p.last_name,
      p.role,
      p.deleted_at,
      (SELECT COUNT(*) FROM apiaries WHERE user_id = p.id) as apiary_count,
      (SELECT COUNT(*) FROM hives WHERE user_id = p.id) as hive_count,
      (SELECT COUNT(*) FROM inspections WHERE user_id = p.id) as inspection_count,
      (SELECT COUNT(*) FROM queens WHERE user_id = p.id) as queen_count
    FROM public.profiles p
    WHERE p.deleted_at IS NOT NULL
    ORDER BY p.deleted_at DESC
  LOOP
    RAISE NOTICE 'User: % (% %)', user_record.email,
                 COALESCE(user_record.first_name, ''), COALESCE(user_record.last_name, '');
    RAISE NOTICE '  ID: %', user_record.id;
    RAISE NOTICE '  Role: %', user_record.role;
    RAISE NOTICE '  Deleted: %', user_record.deleted_at;
    RAISE NOTICE '  Data: % apiaries, % hives, % inspections, % queens',
                 user_record.apiary_count, user_record.hive_count,
                 user_record.inspection_count, user_record.queen_count;
    RAISE NOTICE '';
  END LOOP;

  RAISE NOTICE '============================================';
  RAISE NOTICE '⚠️  ALL DATA ABOVE WILL BE DELETED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  WARNING: This includes ALL beekeeping records!';
  RAISE NOTICE 'This deletion is permanent and cannot be undone.';
  RAISE NOTICE '';
  RAISE NOTICE 'To proceed, uncomment the deletion block below.';
  RAISE NOTICE '============================================';
END $$;

-- ============================================================================
-- DELETION BLOCK - DELETE ALL SOFT-DELETED USERS AND ALL THEIR DATA
-- ============================================================================
-- ⚠️ DELETION BLOCK IS NOW ACTIVE - THIS WILL DELETE ALL SOFT-DELETED USERS!
-- ============================================================================
DO $$
DECLARE
  user_id_to_delete UUID;
  row_count_temp INTEGER;
  deleted_users INTEGER := 0;
  deleted_hives INTEGER := 0;
  deleted_inspections INTEGER := 0;
  deleted_queens INTEGER := 0;
  deleted_apiaries INTEGER := 0;
  deleted_batches INTEGER := 0;
  deleted_varroa_checks INTEGER := 0;
  deleted_varroa_treatments INTEGER := 0;
  deleted_feedings INTEGER := 0;
  deleted_harvests INTEGER := 0;
  deleted_team_members INTEGER := 0;
  deleted_subscription_history INTEGER := 0;
  deleted_auth_users INTEGER := 0;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '🗑️  STARTING PERMANENT DELETION';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';

  -- Loop through each soft-deleted user
  FOR user_id_to_delete IN
    SELECT id FROM public.profiles WHERE deleted_at IS NOT NULL
  LOOP
    RAISE NOTICE 'Deleting all data for user: %', user_id_to_delete;

    -- Delete in order to respect foreign key constraints

    -- 1. Delete inspections (references hives)
    DELETE FROM public.inspections WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS row_count_temp = ROW_COUNT;
    deleted_inspections := deleted_inspections + row_count_temp;

    -- 2. Delete varroa checks
    DELETE FROM public.varroa_checks WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS row_count_temp = ROW_COUNT;
    deleted_varroa_checks := deleted_varroa_checks + row_count_temp;

    -- 3. Delete varroa treatments
    DELETE FROM public.varroa_treatments WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS row_count_temp = ROW_COUNT;
    deleted_varroa_treatments := deleted_varroa_treatments + row_count_temp;

    -- 4. Delete feedings
    DELETE FROM public.feedings WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS row_count_temp = ROW_COUNT;
    deleted_feedings := deleted_feedings + row_count_temp;

    -- 5. Delete harvests
    DELETE FROM public.harvests WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS row_count_temp = ROW_COUNT;
    deleted_harvests := deleted_harvests + row_count_temp;

    -- 6. Delete hives (must be after inspections, treatments, etc.)
    DELETE FROM public.hives WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS row_count_temp = ROW_COUNT;
    deleted_hives := deleted_hives + row_count_temp;

    -- 7. Delete queens
    DELETE FROM public.queens WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS row_count_temp = ROW_COUNT;
    deleted_queens := deleted_queens + row_count_temp;

    -- 8. Delete rearing batches
    DELETE FROM public.rearing_batches WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS row_count_temp = ROW_COUNT;
    deleted_batches := deleted_batches + row_count_temp;

    -- 9. Delete apiaries
    DELETE FROM public.apiaries WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS row_count_temp = ROW_COUNT;
    deleted_apiaries := deleted_apiaries + row_count_temp;

    -- 10. Delete team memberships
    DELETE FROM public.team_members WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS row_count_temp = ROW_COUNT;
    deleted_team_members := deleted_team_members + row_count_temp;

    -- 11. Delete subscription history
    DELETE FROM public.subscription_history WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS row_count_temp = ROW_COUNT;
    deleted_subscription_history := deleted_subscription_history + row_count_temp;

    -- 12. Delete profile
    DELETE FROM public.profiles WHERE id = user_id_to_delete;
    GET DIAGNOSTICS row_count_temp = ROW_COUNT;
    deleted_users := deleted_users + row_count_temp;

    -- 13. Delete auth user
    DELETE FROM auth.users WHERE id = user_id_to_delete;
    GET DIAGNOSTICS row_count_temp = ROW_COUNT;
    deleted_auth_users := deleted_auth_users + row_count_temp;

  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ PERMANENT DELETION COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  Users deleted: %', deleted_users;
  RAISE NOTICE '  Auth accounts deleted: %', deleted_auth_users;
  RAISE NOTICE '';
  RAISE NOTICE 'Beekeeping data deleted:';
  RAISE NOTICE '  Apiaries: %', deleted_apiaries;
  RAISE NOTICE '  Hives: %', deleted_hives;
  RAISE NOTICE '  Queens: %', deleted_queens;
  RAISE NOTICE '  Rearing batches: %', deleted_batches;
  RAISE NOTICE '  Inspections: %', deleted_inspections;
  RAISE NOTICE '  Varroa checks: %', deleted_varroa_checks;
  RAISE NOTICE '  Varroa treatments: %', deleted_varroa_treatments;
  RAISE NOTICE '  Feedings: %', deleted_feedings;
  RAISE NOTICE '  Harvests: %', deleted_harvests;
  RAISE NOTICE '';
  RAISE NOTICE 'Other data deleted:';
  RAISE NOTICE '  Team memberships: %', deleted_team_members;
  RAISE NOTICE '  Subscription history: %', deleted_subscription_history;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  THIS CANNOT BE UNDONE!';
  RAISE NOTICE 'All data has been permanently removed.';
  RAISE NOTICE '============================================';
END $$;

-- Verification (run after deletion)
SELECT
  'Soft-deleted users remaining' as category,
  COUNT(*) as count
FROM public.profiles
WHERE deleted_at IS NOT NULL;
