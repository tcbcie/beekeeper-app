# Events Integration Verification Guide

## Overview

The HiveCraic dashboard displays upcoming events from **TWO sources**:

1. **Queen Rearing Events** - from `rearing_batches` table
2. **User Tasks & Events** - from `tasks_events` table

This dual-source approach ensures:
- Queen rearing dates remain part of batch data (single source of truth)
- Users can create additional tasks/events for any beekeeping activity
- Dashboard shows a unified view of all upcoming activities

## How It Works

### Data Sources

#### Source 1: Queen Rearing Batches (`rearing_batches` table)
The queen rearing workflow automatically generates events from these date fields:
- `acceptance_check_date` → "Acceptance Check" event
- `first_option_to_cage_date` → "1st Cage Option" event
- `second_option_to_cage_date` → "2nd Cage Option" event
- `emergence_date` → "Expected Hatch" event

**Key Points:**
- These dates are intrinsic to the batch lifecycle
- Stored in `rearing_batches` table
- Automatically appear in dashboard when within 7 days
- Clicking event navigates to `/dashboard/batches`

#### Source 2: User Tasks & Events (`tasks_events` table)
Users can create custom tasks and events:
- Tasks (to-do items with completion tracking)
- Events (calendar events)
- Reminders (date-based notifications)

**Key Points:**
- Stored in `tasks_events` table
- Can be linked to hives, apiaries, or batches
- Support priority levels (urgent, high, normal, low)
- Only show active (non-completed) items in dashboard
- Clicking event navigates to `/dashboard/tasks`

### Dashboard Integration

The `UpcomingEvents` component ([src/components/UpcomingEvents.tsx](../src/components/UpcomingEvents.tsx)):

1. **Fetches both sources:**
   ```typescript
   // Fetch queen rearing batch events
   const { data: batches } = await supabase
     .from('rearing_batches')
     .select('id, batch_name, acceptance_check_date, ...')

   // Fetch tasks and events
   const { data: tasks } = await supabase
     .from('tasks_events')
     .select('id, title, event_type, category, priority, ...')
     .eq('completed', false)  // Only active tasks
   ```

2. **Combines and sorts:**
   - Primary sort: By date (soonest first)
   - Secondary sort: By priority (urgent > high > normal > low)

3. **Displays unified view:**
   - Shows next 7 days of events
   - Color-coded priority for tasks
   - Category labels for organization
   - Different links based on source

## Verification Steps

### Step 1: Verify Table Structure

Run this query in Supabase SQL Editor:

```sql
-- Check tasks_events table exists
SELECT * FROM information_schema.tables
WHERE table_name = 'tasks_events';
```

**Expected Result:** One row showing the tasks_events table

