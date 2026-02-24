# Groups I'm In — Member List for Non-Owner Members

## Plan

### 1. Add `expandedMemberRgId` state to the page
- [x] 1. Add `const [expandedMemberRgId, setExpandedMemberRgId] = useState<string | null>(null)` alongside existing state

### 2. Clear member group expansion when opening an owned group
- [x] 2. In the owned-group "View Members" `onClick`, add `setExpandedMemberRgId(null)` so both can't be expanded at once

### 3. Add "View Members" toggle button to each "Groups I'm In" card
- [x] 3. Mirror the existing owned-group button style; on click: set `expandedMemberRgId`, clear `expandedRgId`, call `fetchRearingGroupDetails`

### 4. Render the collapsed member list inside each "Groups I'm In" card
- [x] 4. When `expandedMemberRgId === group.id`, render `rgMembers` — show name/email and role badge only; no experience level, no remove button, no invitation sections

---

## Review

**`src/app/dashboard/rearing-team/page.tsx`:**
- Added `expandedMemberRgId` state to track which "Groups I'm In" group has its member list open
- Owned-group "View Members" toggle now also closes `expandedMemberRgId` (and vice versa) so only one group detail is open at a time
- Each "Groups I'm In" card now has a "View Members" / "Hide Members" toggle button
- On expand, calls `fetchRearingGroupDetails(group.id)` (same hook used by owners) which loads `rgMembers`
- Member list renders name + email + role badge only — no experience level column, no remove button, no invitation sections
- Uses `loadingRgMembers` spinner while fetching, consistent with owner view
