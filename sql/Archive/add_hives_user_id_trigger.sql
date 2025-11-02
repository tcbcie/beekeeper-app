-- Create a trigger to automatically set user_id on hives insert
-- This allows non-admin users to create hives without explicitly setting user_id

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_hives_user_id ON hives;
DROP FUNCTION IF EXISTS set_hives_user_id();

-- Create function to set user_id
CREATE OR REPLACE FUNCTION set_hives_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If user_id is not set or is null, set it to the current authenticated user
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that runs before insert
CREATE TRIGGER set_hives_user_id
  BEFORE INSERT ON hives
  FOR EACH ROW
  EXECUTE FUNCTION set_hives_user_id();

COMMENT ON FUNCTION set_hives_user_id() IS 'Automatically sets user_id to authenticated user on hive creation';
COMMENT ON TRIGGER set_hives_user_id ON hives IS 'Sets user_id before insert if not provided';
