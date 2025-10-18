-- ============================================================================
-- ENABLE ROW LEVEL SECURITY FOR VARROA TABLES
-- ============================================================================
-- This script sets up RLS for the varroa_checks and varroa_treatments tables
-- It ensures users can only access data for hives they own
-- ============================================================================

-- Step 1: Ensure hives table has user_id column
-- This will add the column if it doesn't exist, or do nothing if it already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'hives'
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE hives ADD COLUMN user_id UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added user_id column to hives table';
    ELSE
        RAISE NOTICE 'user_id column already exists in hives table';
    END IF;
END $$;

-- Step 2: For development/single-user setups - assign all hives to first user
-- IMPORTANT: This will assign ALL hives without user_id to the first user in the system
-- Uncomment ONE of these options:

-- OPTION A: Assign to a specific user (replace with your user UUID)
-- UPDATE hives SET user_id = 'YOUR-USER-UUID-HERE' WHERE user_id IS NULL;

-- OPTION B: Assign to the first user in auth.users (single user scenario)
-- UPDATE hives SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;

-- Step 3: Enable Row Level Security on varroa tables
ALTER TABLE varroa_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE varroa_checks ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own varroa treatments" ON varroa_treatments;
DROP POLICY IF EXISTS "Users can insert their own varroa treatments" ON varroa_treatments;
DROP POLICY IF EXISTS "Users can update their own varroa treatments" ON varroa_treatments;
DROP POLICY IF EXISTS "Users can delete their own varroa treatments" ON varroa_treatments;

DROP POLICY IF EXISTS "Users can view their own varroa checks" ON varroa_checks;
DROP POLICY IF EXISTS "Users can insert their own varroa checks" ON varroa_checks;
DROP POLICY IF EXISTS "Users can update their own varroa checks" ON varroa_checks;
DROP POLICY IF EXISTS "Users can delete their own varroa checks" ON varroa_checks;

-- Step 5: Create RLS policies for varroa_treatments
-- Users can only see/modify treatments for their own hives

CREATE POLICY "Users can view their own varroa treatments"
    ON varroa_treatments FOR SELECT
    USING (
        hive_id IN (
            SELECT id FROM hives WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own varroa treatments"
    ON varroa_treatments FOR INSERT
    WITH CHECK (
        hive_id IN (
            SELECT id FROM hives WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own varroa treatments"
    ON varroa_treatments FOR UPDATE
    USING (
        hive_id IN (
            SELECT id FROM hives WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own varroa treatments"
    ON varroa_treatments FOR DELETE
    USING (
        hive_id IN (
            SELECT id FROM hives WHERE user_id = auth.uid()
        )
    );

-- Step 6: Create RLS policies for varroa_checks
-- Users can only see/modify checks for their own hives

CREATE POLICY "Users can view their own varroa checks"
    ON varroa_checks FOR SELECT
    USING (
        hive_id IN (
            SELECT id FROM hives WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own varroa checks"
    ON varroa_checks FOR INSERT
    WITH CHECK (
        hive_id IN (
            SELECT id FROM hives WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own varroa checks"
    ON varroa_checks FOR UPDATE
    USING (
        hive_id IN (
            SELECT id FROM hives WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own varroa checks"
    ON varroa_checks FOR DELETE
    USING (
        hive_id IN (
            SELECT id FROM hives WHERE user_id = auth.uid()
        )
    );

-- Step 7: Optional - Enable RLS on hives table too (recommended)
-- Uncomment if you want to secure the hives table as well
/*
ALTER TABLE hives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own hives" ON hives;
DROP POLICY IF EXISTS "Users can insert their own hives" ON hives;
DROP POLICY IF EXISTS "Users can update their own hives" ON hives;
DROP POLICY IF EXISTS "Users can delete their own hives" ON hives;

CREATE POLICY "Users can view their own hives"
    ON hives FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own hives"
    ON hives FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own hives"
    ON hives FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own hives"
    ON hives FOR DELETE
    USING (user_id = auth.uid());
*/

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✓ RLS enabled successfully for varroa tables!';
    RAISE NOTICE '✓ Users can now only access varroa data for their own hives';
    RAISE NOTICE 'ℹ Remember to set user_id on existing hives if needed';
END $$;
