# Feature: Queen Rearing Planning Summary Snapshot Layout
**Date:** 11/03/2026
**Status:** Implemented

## 1. Overview
Refresh the top summary area of the Queen Rearing `Planning` tab so it behaves like a compact planning snapshot rather than a set of narrow interchangeable cards. The goal is to make the most important dates obvious at a glance and give planning ranges a cleaner, more deliberate visual structure.

## 2. Scope & Simplicity
* **In Scope:** Rework the top summary layout, differentiate single-date milestones from date-range windows, and improve readability across the current responsive widths.
* **Out of Scope:** Changing planner calculations, adding new planning inputs, redesigning the lower milestone cards, or altering database behaviour.
* **Existing Code Impact:** Limited to `src/components/batches/QueenRearingPlanningTab.tsx` and the supporting Queen Rearing documentation.

## 3. Technical Design
### Architecture
Keep the existing planner data as-is and change only the top summary presentation. Instead of rendering five equal cards, introduce a layout with clearer information hierarchy:
- compact anchor blocks for single dates such as graft, emergence, and drone start
- wider range treatments for mating flights and laying windows
- a responsive composition that avoids forcing dense nested content into narrow columns

This remains a presentation-only change:
- reuse the resolved planner dates already produced by the component
- keep the input controls and milestone sections intact
- introduce lightweight presentational helpers only where the refreshed layout needs them

### Database Connections (MCP Server)
No database access or schema changes are required. This remains a client-side presentation refresh only.

## 4. Edge Cases & Risks
* The refreshed summary must stay readable on the intermediate desktop widths where the previous layout failed.
* Single-date items and range items must feel related without pretending they are visually equivalent.
* The new hierarchy should improve scanning without making the summary section feel larger or heavier than the controls beside it.
* The refresh must not disturb the existing planner logic or the lower milestone cards.

## 5. Implementation Phases
1. Phase 1: Replace the current equal-card summary row with a clearer planning snapshot layout.
2. Phase 2: Refine spacing, typography, and responsive behaviour so the summary remains readable across widths.
3. Phase 3: Update the Queen Rearing documentation to describe the refreshed summary presentation.
