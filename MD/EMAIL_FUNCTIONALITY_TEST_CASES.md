# Email Functionality Test Cases - HiveCraic Beekeeping App

**Document Version:** 1.0
**Date:** 2025-12-05
**Author:** Claude (AI Assistant)

This document provides comprehensive test cases for all email functionality in the HiveCraic beekeeping application.

---

## Table of Contents

1. [Task & Event Email Reminders](#1-task--event-email-reminders)
2. [Weekly Email Digest for Queen Rearing Batches](#2-weekly-email-digest-for-queen-rearing-batches)
3. [Team Invitation Emails](#3-team-invitation-emails)
4. [Batch Event Email Reminders](#4-batch-event-email-reminders)
5. [Edge Function Execution Tests](#5-edge-function-execution-tests)
6. [Integration Tests](#6-integration-tests)

---

## 1. Task & Event Email Reminders

**Edge Function:** `task-event-reminders`
**Trigger:** Hourly cron job at minute 0
**Purpose:** Send email reminders for upcoming tasks and events based on user preferences

### 1.1 User Preference Tests

#### Test Case 1.1.1: User Has Task Reminders Enabled
**Preconditions:**
- User profile has `enable_task_email_reminders = true`
- User profile has `task_reminder_frequency` set to 'realtime', 'daily', or 'weekly'

**Test Steps:**
1. Create a task with `event_type = 'task'`
2. Set `reminder_enabled = true`
3. Set `reminder_minutes_before = 60`
4. Set `start_date` to today's date
5. Set `start_time` to 1 hour from now
6. Trigger the Edge Function

**Expected Results:**
- User receives email with task details
- Task is marked as `reminder_sent = true`
- Email contains task title, description, category, priority, date/time, and location (if applicable)

---

#### Test Case 1.1.2: User Has Event Reminders Enabled
**Preconditions:**
- User profile has `enable_event_email_reminders = true`
- User profile has `task_reminder_frequency` set to 'realtime', 'daily', or 'weekly'

**Test Steps:**
1. Create an event with `event_type = 'event'`
2. Set `reminder_enabled = true`
3. Set `reminder_minutes_before = 120`
4. Set `start_date` to today's date
5. Set `start_time` to 2 hours from now
6. Trigger the Edge Function

**Expected Results:**
- User receives email with event details
- Event is marked as `reminder_sent = true`
- Email includes event information formatted appropriately

---

#### Test Case 1.1.3: User Has Both Task and Event Reminders Disabled
**Preconditions:**
- User profile has `enable_task_email_reminders = false`
- User profile has `enable_event_email_reminders = false`

**Test Steps:**
1. Create a task with `reminder_enabled = true`
2. Create an event with `reminder_enabled = true`
3. Trigger the Edge Function

**Expected Results:**
- User does NOT receive any email
- Tasks/events are NOT marked as `reminder_sent = true`

---

#### Test Case 1.1.4: User Has Task Reminders Disabled but Event Reminders Enabled
**Preconditions:**
- User profile has `enable_task_email_reminders = false`
- User profile has `enable_event_email_reminders = true`

**Test Steps:**
1. Create a task with `reminder_enabled = true` and `event_type = 'task'`
2. Create an event with `reminder_enabled = true` and `event_type = 'event'`
3. Both within reminder window
4. Trigger the Edge Function

**Expected Results:**
- User receives email with ONLY the event (not the task)
- Only the event is marked as `reminder_sent = true`
- Task is NOT included in email

---

### 1.2 Reminder Frequency Tests

#### Test Case 1.2.1: Realtime Frequency (24-hour window)
**Preconditions:**
- User has `task_reminder_frequency = 'realtime'`

**Test Steps:**
1. Create Task A with `start_date` = today + 12 hours
2. Create Task B with `start_date` = today + 36 hours
3. Both have `reminder_enabled = true` and `reminder_minutes_before = 60`
4. Trigger the Edge Function

**Expected Results:**
- Email contains Task A (within 24 hours)
- Email does NOT contain Task B (beyond 24 hours)

---

#### Test Case 1.2.2: Daily Frequency (Today and Tomorrow)
**Preconditions:**
- User has `task_reminder_frequency = 'daily'`

**Test Steps:**
1. Create Task A with `start_date` = today
2. Create Task B with `start_date` = tomorrow
3. Create Task C with `start_date` = today + 2 days
4. All have `reminder_enabled = true`
5. Trigger the Edge Function

**Expected Results:**
- Email contains Task A and Task B
- Email does NOT contain Task C (beyond tomorrow)

---

#### Test Case 1.2.3: Weekly Frequency (Next 7 days)
**Preconditions:**
- User has `task_reminder_frequency = 'weekly'`

**Test Steps:**
1. Create Task A with `start_date` = today + 3 days
2. Create Task B with `start_date` = today + 6 days
3. Create Task C with `start_date` = today + 8 days
4. All have `reminder_enabled = true`
5. Trigger the Edge Function

**Expected Results:**
- Email contains Task A and Task B
- Email does NOT contain Task C (beyond 7 days)

---

#### Test Case 1.2.4: Disabled Frequency
**Preconditions:**
- User has `task_reminder_frequency = 'disabled'`

**Test Steps:**
1. Create tasks/events with `reminder_enabled = true`
2. Trigger the Edge Function

**Expected Results:**
- User does NOT receive any email
- User is excluded from query results

---

### 1.3 Reminder Window Tests

#### Test Case 1.3.1: Within Reminder Window
**Test Steps:**
1. Create task with `reminder_minutes_before = 60`
2. Set `start_time` to 45 minutes from now
3. Trigger the Edge Function

**Expected Results:**
- Email is sent (45 min <= 60 min)
- Task is marked as `reminder_sent = true`

---

#### Test Case 1.3.2: Outside Reminder Window (Too Early)
**Test Steps:**
1. Create task with `reminder_minutes_before = 60`
2. Set `start_time` to 90 minutes from now
3. Trigger the Edge Function

**Expected Results:**
- Email is NOT sent (90 min > 60 min)
- Task is NOT marked as `reminder_sent = true`

---

#### Test Case 1.3.3: Past-Due Task/Event (Negative Hours)
**Test Steps:**
1. Create task with `reminder_enabled = true`
2. Set `start_time` to 30 minutes ago
3. Trigger the Edge Function

**Expected Results:**
- Email is NOT sent (hoursUntil < 0)
- Past-due tasks are excluded

---

#### Test Case 1.3.4: All-Day Event Reminder
**Test Steps:**
1. Create event with `all_day = true`
2. Set `start_date` = today
3. Set `reminder_minutes_before = 540` (9 hours)
4. Current time is 8 AM
5. Trigger the Edge Function

**Expected Results:**
- Event defaults to 9 AM start time
- Email is sent if within reminder window
- Date formatted as DD/MM/YYYY (Irish format)

---

### 1.4 Team Collaboration Tests

#### Test Case 1.4.1: Shared Hive - Task Creator Receives Email
**Preconditions:**
- User A creates a task for a shared hive
- Task has `reminder_enabled = true`

**Test Steps:**
1. User A creates task associated with shared hive
2. Task enters reminder window
3. Trigger the Edge Function

**Expected Results:**
- User A receives email (as task creator)

---

#### Test Case 1.4.2: Shared Hive - All Team Members Receive Email
**Preconditions:**
- Hive is shared (`is_shared = true`)
- Team members B and C have access via `team_hive_access`
- User A creates task for this shared hive
- Task has `reminder_enabled = true`

**Test Steps:**
1. User A creates task for shared hive
2. Task enters reminder window
3. Trigger the Edge Function

**Expected Results:**
- User A receives email (task creator)
- User B receives email (team member with access)
- User C receives email (team member with access)
- Hive owner receives email (if different from task creator)
- No duplicate emails sent to same user

---

#### Test Case 1.4.3: Non-Shared Hive - Only Task Creator Receives Email
**Preconditions:**
- Hive is NOT shared (`is_shared = false`)
- Task has `reminder_enabled = true`

**Test Steps:**
1. User A creates task for non-shared hive
2. Task enters reminder window
3. Trigger the Edge Function

**Expected Results:**
- ONLY User A receives email
- Team members do NOT receive email

---

#### Test Case 1.4.4: Task Without Hive Association
**Test Steps:**
1. Create task with `hive_id = null` and `apiary_id = null`
2. Set `reminder_enabled = true`
3. Task enters reminder window
4. Trigger the Edge Function

**Expected Results:**
- Only task creator receives email
- No team member checks performed
- Location field is empty in email

---

### 1.5 Email Content Tests

#### Test Case 1.5.1: Email HTML Format Verification
**Test Steps:**
1. Create task with all fields populated
2. Trigger email

**Expected Results:**
- Email subject: "🐝 Task & Event Reminders - X Upcoming"
- Email from: "HiveCraic <info@hivecraic.com>"
- HTML includes:
  - Header with gradient background
  - User's first name in greeting
  - Table with task details
  - Urgency color coding (red <= 2hr, orange <= 12hr, yellow <= 24hr, blue > 24hr)
  - Priority badges (🔴 urgent, 🟠 high, 🟡 normal, 🟢 low)
  - Type icons (✓ task, 📅 event, 🔔 reminder)
  - Footer with preferences link

---

#### Test Case 1.5.2: Multiple Tasks/Events in Single Email
**Test Steps:**
1. Create 5 tasks with different priorities and times
2. All within reminder window
3. Trigger the Edge Function

**Expected Results:**
- Single email sent with all 5 tasks
- Tasks sorted by urgency (earliest first)
- Subject shows correct count: "🐝 Task & Event Reminders - 5 Upcoming"

---

#### Test Case 1.5.3: Date Formatting (Irish Format)
**Test Steps:**
1. Create task with `start_date = '2025-12-25'`
2. Trigger email

**Expected Results:**
- Date displayed as "25/12/2025" (DD/MM/YYYY)
- Not displayed as "12/25/2025" (US format)

---

#### Test Case 1.5.4: Time Formatting
**Test Steps:**
1. Create task with `start_time = '14:30:00'`
2. Trigger email

**Expected Results:**
- Time displayed as "14:30" (24-hour format)
- Seconds removed

---

#### Test Case 1.5.5: Location Display - Hive
**Test Steps:**
1. Create task associated with hive_id
2. Hive has `hive_number = 'H-42'`
3. Trigger email

**Expected Results:**
- Location shows "📍 Hive H-42" in email

---

#### Test Case 1.5.6: Location Display - Apiary
**Test Steps:**
1. Create task associated with apiary_id
2. Apiary has `name = 'Backyard'`
3. Trigger email

**Expected Results:**
- Location shows "📍 Backyard" in email

---

### 1.6 Reminder Sent Flag Tests

#### Test Case 1.6.1: Flag Updated After Successful Email
**Test Steps:**
1. Create task with `reminder_sent = false`
2. Task enters reminder window
3. Email sends successfully
4. Check database

**Expected Results:**
- Task `reminder_sent` updated to `true`
- Task will not appear in future Edge Function runs

---

#### Test Case 1.6.2: Flag NOT Updated on Email Failure
**Test Steps:**
1. Create task with `reminder_sent = false`
2. Simulate Resend API failure
3. Trigger the Edge Function
4. Check database

**Expected Results:**
- Task `reminder_sent` remains `false`
- Task will appear in next Edge Function run

---

#### Test Case 1.6.3: Completed Tasks Excluded
**Test Steps:**
1. Create task with `reminder_enabled = true` and `completed = true`
2. Task in reminder window
3. Trigger the Edge Function

**Expected Results:**
- Completed task does NOT appear in email
- Query excludes `completed = true` tasks

---

#### Test Case 1.6.4: Already-Sent Reminders Excluded
**Test Steps:**
1. Create task with `reminder_sent = true`
2. Task still in reminder window
3. Trigger the Edge Function

**Expected Results:**
- Task does NOT appear in email
- Query excludes `reminder_sent = true` tasks

---

## 2. Weekly Email Digest for Queen Rearing Batches

**Edge Function:** `weekly-email-digest`
**Trigger:** Weekly cron job (typically Monday mornings)
**Purpose:** Send weekly summary of upcoming batch dates

### 2.1 Batch Selection Tests

#### Test Case 2.1.1: Batch with Email Digest Enabled
**Preconditions:**
- Batch has `enable_email_digest = true`

**Test Steps:**
1. Create batch with upcoming dates
2. Set `enable_email_digest = true`
3. Trigger the Edge Function

**Expected Results:**
- Batch events included in weekly digest email
- User receives email with batch information

---

#### Test Case 2.1.2: Batch with Email Digest Disabled
**Preconditions:**
- Batch has `enable_email_digest = false`

**Test Steps:**
1. Create batch with upcoming dates
2. Set `enable_email_digest = false`
3. Trigger the Edge Function

**Expected Results:**
- Batch events NOT included in digest
- Batch excluded from query results

---

#### Test Case 2.1.3: Multiple Batches from Same User
**Test Steps:**
1. User creates 3 batches
2. All have `enable_email_digest = true`
3. All have upcoming events in next 7 days
4. Trigger the Edge Function

**Expected Results:**
- Single email sent to user
- Email contains events from all 3 batches
- Events sorted by date (earliest first)

---

### 2.2 Date Range Tests (Next 7 Days)

#### Test Case 2.2.1: Event Within 7-Day Window
**Test Steps:**
1. Create batch with `acceptance_check_date` = today + 5 days
2. Set `enable_email_digest = true`
3. Trigger the Edge Function

**Expected Results:**
- Acceptance check date included in email
- Shows "In 5 days" urgency label

---

#### Test Case 2.2.2: Event Beyond 7-Day Window
**Test Steps:**
1. Create batch with `emergence_date` = today + 10 days
2. Set `enable_email_digest = true`
3. Trigger the Edge Function

**Expected Results:**
- Event NOT included in email
- Only events within 7-day window appear

---

#### Test Case 2.2.3: Event Today
**Test Steps:**
1. Create batch with `first_option_to_cage_date` = today
2. Set `enable_email_digest = true`
3. Trigger the Edge Function

**Expected Results:**
- Event included in email
- Urgency label shows "Today" in red color

---

#### Test Case 2.2.4: Event Tomorrow
**Test Steps:**
1. Create batch with `second_option_to_cage_date` = tomorrow
2. Set `enable_email_digest = true`
3. Trigger the Edge Function

**Expected Results:**
- Event included in email
- Urgency label shows "Tomorrow" in orange color

---

#### Test Case 2.2.5: Past Event
**Test Steps:**
1. Create batch with `acceptance_check_date` = yesterday
2. Set `enable_email_digest = true`
3. Trigger the Edge Function

**Expected Results:**
- Past event NOT included in email
- Only future events appear

---

### 2.3 Event Type Coverage Tests

#### Test Case 2.3.1: Acceptance Check Date
**Test Steps:**
1. Create batch with `acceptance_check_date` = today + 2 days
2. Trigger the Edge Function

**Expected Results:**
- Email includes row: "Acceptance Check | 07/12/2025 | In 2 days"

---

#### Test Case 2.3.2: First Option to Cage Date
**Test Steps:**
1. Create batch with `first_option_to_cage_date` = today + 4 days
2. Trigger the Edge Function

**Expected Results:**
- Email includes row: "1st Option to Cage | 09/12/2025 | In 4 days"

---

#### Test Case 2.3.3: Second Option to Cage Date
**Test Steps:**
1. Create batch with `second_option_to_cage_date` = today + 5 days
2. Trigger the Edge Function

**Expected Results:**
- Email includes row: "2nd Option to Cage | 10/12/2025 | In 5 days"

---

#### Test Case 2.3.4: Expected Hatch Date (Emergence Date)
**Test Steps:**
1. Create batch with `emergence_date` = today + 6 days
2. Trigger the Edge Function

**Expected Results:**
- Email includes row: "Expected Hatch Date | 11/12/2025 | In 6 days"

---

#### Test Case 2.3.5: Batch with Null Dates
**Test Steps:**
1. Create batch with only `acceptance_check_date` set
2. All other dates are `null`
3. Trigger the Edge Function

**Expected Results:**
- Email includes only acceptance check date
- Null dates are excluded from email

---

#### Test Case 2.3.6: Batch with Multiple Upcoming Dates
**Test Steps:**
1. Create batch "Batch-A"
2. Set `acceptance_check_date` = today
3. Set `first_option_to_cage_date` = today + 3 days
4. Set `emergence_date` = today + 6 days
5. Trigger the Edge Function

**Expected Results:**
- Email includes all 3 events for Batch-A
- Events sorted by date (earliest first)

---

### 2.4 Email Content Tests

#### Test Case 2.4.1: Email HTML Format Verification
**Test Steps:**
1. Create batch with upcoming events
2. Trigger email

**Expected Results:**
- Email subject: "🐝 Weekly Queen Rearing Digest - X Upcoming Event(s)"
- Email from: "HiveCraic <info@hivecraic.com>"
- HTML includes:
  - Yellow gradient header with 🐝 icon
  - User's first name in greeting
  - Table with batch name, event type, date, timing
  - Color-coded urgency labels
  - "3-5-8 - The Queen is made!" reminder
  - Footer with preferences link

---

#### Test Case 2.4.2: Urgency Color Coding
**Test Steps:**
1. Create batch with events at different times
2. Trigger email

**Expected Results:**
- "Today" = Red background (#dc2626)
- "Tomorrow" = Orange background (#ea580c)
- "In 2-3 days" = Yellow background (#ca8a04)
- "In 4+ days" = Blue background (#2563eb)

---

#### Test Case 2.4.3: User Without Upcoming Events
**Test Steps:**
1. User has batch with `enable_email_digest = true`
2. All dates are beyond 7-day window
3. Trigger the Edge Function

**Expected Results:**
- User does NOT receive email
- No email sent for batches with no upcoming events

---

### 2.5 Multi-User Tests

#### Test Case 2.5.1: Two Users with Separate Batches
**Test Steps:**
1. User A creates Batch A with upcoming events
2. User B creates Batch B with upcoming events
3. Both have `enable_email_digest = true`
4. Trigger the Edge Function

**Expected Results:**
- User A receives email with ONLY Batch A events
- User B receives email with ONLY Batch B events
- No cross-user data leakage

---

#### Test Case 2.5.2: User with No Batches
**Test Steps:**
1. User has no batches created
2. Trigger the Edge Function

**Expected Results:**
- User does NOT receive email
- User excluded from email sending

---

## 3. Team Invitation Emails

**Edge Function:** `send-team-invitation`
**Trigger:** Manual invocation when user sends team invitation
**Purpose:** Send invitation email to join a team

### 3.1 Basic Invitation Tests

#### Test Case 3.1.1: Valid Invitation with All Fields
**Test Steps:**
1. Call Edge Function with:
   - `invitationId`: valid UUID
   - `inviteeEmail`: "newuser@example.com"
   - `teamName`: "My Beekeeping Team"
   - `inviterName`: "John Doe"
   - `inviterEmail`: "john@example.com"
   - `expiresAt`: 7 days from now

**Expected Results:**
- Email sent successfully
- HTTP 200 response with `success: true`
- Email includes accept/decline buttons
- Expiry date formatted as "DD Month YYYY"

---

#### Test Case 3.1.2: Missing Required Fields
**Test Steps:**
1. Call Edge Function without `invitationId`

**Expected Results:**
- HTTP 400 response
- Error: "Missing required fields"
- No email sent

---

#### Test Case 3.1.3: Inviter Name is Null
**Test Steps:**
1. Call Edge Function with `inviterName = null`
2. Provide `inviterEmail`

**Expected Results:**
- Email uses `inviterEmail` instead of name
- Email content shows "inviteemail@example.com has invited you..."

---

### 3.2 Email Content Tests

#### Test Case 3.2.1: Accept URL Format
**Test Steps:**
1. Send invitation
2. Check email content

**Expected Results:**
- Accept URL: `https://www.hivecraic.com/accept-invitation?id={invitationId}`
- Button styled in green (#10b981)

---

#### Test Case 3.2.2: Decline URL Format
**Test Steps:**
1. Send invitation
2. Check email content

**Expected Results:**
- Decline URL: `https://www.hivecraic.com/decline-invitation?id={invitationId}`
- Button styled in gray (#6b7280)

---

#### Test Case 3.2.3: New User Instructions
**Test Steps:**
1. Send invitation
2. Check email content

**Expected Results:**
- Yellow warning box present
- Instructions for new users to sign up
- Emphasis on using correct email address
- Instructions in both HTML and plain text versions

---

#### Test Case 3.2.4: Plain Text Version
**Test Steps:**
1. Send invitation
2. Check plain text content

**Expected Results:**
- Plain text version included
- All URLs in plain text
- Formatting readable without HTML

---

### 3.3 Expiry Date Tests

#### Test Case 3.3.1: Date Formatting (Irish Format)
**Test Steps:**
1. Send invitation with `expiresAt = '2025-12-25T00:00:00Z'`

**Expected Results:**
- Date formatted as "25 December 2025"
- Irish locale used (en-IE)

---

## 4. Batch Event Email Reminders

**Feature:** Auto-created batch events with individual email reminders
**Integration:** Works with `task-event-reminders` Edge Function

### 4.1 Batch Creation with Email Reminders

#### Test Case 4.1.1: Create Batch with Email Reminders Enabled
**Test Steps:**
1. Create new batch
2. Set `enable_batch_event_reminders = true`
3. Set `batch_reminder_minutes_before = 60`
4. Save batch

**Expected Results:**
- All auto-created events have `reminder_enabled = true`
- All auto-created events have `reminder_minutes_before = 60`
- Events: Acceptance Check, 1st Cage Option, 2nd Cage Option, Expected Emergence

---

#### Test Case 4.1.2: Create Batch with Email Reminders Disabled
**Test Steps:**
1. Create new batch
2. Set `enable_batch_event_reminders = false`
3. Save batch

**Expected Results:**
- All auto-created events have `reminder_enabled = false`
- No email reminders sent for these events

---

#### Test Case 4.1.3: Custom Reminder Lead Time
**Test Steps:**
1. Create new batch
2. Set `enable_batch_event_reminders = true`
3. Set `batch_reminder_minutes_before = 240` (4 hours)
4. Save batch

**Expected Results:**
- All auto-created events have `reminder_minutes_before = 240`
- Emails sent 4 hours before each event

---

#### Test Case 4.1.4: Default Lead Time When Not Specified
**Test Steps:**
1. Create new batch
2. Set `enable_batch_event_reminders = true`
3. Do NOT specify `batch_reminder_minutes_before`
4. Save batch

**Expected Results:**
- All auto-created events have `reminder_minutes_before = 60` (default)

---

### 4.2 Batch Update Tests

#### Test Case 4.2.1: Update Existing Batch to Enable Reminders
**Preconditions:**
- Batch exists with `enable_batch_event_reminders = false`

**Test Steps:**
1. Edit batch
2. Set `enable_batch_event_reminders = true`
3. Set `batch_reminder_minutes_before = 120`
4. Save batch

**Expected Results:**
- Existing auto-created events updated with `reminder_enabled = true`
- Existing events updated with `reminder_minutes_before = 120`
- Database trigger function `sync_batch_dates_to_tasks` handles updates

---

#### Test Case 4.2.2: Update Existing Batch to Disable Reminders
**Preconditions:**
- Batch exists with `enable_batch_event_reminders = true`

**Test Steps:**
1. Edit batch
2. Set `enable_batch_event_reminders = false`
3. Save batch

**Expected Results:**
- All associated events updated with `reminder_enabled = false`
- No future emails sent for these events

---

#### Test Case 4.2.3: Change Lead Time on Existing Batch
**Preconditions:**
- Batch exists with `batch_reminder_minutes_before = 60`

**Test Steps:**
1. Edit batch
2. Change `batch_reminder_minutes_before = 180`
3. Save batch

**Expected Results:**
- All associated events updated with `reminder_minutes_before = 180`

---

### 4.3 Email Badge Display Tests

#### Test Case 4.3.1: Email Badge Shows for Batch Events
**Test Steps:**
1. Create batch with `enable_batch_event_reminders = true`
2. View Tasks & Events page
3. Locate auto-created batch events

**Expected Results:**
- Each event displays "📧 Email Reminder" badge
- Badge styled with amber colors
- Badge visible on both mobile and desktop views

---

#### Test Case 4.3.2: Email Badge Hidden When Reminders Disabled
**Test Steps:**
1. Create batch with `enable_batch_event_reminders = false`
2. View Tasks & Events page

**Expected Results:**
- No "📧 Email Reminder" badge displayed
- Badge only shown when `reminder_enabled = true`

---

### 4.4 Integration with Task-Event-Reminders Function

#### Test Case 4.4.1: Batch Event Triggers Email at Correct Time
**Test Steps:**
1. Create batch with `enable_batch_event_reminders = true`
2. Set `batch_reminder_minutes_before = 60`
3. Set `acceptance_check_date` = today + 1 hour
4. Trigger `task-event-reminders` Edge Function

**Expected Results:**
- Email sent with acceptance check event
- Event marked as `reminder_sent = true`
- Email contains batch event details

---

#### Test Case 4.4.2: Multiple Batch Events in Same Email
**Test Steps:**
1. Create batch with multiple dates within 24 hours
2. All events have `reminder_enabled = true`
3. Trigger `task-event-reminders` Edge Function

**Expected Results:**
- Single email sent with all batch events
- Events grouped with user's other tasks/events
- Events sorted by urgency

---

## 5. Edge Function Execution Tests

### 5.1 Manual Trigger Tests

#### Test Case 5.1.1: Invoke task-event-reminders via Dashboard
**Test Steps:**
1. Navigate to Supabase Dashboard
2. Go to Edge Functions
3. Select `task-event-reminders`
4. Click "Invoke now"
5. Check response

**Expected Results:**
- HTTP 200 response
- JSON response includes:
  - `success: true`
  - `emailsSent: X`
  - `emails: [array of email addresses]`
  - `remindersMarkedSent: X`

---

#### Test Case 5.1.2: Invoke weekly-email-digest via Dashboard
**Test Steps:**
1. Navigate to Supabase Dashboard
2. Go to Edge Functions
3. Select `weekly-email-digest`
4. Click "Invoke now"
5. Check response

**Expected Results:**
- HTTP 200 response
- JSON response includes:
  - `success: true`
  - `emailsSent: X`
  - `emails: [array of email addresses]`

---

#### Test Case 5.1.3: No Users Found for Reminders
**Test Steps:**
1. Disable all user preferences for email reminders
2. Invoke `task-event-reminders`

**Expected Results:**
- HTTP 200 response
- Message: "No users with email reminders enabled"
- No emails sent

---

#### Test Case 5.1.4: No Upcoming Events Found
**Test Steps:**
1. User has reminders enabled
2. No tasks/events in reminder window
3. Invoke `task-event-reminders`

**Expected Results:**
- HTTP 200 response
- Message: "No upcoming events with reminders"
- No emails sent

---

### 5.2 Cron Job Tests

#### Test Case 5.2.1: Hourly Execution of task-event-reminders
**Preconditions:**
- Cron job configured: `0 * * * *` (every hour at minute 0)

**Test Steps:**
1. Wait for cron trigger
2. Check Supabase logs at :00 minutes
3. Verify execution

**Expected Results:**
- Function executes automatically at minute 0 of each hour
- Execution logged in Edge Function logs

---

#### Test Case 5.2.2: Weekly Execution of weekly-email-digest
**Preconditions:**
- Cron job configured: Weekly schedule

**Test Steps:**
1. Wait for scheduled execution day
2. Check Supabase logs
3. Verify execution

**Expected Results:**
- Function executes automatically on scheduled day
- Execution logged in Edge Function logs

---

### 5.3 Error Handling Tests

#### Test Case 5.3.1: Resend API Key Missing
**Test Steps:**
1. Remove `RESEND_API_KEY` environment variable
2. Invoke Edge Function

**Expected Results:**
- Function executes without error
- Emails logged to console (simulated mode)
- Response includes `(simulated)` suffix on email addresses

---

#### Test Case 5.3.2: Resend API Returns Error
**Test Steps:**
1. Simulate Resend API returning 400 error
2. Invoke Edge Function

**Expected Results:**
- Error captured and logged
- Response includes `errors` array with error details
- Failed email addresses listed
- Function continues processing remaining users

---

#### Test Case 5.3.3: Database Connection Failure
**Test Steps:**
1. Simulate database unavailable
2. Invoke Edge Function

**Expected Results:**
- HTTP 500 response
- Error message in response body
- Error logged to console

---

#### Test Case 5.3.4: Invalid Email Address
**Test Steps:**
1. User profile has invalid email format
2. Invoke Edge Function

**Expected Results:**
- Resend API rejects email
- Error captured in `errors` array
- Function continues processing other users

---

## 6. Integration Tests

### 6.1 End-to-End User Flows

#### Test Case 6.1.1: Complete Task Reminder Flow
**Test Steps:**
1. User enables task email reminders in profile
2. User sets frequency to "realtime"
3. User creates task with reminder enabled
4. Set reminder for 1 hour before
5. Wait for cron job execution
6. Check email inbox

**Expected Results:**
- User receives email reminder
- Email contains correct task details
- Task marked as reminder_sent in database
- No duplicate emails sent

---

#### Test Case 6.1.2: Complete Batch Digest Flow
**Test Steps:**
1. User creates batch
2. User enables weekly email digest
3. Batch has dates in next 7 days
4. Wait for weekly cron job
5. Check email inbox

**Expected Results:**
- User receives weekly digest email
- Email contains upcoming batch dates
- Correct urgency labels displayed

---

#### Test Case 6.1.3: Complete Team Invitation Flow
**Test Steps:**
1. User A invites User B to team
2. Invitation email sent via Edge Function
3. User B receives email
4. User B clicks "Accept Invitation"
5. User B redirected to app

**Expected Results:**
- Email received with correct details
- Accept link works correctly
- User B added to team successfully

---

### 6.2 Cross-Feature Tests

#### Test Case 6.2.1: User Receives Both Task Reminder and Batch Digest
**Test Steps:**
1. User has task reminders enabled
2. User has batch with email digest enabled
3. Create task due tomorrow
4. Create batch with date tomorrow
5. Trigger both Edge Functions

**Expected Results:**
- User receives TWO separate emails:
  1. Task reminder email (task-event-reminders)
  2. Weekly batch digest (weekly-email-digest)
- Emails have different content and subjects

---

#### Test Case 6.2.2: Batch Events Show in Task Reminder Email
**Test Steps:**
1. User creates batch with `enable_batch_event_reminders = true`
2. Batch has acceptance check date tomorrow
3. User also has manual task tomorrow
4. Trigger `task-event-reminders`

**Expected Results:**
- Single email sent containing:
  - Manual task
  - Batch acceptance check event
- Both sorted by urgency

---

### 6.3 Data Consistency Tests

#### Test Case 6.3.1: Batch Date Change Updates Events
**Test Steps:**
1. Create batch with `acceptance_check_date = '2025-12-10'`
2. Auto-created event has `start_date = '2025-12-10'`
3. Edit batch, change `acceptance_check_date = '2025-12-15'`
4. Save batch

**Expected Results:**
- Event `start_date` updated to `2025-12-15`
- Database trigger `sync_batch_dates_to_tasks` handles update
- Reminder sent based on new date

---

#### Test Case 6.3.2: Batch Deletion Removes Events
**Test Steps:**
1. Create batch with email reminders enabled
2. 4 auto-created events exist
3. Delete batch

**Expected Results:**
- All associated events deleted (cascade)
- No orphaned reminder emails sent

---

## Test Execution Guidelines

### Pre-Test Setup
1. Verify Supabase database is accessible
2. Verify Resend API key is configured
3. Verify Edge Functions are deployed
4. Create test user accounts with known email addresses
5. Set up email forwarding or test mailbox

### Test Data Cleanup
- After each test, reset test data to avoid interference
- Mark test emails as `reminder_sent = false` for re-testing
- Delete test batches, tasks, and events

### Test Environment
- **Development:** Use test email addresses (e.g., yourname+test@gmail.com)
- **Staging:** Test with real email addresses but limited recipients
- **Production:** Use extreme caution, test with own email only

### Expected Response Times
- Edge Function execution: < 10 seconds for single user
- Edge Function execution: < 60 seconds for 50+ users
- Email delivery: < 30 seconds via Resend API

---

## Known Limitations

1. **Hourly Execution Window:** Tasks entering reminder window between cron executions will wait until next hour
2. **Email Delivery Delays:** Resend API may have delays; not guaranteed instant delivery
3. **Browser Notification API:** Not related to email, but users may confuse browser notifications with email notifications
4. **iOS Push Limitations:** Web push notifications not supported on iOS Safari (email fallback important)

---

## Test Results Template

Use this template to document test execution:

```
Test Case ID: [e.g., 1.1.1]
Test Case Name: [e.g., User Has Task Reminders Enabled]
Test Date: [YYYY-MM-DD]
Tester: [Name]
Environment: [Development/Staging/Production]

Result: [PASS/FAIL/BLOCKED]

Actual Results:
[Describe what actually happened]

Notes:
[Any additional observations]

Screenshots/Logs:
[Attach or link to evidence]
```

---

## Appendix: SQL Queries for Testing

### Check User Email Preferences
```sql
SELECT id, email, first_name, enable_task_email_reminders,
       enable_event_email_reminders, task_reminder_frequency
FROM profiles
WHERE email = 'test@example.com';
```

### Check Task Reminders Within Window
```sql
SELECT id, title, start_date, start_time, reminder_enabled,
       reminder_minutes_before, reminder_sent
FROM tasks_events
WHERE user_id = 'user-uuid'
  AND reminder_enabled = true
  AND reminder_sent = false
  AND completed = false
  AND start_date >= CURRENT_DATE
ORDER BY start_date, start_time;
```

### Check Batches with Email Digest Enabled
```sql
SELECT id, batch_name, acceptance_check_date, first_option_to_cage_date,
       second_option_to_cage_date, emergence_date, enable_email_digest
FROM rearing_batches
WHERE user_id = 'user-uuid'
  AND enable_email_digest = true;
```

### Check Batch Event Reminder Settings
```sql
SELECT b.batch_name, b.enable_batch_event_reminders,
       b.batch_reminder_minutes_before,
       te.title, te.reminder_enabled, te.reminder_minutes_before
FROM rearing_batches b
JOIN tasks_events te ON te.batch_id = b.id
WHERE b.id = 'batch-uuid';
```

### Check Team Hive Access for Shared Reminders
```sql
SELECT h.hive_number, h.is_shared, t.user_id, t.team_member_id
FROM hives h
LEFT JOIN team_hive_access t ON t.hive_id = h.id
WHERE h.id = 'hive-uuid';
```

### Reset Reminder Sent Flags (For Re-Testing)
```sql
UPDATE tasks_events
SET reminder_sent = false
WHERE user_id = 'user-uuid'
  AND start_date >= CURRENT_DATE;
```

---

**End of Test Cases Document**
