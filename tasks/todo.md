# Shared Apiary QR Tags — Implementation

## Tasks

- [x] 1. DB: Add `team_id` column to `qr_tags` table + index
- [x] 2. DB: Update RLS policies — allow team members to read and assign shared tags
- [x] 3. DB: Update `transfer_apiary_ownership` RPC to transfer QR tags with apiary hives
- [x] 4. FE: Extend QR Tags page fetch logic to load teams + shared tags + shared hives
- [x] 5. FE: Update Generate modal with "For" selector (My hives / Team X)
- [x] 6. FE: Split tags list into "My Tags" and "Shared Tags" sections with badges
- [x] 7. FE: Hide generate/delete for shared tags when user is team member (not owner)
- [x] 8. FE: Filter assign dropdown to show shared hives for shared tags
- [x] 9. Update feature documentation

## Review

### Changes Summary

| File / Area | Change |
|-------------|--------|
| **DB: `qr_tags`** | Added `team_id UUID REFERENCES teams(id) ON DELETE SET NULL` column + partial index |
| **DB: `qr_tags` RLS** | Renamed owner UPDATE policy; added "Team members can update shared tags" policy (team_id-scoped) |
| **DB: `transfer_apiary_ownership`** | Added step to transfer QR tags assigned to hives in the transferred apiary |
| **`src/app/dashboard/qr-tags/page.tsx`** | Added team/shared state, 3 new fetch functions (fetchTeamData, fetchSharedTags, fetchSharedHives), "For" selector in Generate modal, "My Tags" / "Shared with Me" split sections, blue team badges, filtered assign dropdown for shared hives, shared tags have no delete button |
| **`docs/features/shared-apiary-qr-tags-plan.md`** | Feature documentation updated to Implemented status |

### How It Works

1. **Owner generates tags** → Picks "My hives" or "Team: X" in generate modal → Tags saved with `team_id`
2. **Owner sees** all their tags in "My Tags" (shared ones marked with blue team badge)
3. **Team member sees** owner's shared tags in "Shared with Me" section (blue border, team badge)
4. **Team member can assign** shared tags to hives from that team's shared apiaries
5. **Team member cannot** generate or delete shared tags (buttons hidden)
6. **Assign dropdown** filters to shared hives when assigning a shared tag, own hives otherwise
7. **Print All** includes both own and shared tags
8. **Ownership transfer** moves QR tags with the apiary's hives to the new owner
