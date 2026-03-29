# Queen Weight Recording - Implementation Todo

**Date:** 29/03/2026
**Status:** Complete

- [x] 1. Database migration: create `queen_weights` table with RLS
- [x] 2. Update `graftConstants.ts`: add `latest_weight_mg` to Graft interface
- [x] 3. Update `useBatchGrafts.ts`: fetch latest weights and merge into grafts
- [x] 4. Update `NucInspectionPanel.tsx`: add "Weight Queen" button, form, and history
- [x] 5. Update `MatingNucsTab.tsx`: pass `graftStatus` prop to NucInspectionPanel
- [x] 6. Update `QueenTrackingSection.tsx`: add weight column to table and mobile cards
- [x] 7. Create feature documentation

## Review

### Summary of Changes

**Database**: New `queen_weights` table with user-scoped RLS policies, indexed on `graft_id` and `(user_id, weighed_at)`.

**UI — NucInspectionPanel**: Added "Weight Queen" button (Scale icon) alongside existing "Add Inspection" and "Mark Queen" buttons. Visible only when graft status is emerged/in_nuc/mated. Opens an inline form (blue border) with date, weight (mg), and optional notes fields. Shows weight history below the form with delete capability.

**UI — Queen Tracking Section**: Added read-only "Weight (mg)" column in both desktop table and mobile card views showing the latest weight for each graft.

**Data flow**: `useBatchGrafts` hook fetches latest weights via a second query after loading grafts, merging them into graft objects. Weight saves trigger `onInspectionChange` callback to refresh parent data.

### Files Changed
1. `graftConstants.ts` — 1 line (added `latest_weight_mg` field)
2. `useBatchGrafts.ts` — ~20 lines (weight fetching logic)
3. `NucInspectionPanel.tsx` — ~90 lines (button, form, state, handlers)
4. `MatingNucsTab.tsx` — 1 line (pass `graftStatus` prop)
5. `QueenTrackingSection.tsx` — ~10 lines (weight column in desktop and mobile)
6. `docs/features/queen-weight-recording.md` — new documentation
