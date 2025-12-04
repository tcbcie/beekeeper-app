# Task and Event Email Reminders Edge Function

This Supabase Edge Function sends email reminders for upcoming tasks and events based on user preferences configured in their profile settings.

## Features

- Sends personalized email reminders for tasks and events
- Respects user preferences (tasks vs events, frequency)
- Three frequency options: **Realtime** (hourly), **Daily**, **Weekly**
- Color-coded urgency indicators (red=urgent, orange=soon, yellow=upcoming, blue=future)
- Irish date format (DD/MM/YYYY)
- Includes priority badges and location context (hive/apiary)
- Automatically marks reminders as sent to prevent duplicates
- Only sends reminders for incomplete tasks/events

## User Preferences

Users can configure their email reminder preferences in the **Profile Settings** page:

- **Enable Task Email Reminders**: Receive reminders for tasks and to-do items
- **Enable Event Email Reminders**: Receive reminders for calendar events
- **Reminder Frequency**:
  - `realtime`: Check every hour for reminders in next 24 hours
  - `daily`: Send once per day for tasks/events in next 2 days
  - `weekly`: Send once per week for tasks/events in next 7 days
  - `disabled`: No email reminders

## Setup

### 1. Deploy the Edge Function

```bash
supabase functions deploy task-event-reminders
```

### 2. Set Environment Variables

Required environment variables (automatically available in Supabase):

```bash
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=re_xxxxxxxxxx  # Optional: For sending emails
```

To set the Resend API key:

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxx
```

### 3. Schedule Cron Jobs

Schedule the function based on user frequency preferences:

#### Realtime (Hourly)
```sql
SELECT cron.schedule(
  'task-event-reminders-hourly',
  '0 * * * *', -- Every hour
  $$
  SELECT
    net.http_post(
      url:='https://your-project-ref.supabase.co/functions/v1/task-event-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    ) AS request_id;
  $$
);
```

#### Daily
```sql
SELECT cron.schedule(
  'task-event-reminders-daily',
  '0 8 * * *', -- Every day at 8 AM UTC
  $$
  SELECT
    net.http_post(
      url:='https://your-project-ref.supabase.co/functions/v1/task-event-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    ) AS request_id;
  $$
);
```

#### Weekly
```sql
SELECT cron.schedule(
  'task-event-reminders-weekly',
  '0 8 * * 1', -- Every Monday at 8 AM UTC
  $$
  SELECT
    net.http_post(
      url:='https://your-project-ref.supabase.co/functions/v1/task-event-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    ) AS request_id;
  $$
);
```

**Recommendation**: Run hourly to support all frequency types. The function intelligently filters based on each user's preference.

## How It Works

1. **Fetch Profiles**: Queries users with task/event email reminders enabled
2. **Calculate Reminder Window**: Based on user frequency and reminder_minutes_before setting
3. **Get Upcoming Tasks/Events**: Finds incomplete items with reminders enabled that haven't been sent
4. **Filter by Preferences**: Respects individual task vs event preferences
5. **Fetch Context**: Gets hive/apiary names for location information
6. **Generate HTML**: Creates responsive, branded email with priority indicators
7. **Send Emails**: Uses Resend API to deliver emails
8. **Mark as Sent**: Updates `reminder_sent = true` to prevent duplicates

## Email Content

The email includes:

- **Header**: Branded HiveCraic header with digest type (Daily/Weekly/Upcoming)
- **Summary**: Count of upcoming reminders
- **Reminders Table**:
  - Title and description
  - Category (inspection, treatment, feeding, etc.)
  - Priority indicator (🔴 urgent, 🟠 high, 🟡 normal, 🟢 low)
  - Date/time (Irish format)
  - Urgency badge (color-coded hours/days until due)
  - Location (hive or apiary if linked)
- **Footer**: Manage preferences link

## Database Schema

### Required Tables

#### `profiles`
- `enable_task_email_reminders` (BOOLEAN)
- `enable_event_email_reminders` (BOOLEAN)
- `task_reminder_frequency` (VARCHAR: 'realtime', 'daily', 'weekly', 'disabled')

#### `tasks_events`
- `reminder_enabled` (BOOLEAN)
- `reminder_minutes_before` (INTEGER)
- `reminder_sent` (BOOLEAN)

## Testing

### Manual Test
```bash
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/task-event-reminders' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

### Local Development
```bash
supabase functions serve task-event-reminders
```

Then in another terminal:
```bash
curl -X POST 'http://localhost:54321/functions/v1/task-event-reminders' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json'
```

## Response Format

Success response:
```json
{
  "success": true,
  "emailsSent": 5,
  "emails": ["user1@example.com", "user2@example.com"],
  "remindersMarkedSent": 12,
  "errors": []
}
```

## Troubleshooting

### No emails sending
1. Check `RESEND_API_KEY` is configured
2. Verify domain is verified in Resend dashboard
3. Check Edge Function logs in Supabase Dashboard

### Users not receiving reminders
1. Verify user has email preferences enabled in profile
2. Check task/event has `reminder_enabled = true`
3. Ensure `reminder_sent = false`
4. Verify `start_date` is within reminder window

### Cron job not running
1. Check `pg_cron` extension is enabled
2. View scheduled jobs: `SELECT * FROM cron.job;`
3. Check execution history: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`

## Cost Considerations

- **Resend Free Tier**: 100 emails/day, 3,000 emails/month
- **Supabase Edge Functions**: 500K invocations/month (free tier)
- **Recommended**: Start with hourly execution to support all frequency types

## Security

- Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS (required for cron jobs)
- Email addresses fetched from `profiles` table
- Users can disable reminders in profile settings
- Reminders marked as sent to prevent spam

## Future Enhancements

- SMS reminders via Twilio
- Push notifications for mobile devices
- Digest summaries (combine multiple reminders into one email)
- Custom reminder templates
- Email open/click tracking
- Snooze functionality
