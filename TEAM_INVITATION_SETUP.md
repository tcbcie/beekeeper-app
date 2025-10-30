# Team Invitation System - Complete Setup Guide

**Date**: 2025-10-30
**Features**: Email notifications + Auto-accept on signup

---

## Overview

This system enables team owners to invite users (even those without accounts) via email. When invited users sign up, they're automatically added to the team.

### Key Features:
- ✉️ **Email Invitations** - Beautiful HTML emails sent via Resend API
- 🤖 **Auto-Accept** - New users automatically join teams they were invited to
- ⏰ **7-Day Expiration** - Invitations expire after 7 days
- 🔒 **Secure** - Uses RLS policies and SECURITY DEFINER functions
- 📱 **Mobile-Friendly** - Responsive email design

---

## Architecture

### Components:
1. **Frontend** (`src/app/dashboard/profile/page.tsx`)
   - Team invitation UI
   - Calls Edge Function to send emails

2. **Edge Function** (`supabase/functions/send-team-invitation/`)
   - Sends invitation emails via Resend API
   - Beautiful HTML template with accept/decline links

3. **Database Trigger** (`sql/create_auto_accept_invitation_trigger.sql`)
   - Triggers on new user signup (`auth.users` INSERT)
   - Auto-accepts matching pending invitations
   - Adds user to `team_members` table

4. **RLS Policies** (`sql/add_invitation_acceptance.sql`)
   - Users can view/update their own invitations
   - Team owners can manage team invitations

---

## Setup Instructions

### Step 1: Deploy Edge Function

```bash
# Navigate to your project directory
cd /path/to/beekeeper-app

# Deploy the Edge Function
supabase functions deploy send-team-invitation
```

### Step 2: Configure Resend API

1. **Get Resend API Key**:
   - Go to https://resend.com
   - Sign up for free account (100 emails/day)
   - Go to API Keys → Create API Key
   - Copy the key

2. **Set Environment Variable**:
   ```bash
   # Set Resend API key as Supabase secret
   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
   ```

3. **Update Email "From" Address**:
   - Open `supabase/functions/send-team-invitation/index.ts`
   - Line ~130: Update `from: 'Beekeeper App <noreply@yourdomain.com>'`
   - Replace `yourdomain.com` with your verified domain

4. **Verify Domain in Resend** (Optional but recommended):
   - Go to https://resend.com/domains
   - Add your domain
   - Add DNS records (SPF, DKIM, DMARC)
   - Verify domain
   - **Note**: For testing, you can send to your own email without verification

### Step 3: Create Auto-Accept Trigger

Run the SQL file in Supabase SQL Editor:

```sql
-- File: sql/create_auto_accept_invitation_trigger.sql
-- Copy and paste entire file into Supabase SQL Editor and run
```

This creates:
- ✅ Function: `auto_accept_team_invitations()`
- ✅ Trigger: `on_auth_user_created_auto_accept_invitations`

**Verification**:
```sql
-- Check if trigger exists
SELECT EXISTS (
  SELECT 1 FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE t.tgname = 'on_auth_user_created_auto_accept_invitations'
    AND c.relname = 'users'
) as trigger_active;
-- Should return: true
```

### Step 4: Ensure RLS Policies Exist

If not already applied, run:

```sql
-- File: sql/add_invitation_acceptance.sql
-- This should have been run during initial team setup
```

Verify policies exist:
```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'team_invitations'
ORDER BY policyname;
```

Expected policies:
- `team_invitations_select_by_email` (SELECT)
- `team_invitations_update_by_email` (UPDATE)
- Plus owner/admin policies

### Step 5: Update Profile Page (Already Done)

The Profile page has been updated to call the Edge Function. No action needed.

---

## Testing

### Test 1: Email Invitation (Non-Existing User)

1. **Invite a non-existing user**:
   - Login as team owner
   - Profile → Teams → Click "Invite" on your team
   - Enter: `test@example.com` (or your own email)
   - Click "Invite"

2. **Expected Results**:
   - ✅ Alert: "Invitation email sent to test@example.com!"
   - ✅ Email received with subject: "You've been invited to join [Team Name]..."
   - ✅ Email has Accept and Decline buttons
   - ✅ Invitation shows in "Pending Invitations" section

