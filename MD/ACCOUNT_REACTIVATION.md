# Account Reactivation System

## Problem
When a user is soft-deleted, their email in `auth.users` changes to `deleted_{uuid}@deleted.local`. If they try to sign up again with their original email, they get a confusing error message like:
> "Email address 'deleted_2aeecda2-66b8-4a28-b0cc-28021cee80ce@deleted.local' is invalid"

## Solution
Implement an account reactivation request system that allows deleted users to request account restoration.

## How It Works

### 1. User Experience
1. **Deleted user tries to access their account** → Gets error or realizes account is deleted
2. **Visits reactivation page**: `/reactivate`
3. **Enters their original email address**
4. **Submits reactivation request**
5. **Receives confirmation** that request is pending admin review
6. **Admin approves request**
7. **Account is fully restored** with all data intact

### 2. Technical Flow

#### Soft Delete Process
```sql
profiles table:
  - deleted_at: NOW()
  - is_active: false
  - original_email: 'user@example.com' (preserved)
  - email: 'deleted_{uuid}@deleted.local' (anonymized)

auth.users table:
  - email: 'deleted_{uuid}@deleted.local'
  - banned_until: '2099-12-31'
  - email_confirmed_at: NULL
```

#### Reactivation Process
```sql
1. User submits request → request_account_reactivation(email)
   - Looks up user by original_email
   - Creates reactivation_requests record
   - Status: 'pending'

2. Admin reviews → Views in Settings > User Management > Reactivation Requests

3. Admin approves → reactivate_user_account(request_id, notes)
   - Restores profiles.email = original_email
   - Sets deleted_at = NULL, is_active = true
   - Restores auth.users.email = original_email
   - Sets banned_until = NULL, email_confirmed_at = NOW()
   - Marks request as 'approved'

4. User can now log in with original email
```

## Database Schema

### reactivation_requests Table
```sql
CREATE TABLE public.reactivation_requests (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  original_email TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  processed_at TIMESTAMPTZ,
  processed_by UUID, -- admin user ID
  admin_notes TEXT
);
```

## API Functions

### request_account_reactivation(p_email TEXT)
- **Who can call**: Anyone (anon)
- **Purpose**: Submit reactivation request
- **Returns**: JSON with success/error
- **Logic**:
  - Find deleted user by original_email
  - Check for existing pending request
  - Create new reactivation_requests record

### reactivate_user_account(p_request_id UUID, p_admin_notes TEXT)
- **Who can call**: Admins only
- **Purpose**: Approve and restore account
- **Returns**: JSON with success/error
- **Logic**:
  - Verify admin permissions
  - Restore profiles table (email, deleted_at, is_active)
  - Restore auth.users table (email, banned_until, email_confirmed_at)
  - Mark request as approved

### reject_reactivation_request(p_request_id UUID, p_admin_notes TEXT)
- **Who can call**: Admins only
- **Purpose**: Reject reactivation request
- **Returns**: JSON with success/error
- **Logic**:
  - Verify admin permissions
  - Mark request as rejected with admin notes

## Security

### RLS Policies
```sql
-- Users can see their own requests
CREATE POLICY "Users can view own reactivation requests"
  ON reactivation_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can see all requests
CREATE POLICY "Admins can view all reactivation requests"
  ON reactivation_requests FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'Admin'
  ));

-- Only admins can update requests
CREATE POLICY "Admins can update reactivation requests"
  ON reactivation_requests FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'Admin'
  ));
```

## User Interface

### Public Reactivation Page (`/reactivate`)
- Accessible without login
- Simple form with email input
- Clear messaging about what happens next
- Link back to login page

### Admin Interface (Settings > User Management)
- New tab: "Reactivation Requests"
- Shows pending/approved/rejected requests
- Each request shows:
  - User email
  - Request date
  - Current status
- Actions:
  - Approve (with optional notes)
  - Reject (with required notes)

## Implementation Steps

1. **Run SQL script**: `sql/add_account_reactivation.sql`
   - Creates table, functions, and policies

2. **Add reactivation page**: `/app/reactivate/page.tsx`
   - Public page for users to request reactivation

3. **Update settings page**: `/app/dashboard/settings/page.tsx`
   - Add "Reactivation Requests" tab
   - Add state management for requests
   - Add approve/reject handlers
   - Add UI components for request management

4. **Update login page**: `/app/login/page.tsx`
   - Add link to reactivation page
   - Show helpful message if login fails for deleted account

## Benefits

✅ **User-Friendly**: Clear process for users to restore accounts
✅ **Secure**: Admin approval required before restoration
✅ **Auditable**: All requests tracked with timestamps and admin notes
✅ **Data Preservation**: All user data remains intact during deletion
✅ **Flexible**: Admin can approve or reject with reasons
✅ **Professional**: Better UX than confusing error messages

## Example User Flow

```
Deleted User: "I need my account back"
↓
Visits /reactivate
↓
Enters: user@example.com
↓
Sees: "Request submitted! Admin will review."
↓
(Admin reviews in Settings)
↓
Admin clicks "Approve"
↓
User receives email: "Account restored!"
↓
User logs in with original credentials
↓
All data intact: hives, inspections, queens, etc.
```

## Testing

```sql
-- Test reactivation request
SELECT request_account_reactivation('deleted_user@example.com');

-- View pending requests
SELECT * FROM reactivation_requests WHERE status = 'pending';

-- Test approval (as admin)
SELECT reactivate_user_account('request-id-here', 'Approved - user confirmed identity');

-- Verify user is restored
SELECT id, email, deleted_at, is_active
FROM profiles
WHERE original_email = 'deleted_user@example.com';
```

## Future Enhancements

- Email notifications when request is submitted
- Email notifications when request is approved/rejected
- Automatic expiration of old pending requests (30 days)
- Rate limiting to prevent abuse
- Two-factor verification before restoration
- Self-service reactivation for certain cases
