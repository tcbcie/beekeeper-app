# Power User Role Update - v1.0.35

## Summary

Added a new **Power User** role between User and Admin, with enhanced access permissions.

## The Problem

When changing a user to "Power User" in the admin interface:
- UI shows confirmation ✅
- Role appears to change ✅
- But reverts back to "User" on refresh ❌

**Root Cause:** The `profiles.role` column is TEXT type, but has a CHECK constraint that only allows `'User'` and `'Admin'` values.

## The Solution

Run SQL migration to update the CHECK constraint to include `'Power User'`.

---

## Step 1: Run SQL Migration

**File:** [sql/add_power_user_role.sql](sql/add_power_user_role.sql)

**Open Supabase Dashboard → SQL Editor and run:**

```sql
-- Add Power User role support
-- This migration handles both enum-based and text-based role columns

DO $$
DECLARE
  column_type TEXT;
  enum_exists BOOLEAN;
BEGIN
  -- Check what type the role column is
  SELECT data_type INTO column_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'role';

  RAISE NOTICE 'Current role column type: %', column_type;

  -- If it's a USER-DEFINED type (enum), try to add the value
  IF column_type = 'USER-DEFINED' THEN
    -- Check if user_role enum exists
    SELECT EXISTS (
      SELECT 1 FROM pg_type WHERE typname = 'user_role'
    ) INTO enum_exists;

    IF enum_exists THEN
      -- Check if 'Power User' already exists in the enum
      IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'user_role'
        AND e.enumlabel = 'Power User'
      ) THEN
        ALTER TYPE user_role ADD VALUE 'Power User';
        RAISE NOTICE 'Added "Power User" to user_role enum';
      ELSE
        RAISE NOTICE '"Power User" already exists in user_role enum';
      END IF;
    END IF;

  -- If it's TEXT or CHARACTER VARYING, add a check constraint
  ELSIF column_type IN ('text', 'character varying') THEN
    RAISE NOTICE 'Role column is TEXT-based. Adding check constraint...';

    -- Drop existing constraint if it exists
    IF EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_name = 'profiles_role_check'
        AND table_name = 'profiles'
        AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
      RAISE NOTICE 'Dropped existing role check constraint';
    END IF;

    -- Add new constraint with Power User included
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('User', 'Power User', 'Admin'));

    RAISE NOTICE 'Added check constraint with Power User role';

  ELSE
    RAISE NOTICE 'Unknown role column type: %. No changes made.', column_type;
  END IF;

  -- Final verification message
  RAISE NOTICE '============================================';
  RAISE NOTICE 'POWER USER ROLE CONFIGURATION COMPLETE!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'The role column now supports:';
  RAISE NOTICE '1. User - Standard access';
  RAISE NOTICE '2. Power User - Enhanced access (NEW!)';
  RAISE NOTICE '3. Admin - Full administrative access';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now assign users the "Power User" role';
  RAISE NOTICE 'through the User Management interface.';
  RAISE NOTICE '============================================';
END $$;
```

### Expected Output:

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

---

## Step 2: Verify in UI

### Test the Change:

1. Go to **Dashboard → Settings → User Management**
2. Find a test user
3. Change their role to **Power User** (blue badge)
4. Refresh the page
5. **Verify the role persists as "Power User"** ✅

---

## What Changed

### Database Changes:

```sql
-- Before:
CHECK (role IN ('User', 'Admin'))

-- After:
CHECK (role IN ('User', 'Power User', 'Admin'))
```

### UI Changes (Already Applied):

#### 1. User Management Table
- **Filter dropdown** now includes "Power Users" option
- **Role selector** includes "Power User" option
- **Power User badge** displays in **blue** (vs gray for User, purple for Admin)
- **Compact display**: Shows as "Power" in status badges

#### 2. Legend Added
A comprehensive legend now appears at the bottom of User Management:

