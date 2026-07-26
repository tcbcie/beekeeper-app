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
  - Hybridised offspring (auto-calculated from Queen Tracker distribution records)
  - Virgin queens distributed outside group (auto-calculated from distribution records)
  - Virgins distributed outside — successfully mated (auto-calculated from distribution records)
- Auto-calculated distribution counts from `graft_distributions` records:
  - Hybridised offspring = count of distributions where `offspring_hybridised === true`, grouped by `hybridisation_date` month (tracked via Queen Tracker)
  - External distributions = virgin_queen distributions where recipient is NOT a group member (queen_cell distributions excluded — tracked separately on row 28)
  - Mated queen external distributions included in rows 24/26 (distributed outside / successfully mated)
  - Auto-calculated values used as defaults; manual overrides take precedence when saved
  - "Auto: X from records" indicator shown below manual fields
- Sealed queen cell tracking:
  - Distributed sealed queen cells (distribution_type = 'queen_cell') are tracked on row 28 "Sealed queen cells distributed" with per-apiary breakdown, counted by `distribution_date` month (not batch emergence month)
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
- Row 21: Number of newly mated queens showing hybridised offspring (auto-calculated from `graft_distributions.offspring_hybridised` by `hybridisation_date` month; manual override available)
- "Outside your group" section header
- Row 24: Number of virgin queens distributed outside the group (total only + NB note in red)
- Row 26: Number of virgin queens distributed outside the group that were successfully mated
- Row 28: Sealed queen cells distributed (auto-calculated from distribution records by distribution_date month, per-apiary breakdown)

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
| `src/hooks/useNIHBSReport.ts` | Data aggregation hook for NIHBS report — derives counters from graft statuses when batch-level values are NULL |
| `src/hooks/useRearingGroupReport.ts` | Modified — graft-derived fallback for NULL counters; no queen_cell subtraction |
| `src/components/rearing-groups/RearingGroupReport.tsx` | Monthly rearing report UI — "Sealed Cells" column + Cells Distributed column |
| `src/hooks/useRearingGroups.ts` | Modified — added experience_level to member interface |
| `src/components/rearing-groups/NIHBSMonthlyReturn.tsx` | NIHBS report UI + Excel export component |
| `src/app/dashboard/batches/page.tsx` | Modified — mating apiary dropdown on batch form |
| `src/app/dashboard/reports/page.tsx` | Modified — rearing report and NIHBS returns tabs (conditional on group ownership) |

## Graft-Derived Counter Fallback

Both `useNIHBSReport` and `useRearingGroupReport` derive counters from individual graft statuses in `batch_grafts`, with a fallback to mating-nuc inspection timestamps. Derived counts always take precedence over the stale batch-level columns once any grafts exist for the batch.

- **grafts_accepted** = grafts not in `grafted` or `failed` status (i.e. cells that reached at least `accepted` / `sealed`).
- **queens_hatched** = a graft is counted if **any** of the following is true:
  - graft status is `emerged` or `mated`
  - graft status is `sold` and the linked `graft_distributions.distribution_type` is `virgin_queen` or `mated_queen`
  - the linked `mating_nucs` row has a non-null `queen_emerged_at` **or** `mating_confirmed_at`
  - the linked `mating_nucs` row has a status of `virgin`, `mating`, or `laying` (the queen has emerged even when no inspection stamped `queen_emerged_at`)
- **queens_mated** = a graft is counted if **any** of the following is true:
  - graft status is `mated`
  - graft status is `sold` and the linked `graft_distributions.distribution_type` is `mated_queen` (or `mating_confirmed = true`)
  - the linked `mating_nucs` row has a non-null `mating_confirmed_at`
  - the linked `mating_nucs` row has a status of `mating` or `laying`
- The nuc-status signal lists live in `src/components/batches/graftConstants.ts` as `NUC_HATCHED_STATUSES` / `NUC_MATED_STATUSES`, shared by all three count hooks (`useBatchGrafts`, `useNIHBSReport`, `useRearingGroupReport`).
- **sold grafts** with `distribution_type = queen_cell` count as accepted only (not hatched or mated).

**Why `in_nuc` is not a hatched signal.** When a sealed cell is transferred into a mating nuc via the bulk-setup flow, its graft status is set to `in_nuc` immediately — regardless of whether the queen has actually emerged. Counting `in_nuc` as hatched produced inflated B13 figures in NIHBS reports. Hatching is recognised once an inspection records the queen (`NucInspectionPanel` auto-promotes the graft to `emerged`/`mated` **and** stamps `mating_nucs.queen_emerged_at` / `mating_confirmed_at`, which the nuc-timestamp fallback also picks up).

## Hybridised Offspring — Distribution-Based Tracking

Row 21 ("Number of newly mated queens showing hybridised offspring") is auto-calculated from individual `graft_distributions` records where `offspring_hybridised === true`, grouped by `hybridisation_date` month. This replaces the previous batch-level `rearing_batches.queens_hybridised` field (which is no longer written to from the batch form). The Queen Tracker provides a three-state toggle (Yes/No/?) with a user-selectable date picker when set to Yes. Manual overrides from `nihbs_monthly_returns.hybridised_offspring` still take precedence when explicitly saved.

## Multi-Breeder Batches

NIHBS report figures are aggregated **per batch** (sealed cells, hatched, mated, distributions). Multi-breeder batches — where a batch's cells were grafted from more than one breeder queen, tracked via `batch_breeder_queens` and `batch_grafts.breeder_queen_id` (see [multi-breeder-queens-per-batch.md](./multi-breeder-queens-per-batch.md)) — do **not** split the figures by breeder. They contribute to the same per-batch totals as before. Per-breeder reporting is out of scope for this iteration.

## Incomplete Mating Apiary Warning

The Mating Apiary Details sheet reports a **10 km grid reference** and **altitude** for each mating
apiary. Both are derived from the apiary's coordinates, so a mating site saved without coordinates
(for example with only an Eircode) exports **blank cells** — an incomplete return that was easy to
submit unnoticed.

The on-screen return now lists any mating apiary missing a grid reference or elevation in an amber
warning above the monthly breakdown, naming each apiary and exactly which value is absent. The fix
is to open that apiary and save it: the apiary form resolves coordinates from the Eircode and derives
both values (see [irish-grid-reference.md](./irish-grid-reference.md)), or the position can be set
with "Pick on Map".

## RLS Policies

- `nihbs_monthly_returns`: Group owners only (SELECT/INSERT/UPDATE).
- `batch_grafts`: Group owners can view member grafts (SELECT) — enables graft-derived counter fallback for the NIHBS and rearing reports.
- `batch_breeder_queens`: Group owners can view member rows (SELECT) — mirrors the `batch_grafts` policy so multi-breeder batches are readable by group owners. Insert/update/delete are owner-only.
- `apiaries`: The `can_access_apiary` function grants SELECT access when an apiary is used as a mating apiary in a rearing group the user belongs to — enables the NIHBS report to show mating apiary details (name, grid reference, altitude) for all group members' mating apiaries.
