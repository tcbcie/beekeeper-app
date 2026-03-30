# Task: Add Dates and Events to Apidea Overview Table

**Date:** 30/03/2026
**Status:** Complete

## Objective
Extend the Apidea Overview table in NUC Reports to show event dates (setup, cell introduced, queen emerged, mating confirmed, failed) alongside each apidea number and queen status.

## Plan

- [x] 1. Add `failed_at` to NucRecord interface and Supabase query
- [x] 2. Add `formatDate` helper for consistent en-GB date display
- [x] 3. Extend desktop table with date columns
- [x] 4. Extend mobile cards with date grid (only showing dates with values)
- [x] 5. Update CSV export with all date columns
- [x] 6. Update feature docs

## Review

### Changes Made
- **`src/components/batches/NucReportsTab.tsx`**:
  - Added `failed_at` to `NucRecord` and Supabase select
  - Added `formatDate()` helper (handles both date-only and timestamp strings, en-GB format)
  - Desktop table: 7 columns (Apidea Number, Queen Status, Setup, Cell Introduced, Queen Emerged, Mating Confirmed, Failed)
  - Mobile cards: name/status header row + 2-column date grid showing only populated dates
  - Failed dates highlighted in red
  - CSV export: renamed "NUC Status" to "Queen Status", added Cell Introduced and Failed columns
- **`docs/features/queen-rearing-nuc-reports.md`** — Updated Phase 3 approach description
