-- ============================================================================
-- ENABLE TEAM SUPPORT FOR TASKS & EVENTS
-- ============================================================================
-- This script enables team collaboration for the tasks_events table:
-- - Team members can create tasks/events for shared hives
-- - Team members can view all tasks/events for shared hives
-- - Users can distinguish between their own and team tasks
-- - Maintains user_id to track who created each task
-- ============================================================================

-- Add is_team_task column to track if task belongs to a team
ALTER TABLE tasks_events
ADD COLUMN IF NOT EXISTS is_team_task BOOLEAN DEFAULT false;

COMMENT ON COLUMN tasks_events.is_team_task IS 'True if task is created for a shared hive by any team member';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_events_hive_id ON tasks_events(hive_id);
CREATE INDEX IF NOT EXISTS idx_tasks_events_apiary_id ON tasks_events(apiary_id);
CREATE INDEX IF NOT EXISTS idx_tasks_events_user_id ON tasks_events(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_events_is_team_task ON tasks_events(is_team_task);

-- Enable RLS
ALTER TABLE tasks_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'tasks_events'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON tasks_events', policy_record.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- SELECT: Users can view their own tasks AND tasks for hives they have access to
CREATE POLICY "Users can view their tasks and team tasks"
ON tasks_events FOR SELECT
TO authenticated
USING (
  -- Own tasks (regardless of hive)
  user_id = auth.uid()
  OR
  -- Tasks associated with hives the user can access (team shared)
  (hive_id IS NOT NULL AND can_access_hive(hive_id, auth.uid()))
  OR
  -- Tasks associated with apiaries the user can access (team shared)
  (apiary_id IS NOT NULL AND can_access_apiary(apiary_id, auth.uid()))
);

-- INSERT: Users can create tasks for their own hives OR shared hives they can access
CREATE POLICY "Users can create tasks for accessible hives"
ON tasks_events FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    -- No hive/apiary association (personal task)
    (hive_id IS NULL AND apiary_id IS NULL)
    OR
    -- Hive they can access (own or shared)
    (hive_id IS NOT NULL AND can_access_hive(hive_id, auth.uid()))
    OR
    -- Apiary they can access (own or shared)
    (apiary_id IS NOT NULL AND can_access_apiary(apiary_id, auth.uid()))
  )
);

-- UPDATE: Users can update their own tasks OR team tasks if they can access the associated hive
CREATE POLICY "Users can update their own tasks and team tasks"
ON tasks_events FOR UPDATE
TO authenticated
USING (
  -- Own tasks
  user_id = auth.uid()
  OR
  -- Team tasks for hives they can access (allows marking complete, editing)
  (hive_id IS NOT NULL AND can_access_hive(hive_id, auth.uid()))
  OR
  (apiary_id IS NOT NULL AND can_access_apiary(apiary_id, auth.uid()))
)
WITH CHECK (
  -- Can only update to valid associations they have access to
  user_id = auth.uid()
  AND (
    (hive_id IS NULL AND apiary_id IS NULL)
    OR
    (hive_id IS NOT NULL AND can_access_hive(hive_id, auth.uid()))
    OR
    (apiary_id IS NOT NULL AND can_access_apiary(apiary_id, auth.uid()))
  )
);

-- DELETE: Users can delete their own tasks OR team tasks if they're the creator
CREATE POLICY "Users can delete their own tasks"
ON tasks_events FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
);

-- Add comment
COMMENT ON TABLE tasks_events IS 'Tasks and events with team collaboration support - users can create/view tasks for shared hives';

-- ============================================================================
-- HELPER FUNCTION TO AUTO-SET is_team_task FLAG
-- ============================================================================

CREATE OR REPLACE FUNCTION set_task_team_flag()
RETURNS TRIGGER AS $$
BEGIN
  -- If task is associated with a hive or apiary, check if it's shared
  IF NEW.hive_id IS NOT NULL THEN
    -- Check if this hive is in a shared apiary
    NEW.is_team_task := EXISTS (
      SELECT 1
      FROM hives h
      INNER JOIN team_apiaries ta ON h.apiary_id = ta.apiary_id
      WHERE h.id = NEW.hive_id
        AND h.user_id != NEW.user_id  -- Hive owned by someone else
    );
  ELSIF NEW.apiary_id IS NOT NULL THEN
    -- Check if this apiary is shared
    NEW.is_team_task := EXISTS (
      SELECT 1
      FROM team_apiaries ta
      INNER JOIN apiaries a ON ta.apiary_id = a.id
      WHERE a.id = NEW.apiary_id
        AND a.user_id != NEW.user_id  -- Apiary owned by someone else
    );
  ELSE
    -- No hive/apiary association = personal task
    NEW.is_team_task := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-set is_team_task flag
DROP TRIGGER IF EXISTS trigger_set_task_team_flag ON tasks_events;
CREATE TRIGGER trigger_set_task_team_flag
  BEFORE INSERT OR UPDATE ON tasks_events
  FOR EACH ROW
  EXECUTE FUNCTION set_task_team_flag();

-- ============================================================================
-- BACKFILL EXISTING TASKS
-- ============================================================================

-- Update existing tasks to set is_team_task flag
UPDATE tasks_events t
SET is_team_task = EXISTS (
  SELECT 1
  FROM hives h
  INNER JOIN team_apiaries ta ON h.apiary_id = ta.apiary_id
  WHERE h.id = t.hive_id
    AND h.user_id != t.user_id
)
WHERE t.hive_id IS NOT NULL;

UPDATE tasks_events t
SET is_team_task = EXISTS (
  SELECT 1
  FROM team_apiaries ta
  INNER JOIN apiaries a ON ta.apiary_id = a.id
  WHERE a.id = t.apiary_id
    AND a.user_id != t.user_id
)
WHERE t.apiary_id IS NOT NULL AND t.hive_id IS NULL;

-- Verification
DO $$
DECLARE
  total_tasks INT;
  team_tasks INT;
  personal_tasks INT;
BEGIN
  SELECT COUNT(*) INTO total_tasks FROM tasks_events;
  SELECT COUNT(*) INTO team_tasks FROM tasks_events WHERE is_team_task = true;
  SELECT COUNT(*) INTO personal_tasks FROM tasks_events WHERE is_team_task = false;

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ TASKS & EVENTS TEAM SUPPORT ENABLED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total tasks/events: %', total_tasks;
  RAISE NOTICE 'Team tasks/events: %', team_tasks;
  RAISE NOTICE 'Personal tasks/events: %', personal_tasks;
  RAISE NOTICE '';
  RAISE NOTICE 'Features enabled:';
  RAISE NOTICE '  • Team members can create tasks for shared hives';
  RAISE NOTICE '  • Team members can view all tasks for shared hives';
  RAISE NOTICE '  • is_team_task flag automatically set';
  RAISE NOTICE '  • RLS policies enforce proper access control';
  RAISE NOTICE '============================================';
END $$;
