# Feature: Inspection Given/Taken Mobile Entry
**Date:** 14/03/2026
**Status:** Implemented

## 1. Overview
Improve the inspection `Given/Taken` section so beekeepers can record both additions and removals directly from mobile without fighting the browser's native number stepper. The section title has been simplified, signed values are accepted, and the saved record view now reflects negative adjustments correctly.

## 2. Scope & Simplicity
* **In Scope:** Rename the section heading, support negative values for the six given/taken fields, and replace the current mobile number entry with a more touch-friendly signed control inside the inspection form.
* **Out of Scope:** Broader inspection form redesign, changes to unrelated numeric controls, and any database migration unless a backend save failure proves one is necessary.
* **Existing Code Impact:** `src/components/records/forms/InspectionForm.tsx` for entry, `src/components/records/cards/InspectionCard.tsx` for display, and the task/documentation files for this change.

## 3. Technical Design
### Architecture
The change stays inside the inspection records flow. The form section now uses a touch-first signed-entry control for each field, with direct text entry, large `-` and `+` step buttons, and quick `-5`, `Clear`, and `+5` actions while preserving the existing `InspectionFormData` structure and submit path. The inspection card now renders non-zero adjustments with explicit signed values so removals remain visible after save.

### Database Connections (MCP Server)
No direct database query changes are planned. Inspection save behaviour already flows through the existing Supabase insert/update path in `src/app/dashboard/records/page.tsx`. The `public.inspections` given/taken columns were checked through the MCP database connection and are plain integer fields with default `0` and no matching signed-value `CHECK` constraints, so this change can stay in the UI and display layers unless a separate business rule surfaces.

## 4. Edge Cases & Risks
* Clearing a value should still resolve cleanly back to `0` rather than leaving `NaN` in form state.
* Negative entries must remain visible in the inspection card; otherwise users could save removals that appear to vanish.
* Mobile controls need to stay compact enough for six fields without making touch targets too small.

## 5. Implementation Phases
1. Phase 1: Rework the inspection form section to use a touch-friendly signed control and rename the section to `Given/Taken`.
2. Phase 2: Update the inspection record card and documentation so signed adjustments are shown and the change is documented.
