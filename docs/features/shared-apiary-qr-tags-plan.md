# Shared Apiary QR Tags

## Overview

Extend the existing QR Tags system so apiary owners can generate QR tags intended for shared apiaries. Team members can see and assign these shared tags but cannot generate or delete them. On ownership transfer, QR tags follow the apiary.

## Status: Implemented

## Requirements

1. **Owner generates** — Only the apiary owner generates QR tags
2. **One QR per hive** — No change to existing constraint
3. **Generation distinguishes own vs shared** — When generating, owner chooses "My hives" or a specific team/shared apiary
4. **Team members see shared tags** — Clearly differentiated in the QR Tags page (e.g., "Shared via [team-name]" badge, similar to apiary cards)
5. **Team members can assign** shared tags to shared hives, but cannot generate or delete them
6. **Ownership transfer** — When apiary ownership transfers, QR tags assigned to that apiary's hives transfer to the new owner

## Design

### Database Changes

**Add `team_id` column to `qr_tags`:**
- `team_id UUID REFERENCES teams(id) ON DELETE SET NULL` (nullable)
- When NULL → tag is for the owner's own hives (current behaviour)
- When set → tag is for shared use within that team
- Index: `idx_qr_tags_team_id` on `team_id`

**Update RLS policies on `qr_tags`:**
- **SELECT**: Keep open read (`true`) — already allows scanning. Additionally, team members need to see tags where `team_id` matches their team membership
- **UPDATE** (assign only): Allow team members to update `hive_id` and `assigned_at` on tags where `team_id` = their team. They cannot change `user_id`, `code`, `team_id`, or `label`
- **INSERT/DELETE**: Owner only (no change)

**Update `transfer_apiary_ownership` RPC:**
- Add step: update `qr_tags.user_id` for tags assigned to hives in the transferred apiary

### Frontend Changes

**QR Tags page (`src/app/dashboard/qr-tags/page.tsx`):**

1. **Generate modal** — Add a "For" selector:
   - "My hives" (default, `team_id = null`)
   - List of teams the user owns that have shared apiaries
   - When a team is selected, `team_id` is set on the generated tags

2. **Tags list** — Two sections:
   - **My Tags** — Tags where `user_id = currentUser AND team_id IS NULL`
   - **Shared Tags** — Tags where `team_id` is in the user's teams (as owner or member)
   - Shared tags show a "Shared via [team-name]" badge (blue border, like ApiaryCard)
   - Team members see assign/reassign buttons but NOT generate or delete buttons

3. **Assign modal** — When assigning a shared tag:
   - Dropdown shows only hives from the shared apiary (filtered by team's apiaries)
   - Owner sees all hives; team member sees shared (non-archived) hives

4. **Fetch logic** — Extend to also fetch:
   - User's team memberships (owned and member teams)
   - Shared tags via `team_id IN (user's team IDs)`
   - Shared hives for assignment dropdown

### Ownership Transfer

In `transfer_apiary_ownership` RPC, add after the existing steps:
```sql
-- Transfer QR tags assigned to hives in this apiary
UPDATE qr_tags
SET user_id = p_new_owner_id
WHERE hive_id IN (
  SELECT id FROM hives WHERE apiary_id = p_apiary_id
);
```

## Changes Summary

| Area | File/Table | Change |
|------|-----------|--------|
| DB | `qr_tags` | Add `team_id` column + index |
| DB | `qr_tags` RLS | Update UPDATE policy for team members |
| DB | `transfer_apiary_ownership` | Transfer QR tags with apiary hives |
| FE | `qr-tags/page.tsx` | Generate modal "For" selector, split list, shared tag badges, filtered assign |

## Simplicity Notes

- Reuses existing team infrastructure (no new tables)
- Single new column (`team_id`) drives all shared behaviour
- No new pages or routes — extends existing QR Tags page
- Shared tags use same QR format and scan flow (no scan-side changes)
- Badge styling matches existing shared apiary pattern
