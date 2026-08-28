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

**File:** `src/app/dashboard/profile/page.tsx`

### Layout (redesigned)

The page opens with an **always-visible identity header** — initials avatar, name,
email, and badges for subscription state, breeder code and national memberships —
followed by eight collapsible sections. From `lg:` the sections split into **two
columns**; phones and tablets keep a single column, and the DOM order is the phone
reading order.

| Column A | Column B |
|---|---|
| Your details | Features |
| Subscription | Notifications |
| Selling your honey | Appearance |
| My data export *(active subscription only)* | Tools & Teams |
| | Account *(includes Delete account)* |

### Density rules

The page previously nested three borders around every setting: the section
`Panel`, an inner card, and a card per individual control. Two shared components
removed that, and neither shrinks any text — the audience is 50+ with reduced
eyesight, so density comes from dropping frames and duplicated prose:

- **`src/components/ui/ToggleRow.tsx`** — one on/off setting as a divider-separated
  row. The whole row is the label, so the tap target is the row rather than the
  44px switch. Optional `children` are revealed beneath the row while the toggle is
  on (used by *Selling your honey* for the Revolut link and currency).
- **`src/components/ui/DetailRow.tsx`** — one read-only label/value pair in a `<dl>`.
  Label above value on phones, label-left / value-right from `sm:`. Renders
  *Not set* for empty values.

`CollapsibleSection` uses `px-4 sm:px-6`, giving phones back 32px of width.

**Sections retained:**
- Your details (display via `DetailRow`s; the edit form is unchanged)
- Subscription (status card, history, renewal modal)
- Selling your honey (jar payments, Revolut link, currency)
- My data export (JSON / CSV)
- Features (label printing, logbook, CRM, apiary map — `ToggleRow`s)
- Notifications (task/event email reminders + frequency)
- Appearance (`ThemeSwitcher`)
- Tools & Teams — 3 link cards to the Scales, Apiary Team and Rearing Team sub-pages
- Account — change password, and delete account (formerly its own *Danger Zone*
  section; the row is red-styled and the confirmation modal does the real guarding)

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
