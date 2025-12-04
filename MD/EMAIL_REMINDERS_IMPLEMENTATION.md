# Email Reminders Implementation - Complete Guide

## Overview

The HiveCraic application now includes two comprehensive email reminder systems:

1. **Queen Rearing Weekly Digest** - Weekly summary of upcoming queen rearing dates
2. **Task & Event Email Reminders** - Configurable reminders for tasks and events

Both systems use Supabase Edge Functions, pg_cron for scheduling, and Resend API for email delivery.

---

## 1. Queen Rearing Weekly Digest

### Status: ✅ **FULLY IMPLEMENTED AND ACTIVE**

### Features
- Weekly email digest sent **every Monday at 8:00 AM UTC**
- Includes upcoming events for next 7 days:
  - Acceptance Check
  - 1st Option to Cage
  - 2nd Option to Cage
  - Expected Hatch Date
- Color-coded urgency badges
- Irish date format (DD/MM/YYYY)
- Opt-in per batch

### User Configuration
Users enable the digest per batch in the **Queen Rearing/Batches** page:
- Checkbox: "Include in Weekly Email Digest"

### Technical Details

**Edge Function:** `supabase/functions/weekly-email-digest/`
- Deployed and active
- Uses Resend API (from: info@hivecraic.com)

**Database:**
- Column: `rearing_batches.enable_email_digest` (boolean, default: false)

**Cron Job:**
```sql
Job ID: 1
Name: weekly-queen-rearing-digest
Schedule: 0 8 * * 1 (Every Monday 8 AM UTC)
Status: ACTIVE
```

**Documentation:** `supabase/functions/weekly-email-digest/README.md`

---

## 2. Task & Event Email Reminders

### Status: ✅ **FULLY IMPLEMENTED AND ACTIVE**

### Features
- Personalized email reminders for tasks and events
- Three frequency options:
  - **Realtime** (hourly check for next 24 hours)
  - **Daily** (once per day for next 2 days)
  - **Weekly** (once per week for next 7 days)
  - **Disabled** (no email reminders)
- Separate toggles for tasks vs events
- Priority indicators (🔴 urgent, 🟠 high, 🟡 normal, 🟢 low)
- Location context (hive/apiary names)
- Color-coded urgency badges
- Automatically marks reminders as sent

### User Configuration
Users manage preferences in **Profile Settings → Additional Settings → Email Notifications**:

**Available Options:**
1. **Enable Task Email Reminders** (toggle)
   - Receive reminders for tasks and to-do items

2. **Enable Event Email Reminders** (toggle)
   - Receive reminders for calendar events

3. **Reminder Frequency** (dropdown)
   - Realtime: Checks every hour for reminders in next 24 hours
   - Daily: Sends once per day for tasks/events in next 2 days
   - Weekly: Sends once per week for tasks/events in next 7 days
   - Disabled: No email reminders

### Technical Details

#### Database Schema

**New Columns in `profiles` table:**
```sql
enable_task_email_reminders    BOOLEAN   DEFAULT true
enable_event_email_reminders   BOOLEAN   DEFAULT true
task_reminder_frequency        VARCHAR   DEFAULT 'daily'
  CHECK (task_reminder_frequency IN ('realtime', 'daily', 'weekly', 'disabled'))
```

**Existing Columns in `tasks_events` table:**
```sql
reminder_enabled              BOOLEAN   DEFAULT false
reminder_minutes_before       INTEGER   DEFAULT 60
reminder_sent                 BOOLEAN   DEFAULT false
```

#### Edge Function

**Location:** `supabase/functions/task-event-reminders/`

**Deployment:**
```bash
supabase functions deploy task-event-reminders
```

**How It Works:**
1. Fetches users with email reminders enabled
2. Calculates reminder window based on frequency preference
3. Queries incomplete tasks/events with reminders enabled
4. Filters by user preferences (tasks vs events)
5. Fetches hive/apiary names for location context
6. Generates branded HTML email with priority/urgency indicators
7. Sends email via Resend API
8. Marks reminders as sent (`reminder_sent = true`)

#### Cron Job

```sql
Job ID: 2
Name: task-event-reminders-hourly
Schedule: 0 * * * * (Every hour on the hour)
Status: ACTIVE
URL: https://tbhofdmfzwibysnnssnx.supabase.co/functions/v1/task-event-reminders
```

**Why Hourly?**
Running hourly supports all three frequency types (realtime, daily, weekly). The Edge Function intelligently filters based on each user's preference.

#### Email Content

The reminder email includes:
- **Header**: Branded HiveCraic header with digest type
- **Summary**: Count of upcoming reminders
- **Reminders Table**:
  - Title and description
  - Category (inspection, treatment, feeding, etc.)
  - Priority indicator (colored emoji)
  - Date/time in Irish format
  - Urgency badge (hours/days until due)
  - Location (hive or apiary if linked)
- **Footer**: Link to manage preferences

---

## Email Service Configuration

### Resend API

