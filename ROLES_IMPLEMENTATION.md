# Role-Based Access Control (RBAC) Implementation Guide

This document explains the role-based access control system implemented in the Beekeeper application.

## Overview

The application now supports two user roles:
- **User** (default) - Standard access to their own beekeeping data
- **Admin** - Full access including administrative features like Settings

## Architecture

### Database Schema

#### user_profiles Table
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'User',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_role CHECK (role IN ('User', 'Admin'))
);
```

### Automatic Profile Creation

New users automatically get a `User` role profile via database trigger:
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Row Level Security (RLS)

User profiles are protected with RLS policies:
- Users can view their own profile
- Users can create their own profile on signup
- Users can update their own profile (role changes restricted in application logic)

## Auth Utility Functions

Located in [src/lib/auth.ts](src/lib/auth.ts), the following functions are available:

### Role Management

```typescript
// Get current user's role
const role = await getUserRole() // Returns 'User' | 'Admin'

// Get complete user profile
const profile = await getUserProfile() // Returns UserProfile | null

// Check if current user is admin
const isUserAdmin = await isAdmin() // Returns boolean

// Require admin access (throws error if not admin)
await requireAdmin() // Throws if user is not admin
```

### Existing Auth Functions

```typescript
// Get current user ID
const userId = await getCurrentUserId() // Returns string | null

// Require user to be authenticated
const userId = await requireUserId() // Throws if not authenticated

// Check authentication status
const authenticated = await isAuthenticated() // Returns boolean
```

## Access Control Implementation

### Admin-Only Pages

The Settings page demonstrates admin-only access:

```typescript
'use client'
import { getCurrentUserId, isAdmin } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { Shield } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)

      // Check admin access
      const adminAccess = await isAdmin()
      setIsAdminUser(adminAccess)

      if (!adminAccess) {
        setAccessDenied(true)
        setLoading(false)
        return
      }

      // Load page data only if admin
      fetchData()
    }
    initUser()
  }, [])

  // Show access denied screen for non-admins
  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md bg-white shadow-lg rounded-lg p-8 text-center">
          <Shield size={64} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You need administrator privileges to access this page.
          </p>
          <button onClick={() => router.push('/dashboard')}>
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    // Page content with Admin badge
    <div className="flex items-center gap-3">
      <h1>Settings ⚙️</h1>
      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full">
        <Shield size={14} />
        Admin Only
      </span>
    </div>
  )
}
```

### Role Indicators in UI

The dashboard shows admin status:

```typescript
import { getUserRole, type UserRole } from '@/lib/auth'
import { Shield } from 'lucide-react'

export default function DashboardPage() {
  const [userRole, setUserRole] = useState<UserRole>('User')

  useEffect(() => {
    const initUser = async () => {
      const role = await getUserRole()
      setUserRole(role)
    }
    initUser()
  }, [])

  return (
    <div className="flex items-center gap-3">
      <h1>Dashboard Overview</h1>
      {userRole === 'Admin' && (
        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full">
          <Shield size={14} />
          Admin
        </span>
      )}
    </div>
  )
}
```

## Database Helper Functions

### Check if User is Admin

```sql
SELECT is_admin('08e38bd9-30b0-4183-92c2-fc3b7600a46a');
-- Returns: true or false
```

### Get User Role

```sql
SELECT get_user_role('08e38bd9-30b0-4183-92c2-fc3b7600a46a');
-- Returns: 'User' or 'Admin'
```

## Managing User Roles

### Using the Admin UI (Recommended)

Admin users can manage user roles directly from the Settings page:

1. **Navigate to Settings** (Admin only)
2. **Expand "User Management" section**
3. **Click "Refresh Users"** to load all users
4. **Search for users** by User ID if needed
5. **Change role** using the dropdown in the Actions column
6. **Confirm the change** when prompted

Features:
- View all user accounts with their User ID, role, and join date
- Search/filter users by ID
- Change user roles with dropdown (User/Admin)
- Cannot modify your own role (safety feature)
- Visual indicators for current user and admin roles
- Real-time updates after role changes

### Using SQL (Alternative Method)

#### Promote User to Admin

```sql
UPDATE user_profiles
SET role = 'Admin', updated_at = NOW()
WHERE id = 'user-uuid-here';
```

#### Demote Admin to User

```sql
UPDATE user_profiles
SET role = 'User', updated_at = NOW()
WHERE id = 'user-uuid-here';
```

### View All Admins

```sql
SELECT
  up.id,
  au.email,
  up.role,
  up.created_at
