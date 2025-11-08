# Apply Subscription System Fixes

## Critical Fixes Required

You've discovered two critical bugs in the subscription system that need to be fixed immediately:

1. **New users not getting subscriptions initialized**
2. **get_subscription_status() function error with NULL records**

## Quick Fix Instructions

### Step 1: Open Supabase Dashboard

1. Go to your Supabase project
2. Navigate to **SQL Editor**

### Step 2: Run Both Fix Scripts (In Order)

#### Fix #1: Initialize Subscriptions for New Users

**File:** `sql/fix_new_user_subscription_init.sql`

1. Copy the entire contents of this file
2. Paste into SQL Editor
3. Click **Run**
4. You should see success messages about triggers being created

**What this fixes:**
- Creates trigger to auto-initialize subscriptions for all future new users
- Fixes existing user `rickneefe65@gmail.com` retroactively
- Fixes any other users who registered without getting subscriptions

#### Fix #2: Fix get_subscription_status Function

**File:** `sql/fix_get_subscription_status.sql`

1. Copy the entire contents of this file
2. Paste into SQL Editor
3. Click **Run**
4. You should see success message about function being fixed

**What this fixes:**
- Fixes PostgreSQL error: "record 'code_info' is not assigned yet"
- Allows subscription status to be fetched without errors
- Makes Profile page load properly
- Makes Subscription warning banner work

### Step 3: Verify Fixes

#### Check in Browser Console

1. Refresh your app
2. Open browser console (F12)
3. Navigate to Profile page
4. **Should NOT see:**
   - "Error fetching subscription status"
   - "record 'code_info' is not assigned yet"
   - "Cannot create and save status of 500"

#### Check User in Admin Panel

1. Go to **Settings > User Management**
2. Find user `rickneefe65@gmail.com`
3. **Should see:**
   - Subscription Code: "07DEC2025"
   - Subscription: "Active" (green badge)
   - Expires: [future date]
   - Days remaining: [number]

#### Check User Profile

1. Sign in as `rickneefe65@gmail.com`
2. Go to **Profile** page
3. **Should see:**
   - Subscription Status Card showing "Active"
   - Green progress bar
   - Subscription history table showing one activation
   - No errors in console

### Step 4: Test with New User (Optional)

Create a brand new test user with a subscription code to verify the trigger works:

1. Sign out
2. Click "Sign Up"
3. Enter test email and create new subscription code
4. Complete registration
5. Check that user immediately has active subscription

## What Each Fix Does

### Fix #1: Auto-Initialize Subscriptions

**Before:**
```
New user registers with code "07DEC2025"
  → used_registration_code_id = [code ID]
  → subscription_expires_at = NULL ❌
  → current_subscription_code_id = NULL ❌
```

**After:**
```
New user registers with code "07DEC2025"
  → Trigger fires automatically
  → subscription_expires_at = NOW() + 365 days ✅
  → current_subscription_code_id = [code ID] ✅
```

### Fix #2: get_subscription_status Function

**Before:**
```sql
DECLARE
  code_info RECORD;  -- Untyped record
BEGIN
  IF code_id IS NOT NULL THEN
    SELECT ... INTO code_info ...
  END IF;

  -- ERROR: code_info not assigned if code_id was NULL
  ... code_info.code ...  -- ❌ Crashes here
```

**After:**
```sql
DECLARE
  code_text VARCHAR(50);  -- Typed variable
  code_desc TEXT;         -- Typed variable
BEGIN
  IF code_id IS NOT NULL THEN
    SELECT ... INTO code_text, code_desc ...
  ELSE
    code_text := NULL;  -- Explicitly set
    code_desc := NULL;
  END IF;

  ... code_text ...  -- ✅ Safe to use
```

## Troubleshooting

### Issue: SQL script returns error

**Error:** "permission denied for table profiles"
**Solution:** Make sure you're running the script as the database owner or with SUPERUSER privileges

**Error:** "function already exists"
**Solution:** This is fine - the script uses `CREATE OR REPLACE` so it will update the existing function

### Issue: User still shows "No Subscription"

1. Verify the fix was applied:
   ```sql
   SELECT COUNT(*) FROM information_schema.triggers
   WHERE trigger_name = 'trigger_initialize_new_user_subscription';
   ```
   Should return 1.

2. Check if user's subscription was initialized:
   ```sql
   SELECT id, email, subscription_expires_at, current_subscription_code_id
   FROM profiles p
   JOIN auth.users au ON au.id = p.id
   WHERE au.email = 'rickneefe65@gmail.com';
   ```
   Both fields should have values.

3. If still NULL, manually run the UPDATE:
   ```sql
   UPDATE profiles
   SET
     subscription_expires_at = NOW() + INTERVAL '365 days',
     current_subscription_code_id = used_registration_code_id
   WHERE id = (
     SELECT id FROM auth.users WHERE email = 'rickneefe65@gmail.com'
   );
   ```

### Issue: Still seeing console errors

1. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Verify second fix was applied:
   ```sql
   SELECT prosrc FROM pg_proc
   WHERE proname = 'get_subscription_status';
   ```
   Should show the new code with `code_text` and `code_desc` variables.

## Expected Results After Both Fixes

✅ **New Users:**
- Automatically get subscriptions when they register
- No manual intervention needed
- subscription_expires_at and current_subscription_code_id populated

✅ **Existing Broken Users:**
- Fixed retroactively by UPDATE statement
- rickneefe65@gmail.com now has active subscription
- All other users with same issue also fixed

✅ **Profile Page:**
- Loads without errors
- Subscription Status Card displays correctly
- Subscription History Table shows data
- No PostgreSQL errors in console

✅ **Admin Panel:**
- User Management shows correct subscription status
- Subscription columns populated with data
- Color-coded badges work correctly

✅ **Warning Banner:**
- Loads without errors
- Shows appropriate warnings for expiring subscriptions
- Hides for active subscriptions

## Files Reference

- **sql/fix_new_user_subscription_init.sql** - Creates triggers for new users
- **sql/fix_get_subscription_status.sql** - Fixes function error
- **sql/README_FIX_NEW_USER_SUBSCRIPTIONS.md** - Detailed documentation for fix #1
- **sql/APPLY_SUBSCRIPTION_FIXES.md** - This file

## Need Help?

If you encounter any issues:

1. Check browser console for specific error messages
2. Check Supabase logs for database errors
3. Verify both SQL scripts ran successfully
4. Try the manual verification queries above

## Version

These fixes are included in **v1.0.31**
