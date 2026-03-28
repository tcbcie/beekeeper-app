# Task: QR Tags Page — Add Type and Assignment Filters

**Date:** 28/03/2026
**Status:** Complete

## Objective
Add filter controls to the QR Tags page so users can filter by tag type (Hive HC- / Nuc MN-) and assignment status (Assigned / Unassigned).

## Plan

- [x] 1. Add filter state (tagTypeFilter, assignedFilter) to QR Tags page
- [x] 2. Add filter bar UI with pill buttons between "My Tags" heading and the tag list
- [x] 3. Apply client-side filtering to both mobile cards and desktop table
- [x] 4. Show "No tags match" message when filters produce no results
- [x] 5. Show filtered count

## Review

### Changes Made
- **`src/app/dashboard/qr-tags/page.tsx`** — Added `tagTypeFilter` ('all' | 'hive' | 'nuc') and `assignedFilter` ('all' | 'assigned' | 'unassigned') state. Added filter bar with pill buttons below "My Tags" heading. Wrapped the My Tags section in an IIFE to compute `filteredTags` and render conditionally. Both mobile cards and desktop table now iterate `filteredTags`. Empty filter result shows a message. Filter count shown inline.
