-- =====================================================
-- Verification Script for Tasks & Events Integration
-- =====================================================
-- This script verifies that the dashboard correctly displays
-- events from both rearing_batches and tasks_events tables

-- 1. Check that tasks_events table exists and has correct structure
SELECT
    'tasks_events table exists' as check_name,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'tasks_events'
        ) THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status;

-- 2. Check that RLS is enabled
SELECT
    'RLS enabled on tasks_events' as check_name,
    CASE
        WHEN rowsecurity = true THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status
FROM pg_tables
WHERE tablename = 'tasks_events';

-- 3. Check RLS policies exist
SELECT
    'RLS policies configured' as check_name,
    CASE
        WHEN COUNT(*) >= 4 THEN '✓ PASS (' || COUNT(*) || ' policies)'
        ELSE '✗ FAIL (only ' || COUNT(*) || ' policies)'
    END as status
FROM pg_policies
WHERE tablename = 'tasks_events';

-- 4. Show sample of upcoming queen rearing events (next 7 days)
SELECT
    '=== QUEEN REARING EVENTS (from rearing_batches) ===' as section,
    '' as batch_name,
    '' as event_type,
    NULL::date as event_date,
    NULL::int as days_until;

SELECT
    '' as section,
    batch_name,
    'Acceptance Check' as event_type,
    acceptance_check_date::date as event_date,
    (acceptance_check_date::date - CURRENT_DATE) as days_until
FROM rearing_batches
WHERE acceptance_check_date IS NOT NULL
    AND acceptance_check_date::date >= CURRENT_DATE
    AND acceptance_check_date::date <= CURRENT_DATE + INTERVAL '7 days'
    AND user_id = auth.uid()
UNION ALL
SELECT
    '' as section,
    batch_name,
    '1st Cage Option' as event_type,
    first_option_to_cage_date::date as event_date,
    (first_option_to_cage_date::date - CURRENT_DATE) as days_until
FROM rearing_batches
WHERE first_option_to_cage_date IS NOT NULL
    AND first_option_to_cage_date::date >= CURRENT_DATE
    AND first_option_to_cage_date::date <= CURRENT_DATE + INTERVAL '7 days'
    AND user_id = auth.uid()
UNION ALL
SELECT
    '' as section,
    batch_name,
    '2nd Cage Option' as event_type,
    second_option_to_cage_date::date as event_date,
    (second_option_to_cage_date::date - CURRENT_DATE) as days_until
FROM rearing_batches
WHERE second_option_to_cage_date IS NOT NULL
    AND second_option_to_cage_date::date >= CURRENT_DATE
    AND second_option_to_cage_date::date <= CURRENT_DATE + INTERVAL '7 days'
    AND user_id = auth.uid()
UNION ALL
SELECT
    '' as section,
    batch_name,
    'Expected Hatch' as event_type,
    emergence_date::date as event_date,
    (emergence_date::date - CURRENT_DATE) as days_until
FROM rearing_batches
WHERE emergence_date IS NOT NULL
    AND emergence_date::date >= CURRENT_DATE
    AND emergence_date::date <= CURRENT_DATE + INTERVAL '7 days'
    AND user_id = auth.uid()
ORDER BY event_date;

-- 5. Show sample of user tasks/events (next 7 days)
SELECT
    '=== USER TASKS & EVENTS (from tasks_events) ===' as section,
    '' as title,
    '' as event_type,
    '' as category,
    '' as priority,
    NULL::date as start_date,
    NULL::int as days_until,
    NULL::boolean as completed;

SELECT
    '' as section,
    title,
    event_type,
    COALESCE(category, 'none') as category,
    priority,
    start_date,
    (start_date::date - CURRENT_DATE) as days_until,
    completed
FROM tasks_events
WHERE start_date >= CURRENT_DATE
    AND start_date <= CURRENT_DATE + INTERVAL '7 days'
    AND user_id = auth.uid()
ORDER BY start_date, priority;

-- 6. Combined view (simulating what dashboard shows)
SELECT
    '=== COMBINED UPCOMING EVENTS (Dashboard View) ===' as section,
    '' as title,
    '' as source,
    '' as type,
    '' as category,
    NULL::date as date,
    NULL::int as days_until;

