## Subscription System Quick Start Guide

This guide helps you test the subscription system immediately after running the database migration.

## Step 1: Run the Database Migration

1. Open Supabase SQL Editor
2. Copy and paste contents of `sql/create_subscription_system.sql`
3. Click "Run"
4. Verify you see success messages in the output

## Step 2: Verify Database Setup

Run these queries to confirm everything is set up:

```sql
-- Check profiles have subscription columns
SELECT
  id,
  email,
  subscription_expires_at,
  current_subscription_code_id,
  created_at
FROM profiles
LIMIT 5;

-- Check existing users have been initialized (1 year from registration)
SELECT
  email,
  subscription_expires_at,
  EXTRACT(DAY FROM (subscription_expires_at - NOW())) as days_remaining
FROM profiles
WHERE subscription_expires_at IS NOT NULL
ORDER BY created_at DESC;

-- Check subscription history table exists
SELECT COUNT(*) FROM subscription_history;

-- View all available functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%subscription%';
```

## Step 3: Test Subscription Functions

### Test 1: Get Your Current Subscription Status

```sql
SELECT * FROM get_subscription_status();
```

**Expected Result:**
```json
{
  "is_active": true,
  "status": "active",
  "expires_at": "2026-01-07...",
  "days_remaining": 365,
  "current_code": "BEEKEEPER2025",
  "code_description": "Default registration code"
}
```

### Test 2: Create a Renewal Code

```sql
-- Create a 30-day subscription renewal code
INSERT INTO registration_codes (
  code,
  description,
  expires_at,
  is_active,
  max_uses,
  subscription_duration_days
) VALUES (
  'RENEWAL30',
  '30-day subscription renewal',
  NOW() + INTERVAL '1 year',
  true,
  100,
  30
);

-- Create a 1-year subscription renewal code
INSERT INTO registration_codes (
  code,
  description,
  expires_at,
  is_active,
  max_uses,
  subscription_duration_days
) VALUES (
  'ANNUAL2025',
  'Annual subscription for 2025',
  NOW() + INTERVAL '1 year',
  true,
  NULL, -- unlimited uses
  365
);
```

### Test 3: Activate a Subscription

```sql
-- Activate 30-day renewal
SELECT activate_subscription('RENEWAL30');
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Subscription activated successfully",
  "expires_at": "2026-02-06...",
  "duration_days": 30
}
```

### Test 4: Check Subscription History

```sql
SELECT * FROM get_subscription_history();
```

**Expected Result:** Table showing:
- Original subscription (1 year from registration)
- New 30-day renewal just activated
- `is_current` = true for the most recent

### Test 5: Test Invalid Code

```sql
-- This should fail
SELECT activate_subscription('INVALID_CODE');
```

**Expected Result:**
```json
{
  "success": false,
  "message": "Invalid, expired, or inactive subscription code"
}
```

### Test 6: View Users Needing Reminders

```sql
-- Manually set a user to expire soon for testing
UPDATE profiles
SET subscription_expires_at = NOW() + INTERVAL '25 days',
    last_subscription_reminder_sent = NULL
WHERE email = 'test@example.com';

-- Now check the reminder view
SELECT * FROM users_needing_subscription_reminder;
```

**Expected Result:** Shows users expiring within 30 days

## Step 4: Test Subscription Statuses

Create test scenarios:

### Active Subscription (>30 days)
```sql
UPDATE profiles
SET subscription_expires_at = NOW() + INTERVAL '60 days'
WHERE email = 'your@email.com';

SELECT * FROM get_subscription_status();
-- Should show: status = 'active'
```

### Expiring Soon (8-30 days)
```sql
UPDATE profiles
SET subscription_expires_at = NOW() + INTERVAL '20 days'
WHERE email = 'your@email.com';

SELECT * FROM get_subscription_status();
-- Should show: status = 'expiring_soon', days_remaining = 20
```

