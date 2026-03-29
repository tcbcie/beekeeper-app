# Batch List Filters

## Problem

The batch list grows long over the years with no way to filter.

## Solution

Add two client-side filters above the batch list:
1. **Status filter** — All / Active / Completed
2. **Year filter** — All Years / specific years extracted from graft dates

### Implementation

- Two state variables: `filterStatus` and `filterYear`
- Compute available years from the `batches` array
- Filter `batches` before rendering in both mobile and desktop views
- Default to "Active" status and "All Years" so completed batches are hidden by default

### Files Changed

| File | Change |
|------|--------|
| `src/app/dashboard/batches/page.tsx` | Add filter state, filter bar UI, and apply filters to batch list |
