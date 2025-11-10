-- Fix usage count for ASHFORD2026 code
-- This code was used for a successful €12 payment but the usage count wasn't incremented
-- because the webhook didn't have the logic to track association code usage yet

-- Check current usage
SELECT
  code,
  current_uses,
  max_uses,
  is_active,
  subscription_expires_at
FROM registration_codes
WHERE code = 'ASHFORD2026';

-- Increment the usage count by 1
UPDATE registration_codes
SET current_uses = current_uses + 1
WHERE code = 'ASHFORD2026';

-- Verify the update
SELECT
  code,
  current_uses,
  max_uses,
  is_active,
  subscription_expires_at,
  updated_at
FROM registration_codes
WHERE code = 'ASHFORD2026';
