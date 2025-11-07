# OAuth Bypass Prevention

## Problem

Users could bypass the registration code requirement by:
1. Going to the login page
2. Clicking "Sign in with Google" directly (WITHOUT clicking "Sign Up")
3. Completing Google authentication
4. Getting an account created without ever providing a registration code

This defeats the purpose of the registration code system which is designed to control who can create accounts.

## Solution

Implemented multi-layered protection to enforce registration codes for ALL new users, including OAuth sign-ups:

### Layer 1: Pre-OAuth Validation (Login Page)

**File:** `src/app/login/page.tsx` (lines 117-138)

When a user clicks "Sign Up" mode and then "Sign in with Google":
```typescript
const handleGoogleSignIn = async () => {
  // For new OAuth sign-ups, require registration code
  if (isSignUp) {
    if (!registrationCode.trim()) {
      throw new Error('Registration code is required for sign-up')
    }

    // Validate registration code before OAuth
    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_registration_code', { reg_code: registrationCode.trim() })

    if (validationError || !validationResult?.valid) {
      throw new Error(validationResult?.message || 'Invalid registration code')
    }

    // Store validated code for the callback
    localStorage.setItem('oauth_reg_code', registrationCode.trim())
    localStorage.setItem('oauth_code_id', validationResult.code_id)
  }
  // Continue with OAuth flow...
}
```

**Flow:**
1. User must click "Sign Up" toggle first
2. Enter valid registration code
3. Code is validated BEFORE OAuth redirect
4. Valid code is stored in localStorage
5. OAuth flow proceeds to Google

### Layer 2: Post-OAuth Processing (Dashboard Layout)

**File:** `src/app/dashboard/layout.tsx` (lines 18-63)

After OAuth callback completes and user lands on dashboard:
```typescript
const checkUser = useCallback(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    const oauthRegCode = localStorage.getItem('oauth_reg_code')
    const oauthCodeId = localStorage.getItem('oauth_code_id')

    if (oauthRegCode && oauthCodeId) {
      // Valid OAuth sign-up - store code reference
      await supabase
        .from('profiles')
        .update({ used_registration_code_id: oauthCodeId })
        .eq('id', session.user.id)

      await supabase.rpc('increment_code_usage', { code_id: oauthCodeId })

      localStorage.removeItem('oauth_reg_code')
      localStorage.removeItem('oauth_code_id')
    } else {
      // Check if this is a bypass attempt
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at, used_registration_code_id')
        .eq('id', session.user.id)
        .single()

      // User created within last 10 seconds without code = bypass attempt
      const isNewUser = profile &&
        new Date().getTime() - new Date(profile.created_at).getTime() < 10000

      if (isNewUser && !profile.used_registration_code_id) {
        // BLOCK: Sign out and delete profile
        await supabase.auth.signOut()
        await supabase.from('profiles').delete().eq('id', session.user.id)
        alert('Registration code required. Please click "Sign Up" and enter a registration code before signing in with Google.')
        router.push('/login')
        return
      }
    }
  }
}, [router])
```

**Flow:**
1. Check localStorage for validated code from Layer 1
2. If found: Link code to profile, increment usage, clean up localStorage
3. If NOT found: Check if this is a new user (created < 10 seconds ago)
4. If new user without code: BLOCK by signing out, deleting profile, showing alert

### Layer 3: Database Tracking

**File:** `sql/add_registration_code_tracking_FIXED.sql`

