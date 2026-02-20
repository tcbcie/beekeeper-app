# Move Sub-pages to Profile & Add Rearing Groups to Dashboard

## Tasks

- [x] Step 1: Remove 3 nav items (Scales, Apiary Team, Rearing Team) from sidebar in `navigation.ts`
- [x] Step 2: Add "Manage" link cards section to Profile page between Profile Info and Theme Preferences
- [x] Step 3: Add "My Rearing Groups" section to dashboard overview (after Teams section)
- [x] Step 4: Fix stale "Manage Teams" link from `/dashboard/profile#teams` to `/dashboard/apiary-team`
- [x] Step 5: Update `docs/features/profile-page-split.md` documentation

## Review

### Summary of Changes

**Sidebar decluttered:** Removed Scales, Apiary Team, and Rearing Team from `src/lib/navigation.ts` (3 nav items + unused `Scale` import).

**Profile "Manage" section:** Added 3 link cards to `src/app/dashboard/profile/page.tsx` between Profile Information and Theme Preferences. Each card shows an icon, label, description, and chevron, linking to the respective sub-page.

**Dashboard rearing groups:** Added `RearingGroupsSection` component to `src/app/dashboard/page.tsx`, mirroring the existing `TeamsSection` pattern. Shows owned groups and member groups with badges and member counts. Only renders when the user belongs to at least one rearing group.

**Stale link fixed:** Changed "Manage Teams" button from `<a href="/dashboard/profile#teams">` to `<Link href="/dashboard/apiary-team">`.

### Files Changed

| File | Action |
|---|---|
| `src/lib/navigation.ts` | Removed 3 nav items + `Scale` import |
| `src/app/dashboard/profile/page.tsx` | Added imports + Manage section with 3 link cards |
| `src/app/dashboard/page.tsx` | Added `useRearingGroups` hook, `RearingGroupsSection` component, fixed Manage Teams link |
| `docs/features/profile-page-split.md` | Updated to reflect new navigation approach |
