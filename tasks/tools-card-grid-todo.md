# Tools Page Reorganisation — Categorised Card Grid

## Tasks

- [x] 1. Add `ArrowLeft` to lucide-react imports
- [x] 2. Define `toolCategories` array with 4 groups (Calculators, Hive Health, Business, Utilities)
- [x] 3. Make `activeSection` nullable (`null` = landing grid)
- [x] 4. Update URL sync `useEffect` to handle `null` state
- [x] 5. Add `handleToolClick` and `handleBackToTools` navigation handlers
- [x] 6. Build the landing grid view (category headers + card grid)
- [x] 7. Add back navigation button to active tool view
- [x] 8. Remove old Quick Links section and tab navigation bar
- [x] 9. Remove old `sections` array

## Review

### Summary
All changes confined to a single file: `src/app/dashboard/tools/page.tsx`.

### What changed
- **Imports**: Added `ArrowLeft` from lucide-react (line 5)
- **State**: `activeSection` is now `ToolsSection | null` — defaults to `null` (landing grid) instead of `'feeding'`
- **URL sync**: The `useEffect` now sets `null` when no valid `?section=` param exists, showing the landing grid
- **Navigation handlers**: `handleToolClick(toolId)` pushes URL param and opens a tool; `handleBackToTools()` clears it and returns to the grid
- **Data structure**: Replaced flat `sections` array with `toolCategories` — 4 groups (Calculators, Hive Health, Business, Utilities), each tool has `id`, `label`, `description`, `icon`, and `type` ('inline' or 'link')
- **Landing grid**: When `activeSection === null`, renders category headers with a responsive card grid (`1 / 2 / 3 cols`). Cards use StatCard-style hover effects. Link-type tools (`<Link>`), inline tools (`<button>`)
- **Active tool view**: When `activeSection !== null`, shows a "Back to Tools" button (ArrowLeft icon, matching hive detail pattern) above the existing tool content — all tool rendering blocks are untouched
- **Removed**: Old Quick Links section (QR Tags + Report Wild Colony cards) and the tab navigation bar — both replaced by the card grid

### What stayed the same
- All tool component imports and their rendered content
- Feeding & fondant calculator inline code and state
- `ToolsSection` type
- Page header (Wrench icon + title + description)
- Auth check and loading spinner
- URL param bookmarks (`?section=feeding`) still work
