# Queen Tracker Expanded Details — Compact Redesign

**Date:** 02/04/2026
**Status:** Complete

## Goal
Tidy up the expanded row details in the Queen Tracker tab. The information is reference-only and should be easy to follow and synthesise, not "visually" presented. Make it compact and logically grouped.

## Plan

- [x] 1. Replace `CompactFactCard` row with a simple inline key:value list (no bordered cards)
- [x] 2. Replace `TrackerPanel` wrappers with lightweight section headers (simple text dividers, no icon circles)
- [x] 3. Merge Breeding Context + Distribution Reference into a single compact key:value grid
- [x] 4. Compact the Outcomes read-only display into a tighter layout
- [x] 5. Tighten the Update Outcome Details form — less spacing and visual weight
- [x] 6. Prompt user to test visually

## Review

### Changes Made
- **`src/components/batches/QueenTrackerTab.tsx`**:
  - Removed `CompactFactCard` component — replaced with inline `DetailItem` key:value pairs
  - Removed `TrackerPanel` component (icon circle headers) — replaced with `SectionHeading` (simple underlined text)
  - Removed `DetailSection` component — no longer needed
  - Removed unused imports (`Package2`, `Sprout`, `ComponentType`)
  - `DetailItem` changed from stacked label-over-value to inline `label  value` using flexbox baseline alignment
  - Merged "Breeding Context" and "Distribution Reference" into a single "Reference" section with a 2-column key:value grid
  - Outcomes read-only notice simplified from bordered card to a single line of text
  - "Update outcome details" form: reduced from bordered card to a simple border-top divider, tighter spacing
  - `OutcomeDateField`: reduced padding (`py-2` → `py-1.5`), rounded-xl → rounded-lg, smaller disabled message text
  - `OutcomeCommentField`: textarea rows reduced from 3 → 2, same spacing/padding reductions
  - Notes field only shown when notes exist (no empty "-" row)
