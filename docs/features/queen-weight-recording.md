# Queen Weight Recording

## Overview

Allows beekeepers to record multiple weight measurements (in milligrams) for queens over time. Weight is an indicator of queen quality — heavier queens tend to be better mated and more productive.

## How It Works

### Recording Weights

Weights are recorded via the **"Weight Queen"** button in the Nuc Inspection Panel, alongside the existing "Add Inspection" and "Mark Queen" actions. The button is available when the graft status is `emerged`, `in_nuc`, or `mated`.

Each weight recording includes:
- **Date** — when the queen was weighed
- **Weight (mg)** — the weight in milligrams (e.g. 220)
- **Notes** — optional observation (e.g. "before mating flight")

### Viewing Weights

- **Nuc Inspection Panel**: When the weight form is open, previous weight recordings are displayed below with date, weight, and notes. Incorrect entries can be deleted.
- **Queen Tracking Section**: The latest weight for each graft is displayed in a "Weight (mg)" column in both the desktop table and mobile card views.

## Database

### `queen_weights` table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK to auth.users (CASCADE) |
| `graft_id` | uuid | FK to batch_grafts (CASCADE) |
| `weight_mg` | integer | Weight in milligrams (must be > 0) |
| `weighed_at` | date | Date of weighing |
| `notes` | text | Optional notes |
| `created_at` | timestamptz | Record creation timestamp |

**RLS**: Standard user-scoped policies (SELECT/INSERT/UPDATE/DELETE where `auth.uid() = user_id`).

## Files Modified

- `src/components/batches/graftConstants.ts` — added `latest_weight_mg` to Graft interface
- `src/hooks/useBatchGrafts.ts` — fetches latest weights and merges into graft objects
- `src/components/batches/NucInspectionPanel.tsx` — "Weight Queen" button, form, history display, delete
- `src/components/batches/MatingNucsTab.tsx` — passes `graftStatus` prop to NucInspectionPanel
- `src/components/batches/QueenTrackingSection.tsx` — weight column in desktop table and mobile cards
