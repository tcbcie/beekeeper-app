-- Migration: Fix User Deletion Constraints
-- Date: 2024-12-04
-- Purpose: Allow hard deletion of users by updating foreign key constraints
-- Strategy:
--   - CASCADE for user-owned data (apiaries, queens, batches, etc.)
--   - SET NULL for audit/tracking fields (created_by, changed_by, inspected_by)

-- ============================================================================
-- DROP EXISTING CONSTRAINTS
-- ============================================================================

-- Apiaries (CASCADE - user owns apiaries)
ALTER TABLE apiaries
DROP CONSTRAINT IF EXISTS apiaries_created_by_fkey;

-- Changelog (SET NULL - keep changelog history)
ALTER TABLE changelog
DROP CONSTRAINT IF EXISTS changelog_created_by_fkey;

-- Feedings (CASCADE - user owns feeding records)
ALTER TABLE feedings
DROP CONSTRAINT IF EXISTS feedings_user_id_fkey;

-- Harvests (CASCADE - user owns harvest records)
ALTER TABLE harvests
DROP CONSTRAINT IF EXISTS harvests_user_id_fkey;

-- Hive Configuration History (SET NULL - keep history)
ALTER TABLE hive_configuration_history
DROP CONSTRAINT IF EXISTS hive_configuration_history_changed_by_fkey;

-- Hives (SET NULL - hive continues to exist, just clear the audit field)
ALTER TABLE hives
DROP CONSTRAINT IF EXISTS hives_configuration_changed_by_fkey;

-- Inspections (CASCADE for user_id, SET NULL for inspected_by)
ALTER TABLE inspections
DROP CONSTRAINT IF EXISTS inspections_user_id_fkey;

ALTER TABLE inspections
DROP CONSTRAINT IF EXISTS inspections_inspected_by_fkey;

-- Queens (CASCADE - user owns queens)
ALTER TABLE queens
DROP CONSTRAINT IF EXISTS queens_created_by_fkey;

-- Rearing Batches (CASCADE - user owns batches)
ALTER TABLE rearing_batches
DROP CONSTRAINT IF EXISTS rearing_batches_created_by_fkey;

-- Varroa Checks (CASCADE - user owns checks)
ALTER TABLE varroa_checks
DROP CONSTRAINT IF EXISTS varroa_checks_user_id_fkey;

-- Varroa Treatments (CASCADE - user owns treatments)
ALTER TABLE varroa_treatments
DROP CONSTRAINT IF EXISTS varroa_treatments_user_id_fkey;

-- ============================================================================
-- ADD NEW CONSTRAINTS WITH PROPER DELETE BEHAVIOR
-- ============================================================================

-- Apiaries (CASCADE)
ALTER TABLE apiaries
ADD CONSTRAINT apiaries_created_by_fkey
FOREIGN KEY (created_by) REFERENCES profiles(id)
ON DELETE CASCADE;

-- Changelog (SET NULL)
ALTER TABLE changelog
ADD CONSTRAINT changelog_created_by_fkey
FOREIGN KEY (created_by) REFERENCES profiles(id)
ON DELETE SET NULL;

-- Feedings (CASCADE)
ALTER TABLE feedings
ADD CONSTRAINT feedings_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE;

-- Harvests (CASCADE)
ALTER TABLE harvests
ADD CONSTRAINT harvests_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE;

-- Hive Configuration History (SET NULL)
ALTER TABLE hive_configuration_history
ADD CONSTRAINT hive_configuration_history_changed_by_fkey
FOREIGN KEY (changed_by) REFERENCES profiles(id)
ON DELETE SET NULL;

-- Hives (SET NULL - hive record stays, just clear audit field)
ALTER TABLE hives
ADD CONSTRAINT hives_configuration_changed_by_fkey
FOREIGN KEY (configuration_changed_by) REFERENCES profiles(id)
ON DELETE SET NULL;

-- Inspections (CASCADE for ownership, SET NULL for audit)
ALTER TABLE inspections
ADD CONSTRAINT inspections_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE;

ALTER TABLE inspections
ADD CONSTRAINT inspections_inspected_by_fkey
FOREIGN KEY (inspected_by) REFERENCES profiles(id)
ON DELETE SET NULL;

-- Queens (CASCADE)
ALTER TABLE queens
ADD CONSTRAINT queens_created_by_fkey
FOREIGN KEY (created_by) REFERENCES profiles(id)
ON DELETE CASCADE;

-- Rearing Batches (CASCADE)
ALTER TABLE rearing_batches
ADD CONSTRAINT rearing_batches_created_by_fkey
FOREIGN KEY (created_by) REFERENCES profiles(id)
ON DELETE CASCADE;

-- Varroa Checks (CASCADE)
ALTER TABLE varroa_checks
ADD CONSTRAINT varroa_checks_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE;

-- Varroa Treatments (CASCADE)
ALTER TABLE varroa_treatments
ADD CONSTRAINT varroa_treatments_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this query to verify the changes:
-- SELECT tc.table_name, kcu.column_name, rc.delete_rule
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.referential_constraints AS rc
--   ON tc.constraint_name = rc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--   AND kcu.table_name IN (
--     'apiaries', 'changelog', 'feedings', 'harvests',
--     'hive_configuration_history', 'hives', 'inspections',
--     'queens', 'rearing_batches', 'varroa_checks', 'varroa_treatments'
--   )
--   AND kcu.column_name IN (
--     'created_by', 'user_id', 'changed_by',
--     'configuration_changed_by', 'inspected_by'
--   )
-- ORDER BY tc.table_name, kcu.column_name;
