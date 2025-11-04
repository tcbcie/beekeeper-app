-- =====================================================
-- Tasks and Events Table Migration
-- Created: November 4, 2025
-- =====================================================
-- This table stores user tasks and events that can be
-- synced with Google Calendar and displayed in the dashboard

-- Create tasks_events table
CREATE TABLE IF NOT EXISTS tasks_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Information
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Type and Category
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('task', 'event', 'reminder')),
  category VARCHAR(50) CHECK (category IN (
    'inspection',
    'treatment',
    'feeding',
    'harvest',
    'queen_rearing',
    'maintenance',
    'general',
    'other'
  )),

  -- Date and Time
  start_date DATE NOT NULL,
  start_time TIME,
  end_date DATE,
  end_time TIME,
  all_day BOOLEAN DEFAULT false,

  -- Task-specific fields
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  priority VARCHAR(20) CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',

  -- Associations
  hive_id UUID REFERENCES hives(id) ON DELETE SET NULL,
  apiary_id UUID REFERENCES apiaries(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES rearing_batches(id) ON DELETE SET NULL,

  -- Recurrence (for future implementation)
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern VARCHAR(50),
  recurrence_end_date DATE,

  -- Reminders
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_minutes_before INTEGER DEFAULT 60,
  reminder_sent BOOLEAN DEFAULT false,

  -- Google Calendar Integration (for future)
  google_calendar_event_id VARCHAR(255),
  google_calendar_synced_at TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_tasks_events_user_id ON tasks_events(user_id);
CREATE INDEX idx_tasks_events_start_date ON tasks_events(start_date);
CREATE INDEX idx_tasks_events_event_type ON tasks_events(event_type);
CREATE INDEX idx_tasks_events_completed ON tasks_events(completed);
CREATE INDEX idx_tasks_events_hive_id ON tasks_events(hive_id);
CREATE INDEX idx_tasks_events_apiary_id ON tasks_events(apiary_id);
CREATE INDEX idx_tasks_events_batch_id ON tasks_events(batch_id);
CREATE INDEX idx_tasks_events_user_start_date ON tasks_events(user_id, start_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tasks_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER tasks_events_updated_at
  BEFORE UPDATE ON tasks_events
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_events_updated_at();

-- Enable Row Level Security
ALTER TABLE tasks_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Users can view their own tasks/events
CREATE POLICY "Users can view their own tasks and events"
  ON tasks_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own tasks/events
CREATE POLICY "Users can create their own tasks and events"
  ON tasks_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tasks/events
CREATE POLICY "Users can update their own tasks and events"
  ON tasks_events
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own tasks/events
CREATE POLICY "Users can delete their own tasks and events"
  ON tasks_events
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON tasks_events TO authenticated;
GRANT SELECT ON tasks_events TO anon;

-- Comments for documentation
COMMENT ON TABLE tasks_events IS 'Stores user tasks, events, and reminders with Google Calendar integration support';
COMMENT ON COLUMN tasks_events.event_type IS 'Type of entry: task (to-do item), event (calendar event), or reminder';
COMMENT ON COLUMN tasks_events.category IS 'Category for organizing tasks/events by beekeeping activity';
COMMENT ON COLUMN tasks_events.priority IS 'Priority level for tasks (low, normal, high, urgent)';
COMMENT ON COLUMN tasks_events.is_recurring IS 'Whether this is a recurring task/event';
COMMENT ON COLUMN tasks_events.google_calendar_event_id IS 'Google Calendar event ID for syncing';
