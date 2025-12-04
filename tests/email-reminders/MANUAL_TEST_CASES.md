# Manual Test Cases - Email Reminder System

## Test Environment Setup

### Prerequisites
- Active Supabase project with migrations applied
- Resend API key configured
- Test user account created
- Access to profile settings page

### Test Data Setup
```sql
-- Create test user if needed
INSERT INTO profiles (email, first_name, last_name)
VALUES ('tester@example.com', 'Test', 'User');
```

---

## Test Suite 1: Profile Settings UI

### TC-1.1: Navigate to Email Notification Settings
**Objective:** Verify email notification settings are accessible

**Steps:**
1. Login to the application
2. Navigate to Profile page
3. Scroll to "Additional Settings" section
4. Locate "Email Notifications" card

**Expected Result:**
- Email Notifications card is visible
- Contains toggles for Task and Event reminders
- Contains Reminder Frequency dropdown
- No "Coming Soon" button present

**Priority:** HIGH
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-1.2: Toggle Task Email Reminders
**Objective:** Verify task reminder toggle works

**Steps:**
1. Navigate to Profile → Additional Settings → Email Notifications
2. Note current state of "Task Reminders" toggle
3. Click the toggle to change state
4. Wait 2 seconds
5. Refresh the page
6. Check toggle state

**Expected Result:**
- Toggle changes state immediately
- State persists after page refresh
- No error messages appear
- Database updated correctly

**Validation Query:**
```sql
SELECT enable_task_email_reminders
FROM profiles
WHERE email = 'tester@example.com';
```

**Priority:** HIGH
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-1.3: Toggle Event Email Reminders
**Objective:** Verify event reminder toggle works

**Steps:**
1. Navigate to Profile → Additional Settings → Email Notifications
2. Note current state of "Event Reminders" toggle
3. Click the toggle to change state
4. Wait 2 seconds
5. Refresh the page
6. Check toggle state

**Expected Result:**
- Toggle changes state immediately
- State persists after page refresh
- No error messages appear
- Database updated correctly

**Validation Query:**
```sql
SELECT enable_event_email_reminders
FROM profiles
WHERE email = 'tester@example.com';
```

**Priority:** HIGH
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-1.4: Change Reminder Frequency - Realtime
**Objective:** Verify frequency dropdown works for Realtime

**Steps:**
1. Navigate to Email Notifications settings
2. Open "Reminder Frequency" dropdown
3. Select "Realtime (Hourly check)"
4. Verify helper text updates
5. Refresh page
6. Check selected value

**Expected Result:**
- Dropdown shows "Realtime (Hourly check)" selected
- Helper text: "Checks every hour for reminders in next 24 hours"
- Selection persists after refresh
- Database updated correctly

**Validation Query:**
```sql
SELECT task_reminder_frequency
FROM profiles
WHERE email = 'tester@example.com';
-- Expected: 'realtime'
```

**Priority:** HIGH
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-1.5: Change Reminder Frequency - Daily
**Objective:** Verify frequency dropdown works for Daily

**Steps:**
1. Navigate to Email Notifications settings
2. Open "Reminder Frequency" dropdown
3. Select "Daily (Once per day)"
4. Verify helper text updates
5. Refresh page

**Expected Result:**
- Helper text: "Sends once per day for tasks/events in next 2 days"
- Database value: 'daily'

**Priority:** HIGH
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-1.6: Change Reminder Frequency - Weekly
**Objective:** Verify frequency dropdown works for Weekly

**Steps:**
1. Navigate to Email Notifications settings
2. Select "Weekly (Once per week)"
3. Verify helper text updates

**Expected Result:**
- Helper text: "Sends once per week for tasks/events in next 7 days"
- Database value: 'weekly'

**Priority:** HIGH
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-1.7: Change Reminder Frequency - Disabled
**Objective:** Verify frequency can be disabled

**Steps:**
1. Navigate to Email Notifications settings
2. Select "Disabled (No emails)"
3. Verify helper text updates

**Expected Result:**
- Helper text: "No email reminders will be sent"
- Database value: 'disabled'
- User should not receive any reminder emails

**Priority:** HIGH
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

## Test Suite 2: Task Creation with Reminders

### TC-2.1: Create Task with Reminder Enabled
**Objective:** Verify tasks can be created with reminders

**Steps:**
1. Navigate to Tasks page
2. Click "Add Task" button
3. Fill in task details:
   - Title: "Test Hive Inspection"
   - Description: "Check for queen cells"
   - Type: Task
   - Category: Inspection
   - Priority: High
   - Date: Tomorrow
   - Time: 10:00 AM
4. Enable "Reminder" toggle
5. Set "Remind me" to 2 hours before
6. Save task

