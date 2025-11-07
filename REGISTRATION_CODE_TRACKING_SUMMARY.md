# Registration Code Tracking Feature - Complete

## Overview
Admins can now see which registration code each user signed up with in the Settings → Users page.

## What Was Implemented

### 1. Database Changes
- Added `used_registration_code_id` column to `profiles` table
- Created `users_with_registration_codes` view for easy querying
- Updated `get_users_with_email()` function to include registration code info
- Updated `handle_new_user()` trigger to store code reference from user metadata

### 2. Frontend Changes
- Added "Registration Code" column to Users table in Settings page
- Displays code and description (if available)
- Shows "Legacy user" for users who signed up before this feature

### 3. Code Flow

#### Email/Password Sign-Up:
```
1. User enters email, password, and registration code
2. Code is validated
3. User is created with metadata: { registration_code_id: 'uuid' }
4. handle_new_user trigger reads metadata and stores in profiles.used_registration_code_id
5. Code usage is incremented
```

#### OAuth Sign-Up:
```
1. User enters registration code and clicks "Sign in with Google"
2. Code is validated and code_id is stored in localStorage
3. OAuth flow completes, user is created
4. Dashboard loads, checks localStorage
5. Updates profiles.used_registration_code_id with stored code_id
6. Code usage is incremented
7. localStorage is cleaned up
```

## Files Modified

### Database Files:
- **sql/add_registration_code_tracking.sql** - Complete database setup

### Frontend Files:
- **src/app/dashboard/settings/page.tsx** - Added Registration Code column to users table
- **src/app/dashboard/layout.tsx** - Store code reference for OAuth users
- **src/app/login/page.tsx** - Already stores code_id in metadata for email sign-ups

## How to Apply

### Step 1: Run SQL Script
Run this in Supabase SQL Editor:

```sql
-- Add column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS used_registration_code_id UUID
REFERENCES public.registration_codes(id) ON DELETE SET NULL;

-- Update get_users_with_email function
DROP FUNCTION IF EXISTS public.get_users_with_email();

CREATE OR REPLACE FUNCTION public.get_users_with_email()
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  registration_code TEXT,
  code_description TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.email,
    p.role::TEXT,
    COALESCE(p.is_active, true) as is_active,
    p.created_at,
    rc.code as registration_code,
    rc.description as code_description
  FROM public.profiles p
  LEFT JOIN public.registration_codes rc ON p.used_registration_code_id = rc.id
  ORDER BY p.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated;

-- Update handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  reg_code_id UUID;
BEGIN
  -- Try to get registration_code_id from user metadata
  reg_code_id := (NEW.raw_user_meta_data->>'registration_code_id')::UUID;

  INSERT INTO public.profiles (
    id,
    email,
    role,
    is_active,
    used_registration_code_id,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    'User',
    TRUE,
    reg_code_id,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verification
SELECT * FROM get_users_with_email();
```

### Step 2: Test It

#### Test 1: New Email/Password Sign-Up
```
1. Go to login page
2. Click "Sign Up"
3. Enter email, password, and code (BEEKEEPER2025)
4. Sign up
5. Login as admin
6. Go to Settings → Users
7. ✅ New user should show the registration code
```

#### Test 2: New OAuth Sign-Up
```
1. Go to login page
2. Click "Sign Up"
3. Enter code (BEEKEEPER2025)
4. Click "Sign in with Google"
5. Complete OAuth
6. Login as admin
7. Go to Settings → Users
8. ✅ New user should show the registration code
```

#### Test 3: View Existing Users
```
1. Login as admin
2. Go to Settings → Users
3. ✅ Old users show "Legacy user"
4. ✅ New users show their registration code
```

## UI Display

The Registration Code column shows:
- **Code + Description**: If user signed up with a code
  ```
  BEEKEEPER2025
  Default registration code for 2025
  ```
- **Legacy user**: If user signed up before this feature (used_registration_code_id is NULL)

## Benefits

1. **Audit Trail**: Track which codes are being used
2. **User Source**: Know where users came from
3. **Code Effectiveness**: See which codes are most popular
4. **Troubleshooting**: Help users by seeing which code they used

## Queries

### See all users with their codes:
```sql
SELECT * FROM users_with_registration_codes;
```

### Count users per code:
```sql
SELECT
  rc.code,
  rc.description,
  COUNT(p.id) as user_count
FROM registration_codes rc
LEFT JOIN profiles p ON p.used_registration_code_id = rc.id
GROUP BY rc.code, rc.description
ORDER BY user_count DESC;
```

### Find users who used a specific code:
```sql
SELECT
  p.email,
  p.created_at,
  rc.code
FROM profiles p
JOIN registration_codes rc ON p.used_registration_code_id = rc.id
WHERE rc.code = 'BEEKEEPER2025'
ORDER BY p.created_at DESC;
```

## Notes

- Existing users (before this feature) will show "Legacy user"
- If a registration code is deleted, the reference remains (ON DELETE SET NULL)
- Code tracking works for both email/password and OAuth sign-ups
- The code is stored at registration time and never changes

## Troubleshooting

### Issue: New users don't show their code
**Check:**
1. Verify column exists: `\d profiles` in psql
2. Check trigger function is updated
3. Test with new sign-up
4. Check browser console for errors

### Issue: OAuth users don't have code tracked
**Check:**
1. Verify localStorage has oauth_code_id before OAuth
2. Check dashboard layout console for errors
3. Verify profiles table update permissions

### Issue: "Legacy user" shown for new users
**Solution:** The handle_new_user trigger might not be storing the code. Check trigger function definition.
