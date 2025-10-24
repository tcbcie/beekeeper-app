-- Remove unique constraint on queen_number if it exists
-- Multiple users should be able to have the same queen number

-- Drop unique constraint if it exists
-- First, find any unique constraints on queen_number
-- Then drop them

-- Check for and drop unique index on queen_number (case 1: named constraint)
DO $$
BEGIN
    -- Drop unique constraint if it exists
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'queens_queen_number_key'
    ) THEN
        ALTER TABLE queens DROP CONSTRAINT queens_queen_number_key;
        RAISE NOTICE 'Dropped unique constraint: queens_queen_number_key';
    END IF;

    -- Drop unique index if it exists (case 2: unique index)
    IF EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE indexname = 'queens_queen_number_idx'
        AND indexdef LIKE '%UNIQUE%'
    ) THEN
        DROP INDEX queens_queen_number_idx;
        RAISE NOTICE 'Dropped unique index: queens_queen_number_idx';
    END IF;

    -- Drop any other unique constraints on queen_number
    IF EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
        WHERE c.contype = 'u'
        AND a.attname = 'queen_number'
        AND c.conrelid = 'queens'::regclass
    ) THEN
        EXECUTE (
            SELECT 'ALTER TABLE queens DROP CONSTRAINT ' || c.conname
            FROM pg_constraint c
            JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
            WHERE c.contype = 'u'
            AND a.attname = 'queen_number'
            AND c.conrelid = 'queens'::regclass
            LIMIT 1
        );
        RAISE NOTICE 'Dropped additional unique constraint on queen_number';
    END IF;
END $$;

-- Verify: queen_number should now allow duplicates across different users
-- Each user can have their own queen numbered "1", "2", etc.
COMMENT ON COLUMN queens.queen_number IS 'Queen identification number (not unique across users)';
