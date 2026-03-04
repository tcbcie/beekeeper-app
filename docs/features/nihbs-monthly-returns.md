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
- Located on the Reports page (`/dashboard/reports`) as a conditional tab (visible to rearing group owners only).
- Select a group and year to view data.
- Auto-calculated metrics from batch data:
  - Grafting rounds (batch count)
  - Cells grafted (cell_count)
  - Sealed queen cells (grafts_accepted)
  - Queen cells hatched
  - Queens mated within group
- Manual-entry fields (saved per month):
  - Hybridised offspring
  - Virgin queens distributed outside group (auto-calculated from distribution records)
  - Virgins distributed outside — successfully mated (auto-calculated from distribution records)
- Auto-calculated distribution counts from `graft_distributions` records:
  - External distributions = virgin_queen distributions where recipient is NOT a group member (queen_cell distributions excluded — tracked separately on row 28)
  - Mated queen external distributions included in rows 24/26 (distributed outside / successfully mated)
  - Auto-calculated values used as defaults; manual overrides take precedence when saved
  - "Auto: X from records" indicator shown below manual fields
- Sealed queen cell tracking:
  - Distributed sealed queen cells (distribution_type = 'queen_cell') are tracked on row 28 "Sealed queen cells distributed" with per-apiary breakdown
  - No subtraction from queens_hatched/queens_mated — batch values already reflect only queens that actually hatched/mated in possession

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
- Row 3: "Breakdown of quantities..." explanatory text with rich-text YELLOW highlight (merged across columns, minimum 10-column span for readability)
- Row 4: "Data Checks" header (red bg, white text, 1.5× row height) + dynamically numbered column headers #1–#N matching actual apiary count
- Row 5: "Total" label + apiary names (bold, rotated 45°)
- Row 7: Number of Grafting rounds this month (yellow fill for Total + per-apiary values)
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
- Row 28: Sealed queen cells distributed (auto-calculated from distribution records, per-apiary breakdown)

**Dynamic Column Behaviour:**
- Apiary columns are generated dynamically based on the actual mating apiaries referenced by batches
- No hardcoded 20-column layout — only columns for real apiaries are shown
- Mating apiaries are derived automatically from `mating_apiary_id` on batch records (no separate management needed)

**Error Handling:**
- The `useNIHBSReport` hook exposes an `error` state for failed data fetches
- Error messages are displayed inline in the UI when report loading fails

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
| `src/hooks/useRearingGroupReport.ts` | Modified — added cell_count + mating_apiary_id; queen_cell distribution subtraction from hatched/mated |
| `src/components/rearing-groups/RearingGroupReport.tsx` | Monthly rearing report UI — includes Cells Distributed column |
| `src/hooks/useRearingGroups.ts` | Modified — added experience_level to member interface |
| `src/components/rearing-groups/NIHBSMonthlyReturn.tsx` | NIHBS report UI + Excel export component |
| `src/app/dashboard/batches/page.tsx` | Modified — mating apiary dropdown on batch form |
| `src/app/dashboard/reports/page.tsx` | Modified — rearing report and NIHBS returns tabs (conditional on group ownership) |

## RLS Policies

- `nihbs_monthly_returns`: Group owners only (SELECT/INSERT/UPDATE).
