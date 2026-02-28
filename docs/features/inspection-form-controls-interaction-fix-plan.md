# Feature: Inspection Form Controls Interaction Fix
**Date:** 28/02/2026
**Status:** Implemented

## 1. Overview
Ensure all interactive controls in the Records inspection form provide clear visual feedback and reliable state updates when selected. This removes the current mismatch where clicks can occur but custom selected styles are overridden, making controls appear non-functional.

## 2. Scope & Simplicity
* **In Scope:** Add a controlled `unstyled` option to the shared button component and use it in the inspection form for controls that already define their own full visual styles.
* **Out of Scope:** Database schema/query changes, record submission logic changes, and redesign of non-inspection forms.
* **Existing Code Impact:** Limited to `src/components/ui/Button.tsx` and `src/components/records/forms/InspectionForm.tsx`.

## 3. Technical Design
### Architecture
The shared `Button` component currently applies neutral base styling by default. Inspection form controls already provide explicit Tailwind classes for selected/unselected states. Add an `unstyled` prop so inspection controls can opt out of base `fj-btn`/tone classes, preventing style conflicts while keeping existing button behaviour unchanged elsewhere.

Implemented detail:
* Added `unstyled?: boolean` to `src/components/ui/Button.tsx` with a backwards-compatible default of `false`.
* Applied `unstyled` to every custom-styled `Button` within `src/components/records/forms/InspectionForm.tsx` so control-state classes render correctly.

### Database Connections (MCP Server)
No database interactions are required for this fix. Submission payloads and Supabase writes remain unchanged.

## 4. Edge Cases & Risks
* Buttons with custom class-driven states must keep `type="button"` where appropriate to avoid accidental form submission.
* `unstyled` must not alter existing buttons unless explicitly set, to avoid regressions in unrelated screens.
* Control states using `0`, `null`, and boolean values must continue to map to the same payload values on submit.

## 5. Implementation Phases
1. Phase 1: Add `unstyled` support in shared `Button` component with backwards-compatible defaults.
2. Phase 2: Apply `unstyled` to all custom-styled controls in `InspectionForm` and verify consistent visual feedback across all inspection controls.
