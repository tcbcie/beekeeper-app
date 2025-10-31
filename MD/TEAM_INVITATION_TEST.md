# Team Invitation Verification Test Plan
**Date**: 2025-10-30
**Purpose**: Verify that users without accounts can be invited to teams and properly added when they create accounts

---

## Current Implementation Status

### ✅ Implemented Features:
1. **Invitation Creation** (for non-existing users)
   - Email validation
   - Duplicate invitation checking
   - Creates `team_invitations` record with `status='pending'`
   - Stores: team_id, email, invited_by, expires_at (7 days)

2. **Database Functions**:
   - `lookup_user_by_email()` - Checks if user exists in auth.users
   - `accept_team_invitation()` - Adds user to team_members when accepted
   - `decline_team_invitation()` - Marks invitation as declined

3. **RLS Policies**:
   - Users can view invitations sent to their email
   - Users can update their own pending invitations
   - Team owners can manage team invitations

### ⚠️ Missing/Incomplete Features:
1. **No email notification sent** - Line 656 in profile page says "to be implemented"
2. **No automatic invitation acceptance** - User must manually accept after signup
3. **No UI for new users to see/accept invitations** - Users need to navigate to Profile page

---

## Test Scenarios

### Scenario 1: Invite User Without Account (Current Flow)
**Steps**:
1. Login as team owner (Admin)
2. Navigate to Profile → Teams Management
3. Click "Invite" on an owned team
4. Enter email of non-existing user: `newuser@example.com`
5. Click "Invite"

**Expected Result**:
- ✅ Alert: "Invitation sent to newuser@example.com! They will be added when they create an account."
- ✅ Invitation appears in "Pending Invitations" section
- ✅ Record created in `team_invitations` table with `status='pending'`
- ❌ **No email is actually sent** (not implemented yet)

### Scenario 2: New User Signs Up With Invited Email
**Steps**:
1. New user signs up with email matching pending invitation
2. User logs in for first time
3. User navigates to Dashboard

**Expected Result**:
- ❌ User does NOT automatically become team member
- ⚠️ User must navigate to Profile page to see pending invitations
- ⚠️ User must manually click "Accept" on invitation
- ✅ After accepting, user becomes team member with role='member'

### Scenario 3: Check Pending Invitation in Database
**SQL Query**:
```sql
-- View pending invitations
SELECT
  ti.id,
  ti.email,
  t.name as team_name,
  ti.status,
  ti.invited_at,
  ti.expires_at,
  CASE
    WHEN ti.expires_at < NOW() THEN 'EXPIRED'
    WHEN ti.expires_at > NOW() THEN 'VALID'
  END as validity
FROM team_invitations ti
JOIN teams t ON t.id = ti.team_id
WHERE ti.email = 'newuser@example.com'
ORDER BY ti.invited_at DESC;
```

**Expected Result**:
- Shows invitation record
- status = 'pending'
- expires_at = invited_at + 7 days
- validity = 'VALID' (if within 7 days)

### Scenario 4: Accept Invitation Manually (If UI Exists)
**Steps**:
1. Login as new user with invited email
2. Navigate to Profile page
3. Look for "Pending Invitations" section
4. Click "Accept" on invitation

**Expected Result**:
- ✅ Invitation status changes to 'accepted'
- ✅ User added to `team_members` table
- ✅ User can see team in "Teams I'm A Member Of" section
- ✅ User can see shared apiaries from team

---

## Known Issues & Limitations

### Issue 1: No Email Notifications
**Problem**: Invited users don't receive emails, so they don't know they've been invited
**Impact**: High - Users won't know to create account or accept invitation
**Solution Needed**: Implement Supabase Edge Function to send invitation emails

### Issue 2: No Auto-Accept on Signup
**Problem**: New users must manually accept after signup
**Impact**: Medium - Extra step, not user-friendly
**Possible Solutions**:
- Option A: Auto-accept all pending invitations matching user's email on signup
- Option B: Show prominent notification/modal on first login with pending invitations
- Option C: Send follow-up email after signup reminding to accept

### Issue 3: No UI for Invitation Acceptance Visible to New Users
**Problem**: Dashboard doesn't show pending invitations
**Impact**: Medium - Users must know to go to Profile page
**Solution Needed**: Add notification banner or dashboard widget for pending invitations

---

## Verification Checklist

Run these checks to verify current functionality:

### Database Verification:
- [ ] `team_invitations` table exists
- [ ] `lookup_user_by_email()` function exists
- [ ] `accept_team_invitation()` function exists
- [ ] `decline_team_invitation()` function exists
- [ ] RLS policies allow users to see their own invitations
- [ ] RLS policies allow users to update their own invitations

### UI Verification:
- [ ] Profile page shows "Invite" button for owned teams
- [ ] Invite modal validates email format
- [ ] Invite modal checks for duplicate invitations
- [ ] Invite modal checks if user already exists
- [ ] Pending invitations section shows invited emails
- [ ] Pending invitations show expiry date (7 days from invite)
- [ ] Cancel button removes pending invitation

### Functional Verification:
- [ ] Inviting existing user auto-adds them to team
- [ ] Inviting non-existing user creates pending invitation
- [ ] Alert message differentiates between existing/non-existing users
- [ ] Invitation expires after 7 days
- [ ] User can accept invitation via Profile page
- [ ] User can decline invitation via Profile page
- [ ] Accepted invitation adds user to team_members
- [ ] Declined invitation updates status to 'declined'

---

## Recommended Next Steps

1. **Implement Email Notifications**:
   - Create Supabase Edge Function to send invitation emails
   - Use Resend API (same as weekly digest)
   - Include team name, inviter name, accept/decline links
   - Send reminder email 1 day before expiration

2. **Add Auto-Accept Trigger** (Optional):
   - Create database trigger on auth.users insert
   - Check for pending invitations matching email
   - Auto-accept and add to team_members
   - Send welcome email with team info

3. **Improve UX for New Users**:
   - Add notification banner on dashboard for pending invitations
   - Show count of pending invitations in header
   - Add "View Invitations" quick link

4. **Add Invitation Management UI**:
   - Allow team owners to resend invitations
   - Show invitation history (accepted, declined, expired)
   - Allow extending expiration date

---

## Test Results

**Date Tested**: _[To be filled]_
**Tested By**: _[To be filled]_
**Environment**: _[Development/Production]_

| Test Scenario | Status | Notes |
|--------------|--------|-------|
| Invite non-existing user | ⬜ Pass / ⬜ Fail | |
| Pending invitation created | ⬜ Pass / ⬜ Fail | |
| New user signup | ⬜ Pass / ⬜ Fail | |
| Manual invitation acceptance | ⬜ Pass / ⬜ Fail | |
| User added to team | ⬜ Pass / ⬜ Fail | |
| Invitation expiration | ⬜ Pass / ⬜ Fail | |

**Overall Result**: ⬜ Pass / ⬜ Fail / ⬜ Partial

**Issues Found**: _[To be filled]_

**Recommendations**: _[To be filled]_
