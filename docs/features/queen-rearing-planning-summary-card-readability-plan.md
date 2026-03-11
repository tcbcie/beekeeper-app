# Feature: Queen Rearing Planning Summary Card Readability
**Date:** 11/03/2026
**Status:** Implemented

## 1. Overview
Improve the top summary cards in the Queen Rearing `Planning` tab so the key dates are easier to scan at a glance. The current combined date-and-weekday strings wrap awkwardly, especially for planning ranges, which makes the feature feel less clear than the underlying timeline actually is.

## 2. Scope & Simplicity
* **In Scope:** Restructure the summary-card content for single dates and ranges, improve spacing and typography within those cards, and preserve the existing planner calculations.
* **Out of Scope:** Changing milestone offsets, adding new planner inputs, persisting scenarios, or redesigning the rest of the Queen Rearing interface.
* **Existing Code Impact:** Limited to `src/components/batches/QueenRearingPlanningTab.tsx` and the supporting Queen Rearing documentation.

## 3. Technical Design
### Architecture
Keep the planner data model as-is and only change how the top summary cards render it. Instead of showing one wrapped string such as `19/04/2026 | Sun to 22/04/2026 | Wed`, the cards should render the important parts as deliberate visual rows, for example by separating labels, dates, weekdays, and range boundaries into predictable blocks.

This should remain a presentation-only change:
- reuse the existing resolved planner dates
- introduce small display helpers or lightweight presentational markup where needed
- keep milestone calculations and state management untouched

### Database Connections (MCP Server)
No database access or schema changes are required. This is a client-side presentation refinement only.

## 4. Edge Cases & Risks
* Range cards must stay readable on narrower widths without creating uneven or broken wrapping.
* Single-date cards and range cards should still feel visually consistent with each other.
* The revised layout must preserve contrast and legibility in both light and dark themes.
* The change should not accidentally affect the lower milestone cards, which already rely on the current formatting helpers.

## 5. Implementation Phases
1. Phase 1: Isolate the top planner summary-card rendering and replace the wrapped string output with structured date presentation.
2. Phase 2: Adjust the summary-card layout and typography so the cards remain balanced and readable across breakpoints.
3. Phase 3: Update the Queen Rearing documentation to reflect the improved planner summary display.
