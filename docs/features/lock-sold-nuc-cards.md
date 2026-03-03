# Lock Sold Nuc Cards

## Overview
When a nuc is distributed and its status changes to `sold`, the nuc card is now locked to prevent accidental data changes. This matches the existing behaviour where batch graft records are locked after distribution.

## Behaviour

### Sold Nucs
- **Edit** button — hidden
- **Retire** button — hidden
- **Delete** button — hidden
- **History** button — visible (read-only, still useful)
- **Distribute** button — already hidden (only shows for `virgin`/`mating`/`laying`)
- **Expand** — still works, past inspections are viewable
- **Add Inspection** button — hidden
- **Mark Queen** button — hidden
- **Inspection card Edit/Delete** — hidden

### Non-Sold Nucs
All buttons function as before — no regression.

## Files Modified
- `src/components/batches/NucInspectionCard.tsx` — `readOnly` prop hides Edit/Delete buttons
- `src/components/batches/NucInspectionPanel.tsx` — `readOnly` prop hides Add Inspection + Mark Queen, passes to cards
- `src/components/batches/MatingNucsTab.tsx` — wraps Edit/Retire/Delete in `nuc.status !== 'sold'` check, passes `readOnly={nuc.status === 'sold'}` to inspection panel
