-- ============================================================================
-- CHECK FOREIGN KEY CONSTRAINTS
-- ============================================================================
-- Lists all foreign key constraints and their ON DELETE behavior
-- ============================================================================

-- Check all foreign key constraints in the database
SELECT
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  rc.update_rule,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND (
    ccu.table_name = 'profiles'  -- References to profiles
    OR tc.table_name IN (  -- Or these tables
      'subscription_history',
      'hives',
      'inspections',
      'apiaries',
      'colonies',
      'rearing_batches'
    )
  )
ORDER BY tc.table_name, tc.constraint_name;

-- Specifically check subscription_history constraints
SELECT
  'subscription_history' as table_name,
  constraint_name,
  pg_get_constraintdef(oid) as full_definition
FROM pg_constraint
WHERE conrelid = 'public.subscription_history'::regclass
  AND contype = 'f'
ORDER BY constraint_name;

-- Check what happens if we try to delete a specific user
-- (This won't actually delete, just shows what would be affected)
DO $$
DECLARE
  test_user_id UUID;
  sub_count INTEGER;
  hive_count INTEGER;
  inspection_count INTEGER;
BEGIN
  -- Get a user with subscription history
  SELECT id INTO test_user_id
  FROM profiles
  WHERE email = 'rickneefe65@gmail.com'
  LIMIT 1;

  IF test_user_id IS NULL THEN
    RAISE NOTICE 'Test user not found';
    RETURN;
  END IF;

  -- Count related records
  SELECT COUNT(*) INTO sub_count
  FROM subscription_history
  WHERE user_id = test_user_id;

  SELECT COUNT(*) INTO hive_count
  FROM hives
  WHERE user_id = test_user_id;

  SELECT COUNT(*) INTO inspection_count
  FROM inspections
  WHERE user_id = test_user_id;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'DELETION IMPACT FOR USER: %', test_user_id;
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Subscription history records: %', sub_count;
  RAISE NOTICE 'Hives: %', hive_count;
  RAISE NOTICE 'Inspections: %', inspection_count;
  RAISE NOTICE '';
  IF sub_count > 0 THEN
    RAISE NOTICE '⚠️  CANNOT DELETE: User has subscription history!';
    RAISE NOTICE 'Foreign key constraint will prevent deletion.';
  ELSE
    RAISE NOTICE '✓ Can delete: No subscription history found.';
  END IF;
  RAISE NOTICE '============================================';
END $$;
