# Feature Plan — Bulk Change Mating Site for Mating Nucs

## Goal
Let the user select all or some set-up mating nucs and change their **mating site** in one action,
instead of editing each nuc individually.

## Where
`src/components/batches/MatingNucsTab.tsx` only. No DB schema change — `mating_nucs.mating_location`
already exists and is a free-text/apiary-name string. Reuses the existing `matingLocationOptions`
(own + team-shared apiaries) already loaded by `fetchMatingLocationOptions`.

## UX
1. **Per-row checkbox** — a small checkbox at the left of each collapsed nuc row toggles that nuc
   into a `selectedNucIds` set. Clicking it does **not** expand/highlight the row (stops propagation).
   This is separate from the existing single-row highlight (`selectedNucId`), which is left untouched.
2. **Bulk action bar** — shown above the nuc list whenever the list is non-empty:
   - "Select all" checkbox (checked/indeterminate based on how many visible nucs are selected).
   - "<N> selected" count.
   - **Change Mating Site** button (disabled until ≥1 selected).
   - "Clear" to deselect all.
3. **Change Mating Site modal** — reuses the apiary `<select>` + custom-text input pattern from the
   create form. Confirm applies the chosen location to every selected nuc.

## Scope of selection
Operates on the **currently visible** nucs (respects the active batch filter and the Show/Hide
Retired toggle). Selecting all therefore means "all nucs currently shown" — e.g. all of batch
TQRQB_RZ03 when that batch filter is active. Retired/sold nucs shown in the list can still be
selected; the location update is harmless metadata, but we can exclude sold/retired if preferred.

## Data update
```ts
await supabase
  .from('mating_nucs')
  .update({ mating_location: newLocation })
  .in('id', Array.from(selectedNucIds))
  .eq('user_id', userId)        // RLS-safe ownership filter
```
Then `fetchNucs()` to refresh, toast the count updated, clear the selection, close the modal.

## Defensive considerations
- Guard against empty selection and empty/blank location (button disabled + early return).
- `.in()` with a bounded id list from the visible set; ownership enforced by `.eq('user_id', userId)`.
- Clear `selectedNucIds` of any ids no longer visible (extend the existing "clear stale selection"
  effect) so a filter change can't leave phantom selections.
- No change to graft/queen status — only the location string is updated.

## Out of scope
- Bulk-changing other fields (status, batch). Could follow the same pattern later if wanted.
- A confirmation dialog (the change is reversible/non-destructive); a toast summary suffices.

## Todo
- [ ] Add `selectedNucIds` state + toggle/select-all/clear helpers.
- [ ] Add per-row checkbox (stops propagation).
- [ ] Add bulk action bar above the list.
- [ ] Add Change Mating Site modal (apiary picker + custom text).
- [ ] Add `handleBulkChangeMatingSite` update + refresh + toast.
- [ ] Extend stale-selection cleanup to prune `selectedNucIds`.
- [ ] Update `docs/features` documentation.
