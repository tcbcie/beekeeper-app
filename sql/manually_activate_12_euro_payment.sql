-- ============================================================================
-- MANUALLY ACTIVATE €12 ASSOCIATION CODE PAYMENT
-- ============================================================================
-- Use this to activate the subscription for the user who paid €12 with ASHFORD2026
-- ============================================================================

-- Step 1: Find your user and association
SELECT
  p.id as user_id,
  p.email,
  p.full_name,
  ba.id as association_id,
  ba.name as association_name
FROM profiles p
CROSS JOIN beekeeping_associations ba
WHERE ba.name ILIKE '%ashford%'
  AND p.id = '16452689-95b7-41c6-b409-0c0549f0f546'  -- Your user ID from console logs
LIMIT 1;

-- Step 2: Activate the subscription manually
-- This simulates what the webhook should have done
UPDATE profiles
SET
  subscription_expires_at = NOW() + INTERVAL '12 months',
  subscription_type = 'credit_card',
  subscription_price = 12.00,
  is_association_member = true,
  association_id = (SELECT id FROM beekeeping_associations WHERE name ILIKE '%ashford%' LIMIT 1),
  current_subscription_code_id = NULL
WHERE id = '16452689-95b7-41c6-b409-0c0549f0f546';

-- Step 3: Add entry to subscription history
INSERT INTO subscription_history (
  user_id,
  code_id,
  code,
  activated_at,
  expires_at,
  subscription_type,
  price_paid,
  payment_method,
  stripe_payment_intent_id
) VALUES (
  '16452689-95b7-41c6-b409-0c0549f0f546',
  NULL,
  NULL,
  NOW(),
  NOW() + INTERVAL '12 months',
  'credit_card',
  12.00,
  'stripe',
  'manual_activation_association_payment'
);

-- Step 4: Increment ASHFORD2026 usage count
UPDATE registration_codes
SET current_uses = current_uses + 1
WHERE code = 'ASHFORD2026';

-- Step 5: Verify activation
SELECT
  email,
  subscription_expires_at,
  subscription_type,
  subscription_price,
  is_association_member
FROM profiles
WHERE id = '16452689-95b7-41c6-b409-0c0549f0f546';

-- Step 6: Verify history
SELECT
  code,
  activated_at,
  expires_at,
  subscription_type,
  price_paid
FROM subscription_history
WHERE user_id = '16452689-95b7-41c6-b409-0c0549f0f546'
ORDER BY activated_at DESC
LIMIT 1;

-- Step 7: Verify code usage
SELECT
  code,
  current_uses,
  max_uses
FROM registration_codes
WHERE code = 'ASHFORD2026';
