# Overview Pages Refactoring

## Date: 2026-02-13

## Summary
Refactored all overview pages (Dashboard, Apiaries, Hives, Queens) to extract types and components, add at-a-glance information, and create new detail pages for apiaries and queens.

## Changes Implemented

### Phase 0: Type Extraction
- Created `src/types/apiary.ts` and `src/types/queen.ts`
- Extended `src/types/hive.ts` with Colony, HiveFormData, and additional fields
- All three listing pages now import from shared type files

### Phase 1: Dashboard Enhancements
- **5 stat cards**: Apiaries, Hives, Inspections (7d), Active Queens, Active Tasks
- **Quick Actions bar**: New Inspection, Log Feeding, Varroa Check, Add Treatment, Log Harvest, New Task
- **Attention Needed alerts**: Overdue inspections (14+ days), old queens (2+ years), high varroa (>3%)
- **Clickable recent activity**: Each item links to records page filtered by hive
- **Compact version footer**: Single-line muted text replacing the full card

### Phase 2: Apiaries Listing
- Extracted `ApiaryCard` component
- Each card shows hive count badge and colour-coded last inspection badge
- Summary bar: "X Apiaries | Y Total Hives"
- Apiary name links to new detail page

### Phase 3: Hives Listing
- Extracted `HiveListCard` component
- Days-since-inspection badge (green <7d, amber 7-14d, red 14+d, grey never)
- Summary bar: "X Active | Y Archived | Z Need Inspection (14+ days)"
- Sort dropdown: Default, Hive Number, Last Inspected, Status (persisted to sessionStorage)

### Phase 4: Queens Listing
- Summary bar: "X Active | Y Retired | Z Dead | Avg Age: N months"
- Age warning: Amber "Replace soon" badge for active queens > 2 years old
- Assignment filter: All / Assigned / Unassigned dropdown

### Phase 5: Apiary Detail Page
- New route: `/dashboard/apiaries/[id]`
- Header, info card (location, hive count, last inspection), quick actions, hives list, recent activity

### Phase 6: Queen Detail Page
- New route: `/dashboard/queens/[id]`
- Header with marking colour badge, age warning, info card (identity, genetics, assignment)
- Lineage tree, offspring list, queen sighting timeline from inspections
- Queen links throughout the app now point to detail page

### Phase 7: Form Extraction (Deferred)
- Forms remain in their page files due to tight coupling with page state

## Files

### New Files
- `src/types/apiary.ts`
- `src/types/queen.ts`
- `src/components/apiaries/ApiaryCard.tsx`
- `src/components/hive/HiveListCard.tsx`
- `src/hooks/useApiaryDetail.ts`
- `src/hooks/useQueenDetail.ts`
- `src/app/dashboard/apiaries/[id]/page.tsx`
- `src/app/dashboard/queens/[id]/page.tsx`

### Modified Files
- `src/types/hive.ts`
- `src/types/dashboard.ts`
- `src/hooks/useDashboardStats.ts`
- `src/hooks/index.ts`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/apiaries/page.tsx`
- `src/app/dashboard/hives/page.tsx`
- `src/app/dashboard/queens/page.tsx`
- `src/app/dashboard/hives/[id]/page.tsx`
- `src/components/hive/HiveListCard.tsx`
