# User Account Enable/Disable Feature - Complete

## Overview
Admins can now enable/disable user accounts from the Settings page. Disabled users are immediately signed out and prevented from accessing the system.

## How It Works

### 1. Admin Controls (Settings → Users)
- **Status Column**: Shows "Active" (green) or "Disabled" (red)
- **Enable/Disable Button**: Toggle button to change account status
- **Real-time Updates**: Status changes are reflected immediately after clicking OK on the confirmation

### 2. User Experience When Disabled
When an admin disables a user account:
1. **Immediate Check**: Next time they navigate or refresh, they're signed out
2. **Alert Message**: "Your account has been disabled. Please contact an administrator."
3. **Redirect**: Automatically redirected to login page
4. **Periodic Check**: Every 30 seconds, active sessions check if account is still enabled
5. **Cannot Login**: Disabled users cannot log back in

### 3. Database Structure
```sql
-- profiles table includes:
profiles.is_active BOOLEAN DEFAULT TRUE
```

When `is_active = false`, the user is disabled.

### 4. Security Enforcement Points

#### A. Dashboard Layout (`src/app/dashboard/layout.tsx`)
- Checks account status on page load
- Checks on auth state change
- Checks every 30 seconds while user is active
- Signs out and redirects if disabled

#### B. Database Function (`toggle_user_account`)
```sql
-- Only admins can toggle accounts
-- Admins cannot disable their own account
-- Updates profiles.is_active field
```

#### C. Auth Helper (`src/lib/auth.ts`)
- `isAccountActive()`: Checks if user's account is active
- `requireActiveAccount()`: Throws error if disabled

## Admin Workflow

### To Disable a User:
1. Go to **Settings** → **Users** tab
2. Find the user in the table
3. Click the **Disable** button (orange)
4. Confirm the action
5. Status changes to "Disabled" (red badge)
6. User will be signed out within 30 seconds or on next navigation

### To Enable a User:
1. Go to **Settings** → **Users** tab
2. Find the disabled user (red "Disabled" badge)
3. Click the **Enable** button (green)
4. Confirm the action
5. Status changes to "Active" (green badge)
6. User can now log in again

## Technical Implementation

### Files Modified:
1. **src/app/dashboard/layout.tsx** - Added account status checks
2. **src/app/dashboard/settings/page.tsx** - Fixed table references, added logging
3. **src/lib/auth.ts** - Account status helper functions
4. **sql/create_registration_security.sql** - Toggle function
5. **sql/COMPLETE_FIX_ALL.sql** - Complete setup script

### Database Functions:
- `get_users_with_email()` - Returns all users with is_active status
- `toggle_user_account(user_id, enable)` - Toggles account status
- Security: Only admins can call these functions

### Key Features:
- ✅ Real-time status updates in UI
- ✅ Immediate logout enforcement
- ✅ Periodic background checks (every 30 seconds)
- ✅ Admin cannot disable own account
- ✅ Clear user feedback with alerts
- ✅ Database-level security with RLS

## Testing

### Test Scenario 1: Disable User
1. Login as admin
2. Go to Settings → Users
3. Click Disable on a test user
4. Open incognito window and login as that user
5. Observe: User is signed out immediately

### Test Scenario 2: Active User Gets Disabled
1. Login as test user in one browser
2. Login as admin in another browser
3. Admin disables the test user
4. Wait up to 30 seconds
5. Test user will see alert and be signed out

### Test Scenario 3: Re-enable User
1. Login as admin
2. Click Enable on disabled user
3. User can now log in successfully

## Troubleshooting

### User Can Still Login After Being Disabled
**Solution**: Hard refresh the page (Ctrl+Shift+R) - the periodic check will catch them within 30 seconds

### Status Not Updating in UI
**Solution**:
1. Check browser console for errors
2. Verify `get_users_with_email()` function includes `is_active` field
3. Run SQL: `SELECT * FROM get_users_with_email();`

### Admin Accidentally Disabled
**Solution**: Run SQL directly:
```sql
UPDATE profiles SET is_active = true WHERE email = 'admin@example.com';
```

## Security Notes
- Only users with role='Admin' can toggle account status
- Admins cannot disable their own account (safety check)
- All actions are logged in browser console
- Database function uses SECURITY DEFINER for elevation
- RLS policies still apply for data access
