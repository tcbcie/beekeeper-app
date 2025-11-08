# Fix: Re-invite Users Who Previously Declined

## Problem
When trying to send a new invitation to a user who previously declined an invitation, the system would show an error message "Already a member" even though the user was not actually a member of the team.

## Root Cause
The invitation checking logic only looked for `pending` invitations, not `declined` ones. When a user declined an invitation, that declined record remained in the database. If that user later signed up for the app and the team owner tried to invite them again, the system would:

1. Find the user exists in the system
2. Check if they're a team member (they're not)
3. Check for pending invitations (none found - the old one is declined)
4. Try to auto-add them to the team (since existing users are auto-accepted)
5. Fail due to database constraints or other conflicts

## Solution
Modified the invitation checking logic in [src/app/dashboard/profile/page.tsx](../src/app/dashboard/profile/page.tsx) to:

1. **Check for both pending AND declined invitations** (line 637)
   ```typescript
   .in('status', ['pending', 'declined'])
   ```

2. **Handle declined invitations specially** (lines 645-659)
   - If a declined invitation exists, delete it first
   - Then continue with sending a new invitation
   - This allows users to be re-invited after declining

3. **Maintain pending invitation check**
   - Still prevents duplicate pending invitations
   - Shows appropriate message for pending invitations

## Code Changes

### Before
```typescript
// Check if invitation already exists
const { data: existingInvite } = await supabase
  .from('team_invitations')
  .select('id')
  .eq('team_id', selectedTeam.id)
  .eq('email', inviteEmail.toLowerCase())
  .eq('status', 'pending')  // Only checked pending
  .maybeSingle()

if (existingInvite) {
  alert('An invitation has already been sent to this email.')
  setSendingInvite(false)
  return
}
```

### After
```typescript
// Check if invitation already exists (pending or declined)
const { data: existingInvite } = await supabase
  .from('team_invitations')
  .select('id, status')
  .eq('team_id', selectedTeam.id)
  .eq('email', inviteEmail.toLowerCase())
  .in('status', ['pending', 'declined'])  // Check both statuses
  .maybeSingle()

if (existingInvite) {
  if (existingInvite.status === 'pending') {
    alert('An invitation has already been sent to this email.')
    setSendingInvite(false)
    return
  } else if (existingInvite.status === 'declined') {
    // Delete the old declined invitation so we can send a new one
    const { error: deleteError } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', existingInvite.id)

    if (deleteError) {
      console.error('Error deleting declined invitation:', deleteError)
      alert('Failed to resend invitation. Please try again.')
      setSendingInvite(false)
      return
    }
    // Continue to send new invitation below
  }
}
```

## User Scenarios

### Scenario 1: User declined, not yet signed up
1. User receives invitation email
2. User clicks "Decline" link
3. Team owner tries to reinvite
4. ✅ Old declined invitation is deleted
5. ✅ New invitation is sent
6. ✅ User receives new invitation email

### Scenario 2: User declined, then signed up
1. User receives invitation email
2. User clicks "Decline" link
3. User later creates account on the app
4. Team owner tries to reinvite
5. ✅ Old declined invitation is deleted
6. ✅ User is auto-added to team (since they now exist)
7. ✅ Invitation marked as "accepted" in audit trail

### Scenario 3: Pending invitation exists
1. User receives invitation email
2. User hasn't responded yet
3. Team owner tries to send another invite
4. ⚠️ System shows "An invitation has already been sent"
5. ✅ Prevents duplicate pending invitations

## Benefits

1. **Improved User Experience**
   - Team owners can easily reinvite users who changed their mind
   - No confusing "Already a member" error for non-members
   - Clear feedback for each scenario

2. **Data Integrity**
   - Deletes old declined invitations before creating new ones
   - Maintains audit trail with new invitation records
   - Prevents duplicate pending invitations

3. **Flexibility**
   - Users can decline initially and be invited again later
   - Supports user growth scenarios (decline → signup → invite)
   - Team owners have more control

## Testing

### Test Cases
- [ ] Decline invitation → reinvite same email (not signed up)
- [ ] Decline invitation → signup → reinvite same email
- [ ] Pending invitation exists → try to reinvite (should block)
- [ ] Accepted invitation → try to reinvite (should show "already a member")
- [ ] No previous invitation → send invite (should work normally)

### Manual Testing Steps
1. Create a team as user A
2. Invite user B (use an email that can decline)
3. Decline the invitation as user B
4. Try to reinvite user B from user A's profile
5. ✅ Should succeed and send new invitation
6. Check that old declined invitation is no longer visible

## Database Impact

- **Deletes declined invitations** when reinviting
- This is intentional to allow fresh invitations
- Declined invitation history is lost (trade-off for functionality)
- Alternative: Could add `superseded_by` field to maintain full history

## Future Enhancements

1. **Maintain full audit trail**
   - Add `superseded_by` column to link old/new invitations
   - Keep declined invitations for historical records

2. **Rate limiting**
   - Limit how often same email can be reinvited
   - Prevent invitation spam

3. **Notification preferences**
   - Allow users to block invitations from specific teams
   - Add "Don't invite me again" option

4. **Bulk operations**
   - Allow deleting multiple declined invitations at once
   - Add "Clear declined invitations" button for team owners
