-- ============================================================================
-- QUICK SUBSCRIPTION ACTIVATION
-- ============================================================================
-- This will activate the subscription for the user who paid €12 with ASHFORD2026
-- ============================================================================

-- First, let's find the user who most recently should have been activated
-- This assumes you're the only one who made a payment recently
-- Uncomment and modify the WHERE clause if needed

DO $$
DECLARE
  v_user_id UUID;
  v_association_id UUID;
  v_user_email TEXT;
BEGIN
  -- Find the association ID for Ashford
  SELECT id INTO v_association_id
  FROM beekeeping_associations
  WHERE name ILIKE '%ashford%'
  LIMIT 1;

  IF v_association_id IS NULL THEN
    RAISE EXCEPTION 'Ashford association not found';
  END IF;

  -- You'll need to replace this with your actual user email or ID
  -- Option 1: If you know your email
  SELECT id, email INTO v_user_id, v_user_email
  FROM profiles
  WHERE email = 'YOUR-EMAIL@example.com';  -- REPLACE THIS

  -- Option 2: Or just select your user ID directly
  -- v_user_id := 'YOUR-USER-ID'::uuid;  -- REPLACE THIS

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Please update the email or user ID in the script.';
  END IF;

  RAISE NOTICE 'Activating subscription for user: % (%)', v_user_email, v_user_id;
  RAISE NOTICE 'Association: %', v_association_id;

  -- Update profile
  UPDATE profiles
  SET
    subscription_expires_at = NOW() + INTERVAL '12 months',
    subscription_type = 'credit_card',
    subscription_price = 12.00,
    is_association_member = true,
    association_id = v_association_id,
    current_subscription_code_id = NULL
  WHERE id = v_user_id;

  -- Add to subscription history
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
    v_user_id,
    NULL,
    NULL,
    NOW(),
    NOW() + INTERVAL '12 months',
    365,
    'credit_card',
    12.00,
    'stripe',
    'manual_activation'
  );

  -- Increment code usage
  UPDATE registration_codes
  SET current_uses = current_uses + 1
  WHERE code = 'ASHFORD2026';

  RAISE NOTICE '✅ Subscription activated successfully!';
  RAISE NOTICE 'Expires: %', NOW() + INTERVAL '12 months';
END $$;

-- Verify the activation
-- REPLACE 'YOUR-EMAIL@example.com' with your actual email
SELECT
  email,
  subscription_expires_at,
  subscription_type,
  subscription_price,
  is_association_member
FROM profiles
WHERE email = 'YOUR-EMAIL@example.com';

-- Check subscription history
-- REPLACE 'YOUR-EMAIL@example.com' with your actual email
SELECT
  sh.code,
  sh.activated_at,
  sh.expires_at,
  sh.subscription_type,
  sh.price_paid
FROM subscription_history sh
JOIN profiles p ON p.id = sh.user_id
WHERE p.email = 'YOUR-EMAIL@example.com'
ORDER BY sh.activated_at DESC
LIMIT 1;

-- Check code usage
SELECT
  code,
  current_uses,
  max_uses
FROM registration_codes
WHERE code = 'ASHFORD2026';
