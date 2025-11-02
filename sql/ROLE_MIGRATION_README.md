# Role Migration Guide

## Overview

This guide covers migrating user role data from the old `del_user_profiles` table to the current `profiles` table, restoring admin functionality for the application.

## Background

Previously, the application used a `user_profiles` table (now renamed to `del_user_profiles`) that contained a `role` column with values:
- `'user'` - Regular users
- `'admin'` - Admin users with access to Settings page

The application has been migrated to use a `profiles` table, but the role column and data need to be properly migrated.

## TypeScript Role Expectations

The TypeScript code expects role values with proper casing:
- `'User'` - Regular user (capital U)
- `'Admin'` - Admin user (capital A)

See `src/lib/auth.ts`:
```typescript
export type UserRole = 'User' | 'Admin'
```

## Migration Scripts

### 1. CHECK_ROLE_MIGRATION_STATUS.sql

**Purpose**: Diagnostic script to check current state

**Run this first** to understand:
- Whether `del_user_profiles` table exists
- Whether `profiles` table has a `role` column
- Current role distribution
- What migration steps are needed

```bash
# Run in your database client or via Supabase SQL editor
```

### 2. MIGRATE_ROLES_FROM_DEL_USER_PROFILES.sql

**Purpose**: Main migration script

**What it does**:
1. Adds `role` column to `profiles` table if missing (default: 'User')
2. Adds check constraint to ensure only 'User' or 'Admin' values
3. Migrates role data from `del_user_profiles` if it exists
4. Normalizes all role values to proper case ('User' or 'Admin')
5. Sets default value for new users
6. Creates index on role column for performance
7. Updates the `handle_new_user` trigger function
8. Shows summary of migration results

**Run this** to perform the migration:
```bash
# Run in your database client or via Supabase SQL editor
```

### 3. SET_USER_AS_ADMIN.sql

**Purpose**: Helper script to manually set a user as admin

**Use this** if:
- You need to promote a user to admin after migration
- No admin users exist after migration
- You want to add additional admin users

**Steps**:
1. Open the file
2. Uncomment one of the UPDATE statements
3. Replace the placeholder with actual email or user ID
4. Run the script

Example:
```sql
UPDATE public.profiles SET role = 'Admin' WHERE email = 'admin@example.com';
```

## Migration Steps (Recommended Order)

### Step 1: Check Current State
```bash
Run: CHECK_ROLE_MIGRATION_STATUS.sql
```
Review output to understand what needs to be migrated.

### Step 2: Run Migration
```bash
Run: MIGRATE_ROLES_FROM_DEL_USER_PROFILES.sql
```
This will:
- Create role column if needed
- Migrate data from del_user_profiles
- Normalize values
- Set up constraints

### Step 3: Verify Results
Check the output of Step 2 for:
- Number of admin users found
- Number of regular users
- Any warnings or errors

### Step 4: Set Admin Users (if needed)
If no admin users were found:
```bash
Run: SET_USER_AS_ADMIN.sql
```
Edit the file first to specify which user should be admin.

### Step 5: Test Admin Functionality
1. Log in with an admin user account
2. Navigate to the Settings page (`/dashboard/settings`)
3. Verify you can access admin features:
   - User Management
   - Support Tickets
   - Varroa Treatments
   - Dropdown Categories

## Database Functions

The following database functions check admin status:

### is_admin(user_id)
Checks if a specific user is an admin.
```sql
SELECT is_admin('user-uuid-here');
```

### is_current_user_admin()
Checks if the current authenticated user is an admin.
```sql
SELECT is_current_user_admin();
```

### get_user_role(user_id)
Returns the role of a specific user.
```sql
SELECT get_user_role('user-uuid-here');
```

## Application Code

The admin check is implemented in `src/lib/auth.ts`:

```typescript
export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'Admin'
}
```

The Settings page (`src/app/dashboard/settings/page.tsx`) uses this check:

```typescript
const adminAccess = await isAdmin()
setUserIsAdmin(adminAccess)

if (!adminAccess) {
  setAccessDenied(true)
  return
}
```

## Troubleshooting

### "Access Denied" on Settings Page

**Symptoms**: User sees "Access Denied" message on Settings page

**Solutions**:
1. Verify user's role in database:
   ```sql
   SELECT id, email, role FROM profiles WHERE email = 'user@example.com';
   ```

2. Ensure role is exactly 'Admin' (capital A):
   ```sql
   UPDATE profiles SET role = 'Admin' WHERE email = 'user@example.com';
   ```

3. Clear browser cache and reload

### No Admin Users Exist

**Solutions**:
1. Use SET_USER_AS_ADMIN.sql to promote a user
2. Or manually in SQL:
   ```sql
   UPDATE public.profiles SET role = 'Admin' WHERE email = 'your@email.com';
   ```

### Role Values Are Wrong Case

**Solution**: Run MIGRATE_ROLES_FROM_DEL_USER_PROFILES.sql again - it normalizes case

### Check Constraint Violation

**Error**: `new row for relation "profiles" violates check constraint "profiles_role_check"`

**Solution**: Ensure you're only using 'User' or 'Admin' (with proper casing):
```sql
-- Fix existing data
UPDATE profiles SET role = 'User' WHERE LOWER(role) = 'user';
UPDATE profiles SET role = 'Admin' WHERE LOWER(role) = 'admin';
```

## Verification Queries

### Count users by role
```sql
SELECT role, COUNT(*) FROM profiles GROUP BY role;
```

### List all admin users
```sql
SELECT id, email, first_name, last_name, role, created_at
FROM profiles
WHERE role = 'Admin'
ORDER BY created_at;
```

### Check specific user's role
```sql
SELECT email, role FROM profiles WHERE email = 'user@example.com';
```

### Test is_admin function
```sql
SELECT
  email,
  role,
  is_admin(id) as is_admin_result
FROM profiles
WHERE email = 'user@example.com';
```

## Post-Migration Cleanup

After successful migration and verification:

1. **Optional**: Rename or drop del_user_profiles table
   ```sql
   -- If you're confident migration worked
   DROP TABLE IF EXISTS public.del_user_profiles CASCADE;
   ```

2. **Archive migration scripts**: Move to sql/Archive/ folder

## Support

If you encounter issues:
1. Check the database logs for error messages
2. Verify all database functions are updated (see UPDATE_FUNCTIONS_TO_USE_PROFILES.sql)
3. Ensure browser cache is cleared
4. Check network tab in browser dev tools for API errors
