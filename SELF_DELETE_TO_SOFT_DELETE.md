# User Self-Delete: Changed from Hard Delete to Soft Delete

## Problem Identified

The user self-deletion feature (`delete_own_account`) was performing a **hard delete** that permanently removed all user data, while admin-initiated deletions used a **soft delete** that preserved data. This created an inconsistency:

- **Admin deletes user** → Soft delete (data preserved, can be reactivated)
- **User deletes self** → Hard delete (all data permanently lost)

## Solution

Updated `delete_own_account` function to use soft delete, making it consistent with admin deletions.

## Changes Made

### 1. Database Function Update

**File:** `sql/update_delete_own_account_to_soft_delete.sql`

**Old Behavior (Hard Delete):**
```sql
-- Permanently deleted:
DELETE FROM tasks_events WHERE user_id = current_user_id;
DELETE FROM harvests WHERE user_id = current_user_id;
DELETE FROM feedings WHERE user_id = current_user_id;
DELETE FROM varroa_treatments WHERE user_id = current_user_id;
DELETE FROM varroa_checks WHERE user_id = current_user_id;
DELETE FROM inspections WHERE user_id = current_user_id;
DELETE FROM queens WHERE user_id = current_user_id;
DELETE FROM hives WHERE user_id = current_user_id;
DELETE FROM apiaries WHERE user_id = current_user_id;
DELETE FROM team_members WHERE user_id = current_user_id;
DELETE FROM teams WHERE owner_id = current_user_id;
DELETE FROM profiles WHERE id = current_user_id;
DELETE FROM auth.users WHERE id = current_user_id;
-- Result: All data permanently lost, cannot be recovered
```

**New Behavior (Soft Delete):**
```sql
-- Preserve all data, just mark as deleted:
UPDATE public.profiles
SET
  deleted_at = NOW(),
  is_active = false,
  original_email = COALESCE(original_email, v_original_email),
  email = 'deleted_' || id || '@deleted.local'
WHERE id = current_user_id;

-- Disable auth account (but don't delete it):
UPDATE auth.users
SET
  email = 'deleted_' || id || '@deleted.local',
  email_confirmed_at = NULL,
  banned_until = '2099-12-31'::timestamptz
WHERE id = current_user_id;
-- Result: All data preserved, account can be reactivated
```

### 2. Profile Page UI Updates

**File:** `src/app/dashboard/profile/page.tsx`

**Changes:**

1. **Button Description:**
   - Old: "Permanently delete your account and all data"
   - New: "Deactivate your account (can be reactivated later)"

2. **Modal Warning Box:**
   - Old: Red warning box about permanent deletion
   - New: Blue info box explaining data preservation and reactivation process

3. **Success Message:**
   - Old: "Your account and all associated data have been permanently deleted."
   - New: "Your account has been deactivated. All your data has been preserved and you can request account reactivation at any time by visiting the reactivation page."

4. **Redirect After Deletion:**
   - Old: Redirects to `/` (home/login)
   - New: Redirects to `/reactivate` (reactivation page)

## Benefits

✅ **Consistency:** User self-delete and admin delete now work the same way
✅ **Data Preservation:** All beekeeping data preserved (apiaries, hives, queens, inspections, etc.)
✅ **Reversible:** Users can change their mind and request reactivation
✅ **Professional UX:** Better user experience with clear messaging about what happens
✅ **Accident Protection:** Prevents permanent data loss from accidental deletions

## User Flow After Changes

### Self-Delete Flow:
```
User clicks "Delete Account" in Profile
↓
Sees blue info box explaining:
  - Data will be preserved
  - Account can be reactivated
  - Admin approval required
↓
Types "DELETE" to confirm
↓
Account deactivated (soft delete)
↓
Redirected to /reactivate page
↓
Can immediately request reactivation
↓
Admin approves request
↓
Full access restored with all data intact
```

### What Gets Preserved:
- All apiaries and hives
- All queens and inspection records
- All varroa checks and treatments
- All feeding and harvest records
- All tasks and events
- All team memberships and owned teams
- User profile and settings
- Subscription history
- Payment history

### What Changes:
- `deleted_at` timestamp set
- `is_active` set to false
- Email changed to `deleted_xxx@deleted.local`
- Auth account banned until 2099-12-31
- Cannot log in until reactivated

## Implementation Steps

1. **Run SQL script in Supabase:**
   ```sql
   -- Run this in Supabase SQL editor
   sql/update_delete_own_account_to_soft_delete.sql
   ```

2. **UI changes already made:**
   - Profile page updated to reflect soft delete
   - Modal messaging updated
   - Success messages updated
   - Redirect updated

## Testing

1. **Test self-delete:**
   - Log in as test user
   - Go to Profile → Danger Zone
   - Click "Delete Account"
   - Verify new blue info box appears
   - Type "DELETE" and confirm
   - Verify redirected to `/reactivate`

2. **Verify data preservation:**
   - Check database - profile should have `deleted_at` timestamp
   - Check email changed to `deleted_xxx@deleted.local`
   - Check all hives, apiaries, etc. still exist in database

3. **Test reactivation:**
   - On `/reactivate` page, enter original email
   - Submit reactivation request
   - Log in as admin
   - Go to Settings → User Management → Reactivation Requests
   - Approve the request
   - Original user can now log in with restored account

## Comparison: Before vs After

| Aspect | Before (Hard Delete) | After (Soft Delete) |
|--------|---------------------|---------------------|
| Data | Permanently deleted | Fully preserved |
| Reactivation | Impossible | Available via admin approval |
| User messaging | "Permanently delete" | "Deactivate (can be reactivated)" |
| Redirect | Home page | Reactivation page |
| Consistency | Inconsistent with admin delete | Consistent across the board |
| Accident protection | None - permanent loss | Full - can be undone |
| Auth account | Deleted | Banned but preserved |
| Profile | Deleted | Marked as deleted |

## Future Enhancements

Potential future additions:
- Self-service reactivation (without admin approval) for certain cases
- Automatic permanent deletion after X months of being soft-deleted
- Email notification when account is deactivated
- Email notification when reactivation request is submitted
- Option for true permanent deletion for users who really want it
