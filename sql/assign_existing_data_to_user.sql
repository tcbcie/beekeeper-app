-- Script to assign all existing data to a specific user
-- Replace the user_id value with your actual user ID from Supabase Dashboard → Authentication → Users
-- Date: 2025-10-21

-- Your user ID (update this value)
-- Get your user ID from: Supabase Dashboard → Authentication → Users → Copy user ID
DO $$
DECLARE
    target_user_id UUID := '08e38bd9-30b0-4183-92c2-fc3b7600a46a';
BEGIN
    -- Update apiaries
    UPDATE apiaries
    SET user_id = target_user_id
    WHERE user_id IS NULL;

    RAISE NOTICE 'Updated % apiaries', (SELECT COUNT(*) FROM apiaries WHERE user_id = target_user_id);

    -- Update hives
    UPDATE hives
    SET user_id = target_user_id
    WHERE user_id IS NULL;

    RAISE NOTICE 'Updated % hives', (SELECT COUNT(*) FROM hives WHERE user_id = target_user_id);

    -- Update queens
    UPDATE queens
    SET user_id = target_user_id
    WHERE user_id IS NULL;

    RAISE NOTICE 'Updated % queens', (SELECT COUNT(*) FROM queens WHERE user_id = target_user_id);

    -- Update inspections
    UPDATE inspections
    SET user_id = target_user_id
    WHERE user_id IS NULL;

    RAISE NOTICE 'Updated % inspections', (SELECT COUNT(*) FROM inspections WHERE user_id = target_user_id);

    -- Update varroa_checks
    UPDATE varroa_checks
    SET user_id = target_user_id
    WHERE user_id IS NULL;

    RAISE NOTICE 'Updated % varroa_checks', (SELECT COUNT(*) FROM varroa_checks WHERE user_id = target_user_id);

    -- Update varroa_treatments
    UPDATE varroa_treatments
    SET user_id = target_user_id
    WHERE user_id IS NULL;

    RAISE NOTICE 'Updated % varroa_treatments', (SELECT COUNT(*) FROM varroa_treatments WHERE user_id = target_user_id);

    -- Update feedings
    UPDATE feedings
    SET user_id = target_user_id
    WHERE user_id IS NULL;

    RAISE NOTICE 'Updated % feedings', (SELECT COUNT(*) FROM feedings WHERE user_id = target_user_id);

    -- Update harvests
    UPDATE harvests
    SET user_id = target_user_id
    WHERE user_id IS NULL;

    RAISE NOTICE 'Updated % harvests', (SELECT COUNT(*) FROM harvests WHERE user_id = target_user_id);

    -- Update rearing_batches
    UPDATE rearing_batches
    SET user_id = target_user_id
    WHERE user_id IS NULL;

    RAISE NOTICE 'Updated % rearing_batches', (SELECT COUNT(*) FROM rearing_batches WHERE user_id = target_user_id);

    RAISE NOTICE 'All existing data has been assigned to user: %', target_user_id;
END $$;

-- Verify the updates
SELECT
    'apiaries' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE user_id = '08e38bd9-30b0-4183-92c2-fc3b7600a46a') as assigned_to_user,
    COUNT(*) FILTER (WHERE user_id IS NULL) as unassigned
FROM apiaries
UNION ALL
SELECT
    'hives',
    COUNT(*),
    COUNT(*) FILTER (WHERE user_id = '08e38bd9-30b0-4183-92c2-fc3b7600a46a'),
    COUNT(*) FILTER (WHERE user_id IS NULL)
FROM hives
UNION ALL
SELECT
    'queens',
    COUNT(*),
    COUNT(*) FILTER (WHERE user_id = '08e38bd9-30b0-4183-92c2-fc3b7600a46a'),
    COUNT(*) FILTER (WHERE user_id IS NULL)
FROM queens
UNION ALL
SELECT
    'inspections',
    COUNT(*),
    COUNT(*) FILTER (WHERE user_id = '08e38bd9-30b0-4183-92c2-fc3b7600a46a'),
    COUNT(*) FILTER (WHERE user_id IS NULL)
FROM inspections
UNION ALL
SELECT
    'varroa_checks',
    COUNT(*),
    COUNT(*) FILTER (WHERE user_id = '08e38bd9-30b0-4183-92c2-fc3b7600a46a'),
    COUNT(*) FILTER (WHERE user_id IS NULL)
FROM varroa_checks
UNION ALL
SELECT
    'varroa_treatments',
    COUNT(*),
    COUNT(*) FILTER (WHERE user_id = '08e38bd9-30b0-4183-92c2-fc3b7600a46a'),
    COUNT(*) FILTER (WHERE user_id IS NULL)
FROM varroa_treatments
UNION ALL
SELECT
    'feedings',
    COUNT(*),
    COUNT(*) FILTER (WHERE user_id = '08e38bd9-30b0-4183-92c2-fc3b7600a46a'),
    COUNT(*) FILTER (WHERE user_id IS NULL)
FROM feedings
UNION ALL
SELECT
    'harvests',
    COUNT(*),
    COUNT(*) FILTER (WHERE user_id = '08e38bd9-30b0-4183-92c2-fc3b7600a46a'),
    COUNT(*) FILTER (WHERE user_id IS NULL)
FROM harvests
UNION ALL
SELECT
    'rearing_batches',
    COUNT(*),
    COUNT(*) FILTER (WHERE user_id = '08e38bd9-30b0-4183-92c2-fc3b7600a46a'),
    COUNT(*) FILTER (WHERE user_id IS NULL)
FROM rearing_batches
ORDER BY table_name;
