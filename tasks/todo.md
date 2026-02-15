# Knowledge Base: Sort by Date & Filter Missing Attributes

## Problem
When a new article/source is added to the AI Knowledge Base, it's hard to find the last entry to edit its metadata. There's also no way to find entries that are missing attributes (author, year, URL).

## Plan

### Changes (all in `KnowledgeBaseManager.tsx`)

- [x] **1. Add `updated_at` to `KnowledgeSource` interface** — The API already returns it, the frontend just didn't use it.

- [x] **2. Replace column-header sorting with a "Sort by" dropdown** — Moved sorting from clickable column headers to a dropdown in the filter bar. Options: Name, Author, Year, Chunks, Recently Added, Recently Edited. Added a direction toggle button. Date sorts default to descending (newest first).

- [x] **3. Add "Missing Info" filter dropdown** — New dropdown with options: All Info, Any Missing Info, Missing Author, Missing Year, Missing URL.

- [x] **4. Highlight missing fields** — Amber text on "—" cells where author, year, or URL is missing.

- [x] **5. Clean up column headers** — Removed sort icons and click handlers from table headers (now plain text).

- [x] **6. Update feature docs** — Created `docs/features/knowledge-base-manager.md`.

### Files Changed
- `src/components/admin/KnowledgeBaseManager.tsx` (only file modified)
- `docs/features/knowledge-base-manager.md` (new)

## Review

### Summary of Changes

| Change | Detail |
|--------|--------|
| **Sort dropdown** | Replaced column-header click sorting with a "Sort by" dropdown in the filter bar. Added "Recently Added" (sorts by `created_at`) and "Recently Edited" (sorts by `updated_at`) options. Date sorts default descending. |
| **Missing info filter** | New dropdown: filter to entries missing author, year, URL, or any missing info. |
| **Amber highlights** | Missing author/year/URL cells show "—" in amber instead of grey, visible at a glance. |
| **Direction toggle** | Arrow button next to sort dropdown to flip ascending/descending. |
| **Clear all** | Updated to include `missingFilter` reset. Updated empty-results condition too. |
| **Removed** | `handleSort()`, `SortIcon` component, `ChevronUp`/`ChevronDown` imports (no longer needed). |

### No Breaking Changes
- All existing functionality works identically
- No API or database changes
- Table layout unchanged (still 6 columns)