**Expected Result:**
- Task created successfully
- `reminder_enabled = true`
- `reminder_minutes_before = 120`
- `reminder_sent = false`
- Task appears in tasks list

**Validation Query:**
```sql
SELECT title, reminder_enabled, reminder_minutes_before, reminder_sent
FROM tasks_events
WHERE title = 'Test Hive Inspection';
```

**Priority:** HIGH
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-2.2: Create Event with Reminder
**Objective:** Verify events can be created with reminders

**Steps:**
1. Navigate to Tasks/Events page
2. Click "Add Event"
3. Fill in event details:
   - Title: "Association Meeting"
   - Type: Event
   - Date: Next week
   - Time: 7:00 PM
4. Enable reminder
5. Set reminder to 1 day before
6. Save event

**Expected Result:**
- Event created with `event_type = 'event'`
- Reminder enabled
- `reminder_minutes_before = 1440` (24 hours)

**Priority:** HIGH
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-2.3: Create Task Without Reminder
**Objective:** Verify tasks can be created without reminders

**Steps:**
1. Create a task
2. Leave "Reminder" toggle off
3. Save task

**Expected Result:**
- `reminder_enabled = false`
- No reminder email will be sent for this task

**Priority:** MEDIUM
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

## Test Suite 3: Email Delivery

### TC-3.1: Receive Task Reminder Email (Realtime)
**Objective:** Verify task reminder emails are sent

**Setup:**
1. Set frequency to "Realtime"
2. Enable task reminders
3. Create task due in 2 hours with 2-hour reminder

**Steps:**
1. Wait for next hour (cron runs hourly)
2. Check email inbox
3. Verify email received

**Expected Result:**
- Email received within 1 hour
- Subject: "🐝 Task & Event Reminders - X Upcoming"
- Contains task details:
  - Title
  - Description
  - Category badge
  - Priority indicator (🟠 high)
  - Date/time in Irish format
  - Urgency badge ("In 2 hours")
- Email is HTML formatted
- HiveCraic branding present

**Priority:** CRITICAL
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-3.2: Receive Event Reminder Email
**Objective:** Verify event reminder emails are sent

**Setup:**
1. Enable event reminders
2. Create event tomorrow with 1-day reminder

**Steps:**
1. Wait for cron execution
2. Check email inbox

**Expected Result:**
- Email received
- Event details displayed correctly
- Event icon (📅) present
- Different styling than tasks

**Priority:** HIGH
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-3.3: Multiple Reminders in One Email
**Objective:** Verify multiple reminders are batched

**Setup:**
1. Create 3 tasks all due tomorrow
2. Enable reminders for all

**Steps:**
1. Wait for cron execution
2. Check email

**Expected Result:**
- Single email received (not 3 separate emails)
- Contains all 3 tasks in table
- Subject line: "3 Upcoming" (plural)
- Tasks sorted by urgency (most urgent first)

**Priority:** HIGH
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-3.4: No Email When No Reminders Due
**Objective:** Verify no email sent when nothing is due

**Setup:**
1. Enable reminders
2. No tasks/events with upcoming reminders

**Steps:**
1. Wait for cron execution
2. Check email inbox

**Expected Result:**
- No email received
- No errors in Edge Function logs

**Priority:** MEDIUM
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-3.5: No Email When Reminders Disabled
**Objective:** Verify no email when user has disabled reminders

**Setup:**
1. Set frequency to "Disabled"
2. Create task with reminder enabled due tomorrow

**Steps:**
1. Wait for cron execution
2. Check email

**Expected Result:**
- No email received
- User excluded from reminder query

**Priority:** HIGH
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-3.6: Task Reminders Only (Events Disabled)
**Objective:** Verify selective reminder types work

**Setup:**
1. Enable task reminders
2. Disable event reminders
3. Create 1 task and 1 event, both due tomorrow

**Steps:**
1. Wait for cron execution
2. Check email

**Expected Result:**
- Email contains only the task (not the event)
- Event is filtered out by Edge Function

**Priority:** HIGH
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-3.7: Event Reminders Only (Tasks Disabled)
**Objective:** Verify selective reminder types work (reverse)

**Setup:**
1. Disable task reminders
2. Enable event reminders
3. Create 1 task and 1 event, both due tomorrow

**Steps:**
1. Wait for cron execution
2. Check email

**Expected Result:**
- Email contains only the event (not the task)

**Priority:** HIGH
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

## Test Suite 4: Reminder Logic

### TC-4.1: Reminder Not Sent Twice
**Objective:** Verify reminders are only sent once

**Setup:**
1. Create task due in 2 hours
2. Wait for first reminder to be sent

