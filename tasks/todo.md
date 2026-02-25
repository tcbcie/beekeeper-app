# Fix Queen Lineage Tree Not Showing Data

## Problem
The Queen Lineage tree on the queens page shows "No lineage data available" even when a queen has valid mother/offspring relationships in the database. E.g., queen 36-DA has mother 1B and 4 daughters (8B, 9B, 14B, 15B), but the lineage tree shows nothing.

## Root Cause Analysis
The `QueenLineageTree` component's Supabase query uses FK constraint name hints (`queens!queens_mother_id_fkey`) for self-referencing joins, while the **working** `useQueenDetail` hook uses column name hints (`queens!mother_id`). The query fails silently — the error is caught and logged to console only, leaving the `lineage` state as `null`, which renders the "No lineage data available" message.

## Tasks

- [x] 1. Fix the Supabase query in `QueenLineageTree.tsx` to use column name FK hints
- [x] 2. Add user-visible error state to QueenLineageTree so failures aren't silent
- [ ] 3. Prompt user to test the fix
- [x] 4. Update/create feature documentation in docs/features

## Files Changed
- `src/components/QueenLineageTree.tsx` — fixed query + added error state

## Review

### Changes Made
1. **Fixed self-referencing join hints** in `QueenLineageTree.tsx`:
   - `queens!queens_mother_id_fkey(...)` → `queens!mother_id(...)`
   - `queens!queens_father_id_fkey(...)` → `queens!father_id(...)`
   - This matches the working pattern used in `useQueenDetail.ts`

2. **Added error visibility**: New `error` state shows a red error message to the user instead of the misleading "No lineage data available" when the query fails.

3. **Created feature documentation**: `docs/features/queen-lineage.md`

### Impact
- Only `QueenLineageTree.tsx` modified — minimal change, 3 lines of query syntax + ~5 lines for error handling
- No database changes required
- No changes to other components
