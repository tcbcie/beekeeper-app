# Queen Rearing Groups & Monthly Report

## Overview

Queen Rearing Groups allow beekeepers to form groups for collaborative queen rearing. The group owner can generate consolidated monthly reports showing grafts accepted, queens hatched, and queens mated across all group members' rearing batches.

This feature is **separate from the existing team system** — teams handle apiary sharing, whilst rearing groups focus exclusively on queen rearing reporting.

## How It Works

### Group Management
- Any user can **create a rearing group** from the Rearing Team page
- The creator becomes the group **owner** and is automatically added as a member
- The owner can **invite members** via email (same flow as team invitations)
- The owner can **rename** or **delete** the group
- The owner can **transfer ownership** to an existing group member via a dropdown — the old owner becomes a regular member
- Members can **leave** a group at any time

### Invitation Flow
1. Owner enters an email address to invite
2. If the user already has a HiveCraic account, they are added directly
3. If the user does not have an account, a pending invitation is created and an email is sent
4. The email contains **Accept** and **Decline** links
5. New users who sign up with a matching email are auto-accepted via the `auto-accept-invitations` webhook

### Monthly Report
- Available only to group **owners**
- Select a group, month, and year to generate a report
- The report aggregates data from all members' `rearing_batches` where `graft_date` falls within the selected month
- The report **always renders** for the selected month, even if all values are zero — all members are listed with their counts
- Shows per-member breakdown and group totals for:
  - Number of batches
  - Grafts accepted
  - Queens hatched
  - Queens mated
- Responsive design: table on desktop, cards on mobile

### Experience Level (Skill Level)
- Each member (including the owner) has an **experience level**: Experienced, Intermediate, or Novice
- Members can **self-declare** their level from the "Groups I'm In" section
- The group owner can also **view and change** any member's level from the expanded members list
- An **info tooltip** (help icon) explains the levels:
  - **Experienced/Advanced** — were already using colony selection and queen rearing, for a number of seasons, before joining group
  - **Intermediate** — had some queen rearing experience prior to joining group
  - **Novice** — no queen rearing experience prior to joining group
- Experience levels are stored in the `experience_level` column on `rearing_group_members`
- Used in NIHBS monthly returns to count members by skill level

### Privacy
- Members **cannot** see each other's batches in the normal batches page
- Only the group owner can view aggregated batch data via the report
- The RLS policy on `rearing_batches` grants the owner **read-only** access to member batches (SELECT only)

## Database Schema

### Tables
- `rearing_groups` — group name + owner
- `rearing_group_members` — membership records (group_id, user_id, role, experience_level)
- `rearing_group_invitations` — invitation records with status tracking

### Helper Functions
- `is_rearing_group_owner(group_uuid, user_uuid)` — checks ownership (used in RLS policies)
- `get_rearing_group_member_user_ids(owner_uuid)` — returns all member user_ids for groups owned by the given user (used in rearing_batches RLS)

### RLS Policies
- `rearing_groups`: owners and members can view; only owners can create/update/delete
- `rearing_group_members`: members can view members of their groups; owners can manage
- `rearing_group_invitations`: publicly readable (UUID-protected); owners can create/delete; invitees can update their own
- `rearing_batches`: additive SELECT policy allowing group owners to read member batches

## Files

| File | Description |
|------|-------------|
| `src/hooks/useRearingGroups.ts` | Group CRUD, member/invitation management, experience level |
| `src/hooks/useRearingGroupReport.ts` | Monthly report data aggregation |
| `src/components/rearing-groups/RearingGroupReport.tsx` | Report UI component |
| `src/app/accept-rearing-group-invitation/page.tsx` | Accept invitation page |
| `src/app/decline-rearing-group-invitation/page.tsx` | Decline invitation page |
| `src/app/dashboard/rearing-team/page.tsx` | Rearing Team page (group management, members, experience levels) |

### Edge Functions
- `send-rearing-group-invitation` — sends invitation email via Resend
- `auto-accept-invitations` — updated to also handle rearing group invitations on signup

## Location in UI

The **Queen Rearing Groups** section is on the dedicated **Rearing Team** page (`/dashboard/rearing-team`).

### Owner View ("My Rearing Groups")
- Group cards with View Members, Invite, Rename, Transfer, and Delete buttons
- Expanded member list with experience level dropdown for all members (including the owner)
- Info tooltip (help icon) explaining the three experience levels
- Pending, accepted, and declined invitation lists

### Member View ("Groups I'm In")
- Group card with Leave Group button
- "My Experience Level" self-declaration dropdown
- Info tooltip (help icon) explaining the three experience levels
