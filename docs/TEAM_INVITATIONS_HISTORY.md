# Team Invitations History Feature

## Overview
Enhanced the My Teams section in the Profile page to display accepted and declined invitations with timestamps, providing complete visibility into invitation history.

## Changes Made

### 1. Database Schema Fix
**Issue:** Missing `declined_at` column in `team_invitations` table causing 406 errors when declining invitations.

**Solution:** Created SQL migration to add the column:
- File: `sql/add_declined_at_to_team_invitations.sql`
- Adds `declined_at TIMESTAMPTZ` column
- Includes schema cache reload via `NOTIFY pgrst, 'reload schema'`

### 2. Interface Updates
**File:** `src/app/dashboard/profile/page.tsx`

Updated `TeamInvitation` interface (lines 41-51):
```typescript
interface TeamInvitation {
  id: string
  team_id: string
  email: string
  invited_by: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  invited_at: string
  expires_at: string
  accepted_at?: string      // Added
  declined_at?: string      // Added
}
```

### 3. State Management
Added new state variables (lines 104-105):
```typescript
const [acceptedInvitations, setAcceptedInvitations] = useState<TeamInvitation[]>([])
const [declinedInvitations, setDeclinedInvitations] = useState<TeamInvitation[]>([])
```

### 4. Data Fetching
Enhanced `fetchTeamDetails` function (lines 555-577) to fetch:
- **Pending invitations** (existing functionality)
- **Accepted invitations** - ordered by `accepted_at` descending
- **Declined invitations** - ordered by `declined_at` descending

### 5. UI Display

#### Accepted Invitations Section (lines 1327-1362)
- Green-themed cards with User icon
- Shows email address
- Displays acceptance timestamp: "Accepted on [date] at [time]"
- Green status badge

#### Declined Invitations Section (lines 1364-1399)
- Red-themed cards with X icon
- Shows email address
- Displays decline timestamp: "Declined on [date] at [time]"
- Red status badge

## User Experience

### Before
- Only pending invitations were visible
- No history of who accepted or declined invitations
- Team owners couldn't track invitation outcomes

### After
Team owners can now see:
1. **Pending Invitations** (orange) - awaiting response with expiry countdown
2. **Accepted Invitations** (green) - who accepted and when
3. **Declined Invitations** (red) - who declined and when

## Display Order

1. **Active Members** - current team members
2. **Pending Invitations** - ordered by invitation date (newest first)
3. **Accepted Invitations** - ordered by acceptance date (newest first)
4. **Declined Invitations** - ordered by decline date (newest first)
5. **Shared Apiaries** - team's shared locations

## Technical Details

### Date Formatting
Uses browser's locale settings for consistent date/time display:
- Date: `toLocaleDateString()` - e.g., "10/31/2025"
- Time: `toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })` - e.g., "10:30 PM"

### Color Scheme
- **Pending:** Orange (`bg-orange-50`, `border-orange-200`, `text-orange-600`)
- **Accepted:** Green (`bg-green-50`, `border-green-200`, `text-green-600`)
- **Declined:** Red (`bg-red-50`, `border-red-200`, `text-red-600`)

### Icons Used
- Pending: `Send` (paper plane)
- Accepted: `User` (person silhouette)
- Declined: `X` (close/cross)
- Timestamp: `Clock` (time indicator)

## Related Files

### Created
- `sql/add_declined_at_to_team_invitations.sql` - Database migration
- `sql/add_declined_at_simple.sql` - Simplified version
- `sql/SIMPLE_FIX_STEPS.md` - Step-by-step fix guide
- `sql/TROUBLESHOOT_406_ERROR.md` - Troubleshooting guide
- `sql/FIX_DECLINE_INVITATION_COMPLETE.md` - Complete fix documentation

### Modified
- `src/app/dashboard/profile/page.tsx` - Main implementation
- `src/app/decline-invitation/page.tsx` - Already had declined_at logic

## Testing Checklist

- [x] Pending invitations display correctly
- [x] Accepted invitations show with timestamps
- [x] Declined invitations show with timestamps
- [x] Timestamps format correctly in local timezone
- [x] Sections only appear when invitations exist
- [x] Build completes without errors
- [ ] Test with actual team invitations (requires user testing)
- [ ] Verify declined_at column exists in production database
- [ ] Test schema cache refresh works

## Future Enhancements

Potential improvements for future versions:
1. Add "Resend Invitation" button for declined invitations
2. Show who invited each person (invited_by user details)
3. Add filter/search for invitation history
4. Export invitation history to CSV
5. Add pagination for teams with many invitations
6. Show invitation acceptance rate statistics
