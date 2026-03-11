# Feature: Queen Rearing Planning Dark Mode Alignment
**Date:** 11/03/2026
**Status:** Implemented

## 1. Overview
Align the Queen Rearing `Planning` tab with the rest of the application’s dark theme so the planner feels intentionally designed in both light and dark modes. The current issue is not the overall structure of the tab, but the fact that several nested cards, chips, and accent treatments still carry light-theme assumptions into dark mode.

## 2. Scope & Simplicity
* **In Scope:** Refine the dark-mode colours and surface treatments of the planning snapshot, nested date panels, badges, and related supporting sections inside `QueenRearingPlanningTab`.
* **Out of Scope:** Changing planner calculations, adding new planner features, redesigning the information hierarchy again, or altering database behaviour.
* **Existing Code Impact:** Limited to `src/components/batches/QueenRearingPlanningTab.tsx` and the supporting Queen Rearing documentation.

## 3. Technical Design
### Architecture
Keep the current planner structure and adjust only its theme tokens and utility classes so the dark-mode palette is coherent throughout the tab. This should focus on:
- nested white surfaces that need dark-theme equivalents
- accent badges whose light-mode text or fills are too bright or mismatched in dark mode
- supporting cards and chips that currently feel disconnected from the surrounding dark canvas

This remains a presentation-only refinement:
- reuse the existing component structure and planner data
- preserve the current layout hierarchy
- change only the theme-specific class combinations needed for consistent dark rendering

### Database Connections (MCP Server)
No database access or schema changes are required. This is a client-side theme refinement only.

## 4. Edge Cases & Risks
* The dark-mode refinement must not degrade the current light-mode presentation.
* Accent colours need to remain distinguishable without becoming harsh or fluorescent in dark theme.
* Nested surfaces must preserve enough contrast to read clearly without looking like disconnected white cards on a dark background.
* The refinement should stay local to the `Planning` tab and not trigger another broad visual redesign.

## 5. Implementation Phases
1. Phase 1: Audit the current `Planning` snapshot and supporting sections for incomplete dark-theme styling.
2. Phase 2: Update the theme classes so nested cards, badges, and supporting surfaces render coherently in dark mode.
3. Phase 3: Update the Queen Rearing documentation to reflect the dark-mode alignment of the planner.
