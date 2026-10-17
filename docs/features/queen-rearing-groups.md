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
2. Everyone gets a pending invitation, including users who already have an account. Nobody is added without accepting (security batch 4, 17/10/2026). Existing users can accept from the email link or from the **Invitations for you** card on the dashboard (`PendingInvitationsCard`, backed by `get_my_pending_invitations`). Joining goes through the `accept_rearing_group_invitation` RPC, which checks the invitation is pending, unexpired and addressed to the caller's email. The database only lets an owner insert their own membership row.
3. If the user does not have an account, a pending invitation is created and an email is sent
4. The email contains **Accept** and **Decline** links
5. New users accept through the email link. If they have no account, the accept page sends them to sign up (`/login?signup=true&redirect=…`), brings them back, and adds them to the group. There is no automatic accept on sign-up for rearing groups. The old `auto-accept-invitations` webhook was never wired to a trigger and was removed for security (SEC-H1).

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
- `rearing_group_members`: members can view members of their groups. Owners can only insert themselves; everyone else joins via `accept_rearing_group_invitation`. Owners can update roles and remove members. A trigger (`guard_membership_columns`) stops any row being moved to another user or group, and stops non-owners changing roles except to step down to `member`.
- `rearing_groups`: ownership can only be transferred to an existing member of the group (the UPDATE policy previously had no `WITH CHECK`, so transfer always failed).
- `rearing_batches`: a trigger (`guard_rearing_batch_links`) only allows a group the batch owner belongs to, and a mating apiary the owner can access directly. A batch's mating apiary grants group members access only when the batch owner can access it directly (`can_access_apiary`).
- `rearing_group_invitations`: readable only by the inviting owner or the invitee; the accept and decline links use the `get_rearing_group_invitation` and `decline_rearing_group_invitation` RPCs (security batches 1–2); owners can create/delete; invitees can update their own
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
