# Task: Auto-Populate Mating Location on Distribute

**Date:** 28/03/2026
**Status:** Complete

## Objective
When distributing a graft with status `mated` (or from a nuc with queen status `laying`/`mating`), auto-populate the mating location field from existing records instead of requiring manual entry.

## Plan

- [x] 1. Add `defaultMatingLocation` prop to `DistributeGraftModal` and use it to initialise state
- [x] 2. Pass `distributeNuc.mating_location` from `MatingNucsTab` to modal
- [x] 3. Thread batch mating apiary name from `batches/page.tsx` → `BatchGraftsSection` → modal
- [x] 4. Update feature documentation

## Review

### Changes Made

- **`src/components/batches/DistributeGraftModal.tsx`**
  - Added optional `defaultMatingLocation?: string` prop to interface
  - Destructured it in the component
  - Initialised `matingLocation` state from it instead of empty string

- **`src/components/batches/MatingNucsTab.tsx`**
  - Passed `distributeNuc.mating_location` as `defaultMatingLocation` when opening the distribute modal from a nuc card

- **`src/components/batches/BatchGraftsSection.tsx`**
  - Added `matingApiaryName?: string | null` prop to interface
  - Passed it as `defaultMatingLocation` to both single and bulk distribute modals (only when graft status is `mated`)

- **`src/app/dashboard/batches/page.tsx`**
  - Resolved mating apiary name from `apiaries` list using `formData.mating_apiary_id`
  - Passed it to `BatchGraftsSection` as `matingApiaryName`

### Notes
- No database or schema changes
- Field remains editable so the user can override
- Existing validation unchanged (at least one of apiary or mating location required)
- For nuc path: uses the nuc's own `mating_location` (set when mating was confirmed)
- For batch grafts path: uses the batch's configured mating apiary name