The `handle_new_user()` trigger stores registration code from metadata:
```sql
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
  SET email = EXCLUDED.email,
      used_registration_code_id = COALESCE(EXCLUDED.used_registration_code_id, profiles.used_registration_code_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Attack Vectors Blocked

### ✅ Vector 1: Direct OAuth Sign-In
**Attack:** User clicks "Sign in with Google" without toggling to "Sign Up"
**Protection:** Layer 2 detects new user without localStorage code and blocks

### ✅ Vector 2: Clearing localStorage
**Attack:** User validates code, clears localStorage before OAuth completes
**Protection:** Layer 2 detects new user without code in profile and blocks

### ✅ Vector 3: Manipulating localStorage
**Attack:** User puts fake code_id in localStorage
**Protection:** Code validation happens server-side in Layer 1 before OAuth starts

### ✅ Vector 4: Direct API Calls
**Attack:** User tries to call Supabase auth directly
**Protection:** Layer 2 runs on every dashboard load, catches unauthorized accounts

## User Experience

### Valid Sign-Up Flow:
1. User clicks "Sign Up" toggle
2. Enters registration code "BEEKEEPER2025"
3. Code validated ✓
4. Clicks "Sign in with Google"
5. Completes OAuth
6. Redirected to dashboard
7. Code linked to profile automatically
8. User can use app normally

### Blocked Bypass Attempt:
1. User clicks "Sign in with Google" directly (no code entered)
2. Completes OAuth
3. Redirected to dashboard
4. Layer 2 detects: New user + No localStorage code + No profile code = BLOCK
5. User signed out automatically
6. Profile deleted
7. Alert shown: "Registration code required. Please click 'Sign Up' and enter a registration code before signing in with Google."
8. Redirected to login page

## Testing

### Test 1: Valid OAuth Sign-Up
```
✅ Expected: User can sign up with Google if they provide valid code
1. Go to login page
2. Click "Sign Up"
3. Enter code "BEEKEEPER2025"
4. Click "Sign in with Google"
5. Complete OAuth
6. Should land on dashboard successfully
7. Check Settings → Users: User should show registration code
```

### Test 2: Bypass Attempt (Direct OAuth)
```
✅ Expected: User is blocked and profile deleted
1. Go to login page
2. DON'T click "Sign Up"
3. Click "Sign in with Google" directly
4. Complete OAuth
5. Should be signed out immediately
6. Should see alert about registration code required
7. Should be redirected to login page
8. Check database: Profile should be deleted
```

### Test 3: Existing User Sign-In
```
✅ Expected: Existing users can sign in normally without code
1. Create user with valid code (Test 1)
2. Sign out
3. Go to login page
4. Click "Sign in with Google"
5. Complete OAuth
6. Should land on dashboard successfully
7. No code prompt or blocking
```

### Test 4: Expired Code
```
✅ Expected: User cannot sign up with expired code
1. Go to login page
2. Click "Sign Up"
3. Enter expired code
4. Click "Sign in with Google"
5. Should show error: "Registration code has expired"
6. OAuth flow should not start
```

### Test 5: Max Uses Reached
```
✅ Expected: User cannot sign up with fully used code
1. Go to login page
2. Click "Sign Up"
3. Enter code with max_uses reached
4. Click "Sign in with Google"
5. Should show error: "Registration code usage limit reached"
6. OAuth flow should not start
```

## Database Queries

### Check if user has registration code:
```sql
SELECT
  p.email,
  p.created_at,
  rc.code as registration_code,
  rc.description
FROM profiles p
LEFT JOIN registration_codes rc ON p.used_registration_code_id = rc.id
WHERE p.email = 'user@example.com';
```

### Find users who bypassed (should be none):
```sql
SELECT
  p.id,
  p.email,
  p.created_at,
  p.used_registration_code_id
FROM profiles p
WHERE p.used_registration_code_id IS NULL
  AND p.created_at > NOW() - INTERVAL '1 day'
ORDER BY p.created_at DESC;
```

## Security Notes

- **10-second window**: New users are detected within 10 seconds of profile creation
- **Immediate deletion**: Unauthorized profiles are deleted, not just disabled
- **No grace period**: Zero tolerance for bypass attempts
- **Audit trail**: All users tracked with registration code in profiles table
- **localStorage bridge**: Temporary storage for OAuth flow, cleaned up immediately

## Troubleshooting

### Issue: Legitimate user blocked
**Symptoms:** User provided valid code but was still blocked
**Causes:**
1. localStorage was cleared between code validation and OAuth callback
2. OAuth took longer than 10 seconds to complete
3. Browser privacy settings block localStorage

**Solution:** Increase 10-second window to 30 seconds if needed:
```typescript
// In dashboard/layout.tsx line 51
new Date().getTime() - new Date(profile.created_at).getTime() < 30000
```

### Issue: Bypass still possible
**Symptoms:** User created account without code
**Causes:**
1. Database trigger not storing code from metadata
2. Layer 2 check not running
3. Profile created before feature deployed

**Solution:**
1. Verify `handle_new_user()` trigger is deployed
2. Check browser console for JavaScript errors
3. Run SQL to find unauthorized users:
```sql
SELECT * FROM profiles
WHERE used_registration_code_id IS NULL
  AND created_at > '2025-01-15'  -- Feature deploy date
ORDER BY created_at DESC;
```

### Issue: OAuth callback fails
**Symptoms:** User gets auth_error after Google OAuth
**Causes:**
1. Supabase OAuth configuration issue
2. Callback URL misconfigured
3. Network error during code exchange

**Solution:**
1. Check Supabase dashboard → Authentication → Providers → Google
2. Verify callback URL: `https://yourdomain.com/auth/callback`
3. Check browser network tab for failed requests

## Related Files

- `src/app/login/page.tsx` - Registration code validation before OAuth
- `src/app/dashboard/layout.tsx` - Post-OAuth bypass detection
- `src/app/auth/callback/route.ts` - OAuth callback handler
- `sql/add_registration_code_tracking_FIXED.sql` - Database schema
- `REGISTRATION_CODE_TRACKING_SUMMARY.md` - Feature overview

## Future Enhancements

1. **Admin notification**: Alert admins when bypass attempt detected
2. **IP tracking**: Log IP addresses of bypass attempts
3. **Rate limiting**: Block repeated bypass attempts from same IP
4. **Audit log**: Store all sign-up attempts in dedicated table
5. **Configurable window**: Make 10-second detection window configurable
