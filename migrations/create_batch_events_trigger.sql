-- =====================================================
-- Batch Events Auto-Creation Trigger
-- Created: November 6, 2025
-- =====================================================
-- This trigger automatically creates/updates events in tasks_events
-- when queen rearing batch dates are set or modified

-- Function to sync batch dates to tasks_events
CREATE OR REPLACE FUNCTION sync_batch_dates_to_tasks()
RETURNS TRIGGER AS $$
DECLARE
  event_id UUID;
BEGIN
  -- Handle ACCEPTANCE CHECK DATE
  IF NEW.acceptance_check_date IS NOT NULL THEN
    -- Check if event already exists for this batch and date type
    SELECT id INTO event_id
    FROM tasks_events
    WHERE batch_id = NEW.id
      AND event_type = 'event'
      AND category = 'queen_rearing'
      AND title LIKE 'Acceptance Check: %';

    IF event_id IS NOT NULL THEN
      -- Update existing event
      UPDATE tasks_events
      SET
        title = 'Acceptance Check: ' || NEW.batch_name,
        start_date = NEW.acceptance_check_date::date,
        updated_at = NOW()
      WHERE id = event_id;
    ELSE
      -- Create new event
      INSERT INTO tasks_events (
        user_id,
        title,
        description,
        event_type,
        category,
        priority,
        start_date,
        all_day,
        batch_id,
        completed
      ) VALUES (
        NEW.user_id,
        'Acceptance Check: ' || NEW.batch_name,
        'Check larvae acceptance for batch ' || NEW.batch_name || '. Grafted on ' || NEW.graft_date::text || '.',
        'event',
        'queen_rearing',
        'high',
        NEW.acceptance_check_date::date,
        true,
        NEW.id,
        false
      );
    END IF;
  END IF;

  -- Handle FIRST CAGE DATE
  IF NEW.first_option_to_cage_date IS NOT NULL THEN
    SELECT id INTO event_id
    FROM tasks_events
    WHERE batch_id = NEW.id
      AND event_type = 'event'
      AND category = 'queen_rearing'
      AND title LIKE '1st Cage Option: %';

    IF event_id IS NOT NULL THEN
      UPDATE tasks_events
      SET
        title = '1st Cage Option: ' || NEW.batch_name,
        start_date = NEW.first_option_to_cage_date::date,
        updated_at = NOW()
      WHERE id = event_id;
    ELSE
      INSERT INTO tasks_events (
        user_id,
        title,
        description,
        event_type,
        category,
        priority,
        start_date,
        all_day,
        batch_id,
        completed
      ) VALUES (
        NEW.user_id,
        '1st Cage Option: ' || NEW.batch_name,
        'First option to cage queen cells for batch ' || NEW.batch_name || '.',
        'event',
        'queen_rearing',
        'high',
        NEW.first_option_to_cage_date::date,
        true,
        NEW.id,
        false
      );
    END IF;
  END IF;

  -- Handle SECOND CAGE DATE
  IF NEW.second_option_to_cage_date IS NOT NULL THEN
    SELECT id INTO event_id
    FROM tasks_events
    WHERE batch_id = NEW.id
      AND event_type = 'event'
      AND category = 'queen_rearing'
      AND title LIKE '2nd Cage Option: %';

    IF event_id IS NOT NULL THEN
      UPDATE tasks_events
      SET
        title = '2nd Cage Option: ' || NEW.batch_name,
        start_date = NEW.second_option_to_cage_date::date,
        updated_at = NOW()
      WHERE id = event_id;
    ELSE
      INSERT INTO tasks_events (
        user_id,
        title,
        description,
        event_type,
        category,
        priority,
        start_date,
        all_day,
        batch_id,
        completed
      ) VALUES (
        NEW.user_id,
        '2nd Cage Option: ' || NEW.batch_name,
        'Second option to cage queen cells for batch ' || NEW.batch_name || '.',
        'event',
        'queen_rearing',
        'high',
        NEW.second_option_to_cage_date::date,
        true,
        NEW.id,
        false
      );
    END IF;
  END IF;

  -- Handle EMERGENCE DATE
  IF NEW.emergence_date IS NOT NULL THEN
    SELECT id INTO event_id
    FROM tasks_events
    WHERE batch_id = NEW.id
      AND event_type = 'event'
      AND category = 'queen_rearing'
      AND title LIKE 'Expected Emergence: %';

    IF event_id IS NOT NULL THEN
      UPDATE tasks_events
      SET
        title = 'Expected Emergence: ' || NEW.batch_name,
        start_date = NEW.emergence_date::date,
        updated_at = NOW()
      WHERE id = event_id;
    ELSE
      INSERT INTO tasks_events (
        user_id,
        title,
        description,
        event_type,
        category,
        priority,
        start_date,
        all_day,
        batch_id,
        completed
      ) VALUES (
        NEW.user_id,
        'Expected Emergence: ' || NEW.batch_name,
        'Expected emergence date for queens in batch ' || NEW.batch_name || '.',
        'event',
        'queen_rearing',
        'normal',
        NEW.emergence_date::date,
        true,
        NEW.id,
        false
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires after INSERT or UPDATE on rearing_batches
DROP TRIGGER IF EXISTS sync_batch_dates_trigger ON rearing_batches;
CREATE TRIGGER sync_batch_dates_trigger
  AFTER INSERT OR UPDATE ON rearing_batches
  FOR EACH ROW
  EXECUTE FUNCTION sync_batch_dates_to_tasks();

-- Function to clean up events when batch is deleted
CREATE OR REPLACE FUNCTION cleanup_batch_events()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all events associated with this batch
  DELETE FROM tasks_events
  WHERE batch_id = OLD.id
    AND category = 'queen_rearing'
    AND title LIKE ANY (ARRAY[
      'Acceptance Check: %',
      '1st Cage Option: %',
      '2nd Cage Option: %',
      'Expected Emergence: %'
    ]);

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for batch deletion
DROP TRIGGER IF EXISTS cleanup_batch_events_trigger ON rearing_batches;
CREATE TRIGGER cleanup_batch_events_trigger
  BEFORE DELETE ON rearing_batches
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_batch_events();

-- Comments
COMMENT ON FUNCTION sync_batch_dates_to_tasks IS 'Automatically creates or updates events in tasks_events when batch dates are set';
COMMENT ON FUNCTION cleanup_batch_events IS 'Removes batch-related events when a batch is deleted';
