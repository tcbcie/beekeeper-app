# Fix: Soft Delete User Management Issues

## Problems
Three issues were identified with the soft delete user management feature:

### 1. Deleted Users Appearing in Active Users Tab
When an admin soft-deleted a user, the deleted user would appear in **both** the Active Users and Deleted Users tabs.

### 2. Deleted Users Tab Showing "0" Count
The "Deleted Users" tab showed "(0)" in the count until the user clicked on it, even though deleted users existed in the database.

### 3. Missing User Details for Restoration
The Deleted Users view didn't show essential information needed to restore user accounts (email, name, subscription info).

## Root Causes

### Issue 1: Active Users Query Not Filtering Deleted Users
The `get_users_with_email()` database function was selecting from `profiles` table without filtering out soft-deleted users:

```sql
-- BEFORE (BROKEN)
SELECT ...
FROM public.profiles p
ORDER BY p.created_at DESC;
```

This returned **all** users, including those with `deleted_at IS NOT NULL`.

### Issue 2: Lazy Loading of Deleted Users
The `useEffect` hook only fetched active users on mount:

```typescript
// BEFORE (BROKEN)
useEffect(() => {
  if (showUserManagement && users.length === 0) {
    fetchUsers()  // Only fetches active users
  }
}, [showUserManagement, users.length])
```

`fetchDeletedUsers()` was only called when clicking the Deleted Users tab, so the count remained at 0.

### Issue 3: Minimal deleted_profiles View
The `deleted_profiles` view was created during soft delete migration but only included basic fields, not the full user details needed for restoration decisions.

## Solutions

### Fix 1: Filter Out Deleted Users in Active Query
**File:** `sql/fix_get_users_exclude_deleted.sql`

Added `WHERE deleted_at IS NULL` filter to only return active users:

```sql
-- AFTER (FIXED)
SELECT ...
FROM public.profiles p
WHERE p.deleted_at IS NULL  -- Only return active (non-deleted) users
ORDER BY p.created_at DESC;
```

### Fix 2: Eager Load Both Active and Deleted Users
**File:** `src/app/dashboard/settings/page.tsx` (lines 586-595)

```typescript
// AFTER (FIXED)
useEffect(() => {
  if (showUserManagement) {
    if (users.length === 0) {
      fetchUsers()
    }
    if (deletedUsers.length === 0) {
      fetchDeletedUsers()  // Fetch deleted users on mount too
    }
  }
}, [showUserManagement, users.length, deletedUsers.length])
```

### Fix 3: Enhanced deleted_profiles View
**File:** `sql/fix_deleted_profiles_view.sql`

Updated the view to include all fields needed for restoration:

```sql
CREATE VIEW public.deleted_profiles AS
SELECT
  p.id,
  p.email,                    -- Email for restoration
  p.role,
  p.first_name,               -- User's name
  p.last_name,
  p.mobile_number,            -- Contact info
  p.is_active,
  p.created_at,
  p.deleted_at,               -- When deleted
  p.deleted_by,               -- Who deleted it
  p.current_subscription_code_id,
  p.subscription_type,        -- Subscription details
  p.subscription_expires_at,
  -- Registration code lookup
  (SELECT rc.code FROM public.registration_codes rc
   WHERE rc.id = p.current_subscription_code_id) as registration_code,
  -- Code description
  COALESCE(
    (SELECT rc.description FROM public.registration_codes rc
     WHERE rc.id = p.current_subscription_code_id),
    CASE
      WHEN p.subscription_type IS NOT NULL
      THEN 'Credit Card: ' || p.subscription_type
      ELSE NULL
    END
  ) as code_description,
  -- Calculated subscription status
  CASE
    WHEN p.subscription_expires_at IS NULL THEN 'no_subscription'
    WHEN p.subscription_expires_at > NOW() + INTERVAL '30 days' THEN 'active'
    WHEN p.subscription_expires_at > NOW() + INTERVAL '7 days' THEN 'expiring_soon'
    WHEN p.subscription_expires_at > NOW() THEN 'expiring_very_soon'
    ELSE 'expired'
  END as subscription_status,
  -- Days remaining calculation
  CASE
    WHEN p.subscription_expires_at IS NULL THEN NULL
    ELSE EXTRACT(DAY FROM (p.subscription_expires_at - NOW()))::INTEGER
  END as days_remaining
FROM public.profiles p
WHERE p.deleted_at IS NOT NULL
ORDER BY p.deleted_at DESC;
```

## Why This Works

### Proper Separation of Active vs Deleted
- Active users query: `WHERE deleted_at IS NULL`
- Deleted users query: `WHERE deleted_at IS NOT NULL`
- No overlap between the two lists

### Accurate Tab Counts
- Both lists fetched on User Management open
- Tab badges show correct counts immediately
- No need to click to see the count

### Complete Restoration Information
Admins can now see:
- User's email (required for restore)
- Full name and contact info
- Subscription status and expiry
- Registration code used
- When and by whom the user was deleted

## Testing

After running the SQL scripts, verify:

1. **Active Users Tab**
   - Only shows users without `deleted_at`
   - Deleted users do not appear here

2. **Deleted Users Tab**
   - Shows correct count immediately (no need to click)
   - Displays full user details:
     - Email
     - Name
     - Role
     - Subscription info
     - Deleted timestamp

3. **User Deletion Flow**
   - Delete a user → they disappear from Active tab
   - Check Deleted tab → user appears with all details
   - Counts update correctly

4. **User Restoration**
   - Admin can see all necessary info to decide restoration
   - Email field is populated for restore form

## SQL Scripts to Run

Run these in order in your Supabase SQL Editor:

1. [fix_get_users_exclude_deleted.sql](../sql/fix_get_users_exclude_deleted.sql) - Fix active users query
2. [fix_deleted_profiles_view.sql](../sql/fix_deleted_profiles_view.sql) - Enhanced deleted users view

## Date Fixed
9 November 2025

## Version
v1.0.37
