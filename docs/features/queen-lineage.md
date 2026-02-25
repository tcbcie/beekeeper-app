# Queen Lineage Tree

## Overview
Displays a visual family tree for any queen, showing ancestors (up to great-grandparents), daughters, and sisters.

## Location
- **Queens list page** (`/dashboard/queens`) — shown below the edit form when editing an existing queen
- **Queen detail page** (`/dashboard/queens/[id]`) — collapsible section

## Component
`src/components/QueenLineageTree.tsx`

## Data Model
Lineage is tracked via self-referencing foreign keys on the `queens` table:
- `mother_id` (uuid, nullable) — references `queens.id`
- `father_id` (uuid, nullable) — references `queens.id`

The free-text `lineage` column stores human-readable breeding notation (e.g., `RZ018=.25-RZ026xSTD(CG)`).

## What It Displays
1. **Great-grandparents** (maternal line only)
2. **Grandparents** (maternal line only)
3. **Parents** — mother and father
4. **Current queen** — highlighted with crown icon
5. **Daughters** — queens where `mother_id` = current queen (up to 6 shown)
6. **Sisters** — queens with the same `mother_id` (up to 5 shown)

Unknown ancestors show an "Unknown" placeholder card. Queens are colour-coded by marking colour (international standard).

## Technical Notes
- Self-referencing Supabase joins use **column name hints** (`queens!mother_id`, `queens!father_id`) — not FK constraint name hints
- RLS access is controlled by `can_access_queen()` function (SECURITY DEFINER)
- Error state is displayed to the user if the query fails
