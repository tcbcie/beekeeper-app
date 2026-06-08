# Bulk Change Mating Site (Mating Nucs)

Select multiple set-up mating nucs and change their **mating site** in one action, instead of
editing each nuc individually.

## Where
`src/components/batches/MatingNucsTab.tsx`. No database change — it updates the existing
`mating_nucs.mating_location` column. The apiary options come from the component's existing
`matingLocationOptions` (own + team-shared apiaries).

## How it works

**Per-row checkbox** — every nuc row shows a checkbox on the left that adds it to a
`selectedNucIds` set. The checkbox stops click propagation so ticking it does not expand or
highlight the row. It is **hidden for sold and retired nucs** (`isNucSelectable`), so only nucs
still in active management can be relocated.

**Bulk action bar** (above the list, shown when there is at least one selectable nuc):
- **Select all** — a tri-state checkbox (checked / indeterminate / empty) that selects or clears
  all *currently visible* selectable nucs. Because it operates on the visible list, it respects
  the active batch filter and the Show/Hide Retired toggle (e.g. selecting all of one batch after
  pressing its "View Nucs").
- **N selected** count.
- **Change Mating Site** button (disabled until ≥1 nuc is selected).
- **Clear** to deselect.

**Change Mating Site modal** — reuses the create form's site picker: choose a known apiary
(own/shared) from the dropdown, or type a custom location. **Apply** writes the chosen site to
every selected nuc:

```ts
await supabase
  .from('mating_nucs')
  .update({ mating_location: location })
  .in('id', Array.from(selectedNucIds))
  .eq('user_id', userId)   // ownership-scoped (RLS-safe)
```

On success it toasts the number of nucs updated, clears the selection, closes the modal, and
refreshes via `fetchNucs()`.

## Defensive behaviour
- Apply is blocked when no nuc is selected or the location is blank (button disabled + early return).
- **In-flight guard**: `bulkSiteSaving` disables Apply/Cancel and short-circuits re-entry while the
  update runs, so a double-click can't fire duplicate writes; the button shows "Applying…".
- **Chunked writes**: ids are updated in batches of 100 so the PATCH filter `?id=in.(…)` can never
  exceed URL-length limits when "Select all" spans a large, unfiltered list. On a partial failure
  the catch re-runs `fetchNucs()` to re-sync the UI with what actually persisted.
- `.eq('user_id', userId)` enforces ownership server-side; the id list is bounded by the visible set.
- A dedicated effect prunes `selectedNucIds` of any nuc that leaves the visible list (filter change
  or refresh), so a stale id can never be updated.
- Only `mating_location` is changed — graft and queen statuses are untouched.

## Out of scope
- Bulk-changing other fields (status, batch). The same select/bar/modal pattern could be extended
  later if needed.
