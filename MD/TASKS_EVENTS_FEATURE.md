# Tasks and Events Feature

## Overview
The Tasks and Events feature provides a comprehensive system for managing beekeeping-related tasks, events, and reminders with future Google Calendar integration support.

## Database Schema

### Table: `tasks_events`

**Purpose**: Centralized storage for all user tasks, events, and reminders.

#### Core Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Reference to user (FK to auth.users) |
| `title` | VARCHAR(255) | Task/event title |
| `description` | TEXT | Detailed description |

#### Type and Classification

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `event_type` | VARCHAR(50) | task, event, reminder | Type of entry |
| `category` | VARCHAR(50) | inspection, treatment, feeding, harvest, queen_rearing, maintenance, general, other | Activity category |
| `priority` | VARCHAR(20) | low, normal, high, urgent | Task priority level |

#### Date and Time

| Field | Type | Description |
|-------|------|-------------|
| `start_date` | DATE | Start date (required) |
| `start_time` | TIME | Start time (optional) |
| `end_date` | DATE | End date (optional) |
| `end_time` | TIME | End time (optional) |
| `all_day` | BOOLEAN | Whether it's an all-day event |

#### Task Management

| Field | Type | Description |
|-------|------|-------------|
| `completed` | BOOLEAN | Task completion status |
| `completed_at` | TIMESTAMPTZ | Completion timestamp |

#### Associations

| Field | Type | Description |
|-------|------|-------------|
| `hive_id` | UUID | Link to specific hive (optional) |
| `apiary_id` | UUID | Link to specific apiary (optional) |
| `batch_id` | UUID | Link to queen rearing batch (optional) |

#### Recurrence (Future Feature)

| Field | Type | Description |
|-------|------|-------------|
| `is_recurring` | BOOLEAN | Whether task/event repeats |
| `recurrence_pattern` | VARCHAR(50) | Pattern (daily, weekly, monthly) |
| `recurrence_end_date` | DATE | When recurrence ends |

#### Reminders

| Field | Type | Description |
|-------|------|-------------|
| `reminder_enabled` | BOOLEAN | Enable reminder notification |
| `reminder_minutes_before` | INTEGER | Minutes before event to remind |
| `reminder_sent` | BOOLEAN | Whether reminder was sent |

#### Google Calendar Integration

| Field | Type | Description |
|-------|------|-------------|
| `google_calendar_event_id` | VARCHAR(255) | Google Calendar event ID |
| `google_calendar_synced_at` | TIMESTAMPTZ | Last sync timestamp |

## Features

### Current Implementation
1. **Database Schema**: Complete table structure with indexes and RLS policies
2. **Event Types**:
   - Tasks: To-do items with completion tracking
   - Events: Calendar events with date/time
   - Reminders: Simple date-based reminders

3. **Categories**: Organized by beekeeping activities
4. **Associations**: Link tasks to hives, apiaries, or queen batches
5. **Priority Levels**: Low, Normal, High, Urgent

### Future Enhancements
1. **Google Calendar Sync**:
   - Export events to Google Calendar
   - Two-way synchronization
   - OAuth authentication
   - Event updates and deletions

2. **Recurring Tasks**:
   - Daily, weekly, monthly patterns
   - Custom recurrence rules
   - Exception dates

3. **Notifications**:
   - Email reminders
   - In-app notifications
   - Push notifications (PWA)

4. **Team Sharing**:
   - Share tasks with team members
   - Assign tasks to team members
   - Team calendar view

## Use Cases

### 1. Hive Inspections
- Schedule regular inspection dates
- Set reminders 1 day before
- Link to specific hives
- Mark as completed after inspection

### 2. Varroa Treatments
- Schedule treatment start dates
- Set follow-up treatment reminders
- Track treatment completion

### 3. Queen Rearing
- Track acceptance checks
- Schedule cage dates
- Monitor emergence dates
- Already integrated with rearing_batches table

### 4. Seasonal Tasks
- Spring: Add supers, check for swarming
- Summer: Monitor honey flow, harvest
- Fall: Prepare for winter, feed syrup
- Winter: Check stores, insulation

