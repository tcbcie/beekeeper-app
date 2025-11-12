-- ============================================================================
-- ADD SUBSCRIPTION TICKET TYPE
-- ============================================================================
-- Add 'subscription' as a valid ticket type for support tickets
-- This allows users to submit tickets specifically for billing and subscription issues
-- ============================================================================

-- Drop the existing check constraint
ALTER TABLE public.support_tickets
DROP CONSTRAINT IF EXISTS support_tickets_ticket_type_check;

-- Add the new check constraint with 'subscription' included
ALTER TABLE public.support_tickets
ADD CONSTRAINT support_tickets_ticket_type_check CHECK (
  (ticket_type)::text = ANY (
    ARRAY[
      'problem'::character varying,
      'suggestion'::character varying,
      'subscription'::character varying
    ]::text[]
  )
);

-- Verification - show current constraint
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.support_tickets'::regclass
AND conname = 'support_tickets_ticket_type_check';
