-- Migration: Add email notification preferences to profiles table
-- Date: 2024-12-04
-- Description: Adds columns to control email notification preferences for tasks and events

-- Add email notification preference columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS enable_task_email_reminders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_event_email_reminders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS task_reminder_frequency VARCHAR(20) DEFAULT 'daily' CHECK (task_reminder_frequency IN ('realtime', 'daily', 'weekly', 'disabled'));

-- Add comments for documentation
COMMENT ON COLUMN profiles.enable_task_email_reminders IS 'Enable/disable email reminders for tasks';
COMMENT ON COLUMN profiles.enable_event_email_reminders IS 'Enable/disable email reminders for events';
COMMENT ON COLUMN profiles.task_reminder_frequency IS 'Frequency of task/event reminder emails: realtime (as they occur), daily (once per day), weekly (once per week), disabled';

-- Create index for efficient querying of users with email reminders enabled
CREATE INDEX IF NOT EXISTS idx_profiles_email_reminders
ON profiles(enable_task_email_reminders, enable_event_email_reminders)
WHERE enable_task_email_reminders = true OR enable_event_email_reminders = true;
