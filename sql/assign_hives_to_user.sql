-- ============================================================================
-- ASSIGN EXISTING HIVES TO CURRENT USER
-- ============================================================================
-- This script assigns all hives that don't have a user_id to the currently
-- authenticated user. Run this ONCE after enabling RLS, while logged in as
-- the user who should own the existing hives.
-- ============================================================================

-- Check current user
SELECT
    auth.uid() as current_user_id,
    auth.email() as current_user_email;

-- Show hives without user_id
SELECT
    COUNT(*) as unassigned_hives
FROM hives
WHERE user_id IS NULL;

-- Assign all unassigned hives to the current user
-- UNCOMMENT THE NEXT LINE TO EXECUTE:
-- UPDATE hives SET user_id = auth.uid() WHERE user_id IS NULL;

-- Verify the assignment
SELECT
    user_id,
    COUNT(*) as hive_count
FROM hives
GROUP BY user_id;
