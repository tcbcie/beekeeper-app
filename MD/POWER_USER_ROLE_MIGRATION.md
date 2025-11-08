# Power User Role Migration Guide

## Issue

When changing a user to "Power User" role in the UI:
- ✅ Change confirmation shown
- ❌ Role reverts back to "User"
- ❌ Change doesn't persist in database

## Root Cause

The `profiles.role` column is type **TEXT** with a default value of `'User'::text`, but there was likely a CHECK constraint that only allowed `'User'` and `'Admin'` values. When you tried to save `'Power User'`, the database either:
1. Rejected it due to the constraint, OR
2. Accepted it but another process reverted it

## The Fix

Run [add_power_user_role.sql](add_power_user_role.sql) which:
1. Detects that `role` is a TEXT column
2. Drops any existing `profiles_role_check` constraint
3. Adds a new CHECK constraint: `role IN ('User', 'Power User', 'Admin')`
4. Allows the database to accept and persist "Power User"

## How to Apply

### Step 1: Run the Migration

1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `add_power_user_role.sql`
5. Click **Run**

### Step 2: Verify Success

You should see output like:

```
NOTICE:  Current role column type: text
NOTICE:  Role column is TEXT-based. Adding check constraint...
NOTICE:  Dropped existing role check constraint
NOTICE:  Added check constraint with Power User role
NOTICE:  ============================================
NOTICE:  POWER USER ROLE CONFIGURATION COMPLETE!
NOTICE:  ============================================
NOTICE:  The role column now supports:
NOTICE:  1. User - Standard access
NOTICE:  2. Power User - Enhanced access (NEW!)
NOTICE:  3. Admin - Full administrative access
NOTICE:
NOTICE:  You can now assign users the "Power User" role
NOTICE:  through the User Management interface.
NOTICE:  ============================================
```

### Step 3: Test in UI

1. Go to **Dashboard > Settings > User Management**
2. Select a user
3. Change their role to **Power User**
4. Click anywhere or change another user
5. **Refresh the page**
6. Verify the user still shows as **Power User** (blue badge)

## What Changed

### Database Level:
```sql
-- OLD CONSTRAINT (if existed):
CHECK (role IN ('User', 'Admin'))

-- NEW CONSTRAINT:
CHECK (role IN ('User', 'Power User', 'Admin'))
```

### UI Level (Already Updated):
- ✅ Role filter dropdown includes "Power Users"
- ✅ Role selector includes "Power User" option
- ✅ Power User badge displays in blue
- ✅ Legend explains all three roles

## Role Descriptions

| Role | Color | Permissions |
|------|-------|------------|
| User | Gray | Standard access to their own beekeeping data |
| Power User | Blue | Enhanced access with additional features and data management |
| Admin | Purple (with shield) | Full access including user management and settings |

## Troubleshooting

### If migration fails:

1. **Check if constraint already exists:**
   ```sql
   SELECT constraint_name, check_clause
   FROM information_schema.check_constraints
   WHERE constraint_name = 'profiles_role_check';
   ```

2. **Manually drop constraint:**
   ```sql
   ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
   ```

3. **Re-run the migration**

### If role still reverts:

1. **Check for triggers:**
   ```sql
   SELECT trigger_name, event_manipulation, action_statement
   FROM information_schema.triggers
   WHERE event_object_table = 'profiles';
   ```

2. **Check for RLS policies** that might be filtering/modifying roles

3. **Check browser console** for any errors during role change

## Files Modified

### Frontend:
- `src/app/dashboard/settings/page.tsx` - Added Power User support throughout

### Backend:
- `sql/add_power_user_role.sql` - Migration to enable Power User role
- `sql/diagnose_role_column.sql` - Diagnostic queries for troubleshooting

## Version

Added in: v1.0.35 (January 8, 2025)