**Steps:**
1. Verify email received
2. Check database: `reminder_sent = true`
3. Wait for next cron execution
4. Check email inbox again

**Expected Result:**
- Only one email received
- Database shows `reminder_sent = true`
- Second cron execution skips this task

**Validation Query:**
```sql
SELECT title, reminder_sent
FROM tasks_events
WHERE title = 'Task Name';
-- Should be: true
```

**Priority:** CRITICAL
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-4.2: No Reminder for Completed Tasks
**Objective:** Verify completed tasks don't trigger reminders

**Setup:**
1. Create task due tomorrow with reminder
2. Mark task as completed

**Steps:**
1. Wait for cron execution
2. Check email

**Expected Result:**
- No email received for completed task
- Completed tasks filtered out by query

**Priority:** HIGH
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-4.3: Reminder Window - Realtime (24 hours)
**Objective:** Verify realtime frequency window

**Setup:**
1. Set frequency to "Realtime"
2. Create tasks:
   - Task A: Due in 12 hours
   - Task B: Due in 30 hours
   - Both with 2-hour reminders

**Steps:**
1. Wait for cron execution
2. Check email

**Expected Result:**
- Email contains Task A (within 24 hours)
- Email does NOT contain Task B (outside window)

**Priority:** HIGH
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-4.4: Reminder Window - Daily (48 hours)
**Objective:** Verify daily frequency window

**Setup:**
1. Set frequency to "Daily"
2. Create tasks at various times:
   - Task A: Tomorrow
   - Task B: Day after tomorrow
   - Task C: 3 days from now

**Steps:**
1. Wait for daily cron execution
2. Check email

**Expected Result:**
- Contains Task A and Task B (within 2 days)
- Does NOT contain Task C (outside window)

**Priority:** HIGH
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-4.5: Reminder Window - Weekly (7 days)
**Objective:** Verify weekly frequency window

**Setup:**
1. Set frequency to "Weekly"
2. Create tasks:
   - Task A: In 4 days
   - Task B: In 10 days

**Steps:**
1. Wait for weekly cron execution
2. Check email

**Expected Result:**
- Contains Task A (within 7 days)
- Does NOT contain Task B (outside window)

**Priority:** HIGH
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

## Test Suite 5: Email Content Verification

### TC-5.1: Priority Indicators
**Objective:** Verify priority badges display correctly

**Setup:**
1. Create tasks with different priorities:
   - Urgent
   - High
   - Normal
   - Low

**Steps:**
1. Trigger reminder email
2. Check email content

**Expected Result:**
- Urgent: 🔴 red circle
- High: 🟠 orange circle
- Normal: 🟡 yellow circle
- Low: 🟢 green circle

**Priority:** MEDIUM
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-5.2: Urgency Badges - Color Coding
**Objective:** Verify urgency badges show correct colors

**Setup:**
1. Create tasks:
   - Task A: Due in 1 hour
   - Task B: Due in 6 hours
   - Task C: Due in 1 day
   - Task D: Due in 5 days

**Steps:**
1. Check email content

**Expected Result:**
- Task A: Red badge "Within 1 hour"
- Task B: Orange badge "In 6 hours"
- Task C: Yellow badge "In 1 day"
- Task D: Blue badge "In 5 days"

**Priority:** MEDIUM
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-5.3: Location Context - Hive
**Objective:** Verify hive location is shown

**Setup:**
1. Create hive "Hive 7"
2. Create task linked to Hive 7
3. Set reminder

**Steps:**
1. Receive email
2. Check task row

**Expected Result:**
- Location column shows "📍 Hive 7"

**Priority:** MEDIUM
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-5.4: Location Context - Apiary
**Objective:** Verify apiary location is shown

**Setup:**
1. Create apiary "Meadowbrook Apiary"
2. Create task linked to apiary
3. Set reminder

**Steps:**
1. Receive email
2. Check task row

**Expected Result:**
- Location column shows "📍 Meadowbrook Apiary"

**Priority:** MEDIUM
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-5.5: Irish Date Format
**Objective:** Verify dates are in DD/MM/YYYY format

**Setup:**
1. Create task for January 5, 2026 (05/01/2026)
2. Set reminder

**Steps:**
1. Check email
2. Verify date format

**Expected Result:**
- Date displays as "05/01/2026" (not "01/05/2026")
- Follows Irish date convention

**Priority:** LOW
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-5.6: Manage Preferences Link
**Objective:** Verify footer link works

**Steps:**
1. Receive reminder email
2. Find "manage your notification preferences" link in footer
3. Click link

**Expected Result:**
- Link navigates to profile settings page
- Email notification section is visible

**Priority:** LOW
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

## Test Suite 6: Edge Cases

