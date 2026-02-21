# NIHBS Monthly Returns — Excel Export

## Overview

Rearing groups in the NIHBS Conservation and Queen Rearing Group Scheme (DAFM-funded) must submit formalised monthly returns. This feature adds a full NIHBS-faithful Excel export alongside the existing in-app report.

## Features

### Mating Apiary on Batches
- Each rearing batch can optionally be linked to a **mating apiary** — the apiary where queens go for mating.
- Set via a dropdown on the batch create/edit form (Queen Rearing page).
- Enables per-apiary breakdown in the NIHBS monthly sheets.

### Member Experience Levels
- Group owners can set each member's experience level: **Experienced**, **Intermediate**, or **Novice**.
- Configured via a dropdown in the expanded member list on the Profile page.
- Used in the Group Details Sheet of the Excel export.

### Mating Apiaries
- Mating apiaries are derived automatically from the `mating_apiary_id` assigned on individual batches.
- No separate management is needed — any apiary referenced by a batch appears in the report.
- Each mating apiary appears as a column in the monthly Excel sheets.

### NIHBS Monthly Returns Section
- Located on the Profile page below the existing Monthly Rearing Report (owner-only).
- Select a group and year to view data.
- Auto-calculated metrics from batch data:
  - Grafting rounds (batch count)
  - Cells grafted (cell_count)
  - Sealed queen cells (grafts_accepted)
  - Queen cells hatched
  - Queens mated within group
- Manual-entry fields (saved per month):
  - Hybridised offspring
  - Virgin queens distributed outside group
  - Virgins distributed outside — successfully mated

### Excel Export
Generates a multi-sheet `.xlsx` workbook matching the NIHBS template. Export is available even when there is no monthly batch data for the selected year.

**Sheet 1: Group Details Sheet** — matches the official NIHBS template layout:
- Row 1: Title with scheme year
- Row 3: Group name (yellow highlight)
- Row 5: Number of Group Members/Participants (yellow)
- Rows 6-8: Member Breakdown — Experienced/Advanced, Intermediate, Novice (yellow counts + description text)
- Row 10: Date of first graft with group for the year (yellow)
- Row 11: Date of last graft within group for the year (yellow)
- Row 13: Number of Mating Apiaries used (yellow)
- Row 23: Mating Apiary Details table header
- Rows 24+: Numbered apiary rows (#1–#13 minimum) with Name, 10km Grid Reference, Altitude

**Monthly Sheets (one per active month)** — matches the official NIHBS template layout:
- Row 1: Group name with red background (spanning all columns)
- Row 3: "Data Checks" header (red bg, white text) + "Breakdown of quantities..." explanatory text with rich-text YELLOW highlight
- Row 4: Numbered column headers #1–#20 (grey fill for unused apiary slots)
- Row 5: "Total" label + apiary names (rotated 45°) or "N/A" with grey fill for unused slots
- Row 7: Number of Grafting rounds this month (yellow fill for Total + per-apiary values, grey for unused)
- Row 9: Total number of cells grafted or cell cups transferred from Cupkit/Jenter boxes
- Row 11: Number of Sealed queen cells achieved
- Row 13: Number of queen cells hatched this month
- Rows 14-16: Note about hatching in calendar month (red bold italic)
- "Within your group" section header
- Row 19: Number of queens mated this month (per-apiary breakdown)
- Row 21: Number of newly mated queens showing hybridised offspring (total only + explanatory note)
- "Outside your group" section header
- Row 24: Number of virgin queens distributed outside the group (total only + NB note in red)
- Row 26: Number of virgin queens distributed outside the group that were successfully mated

## Database Tables

### `nihbs_monthly_returns`
Stores the manual-entry fields per group per month.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| group_id | UUID | FK to rearing_groups |
| month | INTEGER | 1-12 |
| year | INTEGER | 2020-2100 |
| hybridised_offspring | INTEGER | Manual field |
| virgins_distributed_external | INTEGER | Manual field |
| virgins_external_mated | INTEGER | Manual field |
| updated_at | TIMESTAMPTZ | Last update |
| updated_by | UUID | FK to auth.users |

### Modified Tables
- `rearing_group_members` — added `experience_level` column (experienced/intermediate/novice)
- `rearing_batches` — added `mating_apiary_id` column (FK to apiaries)

## Files

| File | Description |
|------|-------------|
| `src/hooks/useNIHBSReport.ts` | Data aggregation hook for NIHBS report |
| `src/hooks/useRearingGroupReport.ts` | Modified — added cell_count + mating_apiary_id |
| `src/hooks/useRearingGroups.ts` | Modified — added experience_level to member interface |
| `src/components/rearing-groups/NIHBSMonthlyReturn.tsx` | NIHBS report UI + Excel export component |
| `src/app/dashboard/batches/page.tsx` | Modified — mating apiary dropdown on batch form |
| `src/app/dashboard/profile/page.tsx` | Modified — experience levels, mating apiaries, NIHBS component |

## RLS Policies

- `nihbs_monthly_returns`: Group owners only (SELECT/INSERT/UPDATE).
