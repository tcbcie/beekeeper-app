# Protect Queen Lineage Data from Deletion

## Tasks
- [x] 1. Add `statusFilter` state (default `'active'`) to the queens page
- [x] 2. Add status filter logic to `filteredQueens` — filter by status before assignment filter
- [x] 3. Add status filter dropdown (Active / Retired / Dead / All) to the filter bar UI
- [x] 4. Replace `handleDelete` with lineage-aware version — check for offspring before allowing delete
- [x] 5. Update `docs/features/queen-lineage.md` with lineage protection notes

## Review

### Files Changed
- `src/app/dashboard/queens/page.tsx` — added status filter + lineage-aware delete
- `docs/features/queen-lineage.md` — added Lineage Protection section

### Summary of Changes
1. **Status filter state**: Added `statusFilter` useState (defaults to `'active'`)
2. **Filter logic**: One line added to `filteredQueens` — skips queens whose status doesn't match the filter
3. **Status dropdown**: New `<select>` added before the assignment filter, same styling — options: Active, Retired, Dead, All Statuses
4. **Lineage-aware delete**: `handleDelete` now queries for offspring count before allowing delete. If offspring exist, shows a warning toast with the count and suggests retirement. If no offspring, shows confirm dialog then success/error toast. Also catches other FK errors with a fallback error toast.
5. **Docs**: Added "Lineage Protection" section to `docs/features/queen-lineage.md`

### What Didn't Change
- No database migrations
- No changes to QueenLineageTree component
- No changes to queen types or hooks
- No changes to queen detail page
