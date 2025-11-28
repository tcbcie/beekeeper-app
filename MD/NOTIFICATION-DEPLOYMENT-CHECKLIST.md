# Notification System Deployment Checklist

This document provides a comprehensive checklist for verifying and completing the notification system deployment.

## ✅ Completed Items

### 1. Notification Icons
- [x] Created `/public/icon-192x192.png` for notifications
- [x] Created `/public/badge-72x72.png` for notification badges
- [x] Icons referenced in service worker at `public/service-worker.js:30-31`

### 2. PWA Manifest
- [x] Created `/public/manifest.json` with app metadata
- [x] Added manifest link to `src/app/layout.tsx`
- [x] Configured app icons and shortcuts
- [x] Set up notification preferences in manifest

### 3. Edge Function Deployment
- [x] Edge function `weekly-email-digest` is deployed (Version 6, Active)
- [x] Last updated: 2025-10-31 17:16:56 UTC
- [x] Function status: ACTIVE

### 4. Database Schema
- [x] Notification preferences columns added to batches table
- [x] Email digest functionality implemented

## ⚠️ Items Requiring Verification

### 1. Resend API Configuration
**Status**: Unknown - needs manual verification

Check if the Resend API key is configured:
```bash
# Check if secret exists (won't show value for security)
supabase secrets list
```

If not set, configure it:
```bash
# Set the Resend API key
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxx
```

**Setup Steps:**
1. Sign up at [resend.com](https://resend.com) (free tier: 100 emails/day)
2. Add and verify your domain
3. Get API key from dashboard
4. Update the sender email in `supabase/functions/weekly-email-digest/index.ts` (around line 170)

### 2. Cron Job Scheduling
**Status**: Needs verification - check if scheduled

Verify the cron job is scheduled:
```sql
-- Run this in Supabase SQL Editor
SELECT * FROM cron.job WHERE jobname LIKE '%digest%' OR jobname LIKE '%queen%';
```

If not scheduled, set it up:
```sql
-- Enable pg_cron extension first (Dashboard > Database > Extensions)
-- Then schedule the job:
SELECT cron.schedule(
  'weekly-queen-rearing-digest',
  '0 8 * * 1', -- Every Monday at 8 AM UTC
  $$
  SELECT
    net.http_post(
      url:='https://YOUR-PROJECT-REF.supabase.co/functions/v1/weekly-email-digest',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    ) AS request_id;
  $$
);
```

**Important:** Replace `YOUR-PROJECT-REF` and `YOUR_ANON_KEY` with actual values.

### 3. Domain Verification for Emails
**Status**: Needs verification

1. Go to Resend dashboard
2. Navigate to "Domains"
3. Verify that your sending domain is verified
4. Update sender email in edge function if needed

## 🧪 Testing Checklist

### Browser Notifications
- [ ] Service worker registers successfully
- [ ] Browser asks for notification permission
- [ ] Notifications appear when batch dates are within 48 hours
- [ ] Notification icons display correctly
- [ ] Clicking notification navigates to `/dashboard/batches`
- [ ] Notifications respect user preferences (on/off toggle)

**Test Steps:**
1. Open app in browser
2. Grant notification permission when prompted
3. Create a batch with dates within next 48 hours
4. Enable "Browser Notifications" toggle
5. Wait for notification to appear (or modify timing in code for testing)

### Email Digest
- [ ] Manual test via curl works
- [ ] Cron job executes on schedule
- [ ] Emails are received by users
- [ ] Email formatting is correct
- [ ] Unsubscribe option works
- [ ] Only sends to users with `enable_email_digest = true`

**Manual Test:**
```bash
# Test the edge function manually
curl -X POST 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/weekly-email-digest' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

### PWA Installation
- [ ] Manifest.json loads correctly
- [ ] Browser shows "Install App" option
- [ ] App installs as PWA on mobile
- [ ] App icon appears on home screen
- [ ] Standalone mode works (no browser UI)

## 📋 Pending Items

### High Priority
1. **Verify Resend API Key** - Check if configured and test email sending
2. **Verify Cron Job** - Confirm weekly digest is scheduled
3. **Domain Verification** - Ensure email domain is verified in Resend

### Medium Priority
4. **Add Tests** - Create test coverage for:
   - Service worker registration
   - Permission handling
   - Notification scheduling
   - Email digest logic
   - UI toggle interactions

5. **User Documentation** - Add help text explaining:
   - Browser notification limitations (tab must be open)
   - How to enable/disable notifications
   - Email digest frequency and content

### Low Priority
6. **Push Notifications** - Consider implementing web push for persistent notifications
7. **Notification History** - Track sent/dismissed notifications
8. **Email Templates** - Add customizable email templates
9. **Notification Settings Page** - Centralized notification preferences

## 🔍 Monitoring & Debugging

### Check Edge Function Logs
1. Go to Supabase Dashboard
2. Navigate to Edge Functions
3. Select `weekly-email-digest`
4. View logs for errors or successful executions

### Check Cron Job History
```sql
-- View recent cron job executions
SELECT * FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%digest%')
ORDER BY start_time DESC
LIMIT 10;
```

### Verify Service Worker Registration
Open browser console and run:
```javascript
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
});
```

## 📊 Current System Status

### What's Working
- ✅ Database schema configured
- ✅ Browser notification code implemented
- ✅ Service worker registered
- ✅ Email digest function deployed
- ✅ PWA manifest configured
- ✅ Notification icons created

### What Needs Action
- ⚠️ Verify Resend API key is set
- ⚠️ Verify cron job is scheduled
- ⚠️ Verify domain is verified in Resend
- ⚠️ Add test coverage
- ⚠️ Test end-to-end functionality

## 🚀 Next Steps

1. **Immediate:**
   - Run `supabase secrets list` to verify Resend API key
   - Check Supabase Dashboard for pg_cron extension
   - Query cron.job table to verify scheduling

2. **Short-term:**
   - Add test files for notification functionality
   - Test email digest manually via curl
   - Document user-facing notification behavior

3. **Long-term:**
   - Monitor email delivery rates
   - Gather user feedback on notification timing
   - Consider implementing web push for always-on notifications

## 📞 Support Resources

- Supabase Edge Functions Docs: https://supabase.com/docs/guides/functions
- Resend API Docs: https://resend.com/docs
- Web Push API: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- Service Workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

---

**Last Updated:** 2025-11-28
**Status:** Partially Deployed - Verification Needed