### Expiring Very Soon (1-7 days)
```sql
UPDATE profiles
SET subscription_expires_at = NOW() + INTERVAL '5 days'
WHERE email = 'your@email.com';

SELECT * FROM get_subscription_status();
-- Should show: status = 'expiring_very_soon', days_remaining = 5
```

### Expired
```sql
UPDATE profiles
SET subscription_expires_at = NOW() - INTERVAL '5 days'
WHERE email = 'your@email.com';

SELECT * FROM get_subscription_status();
-- Should show: status = 'expired', is_active = false, days_remaining = 0
```

### Reset to Normal
```sql
UPDATE profiles
SET subscription_expires_at = NOW() + INTERVAL '365 days'
WHERE email = 'your@email.com';
```

## Step 5: Test Subscription Renewal Logic

### Test Extension from Active Subscription

```sql
-- Set subscription to expire in 100 days
UPDATE profiles
SET subscription_expires_at = NOW() + INTERVAL '100 days'
WHERE email = 'your@email.com';

-- Check current expiry
SELECT subscription_expires_at FROM profiles WHERE email = 'your@email.com';

-- Activate 30-day renewal (should add 30 days to the 100)
SELECT activate_subscription('RENEWAL30');

-- Check new expiry (should be 130 days from now)
SELECT
  subscription_expires_at,
  EXTRACT(DAY FROM (subscription_expires_at - NOW())) as days_from_now
FROM profiles
WHERE email = 'your@email.com';
```

**Expected:** ~130 days remaining

### Test Renewal from Expired Subscription

```sql
-- Set subscription to expired
UPDATE profiles
SET subscription_expires_at = NOW() - INTERVAL '10 days'
WHERE email = 'your@email.com';

-- Activate 30-day renewal (should start from today)
SELECT activate_subscription('RENEWAL30');

-- Check new expiry (should be 30 days from now)
SELECT
  subscription_expires_at,
  EXTRACT(DAY FROM (subscription_expires_at - NOW())) as days_from_now
FROM profiles
WHERE email = 'your@email.com';
```

**Expected:** ~30 days remaining

## Step 6: Admin Queries

Useful queries for admins:

### All Users with Subscription Status
```sql
SELECT * FROM get_users_with_email();
```

### Users Expiring This Month
```sql
SELECT
  email,
  subscription_expires_at,
  EXTRACT(DAY FROM (subscription_expires_at - NOW())) as days_remaining
FROM profiles
WHERE subscription_expires_at IS NOT NULL
  AND subscription_expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'
ORDER BY subscription_expires_at ASC;
```

### Expired Subscriptions
```sql
SELECT
  email,
  subscription_expires_at,
  EXTRACT(DAY FROM (NOW() - subscription_expires_at)) as days_expired
FROM profiles
WHERE subscription_expires_at < NOW()
ORDER BY subscription_expires_at DESC;
```

### Subscription Revenue Projection
```sql
SELECT
  rc.code,
  rc.description,
  rc.subscription_duration_days,
  rc.current_uses,
  COUNT(sh.id) as total_activations,
  COUNT(DISTINCT sh.user_id) as unique_users
FROM registration_codes rc
LEFT JOIN subscription_history sh ON sh.code_id = rc.id
WHERE rc.subscription_duration_days IS NOT NULL
GROUP BY rc.id, rc.code, rc.description, rc.subscription_duration_days, rc.current_uses
ORDER BY total_activations DESC;
```

### Users Who Never Renewed
```sql
SELECT
  p.email,
  p.subscription_expires_at,
  COUNT(sh.id) as renewal_count
FROM profiles p
LEFT JOIN subscription_history sh ON sh.user_id = p.id
GROUP BY p.id, p.email, p.subscription_expires_at
HAVING COUNT(sh.id) <= 1  -- Only initial subscription, no renewals
  AND p.subscription_expires_at < NOW() + INTERVAL '30 days'
ORDER BY p.subscription_expires_at ASC;
```

## Step 7: Test Edge Cases