### Step 2: Verify RLS Policies

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'tasks_events';
```

**Expected Result:** At least 4 policies (SELECT, INSERT, UPDATE, DELETE)

### Step 3: Run Verification Script

1. Open Supabase SQL Editor
2. Copy contents of `scripts/verify-events-integration.sql`
3. Run the script
4. Review the output:
   - Table structure check
   - RLS configuration check
   - Sample of upcoming queen rearing events
   - Sample of user tasks/events
   - Combined dashboard view
   - Summary statistics

### Step 4: Visual Verification in App

1. **Navigate to Dashboard** (`/dashboard`)
2. **Check "Upcoming Events" widget:**
   - Should show events from both sources
   - Events should be sorted by date
   - Tasks should show priority colors
   - Clicking should navigate to correct page

3. **Create a test task:**
   - Navigate to `/dashboard/tasks`
   - Click "Add Task/Event"
   - Create a task with start date within next 7 days
   - Return to dashboard
   - Verify task appears in "Upcoming Events"

4. **Test with Queen Rearing:**
   - Navigate to `/dashboard/batches`
   - Create or edit a batch
   - Set acceptance_check_date within next 7 days
   - Return to dashboard
   - Verify batch event appears in "Upcoming Events"

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        DASHBOARD                             │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │          Upcoming Events Widget                     │    │
│  │  (UpcomingEvents.tsx component)                     │    │
│  └────────────────────────────────────────────────────┘    │
│                    │                                         │
│                    │ fetchUpcomingEvents()                   │
│                    ▼                                         │
│         ┌──────────────────────┐                            │
│         │   Supabase Queries    │                            │
│         └──────────────────────┘                            │
│                    │                                         │
│          ┌─────────┴─────────┐                              │
│          │                   │                              │
│          ▼                   ▼                              │
│  ┌──────────────┐    ┌──────────────┐                      │
│  │  rearing_    │    │  tasks_      │                      │
│  │  batches     │    │  events      │                      │
│  └──────────────┘    └──────────────┘                      │
│          │                   │                              │
│          │                   │                              │
│          ▼                   ▼                              │
│  ┌──────────────┐    ┌──────────────┐                      │
│  │ • Acceptance │    │ • User Tasks │                      │
│  │ • Cage Dates │    │ • Events     │                      │
│  │ • Emergence  │    │ • Reminders  │                      │
│  └──────────────┘    └──────────────┘                      │
│          │                   │                              │
│          └─────────┬─────────┘                              │
│                    │                                         │
│                    ▼                                         │
│         ┌──────────────────────┐                            │
│         │  Combine & Sort       │                            │
│         │  • By date            │                            │
│         │  • By priority        │                            │
│         └──────────────────────┘                            │
│                    │                                         │
│                    ▼                                         │
│         ┌──────────────────────┐                            │
│         │  Display Events       │                            │
│         │  • Next 7 days        │                            │
│         │  • Color-coded        │                            │
│         │  • Clickable links    │                            │
│         └──────────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

## Expected Behavior

### Dashboard "Upcoming Events" Widget

**Displays:**
- All queen rearing dates within next 7 days
- All active (non-completed) tasks/events within next 7 days
- Combined and sorted chronologically
- Priority color coding for user tasks

**Example Output:**
```
┌─────────────────────────────────────────────┐
│  Upcoming Events              Next 7 days   │
├─────────────────────────────────────────────┤
│  🔔 Spring Batch 2025                       │
│     Acceptance Check                  Today │
│     05/11/2025                              │
├─────────────────────────────────────────────┤
│  🔔 Inspect Hive 1 (HIGH PRIORITY)          │
│     Task • Inspection            Tomorrow   │
│     06/11/2025                              │
├─────────────────────────────────────────────┤
│  🔔 Spring Batch 2025                       │
│     1st Cage Option                 3 days  │
│     08/11/2025                              │
├─────────────────────────────────────────────┤
│  🔔 Order Winter Supplies                   │
│     Task • Maintenance             5 days   │
│     10/11/2025                              │
└─────────────────────────────────────────────┘
```

## Why This Approach?

### Advantages of Dual-Source Design

1. **Data Integrity:**
   - Queen rearing dates stay with batch data
   - No duplication or sync issues
   - Single source of truth for each data type

2. **Flexibility:**
   - Users can create additional tasks
   - Tasks can be independent or linked to entities
   - Different types serve different purposes

3. **User Experience:**
   - Unified dashboard view
   - All upcoming activities in one place
   - Clear visual distinction between sources

4. **Maintainability:**
   - Clear separation of concerns
   - Easy to update or extend either source
   - No complex sync logic required

### Alternative Approaches (Not Used)

**Option B: Copy to tasks_events**
- Would require duplicating all batch dates
- Would need sync logic when batch dates change
- Risk of data inconsistency
- Not recommended

**Option C: Move to tasks_events only**
- Would remove dates from batch lifecycle
- Would break batch data model
- Would require complex joins
- Not recommended

## Troubleshooting

### Events Not Showing in Dashboard

**Check 1: Dates within range?**
```sql
-- Are there events in next 7 days?
SELECT batch_name, acceptance_check_date
FROM rearing_batches
WHERE acceptance_check_date >= CURRENT_DATE
  AND acceptance_check_date <= CURRENT_DATE + INTERVAL '7 days'
  AND user_id = auth.uid();
```

**Check 2: Tasks marked complete?**
```sql
-- Are tasks showing as completed?
SELECT title, start_date, completed
FROM tasks_events
WHERE user_id = auth.uid()
  AND start_date >= CURRENT_DATE;
```

**Check 3: RLS policies working?**
```sql
-- Can you see your own tasks?
SELECT * FROM tasks_events WHERE user_id = auth.uid();
```

### Dates Not Updating

**Check:** Clear browser cache and refresh
**Check:** Verify component is re-fetching data

### Wrong Link Destination

**Check:** Event source should determine link:
- `source: 'batch'` → links to `/dashboard/batches`
- `source: 'task'` → links to `/dashboard/tasks`

## Summary

✅ **Queen rearing events** remain in `rearing_batches` table
✅ **User tasks/events** are stored in `tasks_events` table
✅ **Dashboard** fetches from BOTH sources
✅ **Events** are combined, sorted, and displayed together
✅ **No data migration** required - it's a dual-source design
✅ **No sync issues** - each source has its own purpose

## Testing Checklist

- [ ] Run verification SQL script
- [ ] Verify tasks_events table exists
- [ ] Verify RLS policies are active
- [ ] Create a test task for tomorrow
- [ ] Verify test task appears on dashboard
- [ ] Create/edit a batch with acceptance date for tomorrow
- [ ] Verify batch event appears on dashboard
- [ ] Click on batch event - should go to batches page
- [ ] Click on task event - should go to tasks page
- [ ] Mark task as complete
- [ ] Verify completed task disappears from dashboard
- [ ] Check priority color coding for tasks
- [ ] Check category labels display correctly

## Next Steps

1. **Use the feature** - Create tasks for your beekeeping activities
2. **Monitor dashboard** - Verify all upcoming events display correctly
3. **Future enhancements:**
   - Google Calendar export
   - Recurring tasks
   - Email reminders
   - Push notifications