**Service:** Resend ([resend.com](https://resend.com))

**Configuration:**
- Verified domain: hivecraic.com
- From address: info@hivecraic.com
- API Key: Stored in Supabase secrets as `RESEND_API_KEY`

**Free Tier Limits:**
- 100 emails/day
- 3,000 emails/month

**Setting API Key:**
```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxx
```

---

## Database Migrations

All migrations are located in `sql/migrations/`:

1. **20241204_add_email_notification_preferences.sql**
   - Adds email preference columns to profiles table
   - Creates index for efficient querying

2. **20241204_schedule_task_event_reminders_cron.sql**
   - Schedules hourly cron job for task/event reminders

---

## Testing

### Manual Testing

#### Test Queen Rearing Digest:
```bash
curl -X POST 'https://tbhofdmfzwibysnnssnx.supabase.co/functions/v1/weekly-email-digest' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

#### Test Task/Event Reminders:
```bash
curl -X POST 'https://tbhofdmfzwibysnnssnx.supabase.co/functions/v1/task-event-reminders' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

### Verify Cron Jobs

```sql
-- View all scheduled jobs
SELECT jobid, jobname, schedule, active
FROM cron.job
ORDER BY jobname;

-- View cron job execution history
SELECT
  jobid,
  runid,
  job_pid,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobid IN (1, 2) -- Queen rearing and task/event jobs
ORDER BY start_time DESC
LIMIT 20;
```

### Test Data Setup

To test the system, create some test data:

```sql
-- Enable email reminders for a user
UPDATE profiles
SET
  enable_task_email_reminders = true,
  enable_event_email_reminders = true,
  task_reminder_frequency = 'realtime'
WHERE email = 'your.email@example.com';

-- Create a test task with reminder
INSERT INTO tasks_events (
  user_id,
  title,
  description,
  event_type,
  category,
  priority,
  start_date,
  start_time,
  reminder_enabled,
  reminder_minutes_before,
  completed
) VALUES (
  'your-user-id',
  'Test Hive Inspection',
  'Check for queen cells and varroa',
  'task',
  'inspection',
  'high',
  CURRENT_DATE + INTERVAL '2 hours',
  CURRENT_TIME + INTERVAL '2 hours',
  true,
  120, -- 2 hours before
  false
);
```

---

## Troubleshooting

### Emails Not Sending

**Check Resend API Key:**
```bash
supabase secrets list
```

**Verify Resend Configuration:**
1. Login to Resend dashboard
2. Confirm domain verification status
3. Check API key is valid
4. Review sending logs

**Check Edge Function Logs:**
1. Go to Supabase Dashboard
2. Navigate to Edge Functions
3. Select function and view logs
4. Look for errors or warnings

### Cron Jobs Not Running

**Verify pg_cron Extension:**
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

**Check Cron Job Status:**
```sql
SELECT * FROM cron.job WHERE jobname LIKE '%reminder%';
```

**View Execution History:**
```sql
SELECT *
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

**Common Issues:**
- Extension not enabled: `CREATE EXTENSION pg_cron;`
- Job inactive: `UPDATE cron.job SET active = true WHERE jobname = 'job-name';`
- Wrong URL or auth token in job command

### Users Not Receiving Reminders

**Verify User Preferences:**
```sql
SELECT
  id,
  email,
  enable_task_email_reminders,
  enable_event_email_reminders,
  task_reminder_frequency
FROM profiles
WHERE email = 'user@example.com';
```

**Check Task/Event Settings:**
```sql
SELECT
  id,
  title,
  start_date,
  start_time,
  reminder_enabled,
  reminder_sent,
  completed
FROM tasks_events
WHERE user_id = 'user-id'
AND reminder_enabled = true
ORDER BY start_date;
```

**Verify Reminder Window:**
- Realtime: Task must be within next 24 hours
- Daily: Task must be within next 2 days
- Weekly: Task must be within next 7 days
- `reminder_sent` must be `false`
- `completed` must be `false`

### Reset Reminder Sent Flags

If you need to resend reminders (for testing):
```sql
UPDATE tasks_events
SET reminder_sent = false
WHERE user_id = 'user-id'
AND reminder_enabled = true;
```

---

## Cost Analysis

### Resend Free Tier
- **Limit**: 100 emails/day, 3,000/month
- **Estimated Usage**:
  - 50 users with task reminders: ~50 emails/hour = 1,200/day (exceeds free tier)
  - 50 users with weekly digest: 50 emails/week = 200/month ✅

**Recommendation**: Monitor usage and upgrade to paid plan if needed.

### Supabase
- **Edge Functions**: 500K invocations/month (free tier) ✅
- **Cron Jobs**: No additional cost ✅
- **Database**: Standard usage ✅

---

## Future Enhancements

### Short Term
- [ ] Add email digest preview in app before sending
- [ ] Track email open rates and click-through rates
- [ ] Support custom reminder messages per task
- [ ] Add snooze functionality for reminders

### Medium Term
- [ ] SMS reminders via Twilio
- [ ] Push notifications for mobile devices
- [ ] Custom email templates with user branding
- [ ] Batch multiple reminders into single digest

### Long Term
- [ ] AI-powered reminder suggestions
- [ ] Integration with Google Calendar reminders
- [ ] Remind team members of shared tasks
- [ ] Voice reminders via phone call

---

## Changelog

### v1.4.6 (December 4, 2025)
- ✅ Implemented task and event email reminders
- ✅ Added user preferences in profile settings
- ✅ Created Edge Function for reminder delivery
- ✅ Scheduled hourly cron job
- ✅ Added database columns for preferences
- ✅ Updated UI with toggles and frequency selector

### Previous Versions
- v1.4.3: Implemented queen rearing weekly digest

---

## Support

For issues or questions:
1. Check Edge Function logs in Supabase Dashboard
2. Verify cron job execution history
3. Review Resend sending logs
4. Check user preferences in database
5. Test manually using curl commands above

---

## Documentation References

- **Queen Rearing Digest**: `supabase/functions/weekly-email-digest/README.md`
- **Task/Event Reminders**: `supabase/functions/task-event-reminders/README.md`
- **Resend API Docs**: https://resend.com/docs
- **pg_cron Docs**: https://github.com/citusdata/pg_cron
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
