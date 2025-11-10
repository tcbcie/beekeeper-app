-- ============================================================================
-- ADD SUBSCRIPTION TICKET TYPE
-- ============================================================================
-- Add 'subscription' as a valid ticket type for support tickets
-- This allows users to submit tickets specifically for billing and subscription issues
-- ============================================================================

-- Add 'subscription' to the ticket_type column check constraint or enum
-- First check if ticket_type uses an enum or a text field with check constraint

-- If using enum (most likely):
DO $$
BEGIN
    -- Check if the enum value already exists
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'ticket_type_enum'
        AND e.enumlabel = 'subscription'
    ) THEN
        -- Add the new enum value
        ALTER TYPE ticket_type_enum ADD VALUE 'subscription';
        RAISE NOTICE 'Added subscription to ticket_type_enum';
    ELSE
        RAISE NOTICE 'subscription already exists in ticket_type_enum';
    END IF;
END $$;

-- Verification
SELECT enumlabel
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'ticket_type_enum'
ORDER BY enumlabel;
