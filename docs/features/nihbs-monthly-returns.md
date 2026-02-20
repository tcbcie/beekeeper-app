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

### Mating Apiaries Management
- Group owners can designate up to 20 mating apiaries from all group members' apiaries.
- Managed via a subsection in the expanded group view on the Profile page.
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
Generates a multi-sheet `.xlsx` workbook matching the NIHBS template:

**Sheet 1: Group Details Sheet**
- Group name, year, member count
- Experience breakdown (experienced/intermediate/novice)
- First and last graft dates
- Mating apiary details table (name, 10km grid reference, altitude)

**Monthly Sheets (one per active month)**
- Metrics broken down by total and per mating apiary
- Row numbers match the official NIHBS template (7, 9, 11, 13, 19, 21, 24, 26)

## Database Tables

### `rearing_group_mating_apiaries`
Junction table linking rearing groups to designated mating apiaries.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| group_id | UUID | FK to rearing_groups |
| apiary_id | UUID | FK to apiaries |
| sort_order | INTEGER | Display ordering |
| added_at | TIMESTAMPTZ | When added |

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

- `rearing_group_mating_apiaries`: Group owners can manage; members can view.
- `nihbs_monthly_returns`: Group owners only (SELECT/INSERT/UPDATE).
