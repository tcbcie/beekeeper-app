# Queen Rearing Groups & Monthly Report — TODO

## Step 1: Database — Tables & Functions
- [x] 1a. Create `rearing_groups` table
- [x] 1b. Create `rearing_group_members` table
- [x] 1c. Create `rearing_group_invitations` table
- [x] 1d. Create `is_rearing_group_owner` helper function

## Step 2: Database — RLS Policies
- [x] 2a. `rearing_groups` RLS policies
- [x] 2b. `rearing_group_members` RLS policies
- [x] 2c. `rearing_group_invitations` RLS policies
- [x] 2d. `rearing_batches` owner-only SELECT policy + helper function

## Step 3: Edge Function — `send-rearing-group-invitation`
- [x] 3. Deploy invitation edge function

## Step 4: Edge Function — Update `auto-accept-invitations`
- [x] 4. Add rearing group auto-accept block

## Step 5: Accept/Decline Pages
- [x] 5a. Create `/accept-rearing-group-invitation` page
- [x] 5b. Create `/decline-rearing-group-invitation` page

## Step 6: Hook — `useRearingGroups`
- [x] 6. Create useRearingGroups hook

## Step 7: Hook — `useRearingGroupReport`
- [x] 7. Create useRearingGroupReport hook

## Step 8: Component — `RearingGroupReport`
- [x] 8. Create RearingGroupReport component

## Step 9: Integrate into Profile Page
- [x] 9. Add Rearing Groups section to profile page

## Step 10: Documentation
- [x] 10. Create feature documentation

## Step 11: Security Check
- [x] 11. Run get_advisors security check + fix search_path on new functions

## Step 12: QA Audit
- [x] 12a. P0 fix: `rearing_groups` SELECT RLS policy had ambiguous column reference — members could never see non-owned groups
- [x] 12b. P1 fix: `handleCreateRg` owner member-insert error not checked — added error check + rollback

## Review

### Summary of Changes

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | 5 DB migrations (via MCP) | Create | `rearing_groups`, `rearing_group_members`, `rearing_group_invitations` tables + helper functions + RLS policies + search_path fix + RLS SELECT policy fix |
| 2 | Edge Function `send-rearing-group-invitation` | Deploy | Email invitation edge function (same pattern as team invitations) |
| 3 | Edge Function `auto-accept-invitations` | Redeploy | Added rearing group auto-accept block alongside existing team auto-accept |
| 4 | `src/app/accept-rearing-group-invitation/page.tsx` | **New** | Accept invitation page (same pattern as team accept page) |
| 5 | `src/app/decline-rearing-group-invitation/page.tsx` | **New** | Decline invitation page (same pattern as team decline page) |
| 6 | `src/hooks/useRearingGroups.ts` | **New** | Group CRUD + member/invitation management hook |
| 7 | `src/hooks/useRearingGroupReport.ts` | **New** | Monthly report data aggregation hook |
| 8 | `src/components/rearing-groups/RearingGroupReport.tsx` | **New** | Report UI component with desktop table + mobile cards |
| 9 | `src/app/dashboard/profile/page.tsx` | Edit | Added imports, state, handler functions, UI section, and modals for rearing groups |
| 10 | `docs/features/queen-rearing-groups.md` | **New** | Feature documentation |

### What Was Changed

**Database (5 migrations):**
- Created 3 new tables with RLS enabled
- Created 2 helper functions (`is_rearing_group_owner`, `get_rearing_group_member_user_ids`) with `SECURITY DEFINER` and fixed `search_path`
- Created RLS policies matching the team system pattern
- Added additive SELECT policy on `rearing_batches` so group owners can view member batches
- Fixed `rearing_groups` SELECT RLS policy (P0: ambiguous column reference prevented members from seeing non-owned groups)

**Edge Functions:**
- `send-rearing-group-invitation`: new function, same pattern as team invitation email
- `auto-accept-invitations`: updated to also process `rearing_group_invitations` on user signup

**Frontend:**
- Accept/decline pages follow the exact team invitation page pattern
- `useRearingGroups` hook provides all group management operations (create, delete, rename, invite, cancel, remove, leave)
- `useRearingGroupReport` hook aggregates rearing batch data by member for a selected month/year
- `RearingGroupReport` component shows month/year/group selectors and a responsive report table
- Profile page gets a new "Queen Rearing Groups" section between Team Management and Data Export

### What Stays Unchanged
- Batches page — members still see only their own batches
- Existing team system — completely untouched
- Existing RLS on `rearing_batches` — new policy is additive (SELECT only)
- No schema changes to existing tables