### 5. Maintenance
- Equipment cleaning
- Hive repairs
- Order supplies

## Integration Points

### Dashboard
- "Upcoming Events" widget shows next 7 days
- Combined view of:
  - Queen rearing dates
  - User tasks and events
  - Inspection reminders

### Navigation
- New menu item: "Tasks & Events" or "Calendar"
- Quick add button in navbar
- Link from hive/apiary detail pages

### Hive Detail Page
- Show upcoming tasks for specific hive
- Quick add task button
- Task history

## Google Calendar Integration (Future)

### Export Format (iCalendar)
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//HiveCraic//Tasks Events//EN
BEGIN:VEVENT
UID:task-{id}@hivecraic.com
DTSTAMP:{created_at}
DTSTART:{start_date}
DTEND:{end_date}
SUMMARY:{title}
DESCRIPTION:{description}
LOCATION:{apiary_name} - {hive_number}
CATEGORIES:{category}
STATUS:{completed ? COMPLETED : CONFIRMED}
END:VEVENT
END:VCALENDAR
```

### Sync Strategy
1. **One-way Export**: Export to Google Calendar (Phase 1)
2. **Two-way Sync**: Sync changes both ways (Phase 2)
3. **Selective Sync**: Choose which categories to sync

### OAuth Setup
- Google Calendar API credentials
- OAuth 2.0 consent screen
- Scope: calendar.events
- Store refresh tokens in user profile

## API Endpoints (To Be Created)

```typescript
// Get all tasks/events
GET /api/tasks-events?user_id={id}&start_date={date}&end_date={date}

// Get single task/event
GET /api/tasks-events/{id}

// Create task/event
POST /api/tasks-events
Body: { title, description, event_type, start_date, ... }

// Update task/event
PATCH /api/tasks-events/{id}
Body: { field: value, ... }

// Delete task/event
DELETE /api/tasks-events/{id}

// Mark task complete
POST /api/tasks-events/{id}/complete

// Export to Google Calendar
POST /api/tasks-events/export-google-calendar
Body: { task_ids: [...] }

// Sync with Google Calendar
POST /api/tasks-events/sync-google-calendar
```

## UI Components (To Be Created)

### Pages
1. `/dashboard/tasks` - Main tasks and events management page
2. `/dashboard/calendar` - Calendar view (alternative)

### Components
1. `TaskEventList` - List view of tasks/events
2. `TaskEventForm` - Create/edit form
3. `TaskEventCalendar` - Calendar view component
4. `UpcomingTasksWidget` - Dashboard widget
5. `TaskEventFilters` - Filter by type, category, status

## Migration Instructions

### Step 1: Create Table
```bash
# Run the migration SQL in Supabase SQL Editor
# File: migrations/create_tasks_events_table.sql
```

### Step 2: Verify RLS Policies
```sql
-- Check that policies are active
SELECT * FROM pg_policies WHERE tablename = 'tasks_events';
```

### Step 3: Test Basic Operations
```sql
-- Insert test task
INSERT INTO tasks_events (user_id, title, event_type, start_date)
VALUES (auth.uid(), 'Test Task', 'task', CURRENT_DATE);

-- Verify it appears
SELECT * FROM tasks_events WHERE user_id = auth.uid();
```

## Next Steps

1. ✅ Create database schema and migration SQL
2. ⏳ Create tasks/events management page UI
3. ⏳ Update dashboard to show tasks in "Upcoming Events"
4. ⏳ Add task/event creation from hive detail pages
5. ⏳ Implement Google Calendar export (iCalendar format)
6. 🔮 Future: OAuth integration for two-way sync
7. 🔮 Future: Recurring tasks implementation
8. 🔮 Future: Email/push notifications

## Notes

- The table is designed to be extensible for future features
- Google Calendar integration uses standard fields that map well to iCalendar format
- RLS policies ensure data security
- Indexes optimize query performance for common use cases
- The category system aligns with existing beekeeping activities
