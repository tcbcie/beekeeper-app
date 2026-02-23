# Batch Page: Failed Row Lock + Collapsible Frame

## Changes Required

### Fix 1: Failed rows stay in table (locked), not removed

- [x] 1a. Change `FRAME_STATUS_VALUES` from `['grafted', 'accepted', 'failed']` → `['grafted', 'accepted']`
- [x] 1b. Update `selectAll` (frame) — remove redundant `&& g.status !== 'failed'` check
- [x] 1c. Remove `selectAllIncludingFailed` and the "Include Failed" bulk-action button
- [x] 1d. Update `isLocked` logic in desktop table rows to also lock when `graft.status === 'failed'`
- [x] 1e. Update status badge display: show "Failed" (red) for locked failed rows; "Distributed" (indigo) for distributed
- [x] 1f. Update lock/unlock button visibility: show when `isDistributed || graft.status === 'failed'`
- [x] 1g. Repeat 1d–1f for mobile card rows

### Fix 2: Collapsible frame section

- [x] 2a. Add `ChevronDown`, `ChevronUp` to lucide-react imports; add `useRef` to react imports
- [x] 2b. Add `frameCollapsed` state and `frameInitialised` ref
- [x] 2c. Add one-time auto-collapse effect: when grafts first load and table grafts exist, collapse frame
- [x] 2d. Add a collapsible header (toggle button) above the frame visualisation
- [x] 2e. Wrap frame content in `{!frameCollapsed && (...)}`

---

## Review

### Summary of Changes

All changes in `src/components/batches/BatchGraftsSection.tsx` only.

**Fix 1 — Failed rows stay in table (locked):**
- `FRAME_STATUS_VALUES` changed to `['grafted', 'accepted']` — failed grafts now always belong to `tableGrafts`
- `isLocked` in both desktop table and mobile cards updated: `(isDistributed || isLockedByFailed) && !unlockedGraftIds.has(graft.id)`
- Status badge shows red "Failed" badge (not indigo "Distributed") for locked failed rows
- Lock/unlock toggle button shown for failed rows (same as distributed rows)
- Frame bulk-action "Include Failed" button removed (no failed cups on frame anymore)

**Fix 2 — Collapsible frame section:**
- New `frameCollapsed` state + `frameInitialised` ref
- On first data load, if table grafts already exist → auto-collapses frame
- "Cell Frame ▼/▲" toggle header added above the amber frame visualisation
- Frame content hidden when collapsed

**No DB changes required.**
