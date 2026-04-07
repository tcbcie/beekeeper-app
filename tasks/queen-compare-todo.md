# Queen Comparison View TODO

Plan: `docs/features/queen-compare-plan.md`
Status: Implemented — awaiting manual test.

## Tasks

- [x] **1. Extract shared visuals** — moved `TraitBar`, `colorBadgeClass` and `formatRating` into `src/components/queens/queenTraitVisuals.tsx`. Both `QueenReportTab` and `QueenCompareTable` import from there.
- [x] **2. Selection state on the queens list** — `selectedIds: Set<string>` lazily initialised from `sessionStorage` and persisted on every change. `toggleSelect(id)` enforces the 4-queen cap with a toast warning.
- [x] **3. Checkbox column** — first column of the queens table.
- [x] **4. Compare button** — page header next to existing actions. Label: `Compare (n)`. Disabled until 2+ selected. Routes to `/dashboard/queens/compare?ids=…`.
- [x] **5. Compare page scaffold** — `src/app/dashboard/queens/compare/page.tsx` created. Parses `?ids=`, caps at 4 with a warning banner, auto-redirects to the queens list with a toast if fewer than 2 are supplied. Time-window filter (All / 90 / 30) at the top.
- [x] **6. Data fetch** — single `useEffect` fetches queen rows and reports in parallel with `Promise.allSettled`. Per-queen errors degrade to stub columns. Stale-state guarded by a monotonic `requestIdRef`. Calls the standalone `fetchQueenReportData` directly so the page no longer needs `useQueenDetail`.
- [x] **7. QueenCompareTable** — six sections (Identity, Pedigree, Mating Site, Assignment, Trait Averages, Latest Inspection). Best-in-row highlight on trait rows; swarm tendency is direction-aware (lower is better). Ties leave no highlight.
- [x] **8. Empty / error states** — invalid ID → "Unavailable" stub column; no hive → "—"; trait rows show `n = 0` when no inspections; tied trait rows draw no highlight.
- [x] **9. Mobile polish** — table wrapped in `overflow-x-auto`, attribute column is sticky-left, headers have sensible `min-w-[…]` widths.
- [ ] **10. Manual test** — prompt user to test on mobile and desktop, light and dark modes.
- [x] **11. Docs** — this Review section + a Review section on the feature plan.

## Review

### What changed
- **`src/components/queens/queenTraitVisuals.tsx`** (new) — extracted `colorBadgeClass`, `TraitBar`, `formatRating` so the report tab and the compare table share one set of visuals (no behaviour drift between them).
- **`src/components/queens/QueenReportTab.tsx`** — refactored to import the shared visuals.
- **`src/hooks/useQueenDetail.ts`** — `fetchQueenReportData` lifted out of the hook as a module-level standalone async function. The hook still exposes it on its return as `fetchQueenReport` (now just a stable module reference, no `useCallback` needed). Non-hook callers can now import `fetchQueenReportData` directly without paying for an unused `useQueenDetail()` instance.
- **`src/app/dashboard/queens/page.tsx`** — checkbox column, `selectedIds` state with sessionStorage persistence under key `queen-compare-selection`, `Compare (n)` button, 4-queen cap with toast warning.
- **`src/app/dashboard/queens/compare/page.tsx`** (new) — comparison page. Parses `?ids=`, fetches everything in parallel, supports per-queen failure, stale-state guarded by `requestIdRef`.
- **`src/components/queens/QueenCompareTable.tsx`** (new) — columnar comparison table with direction-aware best-in-row highlighting and tie suppression.

### Design decisions
- **Standalone fetcher.** The compare page only needed the report query — instantiating the whole `useQueenDetail` hook just for one callback was wasteful. Lifting `fetchQueenReportData` to module level is the simplest fix and keeps the hook return shape unchanged for the queen detail page.
- **`requestIdRef` over `cancelled` flag.** A `let cancelled = false` closed over by the effect can't actually guard `setColumns` calls that happen inside an async helper that the effect kicks off — the helper runs to completion regardless. A monotonic ref bumped on every effect run lets every async checkpoint short-circuit cleanly.
- **`sessionStorage` for selection persistence.** Survives back-navigation within the same tab without leaking selection between tabs. Cleared on tab close, which is the right default for a transient comparison workflow.
- **4-queen cap.** Keeps the table readable on tablets and avoids parallel request fan-out. A toast fires if the user tries to add a fifth.
- **Direction-aware best-in-row.** Most traits are higher-is-better, but swarm tendency is lower-is-better. Encoded as `bestIs: 'high' | 'low'` per trait so the highlight rule stays declarative.
- **Ties leave no highlight.** Highlighting one tied value over another would mislead the user about the data.

### Test plan
- [ ] Select 2 queens → click Compare → see two-column table with all six sections.
- [ ] Select 4 queens → Compare → all four columns render.
- [ ] Try to select a 5th → toast warning, selection unchanged.
- [ ] Refresh the queens page → selection persists. Close tab and reopen → selection is cleared.
- [ ] Change time window on the compare page → trait averages update; latest inspection unchanged.
- [ ] Open a queen detail page from a column header → navigates correctly.
- [ ] Use the back button from a detail page → selection restored on the queens list.
- [ ] Pass `?ids=invalid-uuid,real-uuid` → invalid column shows "Unavailable" stub, real column renders.
- [ ] Pass `?ids=` with just 1 ID → toast and redirect to queens list.
- [ ] Test on mobile (table scrolls horizontally, attribute column is sticky).
- [ ] Test in dark mode.