3. **Check Database**:
   ```sql
   SELECT id, email, status, invited_at, expires_at
   FROM team_invitations
   WHERE email = 'test@example.com'
   ORDER BY invited_at DESC
   LIMIT 1;
   ```
   Should show: `status = 'pending'`, `expires_at = invited_at + 7 days`

### Test 2: Auto-Accept on Signup

1. **Sign up with invited email**:
   - Logout (or use incognito browser)
   - Go to signup page
   - Sign up with exact email from invitation: `test@example.com`
   - Complete signup

2. **Expected Results**:
   - ✅ User account created successfully
   - ✅ User automatically added to team (no manual accept needed)

3. **Verify in Database**:
   ```sql
   -- Check invitation status changed to 'accepted'
   SELECT id, email, status, accepted_at
   FROM team_invitations
   WHERE email = 'test@example.com'
   ORDER BY invited_at DESC
   LIMIT 1;
   -- Expected: status = 'accepted', accepted_at = NOW()

   -- Check user added to team_members
   SELECT tm.user_id, tm.role, tm.joined_at, t.name as team_name
   FROM team_members tm
   JOIN teams t ON t.id = tm.team_id
   WHERE tm.user_id = (
     SELECT id FROM auth.users WHERE email = 'test@example.com'
   );
   -- Expected: One row with role = 'member'
   ```

4. **Verify in UI**:
   - Login as new user
   - Profile → Teams → "Teams I'm A Member Of"
   - Should see the team listed

### Test 3: Check Logs

```sql
-- View trigger execution logs (if logging is enabled)
-- In Supabase Dashboard → Database → Logs
-- Look for NOTICE messages like:
-- 🔔 New user signup detected: test@example.com
-- ✅ Auto-accepting invitation to team...
-- 🎉 Auto-accepted 1 team invitation(s)
```

### Test 4: Edge Function Direct Test

```bash
# Test Edge Function directly
curl -i --location --request POST \
  'https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-team-invitation' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "invitationId": "test-id-123",
    "inviteeEmail": "your-email@example.com",
    "teamName": "Test Team",
    "inviterName": "Test User",
    "inviterEmail": "inviter@example.com",
    "expiresAt": "2025-11-06T12:00:00Z"
  }'
```

Expected: Email received at `your-email@example.com`

---

## Troubleshooting

### Issue: Email not sending

**Symptoms**: Alert says "Invitation created but email failed to send"

**Solutions**:
1. Check Edge Function logs:
   ```bash
   supabase functions logs send-team-invitation --limit 50
   ```

2. Verify Resend API key is set:
   ```bash
   supabase secrets list
   ```
   Should show `RESEND_API_KEY`

3. Check Resend dashboard for errors:
   - https://resend.com/emails
   - Look for failed emails

4. Verify "from" email address:
   - Must be verified domain OR
   - Must be your own email (for testing)

### Issue: Auto-accept not working

**Symptoms**: User signs up but not added to team

**Solutions**:
1. Check if trigger exists:
   ```sql
   SELECT * FROM pg_trigger
   WHERE tgname = 'on_auth_user_created_auto_accept_invitations';
   ```

2. Check trigger logs in Supabase Dashboard → Database → Logs

3. Verify invitation hasn't expired:
   ```sql
   SELECT email, status, expires_at, expires_at > NOW() as is_valid
   FROM team_invitations
   WHERE email = 'test@example.com';
   ```

4. Check user signed up with EXACT email (case-insensitive but must match):
   ```sql
   SELECT email FROM auth.users WHERE email ILIKE 'test@example.com';
   ```

5. Manually test trigger function:
   ```sql
   -- Get user ID
   SELECT id FROM auth.users WHERE email = 'test@example.com';

   -- Manually call function (for testing)
   -- This won't work directly as it needs NEW record from trigger
   -- Instead, check team_members table:
   SELECT * FROM team_members
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@example.com');
   ```

### Issue: Email in spam folder

**Solutions**:
1. Verify domain in Resend with SPF/DKIM/DMARC records
2. Warm up domain (send small volumes first)
3. Check email content isn't triggering spam filters
4. Use a professional domain (not gmail/yahoo)

