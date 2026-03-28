# Auto-Populate Mating Location on Distribute

## Problem

When distributing a graft/queen that is already mated (graft status `mated`, or nuc queen status `laying`/`mating`), the user is currently required to manually enter the mating location in the Distribute modal. This information is already recorded in the system and should be auto-populated.

## Solution

Add a `defaultMatingLocation` prop to `DistributeGraftModal` so callers can pre-fill the mating location field from existing records.

### Two Distribution Paths

**Path 1 — Nuc Card (Nuc Setup tab)**
- The `MatingNuc` object already has `mating_location` stored.
- Pass `distributeNuc.mating_location` as `defaultMatingLocation` to the modal.

**Path 2 — Queen Tracking Table (Grafting Batch tab)**
- The batch has a `mating_apiary_id` that references an apiary.
- Resolve the apiary name from the apiaries list on the batch page.
- Thread it through: `batches/page.tsx` → `BatchGraftsSection` → `DistributeGraftModal`.

### Files Changed

| File | Change |
|------|--------|
| `src/components/batches/DistributeGraftModal.tsx` | Add `defaultMatingLocation?: string` prop; initialise `matingLocation` state from it |
| `src/components/batches/MatingNucsTab.tsx` | Pass `distributeNuc.mating_location` as `defaultMatingLocation` |
| `src/components/batches/BatchGraftsSection.tsx` | Accept `matingApiaryName` prop; pass it as `defaultMatingLocation` to modal |
| `src/app/dashboard/batches/page.tsx` | Resolve mating apiary name and pass to `BatchGraftsSection` |

### Behaviour

- The mating location field is pre-filled but still editable (user can override).
- Validation is unchanged — at least one of apiary or mating location must be provided for app-user distributions.
- No database or schema changes required.