WITH queen_events AS (
    SELECT
        batch_name as title,
        'rearing_batches' as source,
        'Acceptance Check' as type,
        'queen_rearing' as category,
        acceptance_check_date::date as date,
        (acceptance_check_date::date - CURRENT_DATE) as days_until,
        0 as priority_order
    FROM rearing_batches
    WHERE acceptance_check_date IS NOT NULL
        AND acceptance_check_date::date >= CURRENT_DATE
        AND acceptance_check_date::date <= CURRENT_DATE + INTERVAL '7 days'
        AND user_id = auth.uid()
    UNION ALL
    SELECT
        batch_name,
        'rearing_batches',
        '1st Cage Option',
        'queen_rearing',
        first_option_to_cage_date::date,
        (first_option_to_cage_date::date - CURRENT_DATE),
        0
    FROM rearing_batches
    WHERE first_option_to_cage_date IS NOT NULL
        AND first_option_to_cage_date::date >= CURRENT_DATE
        AND first_option_to_cage_date::date <= CURRENT_DATE + INTERVAL '7 days'
        AND user_id = auth.uid()
    UNION ALL
    SELECT
        batch_name,
        'rearing_batches',
        '2nd Cage Option',
        'queen_rearing',
        second_option_to_cage_date::date,
        (second_option_to_cage_date::date - CURRENT_DATE),
        0
    FROM rearing_batches
    WHERE second_option_to_cage_date IS NOT NULL
        AND second_option_to_cage_date::date >= CURRENT_DATE
        AND second_option_to_cage_date::date <= CURRENT_DATE + INTERVAL '7 days'
        AND user_id = auth.uid()
    UNION ALL
    SELECT
        batch_name,
        'rearing_batches',
        'Expected Hatch',
        'queen_rearing',
        emergence_date::date,
        (emergence_date::date - CURRENT_DATE),
        0
    FROM rearing_batches
    WHERE emergence_date IS NOT NULL
        AND emergence_date::date >= CURRENT_DATE
        AND emergence_date::date <= CURRENT_DATE + INTERVAL '7 days'
        AND user_id = auth.uid()
),
user_events AS (
    SELECT
        title,
        'tasks_events' as source,
        event_type as type,
        COALESCE(category, 'general') as category,
        start_date as date,
        (start_date::date - CURRENT_DATE) as days_until,
        CASE
            WHEN priority = 'urgent' THEN 0
            WHEN priority = 'high' THEN 1
            WHEN priority = 'normal' THEN 2
            WHEN priority = 'low' THEN 3
            ELSE 4
        END as priority_order
    FROM tasks_events
    WHERE start_date >= CURRENT_DATE
        AND start_date <= CURRENT_DATE + INTERVAL '7 days'
        AND completed = false
        AND user_id = auth.uid()
)
SELECT
    '' as section,
    title,
    source,
    type,
    category,
    date,
    days_until
FROM (
    SELECT * FROM queen_events
    UNION ALL
    SELECT * FROM user_events
) combined
ORDER BY days_until, priority_order, title;

-- 7. Summary statistics
SELECT
    '=== SUMMARY ===' as section,
    '' as metric,
    NULL::bigint as count;

SELECT
    '' as section,
    'Queen rearing events (next 7 days)' as metric,
    COUNT(*) as count
FROM (
    SELECT acceptance_check_date::date as d FROM rearing_batches
    WHERE acceptance_check_date IS NOT NULL
        AND acceptance_check_date::date >= CURRENT_DATE
        AND acceptance_check_date::date <= CURRENT_DATE + INTERVAL '7 days'
        AND user_id = auth.uid()
    UNION ALL
    SELECT first_option_to_cage_date::date FROM rearing_batches
    WHERE first_option_to_cage_date IS NOT NULL
        AND first_option_to_cage_date::date >= CURRENT_DATE
        AND first_option_to_cage_date::date <= CURRENT_DATE + INTERVAL '7 days'
        AND user_id = auth.uid()
    UNION ALL
    SELECT second_option_to_cage_date::date FROM rearing_batches
    WHERE second_option_to_cage_date IS NOT NULL
        AND second_option_to_cage_date::date >= CURRENT_DATE
        AND second_option_to_cage_date::date <= CURRENT_DATE + INTERVAL '7 days'
        AND user_id = auth.uid()
    UNION ALL
    SELECT emergence_date::date FROM rearing_batches
    WHERE emergence_date IS NOT NULL
        AND emergence_date::date >= CURRENT_DATE
        AND emergence_date::date <= CURRENT_DATE + INTERVAL '7 days'
        AND user_id = auth.uid()
) events;

SELECT
    '' as section,
    'User tasks/events (next 7 days, active)' as metric,
    COUNT(*) as count
FROM tasks_events
WHERE start_date >= CURRENT_DATE
    AND start_date <= CURRENT_DATE + INTERVAL '7 days'
    AND completed = false
    AND user_id = auth.uid();

SELECT
    '' as section,
    'Total upcoming events' as metric,
    (
        (SELECT COUNT(*) FROM (
            SELECT acceptance_check_date::date as d FROM rearing_batches
            WHERE acceptance_check_date IS NOT NULL
                AND acceptance_check_date::date >= CURRENT_DATE
                AND acceptance_check_date::date <= CURRENT_DATE + INTERVAL '7 days'
                AND user_id = auth.uid()
            UNION ALL
            SELECT first_option_to_cage_date::date FROM rearing_batches
            WHERE first_option_to_cage_date IS NOT NULL
                AND first_option_to_cage_date::date >= CURRENT_DATE
                AND first_option_to_cage_date::date <= CURRENT_DATE + INTERVAL '7 days'
                AND user_id = auth.uid()
            UNION ALL
            SELECT second_option_to_cage_date::date FROM rearing_batches
            WHERE second_option_to_cage_date IS NOT NULL
                AND second_option_to_cage_date::date >= CURRENT_DATE
                AND second_option_to_cage_date::date <= CURRENT_DATE + INTERVAL '7 days'
                AND user_id = auth.uid()
            UNION ALL
            SELECT emergence_date::date FROM rearing_batches
            WHERE emergence_date IS NOT NULL
                AND emergence_date::date >= CURRENT_DATE
                AND emergence_date::date <= CURRENT_DATE + INTERVAL '7 days'
                AND user_id = auth.uid()
        ) events)
        +
        (SELECT COUNT(*) FROM tasks_events
        WHERE start_date >= CURRENT_DATE
            AND start_date <= CURRENT_DATE + INTERVAL '7 days'
            AND completed = false
            AND user_id = auth.uid())
    ) as count;
