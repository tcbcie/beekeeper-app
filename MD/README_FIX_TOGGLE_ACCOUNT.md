# Fix: User Account Enable/Disable Functionality

## Problem
The `toggle_user_account` function is trying to update a non-existent `updated_at` column in the `profiles` table, causing a 400 Bad Request error:
```
column "updated_at" of relation "profiles" does not exist
```

## Solution
Run the SQL script to recreate the function without the problematic column reference.

## Steps to Fix

### 1. Open Supabase SQL Editor
- Go to your Supabase project dashboard
- Navigate to the **SQL Editor** in the left sidebar

### 2. Run Verification Queries (Optional)
- Open `VERIFY_toggle_user_account.sql`
- Copy and paste the queries into the SQL Editor
- Run them to see the current state of your database

### 3. Apply the Fix
- Open `QUICK_FIX_toggle_user_account.sql`
- Copy the entire contents
- Paste into the Supabase SQL Editor
- Click **Run** or press `Ctrl+Enter`

### 4. Test the Fix
- Go back to your HiveCraic application
- Navigate to **Dashboard** → **Settings** → **Users** tab
- Try to disable/enable a user account (not your own)
- The status should change from "Active" to "Disabled" and vice versa

## What Changed
The function was updated to remove this line:
```sql
updated_at = NOW()
```

Because the `profiles` table does not have an `updated_at` column.

## Files Involved
- `QUICK_FIX_toggle_user_account.sql` - The fix to apply
- `VERIFY_toggle_user_account.sql` - Verification queries
- `create_registration_security.sql` - Main script (already fixed for future deployments)

## Expected Result
After running the fix:
- ✅ Enable/Disable buttons should work without errors
- ✅ Status column should update from "Active" to "Disabled"
- ✅ Disabled users should be automatically signed out
- ✅ Database function executes successfully
