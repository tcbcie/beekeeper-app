# Queen Lineage Tree

## Overview
Displays a visual family tree for any queen, showing ancestors, daughters, and sisters. Each queen card shows hive number and apiary name for location context.

## Location
- **Queens list page** (`/dashboard/queens`) - shown below the edit form when editing an existing queen
- **Queen detail page** (`/dashboard/queens/[id]`) - collapsible section
- **Lineage overview page** (`/dashboard/queens/lineage`) - full overview of all lineage trees, accessible via the `Lineage` button on the queens list

## Components
- `src/components/QueenLineageTree.tsx` - per-queen lineage tree (ancestors and descendants)
- `src/hooks/useQueenDetail.ts` - queen detail hook that resolves parent summaries for the detail page
- `src/app/dashboard/queens/lineage/page.tsx` - overview page showing all lineage families

## Data Model
Lineage is tracked via self-referencing foreign keys on the `queens` table:
- `mother_id` (uuid, nullable) - references `queens.id`
- `father_id` (uuid, nullable) - references `queens.id`

The free-text `lineage` column stores human-readable breeding notation (for example `RZ018=.25-RZ026xSTD(CG)`).

## Lineage Integrity
- Parent summaries in the detail page and lineage tree are fetched directly from the stored `mother_id` and `father_id` values.
- The queen create/edit form hides any parent option that would make the edited queen its own ancestor or descendant.
- If repeated lineage links are already present in stored data, the UI shows a warning and hides the repeated branch instead of rendering misleading duplicate ancestry.
- The database currently uses self-referencing foreign keys without a built-in cycle constraint, so the client still enforces lineage safety in the form and tree rendering paths.

## Per-Queen Lineage Tree

### What It Displays
1. **Great-grandparents** (maternal line only)
2. **Grandparents** (maternal line only)
3. **Parents** - mother and father
4. **Current queen** - highlighted with crown icon
5. **Daughters** - queens where `mother_id` = current queen (up to 6 shown)
6. **Sisters** - queens with the same `mother_id` (up to 5 shown)

Each queen card shows:
- Queen number and marking colour badge
- Status (if not active)
- **Hive number** and **apiary name** (if assigned)
- Cards are **clickable** - navigate to the queen's detail page

Unknown ancestors show an `Unknown` placeholder card.

## Lineage Overview Page

### Features
- Shows all lineage family trees for the current user
- Each family starts from a root queen (matriarch) and shows all descendants in a collapsible tree
- **Apiary filter** - filter lineage trees to show only families with queens in a specific apiary
- Summary statistics: number of lineages and total queens
- All queen nodes are clickable links to their detail pages
- If a lineage loop leaves a family with no natural root, the overview starts a fallback tree from one of the affected queens so the family stays visible

### Tree Display
- Root queens shown with crown icon
- Indented child branches with connector lines
- Collapsible and expandable nodes
- Daughter count shown on each queen with offspring

## Lineage Protection
Queens with offspring (referenced via `mother_id` or `father_id`) are protected from deletion:
- **Delete attempt**: A pre-flight query counts offspring. If any exist, a warning toast is shown with the count and a suggestion to retire the queen instead. The delete is blocked.
- **No offspring**: The standard confirm dialog is shown, followed by a success or error toast.
- **Status filter**: The queens list defaults to showing only `Active` queens. Retired and dead queens are hidden by default but can be viewed via the status filter dropdown (`Active` / `Retired` / `Dead` / `All`). This keeps the list uncluttered while preserving lineage data.

## Technical Notes
- Parent summaries in lineage and detail views use direct `queens.id` lookups instead of embedded self-joins
- Hive and apiary data is still joined via `hives!queen_id(hive_number, apiaries(name))`
- `extractQueenNode()` handles Supabase returning non-self joins as arrays or objects
- `QueenLineageTree` ignores stale async responses if the user switches queens or collapses the panel during a fetch
- `useQueenDetail()` clears derived hive and sighting state before applying a new queen response
- The lineage overview clones branch-level visited state so repeated lineage links are skipped safely without dropping the rest of the tree
- RLS access is controlled by `can_access_queen()` function (SECURITY DEFINER)
- Error state is displayed to the user if the query fails
