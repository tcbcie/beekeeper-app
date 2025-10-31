# Weekly Email Digest Edge Function

This Supabase Edge Function sends weekly email summaries of upcoming queen rearing dates to users who have enabled the email digest option for their batches.

## Features

- Sends weekly digest emails with upcoming events (next 7 days)
- Includes 4 event types: Acceptance Check, 1st Option to Cage, 2nd Option to Cage, Expected Hatch Date
- Color-coded urgency indicators (red for today, orange for tomorrow, yellow for 2-3 days, blue for 4-7 days)
- Irish date format (DD/MM/YYYY)
- Only sends to users with batches that have `enable_email_digest = true`
- Only includes events that are within the next 7 days

## Setup

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Deploy the Edge Function

```bash
supabase functions deploy weekly-email-digest
```

### 3. Set Environment Variables

Set the required environment variables in your Supabase project:

```bash
# Required: Supabase credentials (automatically available)
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Resend API key for sending emails
# Sign up at https://resend.com (free tier: 100 emails/day)
RESEND_API_KEY=re_xxxxxxxxxx
```

To set the Resend API key in Supabase:

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxx
```

### 4. Configure Email Sender (Resend)

If using Resend for emails:

1. Sign up at [resend.com](https://resend.com) (free tier available)
2. Add and verify your domain
3. Get your API key from the dashboard
4. Update the `from` address in the Edge Function code (line 170):
   ```typescript
   from: 'HiveCraic <noreply@yourdomain.com>', // Replace with your verified domain
   ```

### 5. Set Up Weekly Cron Job

Schedule the function to run weekly using Supabase's cron functionality:

1. Go to your Supabase project dashboard
2. Navigate to Database > Extensions
3. Enable the `pg_cron` extension
4. Run this SQL to schedule weekly execution:

```sql
-- Schedule weekly email digest to run every Monday at 8 AM UTC
SELECT cron.schedule(
  'weekly-queen-rearing-digest',
  '0 8 * * 1', -- Every Monday at 8 AM UTC
  $$
  SELECT
    net.http_post(
      url:='https://your-project-ref.supabase.co/functions/v1/weekly-email-digest',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    ) AS request_id;
  $$
);
```

Replace:
- `your-project-ref` with your Supabase project reference
- `YOUR_ANON_KEY` with your Supabase anon key

### Cron Schedule Examples

```bash
'0 8 * * 1'   # Every Monday at 8 AM
'0 8 * * 0'   # Every Sunday at 8 AM
'0 9 * * 5'   # Every Friday at 9 AM
'0 8 1 * *'   # First day of every month at 8 AM
```

## Testing

### Manual Test via HTTP

```bash
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/weekly-email-digest' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

### Test via Supabase CLI

```bash
supabase functions serve weekly-email-digest
```

Then in another terminal:

```bash
curl -X POST 'http://localhost:54321/functions/v1/weekly-email-digest' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json'
```

## Email Content

The digest email includes:

- **Header**: Weekly Queen Rearing Digest with bee emoji
- **Greeting**: Personalized with user's first name
- **Events Table**:
  - Batch name
  - Event type
  - Date (Irish format)
  - Timing (color-coded urgency badge)
- **Footer**: Unsubscribe/manage preferences link

## How It Works

1. **Fetch Batches**: Queries all batches with `enable_email_digest = true`
2. **Group by User**: Groups batches by user_id
3. **Calculate Events**: For each batch, checks all 4 date types to find events within next 7 days
4. **Fetch User Profiles**: Gets email addresses and names from user_profiles table
5. **Generate HTML**: Creates responsive HTML email with all upcoming events
6. **Send Emails**: Uses Resend API to send emails (or logs if no API key)

## Response Format

Success response:
```json
{
  "success": true,
  "emailsSent": 5,
  "emails": ["user1@example.com", "user2@example.com", ...],
  "errors": []
}
```

Error response:
```json
{
  "error": "Error message here"
}
```

## Cost Considerations

- **Resend Free Tier**: 100 emails/day, 3,000 emails/month
- **Supabase Edge Functions**: 500K invocations/month on free tier
- **Cron Jobs**: No additional cost on Supabase

For most beekeeping operations, the free tiers should be sufficient.

## Alternative Email Providers

Instead of Resend, you can use:

- **SendGrid** (100 emails/day free)
- **Mailgun** (first 1,000 emails free)
- **AWS SES** (62,000 emails/month free for 12 months)

Update the email sending code (lines 168-195) to use your preferred provider's API.

## Troubleshooting

### Emails not sending

1. Check that `RESEND_API_KEY` is set correctly
2. Verify your domain is verified in Resend dashboard
3. Check the Edge Function logs in Supabase Dashboard
4. Test manually via curl to see response

### No batches found

1. Verify that batches have `enable_email_digest = true`
2. Check that the database migration was applied
3. Ensure batches have dates within the next 7 days

### Cron job not running

1. Verify `pg_cron` extension is enabled
2. Check cron job is scheduled: `SELECT * FROM cron.job;`
3. Check cron job history: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`

## Security Notes

- Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS (required to fetch all users' batches)
- Email addresses are fetched from `user_profiles` table
- No sensitive data is exposed in emails
- Users can opt-out by unchecking "Include in Weekly Email Digest" in batch settings

## Future Enhancements

- Add email preferences page for global unsubscribe
- Support custom email frequency (daily, weekly, biweekly)
- Add email templates with user branding
- Track email open rates and click-through rates
- Add digest preview in the app before sending
