-- Migration: Schedule cron job for task and event email reminders
-- Date: 2024-12-04
-- Description: Schedules hourly cron job to send email reminders for tasks and events

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule hourly task/event reminders (supports all frequency types)
-- Runs every hour on the hour
SELECT cron.schedule(
  'task-event-reminders-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url:='https://tbhofdmfzwibysnnssnx.supabase.co/functions/v1/task-event-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiaG9mZG1mendpYnlzbm5zc254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3Njc2MjgsImV4cCI6MjA3NjM0MzYyOH0.uhOPPVNiccHMc9yiHwDgV3ebHu4HWizC6PEmP-kSKyU"}'::jsonb
    ) AS request_id;
  $$
);

-- Verify the cron job was created
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname = 'task-event-reminders-hourly';