### Multiple Rapid Renewals
```sql
-- Activate multiple codes in succession
SELECT activate_subscription('RENEWAL30');
SELECT activate_subscription('RENEWAL30');
SELECT activate_subscription('RENEWAL30');

-- Check subscription extends correctly
SELECT * FROM get_subscription_history();
```

### Code at Max Uses
```sql
-- Create code with max 2 uses
INSERT INTO registration_codes (
  code, description, expires_at, is_active, max_uses, subscription_duration_days
) VALUES (
  'LIMITED2', 'Limited to 2 uses', NOW() + INTERVAL '1 year', true, 2, 30
);

-- Use it twice (should work)
SELECT activate_subscription('LIMITED2');

-- Use from different user account...

-- Try third use (should fail)
SELECT activate_subscription('LIMITED2');
```

**Expected:** Third attempt returns `success: false, message: "...maximum number of uses"`

### Inactive Code
```sql
-- Create inactive code
INSERT INTO registration_codes (
  code, description, expires_at, is_active, max_uses, subscription_duration_days
) VALUES (
  'INACTIVE', 'Inactive code', NOW() + INTERVAL '1 year', false, NULL, 30
);

-- Try to use it (should fail)
SELECT activate_subscription('INACTIVE');
```

**Expected:** `success: false, message: "Invalid, expired, or inactive subscription code"`

### Expired Code
```sql
-- Create code that's already expired
INSERT INTO registration_codes (
  code, description, expires_at, is_active, max_uses, subscription_duration_days
) VALUES (
  'OLDCODE', 'Expired code', NOW() - INTERVAL '1 day', true, NULL, 30
);

-- Try to use it (should fail)
SELECT activate_subscription('OLDCODE');
```

**Expected:** `success: false, message: "Invalid, expired, or inactive subscription code"`

## Step 8: Cleanup Test Data

After testing, clean up:

```sql
-- Remove test codes
DELETE FROM registration_codes
WHERE code IN ('RENEWAL30', 'ANNUAL2025', 'LIMITED2', 'INACTIVE', 'OLDCODE');

-- Reset your subscription to normal
UPDATE profiles
SET subscription_expires_at = created_at + INTERVAL '365 days',
    last_subscription_reminder_sent = NULL
WHERE email = 'your@email.com';

-- Clear test subscription history (optional)
DELETE FROM subscription_history
WHERE user_id = (SELECT id FROM profiles WHERE email = 'your@email.com');
```

## Common Issues and Solutions

### Issue: Function doesn't exist
**Solution:** Re-run the migration SQL script

### Issue: Permission denied
**Solution:** Ensure you're signed in and functions have correct grants:
```sql
GRANT EXECUTE ON FUNCTION activate_subscription(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_status() TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_history() TO authenticated;
```

### Issue: subscription_expires_at is NULL
**Solution:** Initialize manually:
```sql
UPDATE profiles
SET subscription_expires_at = created_at + INTERVAL '365 days'
WHERE subscription_expires_at IS NULL;
```

### Issue: Can't find subscription_history table
**Solution:** Check table was created:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'subscription_history';
```

## Next Steps After Testing

Once all tests pass:

1. ✅ Document current subscription codes in use
2. ✅ Update existing codes with subscription_duration_days
3. ✅ Communicate subscription system to users
4. ✅ Begin frontend implementation
5. ✅ Set up email notification system

## Support

If you encounter issues:
1. Check Supabase logs for errors
2. Verify all functions were created
3. Ensure RLS policies allow access
4. Test with different user accounts

## Monitoring Queries

Run these regularly:

```sql
-- Health check: All users have valid expiry dates
SELECT COUNT(*) as users_without_expiry
FROM profiles
WHERE subscription_expires_at IS NULL;
-- Should be 0

-- Daily summary
SELECT
  COUNT(*) FILTER (WHERE subscription_expires_at > NOW()) as active,
  COUNT(*) FILTER (WHERE subscription_expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days') as expiring_soon,
  COUNT(*) FILTER (WHERE subscription_expires_at < NOW()) as expired
FROM profiles;
```
