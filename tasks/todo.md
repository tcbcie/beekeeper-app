# Fix Group Member Visibility + Improve List UX

## Tasks
- [x] 1. Apply RLS migration — add policy on `profiles` for rearing group co-members
- [x] 2. Update `DistributeGraftModal.tsx` — add filter input + scrollable list for group members

## Review

### Summary
Two changes to fix group member visibility in the distribute graft modal:

**1. RLS Policy (root cause fix)**
- Added `"Users can view rearing group member profiles"` SELECT policy on `profiles`
- Uses same join pattern as the existing team member policy: joins `rearing_group_members` to itself to find co-members
- Without this, the Supabase query silently filtered out group members the current user couldn't "see"

**2. Modal UX improvements**
- Added `groupFilter` state and a search/filter input (only shown when 6+ members) above the group member list
- Filters by name or email as user types
- Added `max-h-48 overflow-y-auto` to the list container so large groups don't push the form off-screen
- Clears filter when switching recipient mode tabs
- Matches the existing App User search dropdown styling (same `max-h-48 overflow-y-auto` classes)

### Files Changed
| File | Change |
|------|--------|
| Migration | New RLS policy `"Users can view rearing group member profiles"` on `profiles` |
| `src/components/batches/DistributeGraftModal.tsx` | +1 state, +filter input, +scroll cap, filter cleared on mode switch |

### Verification
- User should run `npm run build` to check for errors
- Open distribute modal → Group Member tab → all group members should now appear
- Groups with 6+ members show a filter input
- List scrolls when content exceeds height