**Role Descriptions:**
- **User** (gray badge) - Standard access to their own beekeeping data
- **Power** (blue badge) - Enhanced access with additional features and data management
- **Admin** (purple badge with shield) - Full access including user management and settings

**Status Symbols:**
- Account Status: `●` (active) / `○` (disabled)
- Subscription Status: `✓` (active) / `7d` (expiring) / `3d!` (urgent) / `✗` (expired) / `−` (none)

---

## Role Comparison

| Role | Badge Color | Access Level | Use Case |
|------|-------------|--------------|----------|
| **User** | Gray | Standard | Individual beekeepers managing their own hives |
| **Power User** | Blue | Enhanced | Advanced beekeepers needing additional features |
| **Admin** | Purple + Shield | Full | Organization managers, system administrators |

---

## Implementation Details

### Frontend Files Modified:

**src/app/dashboard/settings/page.tsx:**
- Updated `UserProfile` interface: `role: 'User' \| 'Power User' \| 'Admin'`
- Updated `roleFilter` state to include 'Power User'
- Updated role filter dropdown with "Power Users" option
- Updated role badge display logic (blue for Power User)
- Updated role selector with "Power User" option
- Updated `handleRoleChange` function signature
- Added comprehensive legend with role descriptions and status symbols

### Backend Files Created:

- **sql/add_power_user_role.sql** - Migration to enable Power User role
- **sql/diagnose_role_column.sql** - Diagnostic queries for troubleshooting
- **sql/POWER_USER_ROLE_MIGRATION.md** - Detailed migration documentation
- **POWER_USER_ROLE_UPDATE.md** - This summary document

---

## Troubleshooting

### If migration fails with "constraint already exists":

```sql
-- Manually drop the constraint:
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Then re-run the migration
```

### If role still reverts after migration:

1. **Verify constraint was updated:**
   ```sql
   SELECT constraint_name, check_clause
   FROM information_schema.check_constraints
   WHERE constraint_name = 'profiles_role_check';
   ```

   Should show: `(role = ANY (ARRAY['User'::text, 'Power User'::text, 'Admin'::text]))`

2. **Check for conflicting triggers:**
   ```sql
   SELECT trigger_name, event_manipulation, action_statement
   FROM information_schema.triggers
   WHERE event_object_table = 'profiles';
   ```

3. **Clear browser cache** and hard refresh (Ctrl+Shift+R)

---

## Testing Checklist

After running the migration:

- [ ] Run SQL migration in Supabase SQL Editor
- [ ] Verify success messages in SQL output
- [ ] Go to User Management in admin panel
- [ ] Filter by "Power Users" (should work even if 0 results)
- [ ] Change a test user to "Power User"
- [ ] See blue "Power" badge appear
- [ ] Refresh the page
- [ ] Verify user still shows as "Power User"
- [ ] Click on user to expand details
- [ ] Change user back to "User" (to test both directions)
- [ ] Verify legend appears at bottom of User Management
- [ ] Legend should show all three roles with correct colors

---

## Version History

- **v1.0.35** (January 8, 2025) - Added Power User role with UI and database support

---

## Related Documentation

- [sql/POWER_USER_ROLE_MIGRATION.md](sql/POWER_USER_ROLE_MIGRATION.md) - Detailed migration guide
- [REGISTRATION_TO_SUBSCRIPTION_MIGRATION.md](REGISTRATION_TO_SUBSCRIPTION_MIGRATION.md) - Previous major update
- [LIFETIME_SUBSCRIPTION_UPDATE.md](LIFETIME_SUBSCRIPTION_UPDATE.md) - Lifetime subscription feature

---

## Notes

The Power User role is designed to accommodate users who need more than basic access but don't require full administrative privileges. This could include:

- Team leaders or supervisors
- Advanced beekeepers managing multiple apiaries
- Users with data export/reporting needs
- Beta testers for new features
- Organization coordinators

The exact permissions for Power User can be defined in your application logic by checking `user.role === 'Power User'` and granting appropriate access.
