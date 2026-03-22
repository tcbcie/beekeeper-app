# Queen Lineage Enhancement

## Investigation Findings

### Current State
- `QueenLineageTree` component shows queen_number, marking_colour, and status only
- No hive number or apiary info displayed on any queen card in the lineage
- No overall lineage visualisation page exists — lineage is only per-queen (detail + edit pages)
- Queen cards in lineage tree are NOT clickable (can't navigate to a queen)
- Grandparents/great-grandparents only traced through maternal line (by design)

### Inconsistencies Found
1. **Missing location context**: Lineage cards lack hive/apiary info, making it hard to know where each queen lives
2. **No navigability**: Can't click a queen in the lineage tree to view her detail page
3. **No overview**: No way to see all lineage trees at a glance by user, apiary, or hive
4. **Daughters/siblings lack hive info**: Only queen_number and colour shown for children and sisters

### Data Model (confirmed from DB)
- Real lineage chains exist: e.g. `1B → 36-DA → 8B, 9B, 14B, 15B` and `37-D → 29-DA, 30-DA`
- `UGMul1.6x → 7B` is another lineage chain
- Hive/apiary data available via `hives.queen_id` → `apiaries`

## Tasks

### Part 1: Add Hive Number & Apiary to Lineage Cards
- [x] 1. Extend `QueenNode` interface with `hive_number?` and `apiary_name?`
- [x] 2. Update main queen + mother/father query to join hives and apiaries
- [x] 3. Update grandparent/great-grandparent queries to join hives and apiaries
- [x] 4. Update children + siblings queries to join hives and apiaries
- [x] 5. Update `QueenCard` component to display hive number and apiary name
- [x] 6. Make queen cards clickable (link to queen detail page)

### Part 2: Overall Lineage Visualisation Page
- [x] 7. Create `/dashboard/queens/lineage` page
- [x] 8. Fetch all queens with lineage relationships for current user
- [x] 9. Build tree(s) showing full lineage chains with hive/apiary context
- [x] 10. Add filtering by apiary
- [x] 11. Add navigation link from queens list page to lineage overview

### Part 3: Documentation
- [x] 12. Update `docs/features/queen-lineage.md` with new features

## Review

### Changes Made

**`src/components/QueenLineageTree.tsx`** (per-queen lineage tree):
- Added `hive_number` and `apiary_name` to `QueenNode` interface
- Added `extractQueenNode()` helper to safely extract hive/apiary from Supabase join results (handles array/object ambiguity)
- Updated all 7 Supabase queries to join `hives!queen_id(hive_number, apiaries(name))`
- Updated `QueenCard` to show hive number and apiary below queen number
- Made all non-current queen cards clickable links to their detail pages
- Daughters and siblings cards also show hive/apiary and are clickable

**`src/app/dashboard/queens/lineage/page.tsx`** (new page):
- New lineage overview page showing all family trees for the current user
- Collapsible tree visualisation with indented branches and connector lines
- Each queen node shows: queen number, colour badge, status, hive, apiary, daughter count
- All nodes are clickable links to queen detail pages
- Apiary dropdown filter that includes full lineage chains (ancestors + descendants)
- Summary stats: number of lineages and total queens
- Back button to queens list

**`src/app/dashboard/queens/page.tsx`**:
- Added "Lineage" button with GitBranch icon next to Export CSV button

**`docs/features/queen-lineage.md`**:
- Updated to document all new features including hive/apiary display, clickable cards, and overview page
