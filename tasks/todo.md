# Task: Add Apidea Number / Queen Status Table to NUC Reports

**Date:** 30/03/2026
**Status:** Complete

## Objective
Add a table to the Queen Rearing Reports tab showing each apidea (mating nuc) number alongside its current queen status.

## Plan

- [x] 1. Add `nuc_number` to `NucRecord` interface and Supabase query in `NucReportsTab.tsx`
- [x] 2. Add "Apidea Overview" panel with mobile card view + desktop table view showing nuc number and status
- [x] 3. Include apidea number in CSV export
- [x] 4. Update feature docs

## Review

### Changes Made
- **`src/components/batches/NucReportsTab.tsx`** — Added `nuc_number` to `NucRecord` interface and Supabase query. Added new "Apidea Overview" panel between the Status Overview row and Utilisation row, showing each active mating nuc's apidea number and queen status. Mobile uses compact card rows; desktop uses a two-column table. CSV export now includes "Apidea Number" as the first column.
- **`docs/features/queen-rearing-nuc-reports.md`** — Documented Phase 3 (Apidea Overview Table).

### Notes
- Single file change for functionality. Reuses existing `activeNucs`, `STATUS_LABELS`, `STATUS_TONES`, and `Badge` component.
