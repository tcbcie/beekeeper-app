# Lifetime Subscription Feature

## Overview

Added ability to create subscription codes that **never expire** (lifetime subscriptions).

## What Changed

### 1. UI Updates (Settings Page)

**Dropdown Option Added:**
- New option: `"Never expires (lifetime)"` with value `0`
- When selected, creates a code with `subscription_duration_days = 0`

**Table Display Updates:**

| Column | Display for Lifetime Codes |
|--------|---------------------------|
| **Subscription Duration** | "Never expires (lifetime)" in indigo color |
| **Subscription Expires** | "Never (Lifetime access)" in indigo color |

### 2. Database Functions Updated

Two SQL functions need to be updated to handle `subscription_duration_days = 0`:

#### A. `initialize_new_user_subscription()` Trigger Function

**File:** `sql/fix_new_user_subscription_init_v2.sql`

**What it does:**
- When a new user registers with a lifetime code (duration = 0)
- Sets `subscription_expires_at` to 100 years in future
- Effectively creates a "never expires" subscription

**Logic:**
```sql
IF code_duration = 0 THEN
  -- Lifetime: 100 years from now
  NEW.subscription_expires_at := NOW() + INTERVAL '100 years';
ELSE
  -- Regular: specified number of days
  NEW.subscription_expires_at := NOW() + (code_duration || ' days')::INTERVAL;
END IF;
```

#### B. `activate_subscription()` Function

**File:** `sql/fix_activate_subscription_lifetime.sql`

**What it does:**
- When a user enters a lifetime code to renew
- Sets `subscription_expires_at` to 100 years from now
- Ignores any existing expiry (lifetime always resets to 100 years)

**Logic:**
```sql
IF code_record.subscription_duration_days = 0 THEN
  -- Lifetime subscription: 100 years from now
  new_expiry := NOW() + INTERVAL '100 years';
ELSE
  -- Regular subscription: extend or start from today
  IF current_expiry IS NOT NULL AND current_expiry > NOW() THEN
    new_expiry := current_expiry + (code_record.subscription_duration_days || ' days')::INTERVAL;
  ELSE
    new_expiry := NOW() + (code_record.subscription_duration_days || ' days')::INTERVAL;
  END IF;
END IF;
```

## How to Apply Changes

### Step 1: UI Changes (Already Applied)

The UI changes are already in [settings/page.tsx](../src/app/dashboard/settings/page.tsx):
- ✅ Dropdown has "Never expires (lifetime)" option
- ✅ Table displays lifetime codes correctly
- ✅ Color-coded in indigo for easy identification

### Step 2: Database Updates (You Need to Run These)

Run these SQL scripts in your Supabase SQL Editor **in order**:

1. **First:** `sql/fix_new_user_subscription_init_v2.sql`
   - Updates trigger for new user registrations
   - Handles lifetime codes for new users

2. **Second:** `sql/fix_activate_subscription_lifetime.sql`
   - Updates renewal function
   - Handles lifetime codes when users renew

## How It Works

### Creating a Lifetime Code

1. Admin goes to **Settings > Subscription Codes**
2. Clicks **Create Subscription Code**
3. Fills in details:
   - Code: e.g., `LIFETIME2025`
   - Description: e.g., `Lifetime subscription - never expires`
   - Subscription Duration: Select **"Never expires (lifetime)"**
   - Max Uses: (optional)
4. Click **Create Code**

### User Experience

**When new user registers with lifetime code:**
```
User registers with code "LIFETIME2025"
  ↓
Trigger fires
  ↓
subscription_expires_at = NOW() + 100 years
  ↓
User gets lifetime access
```

**When existing user renews with lifetime code:**
```
User enters code "LIFETIME2025" on Profile page
  ↓
activate_subscription() function runs
  ↓
subscription_expires_at = NOW() + 100 years
  ↓
User gets lifetime access (any previous expiry is replaced)
```

### Admin View

In the Subscription Codes table, lifetime codes show:

| Code | Description | Duration | Expires | Usage |
|------|-------------|----------|---------|-------|
| LIFETIME2025 | Lifetime subscription | **Never expires** (lifetime) | **Never** (Lifetime access) | 5 / ∞ |