FROM user_profiles up
JOIN auth.users au ON up.id = au.id
WHERE up.role = 'Admin'
ORDER BY up.created_at;
```

### View All User Roles

```sql
SELECT
  up.id,
  au.email,
  up.role,
  up.created_at
FROM user_profiles up
JOIN auth.users au ON up.id = au.id
ORDER BY up.role, au.email;
```

## Deployment Instructions

### 1. Run the SQL Migration

Execute [sql/add_roles_system.sql](sql/add_roles_system.sql) in your Supabase SQL Editor:

```bash
# The migration will:
# 1. Create user_profiles table
# 2. Set up RLS policies (including admin access to all profiles)
# 3. Create trigger for automatic profile creation
# 4. Create profiles for existing users (default: 'User')
# 5. Assign Admin role to user 08e38bd9-30b0-4183-92c2-fc3b7600a46a
# 6. Create helper functions (is_admin, get_user_role)
```

**If you've already run the migration before this update:**

Run [sql/fix_user_profiles_rls_for_admins.sql](sql/fix_user_profiles_rls_for_admins.sql) to add the admin policies:

```sql
-- This adds two policies:
-- 1. "Admins can view all profiles" - Allows admins to see all users
-- 2. "Admins can update any profile" - Allows admins to change user roles
```

### 2. Verify the Migration

Run these queries to verify:

```sql
-- Check all user profiles
SELECT id, role, created_at FROM user_profiles ORDER BY created_at;

-- Verify admin user
SELECT id, role FROM user_profiles WHERE id = '08e38bd9-30b0-4183-92c2-fc3b7600a46a';

-- Test helper functions
SELECT is_admin('08e38bd9-30b0-4183-92c2-fc3b7600a46a');
SELECT get_user_role('08e38bd9-30b0-4183-92c2-fc3b7600a46a');
```

### 3. Test the Application

1. **Test Admin Access:**
   - Login as the admin user (08e38bd9-30b0-4183-92c2-fc3b7600a46a)
   - Verify "Admin" badge appears on dashboard
   - Navigate to Settings page - should have access
   - Verify "Admin Only" badge on Settings page

2. **Test User Access:**
   - Create a new user account
   - Verify no "Admin" badge on dashboard
   - Try to navigate to Settings page
   - Should see "Access Denied" screen with Shield icon
   - Click "Return to Dashboard" - should redirect properly

3. **Test New User Registration:**
   - Create a brand new account
   - Check that user_profiles record is automatically created
   - Verify default role is 'User'

## Future Enhancements

Consider implementing these features:

### 1. Additional Roles
```sql
ALTER TABLE user_profiles DROP CONSTRAINT valid_role;
ALTER TABLE user_profiles ADD CONSTRAINT valid_role
  CHECK (role IN ('User', 'Admin', 'Manager', 'Viewer'));
```

### 2. Role Management UI
Create an admin panel page to:
- View all users and their roles
- Change user roles
- Search and filter users
- View role assignment history

### 3. Permission-Based Access
Instead of just roles, implement granular permissions:
- `can_manage_settings`
- `can_view_all_users`
- `can_export_data`
- `can_manage_roles`

### 4. Audit Logging
Track role changes:
```sql
CREATE TABLE role_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  old_role VARCHAR(50),
  new_role VARCHAR(50),
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Security Considerations

1. **Database-Level Protection**: RLS policies ensure users can only modify their own profiles
2. **Application-Level Checks**: UI validates role before showing sensitive features
3. **Role Validation**: Database constraint ensures only valid roles
4. **Automatic Profile Creation**: Trigger ensures all users have a profile
5. **Default Role**: New users start with minimal 'User' role

## Troubleshooting

### User Management Shows Only Current User OR Settings Menu Disappeared

**Problem:** The User Management section only displays the logged-in admin, not all users. Or the Settings menu disappeared after running the fix.

**Cause:** RLS policy circular dependency. When checking if a user is an admin, the policy queries `user_profiles`, which is itself protected by RLS that checks if the user is admin - creating an infinite loop.

**Solution:** Run the updated [sql/fix_user_profiles_rls_for_admins.sql](sql/fix_user_profiles_rls_for_admins.sql):

