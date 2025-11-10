-- ============================================================================
-- TEST SUBSCRIPTION ACTIVATION
-- ============================================================================
-- This tests if the activate_subscription function works correctly
-- ============================================================================

-- First, check if you have an individual code to test with
SELECT
  code,
  code_type,
  is_active,
  subscription_expires_at,
  max_uses,
  current_uses
FROM registration_codes
WHERE code_type = 'individual'
  AND is_active = true
LIMIT 5;

-- Test the function with a code (replace with actual code from above)
-- This should return a JSON response
SELECT activate_subscription('YOUR-CODE-HERE');

-- Check your current subscription status
SELECT
  id,
  email,
  subscription_expires_at,
  subscription_type,
  subscription_price,
  current_subscription_code_id
FROM profiles
WHERE email = 'YOUR-EMAIL@example.com';

-- Check subscription history
SELECT
  id,
  code,
  code_type,
  activated_at,
  expires_at,
  subscription_type,
  price_paid
FROM subscription_history
WHERE user_id = (SELECT id FROM profiles WHERE email = 'YOUR-EMAIL@example.com')
ORDER BY activated_at DESC;
