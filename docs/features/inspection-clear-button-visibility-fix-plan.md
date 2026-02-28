# Feature: Inspection Clear Button Visibility Fix
**Date:** 28/02/2026
**Status:** Implemented

## 1. Overview
Make the `Clear` controls in the inspection Behaviour Ratings row easier to notice and tap, while preserving the current compact form layout and interaction behaviour.

## 2. Scope & Simplicity
* **In Scope:** Visual and spacing updates for the `Clear` button used in `renderStarRating` within the inspection form.
* **Out of Scope:** Changes to rating value logic, database writes, shared button defaults, or other record forms.
* **Existing Code Impact:** `src/components/records/forms/InspectionForm.tsx` only.

## 3. Technical Design
### Architecture
The `Clear` control currently uses low-emphasis text-only styling, which can be overlooked beside star controls. Introduce a clearer secondary-button treatment (subtle filled background, visible border, stronger text weight, and minimum touch height) directly in `renderStarRating`.

Implemented detail:
* Updated the `renderStarRating` `Clear` button classes in `src/components/records/forms/InspectionForm.tsx`.
* Applied a compact secondary-button style with border, elevated background, stronger text weight, `min-h-[32px]`, and `touch-manipulation`.
* Preserved existing layout and behaviour while improving visual discoverability.

### Database Connections (MCP Server)
No database interaction is required. This is a presentation-only change.

## 4. Edge Cases & Risks
* Maintain readability and contrast in both light and dark themes.
* Keep label row alignment stable across responsive breakpoints.
* Avoid visual confusion with selected star states.

## 5. Implementation Phases
1. Phase 1: Update `Clear` button classes for improved prominence and touch usability.
2. Phase 2: Verify appearance and spacing consistency across all Behaviour rating tiles.
