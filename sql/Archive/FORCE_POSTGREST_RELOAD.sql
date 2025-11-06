-- Force PostgREST to completely reload by making a schema change
-- This is a more aggressive approach than just NOTIFY

-- Create a temporary dummy table
CREATE TABLE IF NOT EXISTS public._temp_reload_trigger (id int);

-- Immediately drop it
DROP TABLE IF EXISTS public._temp_reload_trigger;

-- Send reload notification
NOTIFY pgrst, 'reload schema';

-- Verify
SELECT 'Forced schema reload - PostgREST should restart' AS status;
