# Overview Pages Refactoring - Task List

## Phase 0: Type Extraction (Foundation)

- [x] Create `src/types/apiary.ts` — Extract `Apiary`, `ApiaryFormData`, `UserOption` from apiaries page
- [x] Create `src/types/queen.ts` — Extract `Queen`, `QueenFormData`, `Batch` from queens page, plus `getQueenColorFromYear` and `calculateQueenAge` utilities
- [x] Extend `src/types/hive.ts` — Add `Colony`, `HiveFormData` from hives page + missing fields
- [x] Update apiaries page to import from `src/types/apiary.ts`
- [x] Update hives page to import from `src/types/hive.ts`
- [x] Update queens page to import from `src/types/queen.ts`

## Phase 1: Dashboard Enhancements

- [x] 1a. Add queen count and active tasks count to `useDashboardStats` + `DashboardStats` type + 2 new stat cards
- [x] 1b. Add Quick Actions bar below stats (pill buttons linking to key actions)
- [x] 1c. Add Attention Needed alerts (overdue inspections, old queens, high varroa)
- [x] 1d. Make Recent Activity items clickable (link to records)
- [x] 1e. Compact version footer (single-line muted text)

## Phase 2: Apiaries Listing Improvements

- [x] 2a. Extract `ApiaryCard` component from apiaries page
- [x] 2b. Add hive count + last inspection date per apiary card
- [x] 2c. Add summary stats bar ("X Apiaries | Y Total Hives")

## Phase 3: Hives Listing Improvements

- [x] 3a. Extract `HiveListCard` component from hives page
- [x] 3b. Add days-since-inspection colour-coded badge to HiveListCard
- [x] 3c. Add summary stats bar ("X Active | Y Archived | Z Need Inspection")
- [x] 3d. Add sort dropdown (Default, Hive Number, Last Inspected, Status)

## Phase 4: Queens Listing Improvements

- [x] 4a. Add summary stats bar ("X Active | Y Retired | Z Dead | Avg Age")
- [x] 4b. Add age warning indicator for queens > 2 years old
- [x] 4c. Add assigned/unassigned filter dropdown

## Phase 5: Apiary Detail Page

- [x] 5a. Create `useApiaryDetail` hook (fetch apiary, hives, records, stats)
- [x] 5b. Create apiary detail page `src/app/dashboard/apiaries/[id]/page.tsx`
- [x] 5c. Link ApiaryCard name to detail page (done in Phase 2)

## Phase 6: Queen Detail Page

- [x] 6a. Create `useQueenDetail` hook (fetch queen, hive, lineage, offspring, sightings)
- [x] 6b. Create queen detail page `src/app/dashboard/queens/[id]/page.tsx`
- [x] 6c. Link queen number in listings to detail page (queens page, hive detail, HiveListCard)

## Phase 7: Extract Forms (Optional, Lowest Priority)

- [ ] 7a. Extract `ApiaryForm` component — DEFERRED (complex due to map picker + image upload + geocoding)
- [ ] 7b. Extract `HiveForm` component — DEFERRED (complex due to configuration section)
- [ ] 7c. Extract `QueenForm` component — DEFERRED (complex due to lineage tree integration)

---

## Review

### Summary of Changes

**New Files Created (10):**
- `src/types/apiary.ts` — Apiary, ApiaryFormData, UserOption types
- `src/types/queen.ts` — Queen, QueenFormData, Batch types + colour/age utility functions
- `src/components/apiaries/ApiaryCard.tsx` — Extracted apiary card with hive count + inspection badges
- `src/components/hive/HiveListCard.tsx` — Extracted hive listing card with inspection badge
- `src/hooks/useApiaryDetail.ts` — Data hook for apiary detail page
- `src/hooks/useQueenDetail.ts` — Data hook for queen detail page
- `src/app/dashboard/apiaries/[id]/page.tsx` — Apiary detail page
- `src/app/dashboard/queens/[id]/page.tsx` — Queen detail page

**Modified Files (9):**
- `src/types/hive.ts` — Extended with Colony, HiveFormData, additional Hive fields
- `src/types/dashboard.ts` — Added queens/activeTasks to DashboardStats, AttentionAlerts interface, hive_id to Inspection
- `src/hooks/useDashboardStats.ts` — Added queen count, task count, attention alerts queries
- `src/hooks/index.ts` — Added useApiaryDetail, useQueenDetail exports
- `src/app/dashboard/page.tsx` — 5 stat cards, quick actions, attention alerts, clickable activity, compact footer
- `src/app/dashboard/apiaries/page.tsx` — Uses ApiaryCard, hive count enrichment, summary bar
- `src/app/dashboard/hives/page.tsx` — Uses HiveListCard, sort dropdown, summary bar
- `src/app/dashboard/queens/page.tsx` — Summary stats, age warning, assignment filter, clickable queen numbers
- `src/app/dashboard/hives/[id]/page.tsx` — Queen link points to detail page

### Key Decisions
- **Deferred Phase 7** (Form Extraction): Forms are deeply coupled with page state (geocoding, map picker, image upload, configuration section). Extracting risks introducing bugs with minimal benefit. Can be tackled in a future refactoring pass.
- **Overdue inspection count** (dashboard alerts): Implemented client-side by comparing active hive IDs against recent inspection hive IDs, avoiding the need for a new DB function.
- **Queen links**: Changed from query-param based (`?id=`) to proper detail page routes (`/queens/[id]`).

### Testing Checklist
- [ ] Dashboard: 5 stat cards load with correct counts
- [ ] Dashboard: Quick action links navigate correctly
- [ ] Dashboard: Attention alerts appear when data warrants (overdue inspections, old queens, high varroa)
- [ ] Dashboard: Recent activity items are clickable
- [ ] Dashboard: Compact version footer displays correctly
- [ ] Apiaries: Cards show hive count and last inspection badges
- [ ] Apiaries: Summary bar shows correct counts
- [ ] Apiaries: Clicking apiary name navigates to detail page
- [ ] Apiary Detail: Back button, hive list, recent activity all work
- [ ] Hives: Cards show days-since-inspection badges (green/amber/red)
- [ ] Hives: Summary bar shows active/archived/need inspection counts
- [ ] Hives: Sort dropdown works and persists to sessionStorage
- [ ] Hives: Edit, delete, unarchive, context menu all work
- [ ] Queens: Summary stats bar shows correct counts
- [ ] Queens: Age warning badge appears for queens > 2 years old
- [ ] Queens: Assignment filter (All/Assigned/Unassigned) works
- [ ] Queens: Clicking queen number navigates to detail page
- [ ] Queen Detail: All sections load (info, lineage tree, offspring, sightings)
- [ ] All pages: Mobile responsive
- [ ] All pages: Dark mode
- [ ] All pages: Existing CRUD operations still work
