# Profile Page Modularisation

## Overview

The original profile page (`src/app/dashboard/profile/page.tsx`) was 4,244 lines managing 11 distinct feature areas. It has been split into 4 focused pages. The three sub-pages (Scales, Apiary Team, Rearing Team) are accessed via link cards on the Profile page under a "Manage" section.

## New Pages

### Scales (`/dashboard/scales`)
**File:** `src/app/dashboard/scales/page.tsx`

Manages BEEP and Wolf Waagen hive scale integrations:
- Connect/disconnect BEEP account (email + password)
- Connect/disconnect Wolf Waagen (API token)
- Display connected device/scale counts
- Links to assign scales on individual hive pages

### Apiary Team (`/dashboard/apiary-team`)
**File:** `src/app/dashboard/apiary-team/page.tsx`

Manages team-based apiary sharing:
- Create/delete/rename teams
- Invite members by email (sends invitation via Supabase Edge Function `send-team-invitation`)
- Share/unshare apiaries with teams
- View team members and pending invitations
- Leave teams, cancel invitations, remove members

### Rearing Team (`/dashboard/rearing-team`)
**File:** `src/app/dashboard/rearing-team/page.tsx`

Manages queen rearing groups:
- Create/delete/rename rearing groups
- Invite members by email (sends invitation via Supabase Edge Function `send-rearing-group-invitation`)
- Transfer group ownership
- Manage mating apiaries (add/remove shared apiaries for the group)
- Update member experience levels
- Generate Rearing Group Reports
- Export NIHBS Monthly Returns (Excel)

## Remaining Profile Page

**File:** `src/app/dashboard/profile/page.tsx` (1,267 lines)

Retains:
- Profile Information (display/edit name, phone, association memberships)
- **Manage section** — 3 link cards to Scales, Apiary Team, and Rearing Team sub-pages
- Theme Preferences (ThemeSwitcher component)
- Subscription Management (status card, history, renewal modal)
- Data Export (JSON download)
- Additional Settings (change password, email notification preferences)
- Danger Zone (delete account)

## Navigation

Sub-pages are **not** in the sidebar. They are accessed from the Profile page via the "Manage" section link cards. The dashboard overview also shows:
- **My Teams** section with a "Manage Teams" button linking to `/dashboard/apiary-team`
- **My Rearing Groups** section (if the user belongs to any) with a "Manage Groups" button linking to `/dashboard/rearing-team`

## Key Dependencies

| Page | Hooks/Components | Supabase Tables |
|---|---|---|
| Scales | — | `profiles` (beep/wolf token fields) |
| Apiary Team | — | `teams`, `team_members`, `team_invitations`, `team_apiaries`, `apiaries` |
| Rearing Team | `useRearingGroups`, `RearingGroupReport`, `NIHBSMonthlyReturn` | `rearing_groups`, `rearing_group_members`, `rearing_group_invitations` |
| Profile | `SubscriptionStatusCard`, `RenewSubscriptionModal`, `SubscriptionHistoryTable`, `ThemeSwitcher` | `profiles`, `associations` |
| Dashboard | `useRearingGroups`, `useTeams` | (read-only summaries) |

## Database Notes

- The `on_team_created` trigger on the `teams` table automatically calls `add_team_owner_as_member()`, inserting the creator as a team member with role "owner". No application code needed for this.
