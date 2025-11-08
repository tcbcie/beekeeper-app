# Troubleshooting Guide: User Account Enable/Disable Not Working

## Problem
When clicking "Enable" or "Disable" button for a user account:
- Status does not change from "Active" to "Disabled"
- Account does not actually get disabled
- May see 400 Bad Request error in console

## Root Causes
1. Database function has bug (tries to update non-existent `updated_at` column)
2. Missing `is_active` column in profiles table
3. Schema cache not reloaded after changes

## Solution - Run the Complete Fix

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **+ New query**

### Step 2: Run the Complete Fix Script
1. Open the file: `sql/COMPLETE_FIX_ALL.sql`
2. Copy the **entire contents** of the file
3. Paste into the Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)
5. Check the **Results** panel for verification messages

### Step 3: Expected Output
You should see messages like:
```
✓ is_active column already exists (or "Added is_active column")
✓ ALL CHECKS PASSED!
```

### Step 4: Test the Fix
1. **Close** your HiveCraic browser tab completely
2. **Open** a new browser tab
3. Go to your HiveCraic application
4. Navigate to **Settings** → **Users** tab
5. Click **Disable** on any user (not your own)
6. The status should immediately change from "Active" to "Disabled"
7. Click **Enable** to test the reverse
8. The status should change back to "Active"

### Step 5: If Still Not Working

#### Check Browser Console
1. Press **F12** to open Developer Tools
2. Go to **Console** tab
3. Click the Disable button
4. Look for errors - copy and share any error messages

#### Run Diagnostic Script
1. Open `sql/DIAGNOSE_ISSUE.sql`
2. Copy and paste into Supabase SQL Editor
3. Run it and review the output
4. Check specifically:
   - Does `is_active` column exist?
   - Does function contain the word "updated_at"? (it shouldn't)
   - Are there any users in the profiles table?

#### Clear Browser Cache
1. Press **Ctrl+Shift+Delete**
2. Select "Cached images and files"
3. Click **Clear data**
4. Reload the application

#### Check RLS Policies
The function uses `SECURITY DEFINER` so it should bypass RLS, but verify:
```sql
-- Run this in SQL Editor
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
```

## Quick Reference: Key Files

| File | Purpose |
|------|---------|
| `sql/COMPLETE_FIX_ALL.sql` | **USE THIS** - Complete fix with verification |
| `sql/DIAGNOSE_ISSUE.sql` | Diagnostic queries to identify the problem |
| `sql/QUICK_FIX_toggle_user_account.sql` | Just the function fix (if column exists) |
| `sql/ADD_IS_ACTIVE_COLUMN.sql` | Add is_active column (if missing) |
| `sql/VERIFY_toggle_user_account.sql` | Verify current database state |

## Common Issues

### Issue: "Only admins can enable/disable user accounts"
**Solution:** Make sure you're logged in as an Admin user
```sql
-- Check your role
SELECT id, email, role FROM profiles WHERE email = 'your@email.com';

-- If you need to make yourself admin:
UPDATE profiles SET role = 'Admin' WHERE email = 'your@email.com';
```

### Issue: "Cannot disable your own admin account"
**Solution:** This is expected behavior - you cannot disable yourself

### Issue: Status shows but doesn't persist after page reload
**Solution:** The database update failed. Check browser console for actual error message.

### Issue: 400 Bad Request error
**Solution:** The function still has the `updated_at` bug. Re-run `COMPLETE_FIX_ALL.sql`

## Contact
If none of these solutions work, please provide:
1. Output from `DIAGNOSE_ISSUE.sql`
2. Error messages from browser console (F12)
3. Screenshots of the issue
