# Fix: New User Subscription Initialization

## Problem

New users registering with subscription codes are not getting their subscriptions automatically initialized. This causes:
- "No Subscription" status in admin user management
- "Failed to fetch subscription" error in user profile

## Root Cause

The original subscription migration (`create_subscription_system.sql`) only initialized subscriptions for **existing users** at migration time. It did not create a trigger to auto-initialize subscriptions for **new users** registering after the migration.

## Solution

Run the SQL script `fix_new_user_subscription_init.sql` which:

1. **Creates a trigger** to auto-initialize subscriptions for new users
2. **Fixes existing users** who registered after the migration but don't have subscriptions

## How to Apply Fix

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file `sql/fix_new_user_subscription_init.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **Run**

### Option 2: Via Command Line

```bash
# If you have psql installed and DATABASE_URL configured
psql $DATABASE_URL -f sql/fix_new_user_subscription_init.sql
```

## What the Fix Does

### 1. Creates Auto-Initialization Trigger

```sql
CREATE TRIGGER trigger_initialize_new_user_subscription
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_new_user_subscription();
```

This ensures that **every new user** who registers with a code automatically gets:
- `subscription_expires_at` = NOW() + code's `subscription_duration_days`
- `current_subscription_code_id` = their registration code ID

### 2. Fixes Existing Broken Users

The script also runs an UPDATE to fix users who already registered but don't have subscriptions:

```sql
UPDATE public.profiles
SET
  subscription_expires_at = NOW() + code duration,
  current_subscription_code_id = used_registration_code_id
WHERE used_registration_code_id IS NOT NULL
  AND subscription_expires_at IS NULL;
```

This will immediately fix `rickneefe65@gmail.com` and any other users with the same issue.

## Verification

After running the fix, verify it worked:

### 1. Check the Specific User

```sql
-- Replace with the actual user ID
SELECT
  p.id,
  au.email,
  p.subscription_expires_at,
  p.current_subscription_code_id,
  rc.code as registration_code,
  rc.subscription_duration_days
FROM profiles p
JOIN auth.users au ON au.id = p.id
LEFT JOIN registration_codes rc ON rc.id = p.used_registration_code_id
WHERE au.email = 'rickneefe65@gmail.com';
```

You should see:
- `subscription_expires_at` populated with a future date
- `current_subscription_code_id` matching their registration code
- `registration_code` = "07DEC2025"
- `subscription_duration_days` = the duration you set (likely 365)

### 2. Test with New User

Create another test user with a subscription code and verify they immediately get a subscription.

### 3. Check in UI

1. **Admin User Management:**
   - Go to Settings > Subscription Codes
   - Find `rickneefe65@gmail.com`
   - Should show "Active" subscription status
   - Should show subscription expiry date

2. **User Profile:**
   - Sign in as `rickneefe65@gmail.com`
   - Go to Profile page
   - Should see Subscription Status Card showing "Active"
   - Should see subscription history

## Expected Results

After fix:
- ✅ New users automatically get subscriptions when they register
- ✅ Existing broken users are fixed retroactively
- ✅ Admin panel shows correct subscription status
- ✅ User profile shows subscription info without errors

## Technical Details

### Trigger Logic

The trigger function checks:
1. Does the new/updated profile have a `used_registration_code_id`?
2. Is `subscription_expires_at` currently NULL?
3. If yes to both, initialize the subscription

### Trigger Events

Two triggers created:
1. **INSERT trigger** - Fires when new user profile is created
2. **UPDATE trigger** - Fires when registration code is added to existing profile (OAuth flow)

This covers both registration paths:
- Email/password registration (INSERT)
- OAuth registration (INSERT + UPDATE for code)

## Rollback (if needed)

If you need to undo this:

```sql
-- Remove triggers
DROP TRIGGER IF EXISTS trigger_initialize_new_user_subscription ON public.profiles;
DROP TRIGGER IF EXISTS trigger_initialize_subscription_on_code_update ON public.profiles;

-- Remove function
DROP FUNCTION IF EXISTS public.initialize_new_user_subscription();
```

## Future Prevention

This trigger is now permanent. All future new users will automatically get subscriptions initialized. No manual intervention needed.

## Related Files

- **Fix Script:** `sql/fix_new_user_subscription_init.sql`
- **Original Migration:** `sql/Archive/create_subscription_system.sql`
- **Database Functions:**
  - `get_subscription_status()`
  - `activate_subscription(code)`
  - `get_subscription_history()`