```sql
-- Creates a helper function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR(50);
BEGIN
  SELECT role INTO user_role
  FROM public.user_profiles
  WHERE id = auth.uid()
  LIMIT 1;

  RETURN COALESCE(user_role = 'Admin', FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add admin policies using the helper function
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT TO authenticated
  USING (public.is_current_user_admin());

CREATE POLICY "Admins can update any profile"
  ON user_profiles FOR UPDATE TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());
```

**The fix script automatically:**
1. Drops any existing conflicting policies
2. Creates the helper function with SECURITY DEFINER
3. Creates new policies using the helper function
4. Avoids circular dependency by bypassing RLS in the helper function

**Verify:**
```sql
-- Check helper function exists
SELECT proname FROM pg_proc WHERE proname = 'is_current_user_admin';
-- Should return: is_current_user_admin

-- Check RLS policies exist
SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles';
-- Should show: "Admins can view all profiles" and "Admins can update any profile"

-- Test as admin - should return all users
SELECT id, role FROM user_profiles;

-- Test the helper function
SELECT public.is_current_user_admin();
-- Should return: true (if you're an admin)
```

### User Profile Not Created
```sql
-- Manually create profile for a user
INSERT INTO user_profiles (id, role)
VALUES ('user-uuid-here', 'User');
```

### Role Not Updating
```sql
-- Force update with timestamp
UPDATE user_profiles
SET role = 'Admin', updated_at = NOW()
WHERE id = 'user-uuid-here';
```

### Check Trigger Status
```sql
-- Verify trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

### Check RLS Policies
```sql
-- View all policies on user_profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'user_profiles';
```

## User Management Interface

The Settings page includes a comprehensive User Management section for admins:

### Features

**User List Table:**
- Displays all user accounts with Email, User ID, role, and join date
- Email shown prominently in first column
- User ID truncated for readability (full ID in tooltip)
- Current user highlighted with "You" badge
- Admin roles shown with purple badge and shield icon

**Search & Filter:**
- Real-time search by Email or User ID
- Instantly filter the user list as you type
- Searches across both email and ID fields

**Role Management:**
- Dropdown to change user roles (User/Admin)
- Cannot modify your own role (safety measure)
- Confirmation dialog before role changes
- Success/error alerts after operations

**Visual Design:**
- Collapsible section with purple theme
- "Admin Only" badge on section header
- Hover effects on rows for better UX
- Loading spinner during data fetch
- Refresh button to reload user list

### Access Control

The User Management section is:
- Only visible to Admin users
- Protected at the Settings page level (non-admins can't access)
- Uses RLS policies to ensure data security
- Validates admin status before allowing role changes

### Technical Implementation

**Database View for Email Display:**

The system uses a database view to join `user_profiles` with `auth.users` to display emails:

```sql
CREATE VIEW public.user_profiles_with_email AS
SELECT
  up.id,
  up.role,
  up.created_at,
  up.updated_at,
  au.email
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.id = au.id;
```

**Benefits:**
- No need for service role key in client
- RLS policies automatically apply (admins see all, users see only their own)
- Email data always in sync with auth.users
- Simple to query from the application

**Application Code:**

Located in [src/app/dashboard/settings/page.tsx](src/app/dashboard/settings/page.tsx):

```typescript
// Fetch users from view that includes emails
const fetchUsers = async () => {
  const { data, error } = await supabase
    .from('user_profiles_with_email')  // View that joins with auth.users
    .select('*')
    .order('created_at', { ascending: false })
  // ...
}

// Handle role changes
const handleRoleChange = async (targetUserId: string, newRole: 'User' | 'Admin') => {
  if (targetUserId === userId) {
    alert('You cannot change your own role.')
    return
  }
  // Update role in database
  await supabase
    .from('user_profiles')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', targetUserId)
}
```

## Summary

The role-based access control system provides:
- ✅ Two roles: User (default) and Admin
- ✅ Automatic profile creation for new users
- ✅ Database-level security with RLS
- ✅ Admin-only access to Settings page
- ✅ User Management UI in Settings page
- ✅ Visual role indicators in UI
- ✅ Comprehensive auth utility functions
- ✅ Easy role management via UI or SQL
- ✅ Future-proof architecture for additional roles

For questions or issues, refer to [src/lib/auth.ts](src/lib/auth.ts) for implementation details.