### TC-6.1: Task Due Today at 9 AM with 1-hour Reminder
**Objective:** Verify same-day reminders work

**Setup:**
1. Set frequency to "Realtime"
2. Create task for today at 9 AM with 1-hour reminder
3. Current time: 8:00 AM

**Steps:**
1. Wait for 8:00 AM cron execution
2. Check email

**Expected Result:**
- Email received at 8:00 AM
- Shows "In 1 hour" or "Within 1 hour"

**Priority:** HIGH
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-6.2: All-Day Event Reminder
**Objective:** Verify all-day events without specific time

**Setup:**
1. Create all-day event tomorrow
2. Set reminder for 1 day before

**Steps:**
1. Check email received today
2. Verify time display

**Expected Result:**
- Date shown without time (DD/MM/YYYY only)
- No time component displayed

**Priority:** MEDIUM
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-6.3: Task with No Description
**Objective:** Verify tasks without description display correctly

**Setup:**
1. Create task with title only (no description)
2. Set reminder

**Steps:**
1. Check email content

**Expected Result:**
- Title displays
- No description row shown
- No empty description text
- Layout remains clean

**Priority:** LOW
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-6.4: Task with Very Long Title
**Objective:** Verify long titles don't break layout

**Setup:**
1. Create task with 200-character title
2. Set reminder

**Steps:**
1. Check email rendering

**Expected Result:**
- Title text wraps properly
- Table layout not broken
- Text remains readable

**Priority:** LOW
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

## Test Suite 7: System Integration

### TC-7.1: Cron Job Execution Verification
**Objective:** Verify cron job runs on schedule

**Steps:**
1. Check current time
2. Wait for next hour
3. Query cron execution history

**Query:**
```sql
SELECT *
FROM cron.job_run_details
WHERE jobid = 2 -- task-event-reminders-hourly
ORDER BY start_time DESC
LIMIT 5;
```

**Expected Result:**
- New execution record appears
- `start_time` is within last hour
- `status` is 'succeeded' or 'failed'
- `return_message` shows result

**Priority:** CRITICAL
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-7.2: Edge Function Response Format
**Objective:** Verify Edge Function returns proper JSON

**Steps:**
1. Manually trigger Edge Function via curl:
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/task-event-reminders' \
  -H 'Authorization: Bearer ANON_KEY' \
  -H 'Content-Type: application/json'
```

**Expected Result:**
```json
{
  "success": true,
  "emailsSent": 3,
  "emails": ["user1@example.com", "user2@example.com", "user3@example.com"],
  "remindersMarkedSent": 5,
  "errors": []
}
```

**Priority:** HIGH
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-7.3: Edge Function Error Handling
**Objective:** Verify Edge Function handles errors gracefully

**Setup:**
1. Temporarily remove Resend API key
2. Create test task with reminder

**Steps:**
1. Trigger Edge Function
2. Check logs

**Expected Result:**
- Function doesn't crash
- Returns error in `errors` array
- Logs error details
- HTTP 200 response (not 500)

**Priority:** MEDIUM
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

## Test Suite 8: Performance

### TC-8.1: High Volume - 100 Users
**Objective:** Verify system handles many users

**Setup:**
1. Create 100 test users with reminders enabled
2. Create 1 task per user due tomorrow

**Steps:**
1. Trigger Edge Function
2. Measure execution time
3. Check all emails sent

**Expected Result:**
- Execution completes within 60 seconds
- All 100 emails sent successfully
- No timeout errors
- Resend API rate limits not exceeded

**Priority:** MEDIUM
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

### TC-8.2: High Volume - 50 Tasks Per User
**Objective:** Verify system handles many tasks per user

**Setup:**
1. Create 1 user
2. Create 50 tasks with reminders all due tomorrow

**Steps:**
1. Trigger reminder
2. Check email

**Expected Result:**
- Single email received
- Contains all 50 tasks in table
- Email renders properly (not too large)
- Table scrolls if needed

**Priority:** LOW
**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

---

## Test Execution Log

| Test Case | Tester | Date | Result | Notes |
|-----------|--------|------|--------|-------|
| TC-1.1 | | | ⬜ | |
| TC-1.2 | | | ⬜ | |
| TC-1.3 | | | ⬜ | |
| ... | | | ⬜ | |

---

## Test Summary Report Template

**Test Execution Date:** _________
**Tester Name:** _________
**Environment:** Production / Staging / Development

### Results Summary
- Total Test Cases: 45
- Passed: ___
- Failed: ___
- Not Tested: ___
- Blocked: ___

### Critical Issues Found
1.
2.

### Recommendations
1.
2.

### Sign-off
**Tester:** ________________ **Date:** _________
**Reviewer:** ______________ **Date:** _________
