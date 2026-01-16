# User Impersonation Feature

## Overview

Allows admin users to log in as any non-admin user for debugging and support purposes. This is a full session swap - the admin becomes the target user from Supabase's perspective, so all RLS policies work correctly.

## Status: Implemented

Completed: January 16, 2026

## How to Use

1. Log in as an Admin user
2. Go to **Settings** → **User Management**
3. Find the user you want to impersonate
4. Click the purple **"Imp"** button next to their role selector
5. Confirm the action
6. You are now logged in as that user
7. A red banner appears at the top of all pages showing who you're impersonating
8. Click **"Exit Impersonation"** to return to your admin session

## Restrictions

- Only Admin users can impersonate
- Admins cannot impersonate other Admins
- Admins cannot impersonate themselves
- The "Imp" button is hidden for deleted users

## Technical Implementation

### Files Created

| File | Description |
|------|-------------|
| `src/app/api/admin/impersonate/route.ts` | API endpoint that generates magic link token for target user |
| `src/components/ImpersonationBanner.tsx` | Red sticky banner with exit functionality |

### Files Modified

| File | Changes |
|------|---------|
| `src/app/dashboard/layout.tsx` | Added ImpersonationBanner component |
| `src/app/dashboard/settings/page.tsx` | Added impersonate button and handler |

### Flow

```
1. Admin clicks "Imp" button
   ↓
2. Client stores current admin session in localStorage
   ↓
3. Client calls POST /api/admin/impersonate with targetUserId
   ↓
4. API verifies admin role via service role client
   ↓
5. API calls supabaseAdmin.auth.admin.generateLink() for target user
   ↓
6. API returns tokenHash and user info
   ↓
7. Client calls supabase.auth.verifyOtp() with tokenHash
   ↓
8. Client does full page reload to /dashboard
   ↓
9. ImpersonationBanner reads localStorage and displays
```

### Exit Flow

```
1. Admin clicks "Exit Impersonation"
   ↓
2. Client calls supabase.auth.signOut({ scope: 'local' })
   ↓
3. Client calls supabase.auth.setSession() with stored admin tokens
   ↓
4. Client clears localStorage
   ↓
5. Full page reload to /dashboard/settings
```

### localStorage Structure

Key: `hivecraic_impersonation`

```typescript
{
  originalSession: {
    access_token: string
    refresh_token: string
  }
  targetUserEmail: string
  targetDisplayName: string
  startedAt: string  // ISO timestamp
}
```

## Security Considerations

1. **Server-side verification**: API endpoint verifies admin role using service role client
2. **Self-impersonation blocked**: Cannot impersonate yourself
3. **Admin-to-admin blocked**: Cannot impersonate other admins
4. **Secure token generation**: Uses Supabase's built-in magic link system
5. **Full session swap**: RLS policies work correctly because Supabase sees the target user's session

## Limitations

1. If admin closes browser during impersonation, they lose their original session and must log in again
2. No audit logging (could be added in future)
3. No time limit on impersonation sessions

## Future Enhancements (Not Implemented)

- [ ] Audit logging of impersonation sessions
- [ ] Time-limited impersonation tokens
- [ ] Notification to impersonated user
- [ ] Impersonation history in admin panel