### Issue: CORS errors when calling Edge Function

**Symptoms**: Console shows CORS error

**Solutions**:
1. Edge Function includes CORS headers - check they're not stripped
2. Verify you're calling with correct Authorization header
3. Check Supabase project CORS settings

---

## File Structure

```
beekeeper-app/
├── supabase/
│   └── functions/
│       └── send-team-invitation/
│           ├── index.ts              # Edge Function code
│           └── README.md             # Edge Function docs
├── sql/
│   ├── create_auto_accept_invitation_trigger.sql  # Auto-accept trigger
│   ├── add_invitation_acceptance.sql              # RLS policies
│   ├── create_lookup_user_by_email_function.sql   # Lookup function
│   └── create_teams_tables.sql                    # Initial team tables
├── src/
│   └── app/
│       └── dashboard/
│           └── profile/
│               └── page.tsx           # Updated to call Edge Function
├── TEAM_INVITATION_SETUP.md          # This file
└── TEAM_INVITATION_TEST.md           # Test plan
```

---

## How It Works

### Flow for Non-Existing User:

```
1. Team owner enters email → "Invite" button
   ↓
2. Frontend checks if user exists (lookup_user_by_email)
   ↓
3. User doesn't exist → Create pending invitation
   ↓
4. Call Edge Function: send-team-invitation
   ↓
5. Edge Function sends beautiful HTML email via Resend
   ↓
6. User receives email with Accept/Decline buttons
   ↓
7. User clicks "Accept" OR signs up with invited email
   ↓
8. ON SIGNUP: Trigger fires → auto_accept_team_invitations()
   ↓
9. Function finds pending invitations for email
   ↓
10. Adds user to team_members (role: 'member')
    ↓
11. Updates invitation status to 'accepted'
    ↓
12. User is now a team member! ✅
```

### Flow for Existing User:

```
1. Team owner enters email → "Invite" button
   ↓
2. Frontend checks if user exists (lookup_user_by_email)
   ↓
3. User EXISTS → Add directly to team_members
   ↓
4. Create invitation record with status='accepted' (audit trail)
   ↓
5. Alert: "user@example.com has been added to the team!"
   ↓
6. NO EMAIL SENT (user already has account and is added)
```

---

## Security

- ✅ **RLS Policies**: Users can only see/update their own invitations
- ✅ **SECURITY DEFINER**: Functions run with elevated permissions safely
- ✅ **Email Validation**: Regex validates email format
- ✅ **Duplicate Prevention**: Checks for existing members/invitations
- ✅ **Expiration**: Invitations expire after 7 days
- ✅ **Auto-Accept Safety**: Checks user not already a member
- ✅ **Error Handling**: Graceful failures don't break user signup

---

## Maintenance

### Monitor Email Usage

```sql
-- Check invitation stats
SELECT
  status,
  COUNT(*) as count,
  MIN(invited_at) as oldest,
  MAX(invited_at) as newest
FROM team_invitations
GROUP BY status;
```

### Clean Up Expired Invitations (Optional)

```sql
-- Delete expired pending invitations older than 30 days
DELETE FROM team_invitations
WHERE status = 'pending'
  AND expires_at < NOW() - INTERVAL '30 days';
```

### Check Resend Usage

- Free tier: 100 emails/day, 3,000/month
- Monitor at: https://resend.com/overview

---

## Future Enhancements

- [ ] Resend invitation button (for expired/failed emails)
- [ ] Custom invitation message
- [ ] Accept/Decline pages in app (`/accept-invitation`, `/decline-invitation`)
- [ ] Welcome email after auto-accept
- [ ] Invitation expiry reminder (1 day before)
- [ ] Bulk invite (CSV upload)
- [ ] Invitation history view for team owners

---

## Support

**Documentation**:
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Resend API: https://resend.com/docs
- PostgreSQL Triggers: https://www.postgresql.org/docs/current/sql-createtrigger.html

**Logs**:
- Edge Function logs: `supabase functions logs send-team-invitation`
- Database logs: Supabase Dashboard → Database → Logs
- Resend logs: https://resend.com/emails

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Last Updated: 2025-10-30
