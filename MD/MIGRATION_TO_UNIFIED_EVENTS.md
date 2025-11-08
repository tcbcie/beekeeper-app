# Migration to Unified Events System

## Overview

This migration consolidates all events into the `tasks_events` table as the single source of truth. Queen rearing batch dates will automatically create events via database triggers.

## What Changed

### Before
- Queen rearing dates stored in `rearing_batches` table
- Dashboard read from both `rearing_batches` and `tasks_events`
- Batch events couldn't be edited independently

### After
- All events stored in `tasks_events` table (single source of truth)
- Batch dates still exist in `rearing_batches` for batch management
- Database triggers automatically create/update events when batch dates change
- Dashboard reads only from `tasks_events`
- Users can edit all events from Tasks & Events page

## Benefits

✅ **Unified Management** - All events editable from one place
✅ **Automatic Sync** - Batch date changes automatically update events
✅ **No Duplication** - Single source of truth for event display
✅ **Better UX** - Users can modify any event as needed
✅ **Future-Ready** - Prepared for Google Calendar integration

## Migration Steps

### Step 1: Run Trigger Creation Script

This creates database triggers that automatically sync batch dates to events.

**In Supabase SQL Editor:**
1. Open SQL Editor
2. Copy contents of `migrations/create_batch_events_trigger.sql`
3. Run the script
4. Verify success (should see "CREATE FUNCTION" and "CREATE TRIGGER" messages)

**What it does:**
- Creates `sync_batch_dates_to_tasks()` function
- Creates trigger on `rearing_batches` INSERT/UPDATE
- Creates `cleanup_batch_events()` function
- Creates trigger on `rearing_batches` DELETE

### Step 2: Migrate Existing Batch Dates

This one-time script converts all existing batch dates to events.

**In Supabase SQL Editor:**
1. Open a new query
2. Copy contents of `migrations/migrate_existing_batch_dates.sql`
3. Run the script
4. Review the output showing how many events were created

**What it creates:**
- "Acceptance Check: [Batch Name]" events
- "1st Cage Option: [Batch Name]" events
- "2nd Cage Option: [Batch Name]" events
- "Expected Emergence: [Batch Name]" events

**Safety:** The script includes duplicate checks, so it's safe to run multiple times.

### Step 3: Verify Migration

**Check events were created:**
```sql
-- See all batch-related events
SELECT
  title,
  category,
  priority,
  start_date,
  batch_id
FROM tasks_events
WHERE category = 'queen_rearing'
  AND batch_id IS NOT NULL
ORDER BY start_date;
```

**Check trigger is working:**
```sql
-- This should show the trigger exists
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'sync_batch_dates_trigger';
```

### Step 4: Test the Integration

#### Test 1: Create New Batch
1. Navigate to `/dashboard/batches`
2. Click "Add Batch"
3. Fill in batch details with dates within next 7 days
4. Save the batch
5. Navigate to `/dashboard`
6. **Expected:** Events appear in "Upcoming Events" widget
7. Navigate to `/dashboard/tasks`
8. **Expected:** Batch events appear in the list

#### Test 2: Edit Batch Date
1. Navigate to `/dashboard/batches`
2. Edit an existing batch
3. Change the `acceptance_check_date` to a different date
4. Save changes
5. Navigate to `/dashboard/tasks`
6. **Expected:** Event date is automatically updated

#### Test 3: Edit Event from Tasks Page
1. Navigate to `/dashboard/tasks`
2. Find a queen rearing event
3. Click edit
4. Change the start date or add notes
5. Save changes
6. Return to dashboard
7. **Expected:** Updated event shows with new date/details

#### Test 4: Delete Batch
1. Navigate to `/dashboard/batches`
2. Delete a batch
3. Navigate to `/dashboard/tasks`
4. **Expected:** Associated events are automatically removed

### Step 5: Deploy Frontend Changes

The frontend has been updated to read only from `tasks_events`.

**Files changed:**
- `src/components/UpcomingEvents.tsx` - Now reads only from tasks_events

**Deploy:**
```bash
git pull origin main
npm install
npm run build
```

Or if using Vercel/similar, push will auto-deploy.

## How It Works

### Automatic Event Creation

When you create or update a batch with dates:

```
User creates/updates batch
       ↓
Batch saved to rearing_batches
       ↓
Trigger fires: sync_batch_dates_to_tasks()
       ↓
Events created/updated in tasks_events
       ↓
Dashboard displays events
```

### Event Naming Convention

Events are automatically named and categorized:
- **Title:** `[Event Type]: [Batch Name]`
  - "Acceptance Check: Spring Batch 2025"
  - "1st Cage Option: Spring Batch 2025"
  - "2nd Cage Option: Spring Batch 2025"
  - "Expected Emergence: Spring Batch 2025"
