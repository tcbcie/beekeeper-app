# Feature: Queen Rearing Planning Desktop Dark Layout Reset
**Date:** 11/03/2026
**Status:** Implemented

## 1. Overview
Reset the top desktop presentation of the Queen Rearing `Planning` tab so the dark-mode version feels intentionally designed rather than partially inverted. The issue is now architectural at the layout level: the desktop planner still shows a pale outer shell, low-contrast copy, and pastel snapshot cards that do not sit comfortably in dark theme.

## 2. Scope & Simplicity
* **In Scope:** Rework the desktop dark-mode treatment of the top planning band, including the outer shell, snapshot panel, summary cards, right-hand control panel, and the shared surfaced card language those sections use.
* **Out of Scope:** Changing planner calculations, altering date offsets, or modifying any persistence behaviour.
* **Existing Code Impact:** Limited to `QueenRearingPlanningTab.tsx` and the supporting Queen Rearing documentation.

## 3. Technical Design
### Architecture
Keep the existing planner data flow and state exactly as they are, but replace the current mixed-theme desktop shell with a more coherent dark-first composition. The implementation should focus on:
- a unified top container that reads as a single desktop module in dark mode
- stronger hierarchy between the narrative intro, the snapshot, and the control panel
- snapshot cards that use surfaced dark panels with restrained accent borders or badges instead of large pastel fills
- clearer typography and contrast so the heading, supporting copy, and date blocks remain readable at desktop widths

This remains a presentation-only refinement:
- reuse the current planner logic and components where possible
- keep the current mobile behaviour unless a small adjustment is needed for consistency
- update only the classes and structure needed to restore desktop visual coherence

### Database Connections (MCP Server)
No database access or schema changes are required. This is a client-side layout and theme refinement only.

## 4. Edge Cases & Risks
* The reset must improve desktop dark mode without regressing the mobile presentation that now reads acceptably.
* Snapshot cards still need enough accent separation to distinguish anchor dates, planning windows, and drone timing without falling back to pale fills.
* The control panel and snapshot should feel related rather than like two unrelated cards side by side.
* Invalid-date handling and the existing planner behaviour must remain untouched.

## 5. Implementation Phases
1. Phase 1: Audit the top desktop planner band for shell, contrast, and hierarchy issues in dark mode.
2. Phase 2: Recompose the desktop shell and snapshot cards into a coherent dark-first layout while preserving the existing planner logic.
3. Phase 3: Update the Queen Rearing documentation to reflect the desktop dark-layout reset.
