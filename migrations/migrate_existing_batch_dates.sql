-- =====================================================
-- Migrate Existing Batch Dates to Tasks
-- Created: November 6, 2025
-- =====================================================
-- This script migrates all existing queen rearing batch dates
-- to the tasks_events table as events

-- Insert all acceptance check dates
INSERT INTO tasks_events (
  user_id,
  title,
  description,
  event_type,
  category,
  priority,
  start_date,
  all_day,
  batch_id,
  completed
)
SELECT
  user_id,
  'Acceptance Check: ' || batch_name as title,
  'Check larvae acceptance for batch ' || batch_name || '. Grafted on ' || graft_date::text || '.' as description,
  'event' as event_type,
  'queen_rearing' as category,
  'high' as priority,
  acceptance_check_date::date as start_date,
  true as all_day,
  id as batch_id,
  false as completed
FROM rearing_batches
WHERE acceptance_check_date IS NOT NULL
  -- Avoid duplicates: only insert if event doesn't already exist
  AND NOT EXISTS (
    SELECT 1 FROM tasks_events
    WHERE batch_id = rearing_batches.id
      AND title = 'Acceptance Check: ' || rearing_batches.batch_name
  );

-- Insert all first cage dates
INSERT INTO tasks_events (
  user_id,
  title,
  description,
  event_type,
  category,
  priority,
  start_date,
  all_day,
  batch_id,
  completed
)
SELECT
  user_id,
  '1st Cage Option: ' || batch_name as title,
  'First option to cage queen cells for batch ' || batch_name || '.' as description,
  'event' as event_type,
  'queen_rearing' as category,
  'high' as priority,
  first_option_to_cage_date::date as start_date,
  true as all_day,
  id as batch_id,
  false as completed
FROM rearing_batches
WHERE first_option_to_cage_date IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tasks_events
    WHERE batch_id = rearing_batches.id
      AND title = '1st Cage Option: ' || rearing_batches.batch_name
  );

-- Insert all second cage dates
INSERT INTO tasks_events (
  user_id,
  title,
  description,
  event_type,
  category,
  priority,
  start_date,
  all_day,
  batch_id,
  completed
)
SELECT
  user_id,
  '2nd Cage Option: ' || batch_name as title,
  'Second option to cage queen cells for batch ' || batch_name || '.' as description,
  'event' as event_type,
  'queen_rearing' as category,
  'high' as priority,
  second_option_to_cage_date::date as start_date,
  true as all_day,
  id as batch_id,
  false as completed
FROM rearing_batches
WHERE second_option_to_cage_date IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tasks_events
    WHERE batch_id = rearing_batches.id
      AND title = '2nd Cage Option: ' || rearing_batches.batch_name
  );

-- Insert all emergence dates
INSERT INTO tasks_events (
  user_id,
  title,
  description,
  event_type,
  category,
  priority,
  start_date,
  all_day,
  batch_id,
  completed
)
SELECT
  user_id,
  'Expected Emergence: ' || batch_name as title,
  'Expected emergence date for queens in batch ' || batch_name || '.' as description,
  'event' as event_type,
  'queen_rearing' as category,
  'normal' as priority,
  emergence_date::date as start_date,
  true as all_day,
  id as batch_id,
  false as completed
FROM rearing_batches
WHERE emergence_date IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tasks_events
    WHERE batch_id = rearing_batches.id
      AND title = 'Expected Emergence: ' || rearing_batches.batch_name
  );

-- Show results
SELECT
  'Migration complete' as status,
  COUNT(*) as total_events_created
FROM tasks_events
WHERE category = 'queen_rearing'
  AND batch_id IS NOT NULL;

-- Show breakdown by event type
SELECT
  CASE
    WHEN title LIKE 'Acceptance Check:%' THEN 'Acceptance Checks'
    WHEN title LIKE '1st Cage Option:%' THEN '1st Cage Options'
    WHEN title LIKE '2nd Cage Option:%' THEN '2nd Cage Options'
    WHEN title LIKE 'Expected Emergence:%' THEN 'Emergence Dates'
    ELSE 'Other'
  END as event_type,
  COUNT(*) as count
FROM tasks_events
WHERE category = 'queen_rearing'
  AND batch_id IS NOT NULL
GROUP BY
  CASE
    WHEN title LIKE 'Acceptance Check:%' THEN 'Acceptance Checks'
    WHEN title LIKE '1st Cage Option:%' THEN '1st Cage Options'
    WHEN title LIKE '2nd Cage Option:%' THEN '2nd Cage Options'
    WHEN title LIKE 'Expected Emergence:%' THEN 'Emergence Dates'
    ELSE 'Other'
  END
ORDER BY count DESC;
