# Feature: Virgin Queen Tracker
**Date:** 05/03/2026
**Status:** Implemented

## 1. Overview
The Virgin Queen Tracker allows beekeepers to track the lifecycle of virgin queens distributed from rearing group batches. It tracks mating success, overwintering outcomes, and hybridisation status of offspring.

This feature supports conservation breeding programmes by providing visibility into:
- Distribution tracking (who received queens, when, and where)
- Mating confirmation status
- Overwintering success rates
- Hybridisation assessment of offspring

## 2. Scope & Simplicity
* **In Scope:**
  - Track queen cell, virgin queen, and mated queen distributions from group-linked batches
  - Record overwintering status (survived/failed/unknown)
  - Record hybridisation status of offspring (hybridised/pure/unknown)
  - Filter by group, year, and status
  - Summary statistics dashboard
  - Mobile-responsive card view + desktop table view

* **Out of Scope:**
  - Editing distribution recipient details (handled in batch grafts section)
  - Creating new distributions (handled in batch grafts/mating nucs)
  - Queen pedigree tracking (separate feature)

* **Existing Code Impact:**
  - `graft_distributions` table: Added 4 new columns
  - `src/app/dashboard/batches/page.tsx`: Replaced placeholder with component
  - New files: `useVirginQueenTracker.ts`, `VirginQueenTrackerTab.tsx`

## 3. Technical Design

### Architecture
The feature is implemented as a tab component on the Queen Rearing page (`/dashboard/batches`). It fetches distributions from batches linked to rearing groups the user is a member of.

### Database Schema Changes
Added to `graft_distributions` table:
```sql
overwintered BOOLEAN DEFAULT NULL
overwintered_date DATE DEFAULT NULL
offspring_hybridised BOOLEAN DEFAULT NULL
hybridisation_date DATE DEFAULT NULL
```

### Visibility Rules
- **Group members:** See their own distributions from group-linked batches
- **Group owners:** See all member distributions from their groups
- **Edit access:** Each user can update overwintering/hybridisation status

### Data Flow
1. Hook fetches user's group memberships
2. Hook fetches distributions from batches linked to those groups
3. Visibility filter applied: own distributions + group owner sees all
4. UI displays with filters and inline toggle updates

## 4. Edge Cases & Risks
* **No group membership:** Shows message prompting user to join/create a group
* **Empty results:** Graceful empty state with helpful message
* **Toggle race conditions:** Handled with optimistic update pattern
* **Date auto-population:** Dates set automatically when status toggled to Yes/No

## 5. Files Created/Modified

### New Files
- `src/hooks/useVirginQueenTracker.ts` - Data fetching and update logic
- `src/components/batches/VirginQueenTrackerTab.tsx` - UI component

### Modified Files
- `src/app/dashboard/batches/page.tsx` - Added import and component usage
- Database migration: `add_overwintered_and_hybridisation_tracking`

## 6. Usage

### Accessing the Tracker
1. Navigate to Queen Rearing (`/dashboard/batches`)
2. Click the "Virgin Queen Tracker" tab

### Filtering Data
- **Group:** Filter by specific rearing group (or view all)
- **Year:** Filter by distribution year (defaults to current year)
- **Status:** Filter by lifecycle status (Pending/Mated/Overwintered/Failed)

### Updating Status
- Click the toggle button to cycle through states: Unknown (?) → Yes → No → Unknown
- Dates are automatically recorded when status is set to Yes or No
- Dates are cleared when status is reset to Unknown

### Distribution Types
The tracker now shows all three distribution types with colour-coded badges:
- **Cell** (amber) — sealed queen cell, not yet emerged or mated
- **Virgin** (blue) — virgin queen, emerged but not yet mated
- **Mated** (green) — queen already mated at distribution time

### Mated Status Logic
A distribution is considered "mated" if either:
- `mating_confirmed = true` (explicitly confirmed via toggle), OR
- `distribution_type = 'mated_queen'` (queen was already mated at distribution time)

When a `mated_queen` distribution is created, `mating_confirmed` is automatically set to `true` with the distribution date as the confirmation date.

### Cell Queen → Mated Feedback
When a recipient marks a distributed cell queen as mated via the queen detail page ("Mark as Mated" action), the corresponding `graft_distributions` record is automatically updated with `mating_confirmed = true`, `mating_confirmed_date`, and `mating_location`. This feeds into:
- The Virgin Queen Tracker (mated badge appears)
- The NIHBS monthly report cell B26 (virgins externally mated count)

### Summary Statistics
The dashboard shows:
- Total distributions matching filters
- Mated count (mating confirmed or distributed as mated queen)
- Overwintered count (survived winter)
- Failed count (did not survive)
- Hybridised count (offspring show hybridisation)
