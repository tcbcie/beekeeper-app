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

### Promote User to Admin

```sql
UPDATE user_profiles
SET role = 'Admin', updated_at = NOW()
WHERE id = 'user-uuid-here';
```

### Demote Admin to User

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
# 2. Set up RLS policies
# 3. Create trigger for automatic profile creation
# 4. Create profiles for existing users (default: 'User')
# 5. Assign Admin role to user 08e38bd9-30b0-4183-92c2-fc3b7600a46a
# 6. Create helper functions (is_admin, get_user_role)
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

## Summary

The role-based access control system provides:
- ✅ Two roles: User (default) and Admin
- ✅ Automatic profile creation for new users
- ✅ Database-level security with RLS
- ✅ Admin-only access to Settings page
- ✅ Visual role indicators in UI
- ✅ Comprehensive auth utility functions
- ✅ Easy role management via SQL
- ✅ Future-proof architecture for additional roles

For questions or issues, refer to [src/lib/auth.ts](src/lib/auth.ts) for implementation details.