### User View

In the user's Profile page:

- **Status:** Active
- **Expires:** Jan 7, 2125 (100 years in future)
- **Days Remaining:** ~36,500 days
- **Current Code:** LIFETIME2025

The subscription status card will show "Active" with a green badge.

## Technical Details

### Why 100 Years?

- PostgreSQL handles dates up to year 294276
- 100 years is effectively "lifetime" for any human user
- Simpler than NULL values (avoids complex NULL handling)
- Easy to query: `WHERE subscription_expires_at > NOW()` works perfectly

### Database Schema

The `subscription_duration_days` column already allows `0`:

```sql
subscription_duration_days INTEGER NOT NULL
```

No schema changes needed - just function updates!

### Backwards Compatibility

✅ All existing codes continue to work exactly as before
✅ Regular duration codes (30/90/180/365 days) unchanged
✅ Users with regular subscriptions are not affected

## Testing

### Test Plan

1. **Create a lifetime code:**
   - Go to Settings > Subscription Codes
   - Create code with "Never expires (lifetime)"
   - Verify table shows "Never expires" in both columns

2. **Test new user registration:**
   - Sign out
   - Register new user with the lifetime code
   - Verify user gets subscription expiring ~100 years in future
   - Check Admin panel: user should show "Active" subscription

3. **Test renewal:**
   - Sign in as existing user with expiring subscription
   - Go to Profile page
   - Enter lifetime code
   - Verify subscription updates to ~100 years in future

4. **Test admin view:**
   - Check User Management table
   - Lifetime users should show very large "days remaining"
   - Status should be "Active" (green)

## Troubleshooting

### Issue: UI shows "Never expires" but user doesn't get lifetime subscription

**Solution:** You need to run the SQL scripts:
1. `sql/fix_new_user_subscription_init_v2.sql`
2. `sql/fix_activate_subscription_lifetime.sql`

The UI changes alone don't update the database logic.

### Issue: Existing lifetime codes created before this update

If you created codes with duration=0 before running the SQL updates:

1. Run both SQL scripts
2. Users who already used those codes need to re-activate:
   - Give them a new lifetime code, OR
   - Manually update their `subscription_expires_at` in database:
   ```sql
   UPDATE profiles
   SET subscription_expires_at = NOW() + INTERVAL '100 years'
   WHERE id = 'user-id-here';
   ```

### Issue: "Never expires" codes show wrong expiry in User Management

This is expected! The database has a future date (100 years), but the UI interprets this as "lifetime" and shows it appropriately.

## Files Modified

### Frontend
- ✅ [src/app/dashboard/settings/page.tsx](../src/app/dashboard/settings/page.tsx)
  - Added "Never expires (lifetime)" dropdown option
  - Updated table display logic for duration = 0
  - Added "Subscription Expires" column

### Backend (SQL Scripts to Run)
- 🔧 [sql/fix_new_user_subscription_init_v2.sql](fix_new_user_subscription_init_v2.sql)
  - Updates `initialize_new_user_subscription()` function
  - Handles lifetime codes for new users

- 🔧 [sql/fix_activate_subscription_lifetime.sql](fix_activate_subscription_lifetime.sql)
  - Updates `activate_subscription()` function
  - Handles lifetime codes for renewals

### Documentation
- 📄 [sql/LIFETIME_SUBSCRIPTION_UPDATE.md](LIFETIME_SUBSCRIPTION_UPDATE.md) (this file)

## Version

These changes are part of **v1.0.34** (pending).

## Related Features

- [Subscription System](../SUBSCRIPTION_UI_IMPLEMENTATION.md)
- [Registration Codes](README_FIX_NEW_USER_SUBSCRIPTIONS.md)
- [Fix Subscription Status](fix_get_subscription_status.sql)

## Summary

✅ **UI Ready:** Admins can now create lifetime codes
🔧 **SQL Needed:** Run 2 SQL scripts to enable backend support
🎯 **Result:** True "never expires" subscriptions for VIP users

**Next Steps:**
1. Run `sql/fix_new_user_subscription_init_v2.sql`
2. Run `sql/fix_activate_subscription_lifetime.sql`
3. Create your first lifetime code!
4. Test with a new user registration
