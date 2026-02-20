# NIHBS Monthly Returns — Excel Export TODO

## Steps

- [x] 1. Install `exceljs` dependency
- [x] 2. Database migrations (4 migrations via MCP)
  - [x] 2a. Add `experience_level` to `rearing_group_members`
  - [x] 2b. Create `rearing_group_mating_apiaries` junction table
  - [x] 2c. Add `mating_apiary_id` to `rearing_batches`
  - [x] 2d. Create `nihbs_monthly_returns` table
- [x] 3. Batch form — add mating apiary dropdown (`batches/page.tsx`)
- [x] 4. Profile page — group management enhancements
  - [x] 4a. Member experience level dropdown
  - [x] 4b. Mating apiaries subsection (add/remove)
- [x] 5. Modify `useRearingGroupReport` hook (add `cell_count` + `mating_apiary_id`)
- [x] 6. Create `useNIHBSReport` hook (new file)
- [x] 7. Create `NIHBSMonthlyReturn` component (new file — UI + Excel export)
- [x] 8. Profile page integration — import + render NIHBS component
- [x] 9. Documentation (`docs/features/nihbs-monthly-returns.md`)

## Review

### Summary of Changes

**Database (4 migrations applied via MCP):**
- Added `experience_level` TEXT column to `rearing_group_members` (experienced/intermediate/novice)
- Created `rearing_group_mating_apiaries` junction table with RLS (owners manage, members view)
- Added `mating_apiary_id` UUID column to `rearing_batches` (FK to apiaries)
- Created `nihbs_monthly_returns` table with RLS (owner-only) for manual-entry fields

**`package.json`:**
- Added `exceljs` dependency for client-side .xlsx generation

**`src/app/dashboard/batches/page.tsx`:**
- Added `mating_apiary_id` to Batch interface, FormData interface, initial state, resetForm
- Added `mating_apiary_id` to dataToSubmit in handleSubmit and form initialisation in handleEdit
- Added Mating Apiary dropdown section in the form UI between Starter Colony and Batch Quantities

**`src/hooks/useRearingGroups.ts`:**
- Added `experience_level` to `RearingGroupMember` interface

**`src/hooks/useRearingGroupReport.ts`:**
- Added `cell_count` to `RearingGroupMemberReport` interface and totals
- Updated select query to include `cell_count` and `mating_apiary_id`
- Updated aggregation and reducer to handle `cell_count`

**`src/hooks/useNIHBSReport.ts` (new):**
- Fetches group members with experience levels
- Fetches mating apiaries with grid reference and elevation
- Fetches batches for all members in a year, groups by month and mating apiary
- Fetches/saves manual fields from nihbs_monthly_returns via upsert
- Returns structured NIHBSReportData

**`src/components/rearing-groups/NIHBSMonthlyReturn.tsx` (new):**
- Group + Year selectors
- Summary card (members, mating apiaries, first/last graft dates)
- Per-month breakdown tables with 8 NIHBS metric rows (5 auto + 3 manual inputs)
- Save button per month for manual fields
- Export NIHBS Excel button — generates multi-sheet workbook:
  - Sheet 1: Group Details with member breakdown and mating apiary table
  - Monthly sheets: metrics with per-apiary columns matching NIHBS row numbers
- Mobile and desktop responsive views

**`src/app/dashboard/profile/page.tsx`:**
- Added NIHBSMonthlyReturn import and render below RearingGroupReport (owner-only)
- Added `handleUpdateExperienceLevel` handler
- Added mating apiaries state, fetch functions, add/remove handlers
- Updated "View Members" button to also fetch mating apiaries and member apiaries
- Added experience level dropdown next to each non-owner member in the expanded member list
- Added Mating Apiaries subsection with add dropdown and remove buttons

**`docs/features/nihbs-monthly-returns.md` (new):**
- Full feature documentation covering all aspects

### QA Bug Fixes

7 bugs found during QA audit, all fixed:

**P1 — Fix #1: Timezone month-bucket shift (useNIHBSReport.ts + NIHBSMonthlyReturn.tsx)**
- `new Date("2026-05-01")` parses as UTC midnight, shifts to April in BST
- Fixed: parse date strings directly via `split('-')` instead of `new Date()`

**P1 — Fix #2: Excel export uses stale manual edits (NIHBSMonthlyReturn.tsx)**
- `handleExportExcel` read from `reportData` (last DB fetch) not current UI state
- Fixed: merge `manualEdits` into `exportData` before export, replaced all references, added `manualEdits` to dependency array

**P1 — Fix #3: Experience dropdown reverts on re-render (profile/page.tsx + useRearingGroups.ts)**
- `handleUpdateExperienceLevel` updated DB but not local `rgMembers` state
- Fixed: exposed `setRgMembers` from hook, update local state after successful DB save

**P1 — Fix #4: Stale mating apiaries flash when switching groups (profile/page.tsx)**
- `rgMatingApiaries`/`rgMemberApiaries` showed previous group's data until fetch completed
- Fixed: clear both arrays immediately when expanding a different group

**P2 — Fix #5: Elevation 0 treated as null (useNIHBSReport.ts + profile/page.tsx)**
- `|| null` treats sea-level elevation (0) as falsy
- Fixed: changed to `?? null` in both files

**P2 — Fix #6: No save feedback (NIHBSMonthlyReturn.tsx)**
- `handleSaveMonth` discarded the boolean return from `saveManualFields`
- Fixed: added "Saved"/"Failed to save" status indicator next to Save button with 3s auto-dismiss

**P2 — Fix #7: Orphaned manual returns invisible (useNIHBSReport.ts)**
- Months with only manual data (no batches) were not shown
- Fixed: create month entry when manual return exists but no batches in that month