- **Category:** `queen_rearing`
- **Type:** `event`
- **Priority:**
  - Acceptance checks: `high`
  - Cage dates: `high`
  - Emergence: `normal`
- **All Day:** `true`
- **Batch Association:** `batch_id` links to rearing_batches

### Dashboard Behavior

**Upcoming Events Widget:**
- Shows next 7 days from `tasks_events` only
- Includes all event types (tasks, events, reminders)
- Shows both user-created and batch-generated events
- Sorted by date, then priority
- All events link to `/dashboard/tasks`

**Tasks & Events Page:**
- Shows all events from `tasks_events`
- Batch events are fully editable
- Filtering by category shows `queen_rearing` events
- Can filter by associated batch

## Troubleshooting

### Events Not Appearing

**Problem:** Created a batch but events don't show in dashboard

**Check 1:** Are dates within next 7 days?
```sql
SELECT batch_name, acceptance_check_date, first_option_to_cage_date
FROM rearing_batches
WHERE user_id = auth.uid()
ORDER BY created_at DESC LIMIT 5;
```

**Check 2:** Did trigger create events?
```sql
SELECT title, start_date, batch_id
FROM tasks_events
WHERE category = 'queen_rearing'
  AND user_id = auth.uid()
ORDER BY created_at DESC LIMIT 10;
```

**Check 3:** Is trigger installed?
```sql
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'sync_batch_dates_trigger';
```

### Duplicate Events

**Problem:** Same event appears twice

**Solution:** Remove duplicates (keep most recent):
```sql
-- Find duplicates
SELECT title, start_date, COUNT(*)
FROM tasks_events
WHERE category = 'queen_rearing'
GROUP BY title, start_date
HAVING COUNT(*) > 1;

-- Delete older duplicates (CAREFUL!)
DELETE FROM tasks_events a
USING tasks_events b
WHERE a.id < b.id
  AND a.title = b.title
  AND a.start_date = b.start_date
  AND a.category = 'queen_rearing';
```

### Events Not Updating

**Problem:** Changed batch date but event didn't update

**Check:** Trigger is working
```sql
-- Update a batch to test
UPDATE rearing_batches
SET acceptance_check_date = acceptance_check_date + INTERVAL '1 day'
WHERE id = '[batch-id]';

-- Check if event updated
SELECT title, start_date, updated_at
FROM tasks_events
WHERE batch_id = '[batch-id]'
  AND title LIKE 'Acceptance Check:%';
```

### Old Events Still Showing

**Problem:** Deleted batch but events remain

**Solution:** Re-run cleanup:
```sql
-- Find orphaned events (batch no longer exists)
SELECT te.id, te.title, te.batch_id
FROM tasks_events te
LEFT JOIN rearing_batches rb ON te.batch_id = rb.id
WHERE te.batch_id IS NOT NULL
  AND rb.id IS NULL;

-- Delete orphaned events
DELETE FROM tasks_events
WHERE batch_id IS NOT NULL
  AND batch_id NOT IN (SELECT id FROM rearing_batches);
```

## Rollback (Emergency Only)

If you need to rollback:

### 1. Remove Triggers
```sql
DROP TRIGGER IF EXISTS sync_batch_dates_trigger ON rearing_batches;
DROP TRIGGER IF EXISTS cleanup_batch_events_trigger ON rearing_batches;
DROP FUNCTION IF EXISTS sync_batch_dates_to_tasks CASCADE;
DROP FUNCTION IF EXISTS cleanup_batch_events CASCADE;
```

### 2. Revert Frontend
```bash
git revert [commit-hash]
git push
```

### 3. Optionally Delete Generated Events
```sql
-- CAUTION: This deletes all batch-generated events
DELETE FROM tasks_events
WHERE category = 'queen_rearing'
  AND batch_id IS NOT NULL;
```

## Summary Checklist

- [ ] Run `create_batch_events_trigger.sql` in Supabase
- [ ] Verify triggers created successfully
- [ ] Run `migrate_existing_batch_dates.sql` in Supabase
- [ ] Check migration results (count of events created)
- [ ] Test creating a new batch with dates
- [ ] Verify events appear in dashboard
- [ ] Test editing batch date
- [ ] Verify event updates automatically
- [ ] Test editing event from Tasks page
- [ ] Test deleting a batch
- [ ] Verify associated events are removed
- [ ] Deploy frontend changes
- [ ] Test in production

## Notes

- Batch dates remain in `rearing_batches` for batch management
- Triggers keep events synchronized automatically
- Events are editable from Tasks & Events page
- Changes to events don't update batch table (one-way sync)
- Dashboard now has single source of truth (tasks_events)
- All events link to `/dashboard/tasks` for editing

## Support

If you encounter issues:
1. Check Supabase logs for trigger errors
2. Verify RLS policies allow event creation
3. Check browser console for JavaScript errors
4. Review migration scripts for completion
5. Consult troubleshooting section above
