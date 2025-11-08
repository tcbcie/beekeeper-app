# OAuth Registration Code Enforcement

## Overview
Registration codes are now required for **both** email/password sign-ups AND Google OAuth sign-ups.

## How It Works

### For Email/Password Sign-Up:
1. User clicks "Sign Up" button
2. Form shows Registration Code field
3. Code is validated before creating account
4. If valid, account is created and code usage is incremented

### For Google OAuth Sign-Up:
1. User clicks "Sign Up" button (to set `isSignUp = true`)
2. Registration Code field appears
3. User enters code and clicks "Sign in with Google"
4. **Before OAuth flow starts**: Code is validated via RPC
5. If valid: Code and code_id are stored in localStorage
6. OAuth flow proceeds normally (Google authentication)
7. After OAuth callback: Dashboard layout checks localStorage
8. If OAuth code exists: Increments usage counter
9. Cleans up localStorage

### For Existing Users (Login):
1. User does NOT click "Sign Up" (`isSignUp = false`)
2. Registration Code field is hidden
3. Both email/password login and Google sign-in work WITHOUT code
4. Existing users can log in freely

## User Experience

### New User Signing Up:
```
1. Goes to login page
2. Clicks "Sign Up" button → Form switches to sign-up mode
3. Sees "Registration Code" field appear
4. Enters code (e.g., "BEEKEEPER2025")
5. Clicks "Sign in with Google"
6. ✅ Code is validated BEFORE Google OAuth
7. If valid → Redirected to Google sign-in
8. After Google auth → Account created, redirected to dashboard
```

### Existing User Logging In:
```
1. Goes to login page
2. Does NOT click "Sign Up" (stays in login mode)
3. Registration Code field is hidden
4. Clicks "Sign in with Google"
5. ✅ No code required
6. Signs in normally
```

## Technical Implementation

### Files Modified:

#### 1. `src/app/login/page.tsx`
- Added registration code validation to `handleGoogleSignIn()`
- Validates code BEFORE starting OAuth flow if `isSignUp === true`
- Stores validated code in localStorage for callback

```typescript
if (isSignUp) {
  // Validate registration code
  const { data: validationResult } = await supabase
    .rpc('validate_registration_code', { reg_code: registrationCode })

  if (!validationResult.valid) {
    throw new Error('Invalid registration code')
  }

  // Store for callback
  localStorage.setItem('oauth_reg_code', registrationCode)
  localStorage.setItem('oauth_code_id', validationResult.code_id)
}
```

#### 2. `src/app/dashboard/layout.tsx`
- Checks localStorage on dashboard load
- If OAuth code exists, increments usage counter
- Cleans up localStorage after processing

```typescript
const oauthRegCode = localStorage.getItem('oauth_reg_code')
const oauthCodeId = localStorage.getItem('oauth_code_id')

if (oauthRegCode && oauthCodeId) {
  await supabase.rpc('increment_code_usage', { code_id: oauthCodeId })
  localStorage.removeItem('oauth_reg_code')
  localStorage.removeItem('oauth_code_id')
}
```

## Flow Diagram

```
NEW USER SIGN-UP (OAuth):
┌─────────────────────────────────────────────────────────────┐
│ 1. User clicks "Sign Up" → isSignUp = true                  │
│ 2. Registration Code field appears                           │
│ 3. User enters code                                          │
│ 4. User clicks "Sign in with Google"                         │
│                                                              │
│ 5. VALIDATE CODE (before OAuth):                            │
│    → Call validate_registration_code RPC                    │
│    → If invalid: Show error, stop                           │
│    → If valid: Store code in localStorage                   │
│                                                              │
│ 6. START OAUTH FLOW:                                        │
│    → Redirect to Google sign-in                             │
│    → User authorizes app                                     │
│    → Google redirects back to /auth/callback                │
│                                                              │
│ 7. CALLBACK HANDLER:                                        │
│    → Exchanges code for session                             │
│    → Creates user profile (via trigger)                     │
│    → Redirects to dashboard                                 │
│                                                              │
│ 8. DASHBOARD LOAD:                                          │
│    → Checks localStorage for oauth_code_id                  │
│    → Calls increment_code_usage RPC                         │
│    → Cleans up localStorage                                 │
│    → User is now fully registered!                          │
└─────────────────────────────────────────────────────────────┘

EXISTING USER LOGIN (OAuth):
┌─────────────────────────────────────────────────────────────┐
│ 1. User does NOT click "Sign Up" → isSignUp = false         │
│ 2. Registration Code field stays hidden                      │
│ 3. User clicks "Sign in with Google"                         │
│                                                              │
│ 4. NO CODE VALIDATION (skip steps 5-8 from above)           │
│    → Goes directly to OAuth flow                            │
│    → Signs in normally                                       │
└─────────────────────────────────────────────────────────────┘
```

## Security Considerations

1. **Code Validation Before OAuth**: Code is validated BEFORE user can start OAuth flow
2. **No Code Bypass**: If code is invalid, OAuth flow never starts
3. **Usage Tracking**: Code usage is incremented after successful sign-up
4. **Existing Users Unaffected**: Only new sign-ups require codes
5. **Clean State**: localStorage is cleaned after processing

## Testing

### Test 1: New User with Valid Code
```
1. Go to login page
2. Click "Sign Up"
3. Enter valid code (BEEKEEPER2025)
4. Click "Sign in with Google"
5. Complete Google auth
6. ✅ Should reach dashboard successfully
7. Check code usage in admin panel → should be incremented
```

### Test 2: New User with Invalid Code
```
1. Go to login page
2. Click "Sign Up"
3. Enter invalid code (INVALID123)
4. Click "Sign in with Google"
5. ❌ Should see error: "Invalid registration code"
6. OAuth flow should NOT start
```

### Test 3: New User without Code
```
1. Go to login page
2. Click "Sign Up"
3. Leave code field empty
4. Click "Sign in with Google"
5. ❌ Should see error: "Registration code is required for sign-up"
```

### Test 4: Existing User Login
```
1. Go to login page
2. Do NOT click "Sign Up"
3. Click "Sign in with Google"
4. ✅ Should sign in without asking for code
```

## Troubleshooting

### Issue: Existing users asked for registration code
**Solution**: Make sure "Sign Up" button is NOT activated. Registration code only required when isSignUp = true.

### Issue: Code usage not incrementing
**Solution**: Check browser console for errors. Verify `increment_code_usage` RPC function exists and has correct permissions.

### Issue: OAuth code stuck in localStorage
**Solution**: Dashboard layout cleans it up automatically. If stuck, manually clear: `localStorage.removeItem('oauth_reg_code')`

## Database Functions Used

1. `validate_registration_code(reg_code TEXT)` - Validates if code is valid, active, not expired
2. `increment_code_usage(code_id UUID)` - Increments current_uses counter
3. Both functions have `SECURITY DEFINER` and appropriate grants

## Future Enhancements

- [ ] Add better UI feedback during code validation
- [ ] Show loading spinner during validation
- [ ] Add toast notifications instead of alerts
- [ ] Track which code was used in user profile metadata
