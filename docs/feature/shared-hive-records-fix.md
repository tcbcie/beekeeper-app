# Fix: Shared Hive Records Not Visible to Team Members

## Problem
When user `rico.zmarzly@sensiblemail.net` shares an apiary (Meadowbrook) containing hive H3 with user `rico.zmarzly@gmail.com` via SensibleTeam, the gmail user cannot see any records against H3.

## Root Cause
The database RLS is correct - `can_access_hive` returns TRUE and a simulated query returns all 10 inspections. The bug is in the **frontend records page** (`/dashboard/records`).

### Bug 1: Default ownership filter excludes shared records
- Default `ownershipFilter` is `'my'` (`useRecordFilters.ts:59`)
- `fetchAllData` is called with `'my'` on page load
- Only records for the user's OWN hives are fetched
- H3 records are never loaded because H3 is a shared hive

### Bug 2: Ownership filter change only refetches inspections
- `records/page.tsx:153-159` - the ownership filter change effect only calls `fetchInspections`
- Other record types (treatments, checks, feedings, harvests) are NOT refetched
- Switching to 'team' or 'all' only updates inspections, not other record types

## Fix Plan

### Task 1: Refetch ALL record types when ownership filter changes
**File:** `src/app/dashboard/records/page.tsx` (lines 153-159)
**Change:** Replace `fetchInspections` with `fetchAllData` so all record types are refetched when the ownership filter changes.

### Task 2: Auto-detect shared hive from URL params and set correct ownership filter
**File:** `src/app/dashboard/records/page.tsx` (lines 253-274)
**Change:** When a `hive` URL param points to a shared hive (not owned by current user), auto-set the ownership filter to `'all'` so the records are loaded.

## Files Impacted
- `src/app/dashboard/records/page.tsx` - two small changes

## Status: IMPLEMENTED

Both fixes applied to `src/app/dashboard/records/page.tsx`. Awaiting user testing.

## Notes
- The hive detail page (`/dashboard/hives/[id]`) uses `useHiveDetail` which fetches records with just `.eq('hive_id', hiveId)` and relies on RLS - this should work correctly
- The `can_access_hive` function is `SECURITY DEFINER` and correctly grants access for team members
