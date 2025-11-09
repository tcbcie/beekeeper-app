-- ============================================================================
-- MANUALLY ACTIVATE SUBSCRIPTION FOR FAILED WEBHOOK
-- ============================================================================
-- Use this to manually activate a subscription when the webhook failed
-- Replace the placeholder values with actual data
-- ============================================================================

-- STEP 1: Find your user ID and association ID
-- Run this first to get the UUIDs you need:

SELECT
  p.id as user_id,
  p.email,
  p.full_name,
  ba.id as ashford_association_id,
  ba.name as association_name
FROM profiles p
CROSS JOIN beekeeping_associations ba
WHERE ba.name ILIKE '%ashford%'
  AND p.email = 'YOUR-EMAIL@example.com'  -- Replace with your email
LIMIT 1;

-- STEP 2: After getting the IDs from above, update the user's profile
-- Replace USER-ID and ASSOCIATION-ID with values from STEP 1

/*
UPDATE profiles
SET
  subscription_expires_at = NOW() + INTERVAL '12 months',
  subscription_type = 'credit_card',
  subscription_price = 12.00,
  is_association_member = true,
  association_id = 'ASSOCIATION-ID'::uuid,  -- Replace with actual UUID
  current_subscription_code_id = NULL
WHERE id = 'USER-ID'::uuid;  -- Replace with actual UUID
*/

-- STEP 3: Add entry to subscription_history
-- Replace USER-ID and PAYMENT-INTENT-ID

/*
INSERT INTO subscription_history (
  user_id,
  code_id,
  code,
  activated_at,
  expires_at,
  duration_days,
  subscription_type,
  price_paid,
  payment_method,
  stripe_payment_intent_id
) VALUES (
  'USER-ID'::uuid,  -- Replace with actual UUID
  NULL,  -- No code_id for credit card payment
  NULL,  -- No code for credit card payment
  NOW(),
  NOW() + INTERVAL '12 months',
  365,
  'credit_card',
  12.00,
  'stripe',
  'pi_xxxxx'  -- Replace with actual Stripe payment intent ID (optional, can leave as-is)
);
*/

-- STEP 4: Increment ASHFORD2026 code usage
UPDATE registration_codes
SET current_uses = current_uses + 1
WHERE code = 'ASHFORD2026';

-- STEP 5: Verify everything worked
-- Replace USER-ID with your actual UUID

/*
SELECT
  id,
  email,
  subscription_expires_at,
  subscription_type,
  subscription_price,
  is_association_member,
  association_id
FROM profiles
WHERE id = 'USER-ID'::uuid;

SELECT
  id,
  code,
  activated_at,
  expires_at,
  subscription_type,
  price_paid
FROM subscription_history
WHERE user_id = 'USER-ID'::uuid
ORDER BY activated_at DESC
LIMIT 1;

SELECT
  code,
  current_uses,
  max_uses
FROM registration_codes
WHERE code = 'ASHFORD2026';
*/
