# Feature: Queen Rearing Planning Desktop Snapshot Overlap Refinement
**Date:** 11/03/2026
**Status:** Implemented

## 1. Overview
Refine the top snapshot area of the Queen Rearing `Planning` tab so it keeps the improved mobile readability while also remaining clean on desktop widths where the date ranges still crowd each other. The goal is to preserve the new hierarchy without allowing wide date strings, weekday chips, or supporting labels to overlap visually.

## 2. Scope & Simplicity
* **In Scope:** Adjust the desktop and intermediate-width layout of the top planning snapshot, simplify the internal alignment of the window cards and drone strip, and preserve the current mobile behaviour where it already reads well.
* **Out of Scope:** Changing the planner calculations, adding new timeline data, redesigning the lower milestone cards, or altering database behaviour.
* **Existing Code Impact:** Limited to `src/components/batches/QueenRearingPlanningTab.tsx` and the supporting Queen Rearing documentation.

## 3. Technical Design
### Architecture
Keep the existing snapshot concept but tighten the internal layout rules so the content cannot compete for the same horizontal space. This likely means letting dates and weekday markers align in a more predictable stack or dedicated sub-grid rather than relying on inline balancing inside relatively narrow panels.

This remains a presentation-only refinement:
- reuse the existing resolved planner dates
- preserve the current anchor-window-support hierarchy
- change only the layout and spacing rules of the top snapshot components

### Database Connections (MCP Server)
No database access or schema changes are required. This is a client-side layout refinement only.

## 4. Edge Cases & Risks
* The desktop fix must not degrade the mobile view that now reads well.
* Intermediate tablet and narrower desktop widths are the main failure range and need explicit attention.
* Date ranges with weekend chips must still fit cleanly when the badges are present.
* The refinement should stay restrained and not become another full redesign of the `Planning` tab.

## 5. Implementation Phases
1. Phase 1: Tighten the desktop structure of the snapshot window cards and drone strip so overlap cannot occur.
2. Phase 2: Adjust spacing, alignment, and breakpoints to keep the snapshot stable across desktop and tablet widths.
3. Phase 3: Update the Queen Rearing documentation to reflect the refined snapshot layout.
