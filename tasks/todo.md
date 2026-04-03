# Queen Tracker Table Layout Improvements

**Date:** 03/04/2026
**Status:** Complete

## Plan

- [x] 1. Remove Details column — make cell name clickable to expand/collapse with chevron
- [x] 2. Compact action buttons — icon-only toggles in a single row with tooltips
- [x] 3. Status column — show only lifecycle badge, drop distribution type badge
- [x] 4. Fix "Age Future date" bug in calculateQueenAge
- [x] 5. Move summary count inline with filters, remove separate Ledger Summary section
- [x] 6. Verify row height reduction (natural result of #1, #2, #3)

## Review

### Changes Made

1. **Details column removed** — Queen name is now clickable with a chevron icon to expand/collapse details. Merged into the Queen td cell. Fixed `queenSecondaryLabel` variable scoping bug (was referencing a local variable instead of `distribution.queen_secondary_label`). Updated `colSpan` from 5 to 4 on expanded rows. Table min-width reduced from 66rem to 48rem.

2. **Action buttons compacted** — Replaced the labelled 2x2 `ThreeStateActionButton` grid with a single row of `OutcomeActionIcon` circular icon buttons (Check, Snowflake, GitMerge, X). Each button is 28px with a tooltip showing state.

3. **Status column simplified** — Removed the `display_type_label` badge. Only the `lifecycle_label` badge is now shown (e.g. "Cell Stage", "Mated", "Overwintered", "Failed").

4. **Age bug fixed** — `calculateQueenAge` now returns "Not yet emerged" instead of "Future date" for queens with birth dates in the future.

5. **Summary moved inline** — Removed the separate collapsible "Ledger Summary" section and its `SummaryPill` components. Summary counts are now displayed as compact coloured-dot labels inline with the filter section header. Removed `isSummaryExpanded` state.

6. **Row height reduced** — Natural result of removing the Details column, compacting action buttons to icon-only, and removing the distribution type badge from Status.

### Cleanup
- Removed unused `ThreeStateActionButton` component
- Removed unused `SummaryPill` component
- Removed unused `HelpCircle` import from lucide-react
