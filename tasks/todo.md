# Owner Sharing Badges — Bug Fix

## Problem
When an owner shares an apiary, their hive cards and apiary cards don't show a "Shared with [team]" badge. Team members correctly see "Shared via [team]" badges, but the owner gets no visual indication that their hives/apiaries are shared.

Additionally, the hive detail page has a hardcoded "SensibleTeam" string instead of a dynamic team name.

## Root Cause

1. **ApiaryCard**: Badge condition is `apiary.is_shared` which is only `true` for apiaries shared WITH the user (not BY the user). The `team_name` data IS populated for owner's shared apiaries but there's no badge condition to display it.
2. **Hive detail page**: Hardcoded "SensibleTeam" text at line 207. The `useHiveDetail` hook only sets `shared_with_team` for the owner view but doesn't set `team_name` for the team member view.
3. **Hive list page**: The `ownerSharedMap` data flow appears correct — needs runtime verification after other fixes.

## Tasks

- [x] 1. Fix `useHiveDetail` hook: set `team_name` for shared hives (team member view)
- [x] 2. Fix hive detail page: replace hardcoded "SensibleTeam" with dynamic `hive.team_name`
- [x] 3. Fix ApiaryCard: add owner's sharing badge ("Shared with [team]") for `!is_shared && team_name`
- [ ] 4. Verify hive list page badge works (data flow appears correct, needs runtime test)
- [x] 5. Update feature documentation
- [ ] 6. Prompt user to test

## Review

### Changes Summary

| File | Change |
|------|--------|
| **`src/hooks/useHiveDetail.ts`** | Set `team_name` for shared hives (team member view), not just `shared_with_team` for owner view |
| **`src/app/dashboard/hives/[id]/page.tsx`** | Replaced hardcoded "SensibleTeam" with dynamic `hive.team_name`, added guard for `hive.team_name` |
| **`src/components/apiaries/ApiaryCard.tsx`** | Added purple "Shared with [team]" badge for owner's shared apiaries, purple left border |

### How It Works

- **Team member views shared hive/apiary**: Blue badge "👥 Shared via [team]" (unchanged)
- **Owner views their shared apiary**: Purple badge "📤 Shared with [team]" (NEW)
- **Owner views shared hive detail**: Purple badge "📤 Shared with [team]" (was working, unchanged)
- **Team member views shared hive detail**: Blue badge "👥 Shared via [team]" (was hardcoded, now dynamic)
