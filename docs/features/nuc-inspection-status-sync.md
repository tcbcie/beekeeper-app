# Nuc Inspection → Status Auto-Sync

## Overview
When a nuc inspection is saved with a `queen_status`, the mating nuc and linked batch graft statuses are automatically updated to stay in sync.

## Mappings

| Inspection queen_status | Nuc status | Graft status | Nuc date field |
|------------------------|------------|--------------|----------------|
| `virgin` | `virgin` | `emerged` | `queen_emerged_at` |
| `mated` | `mating` | `mated` | `mating_confirmed_at` |
| `laying` | `laying` | `mated` | `mating_confirmed_at` |
| `dead` / `missing` | `failed` | `failed` | `failed_at` |

## Derived queen status (blank dropdown)

When the beekeeper leaves the **Queen Status** dropdown blank, the status is derived from the brood
evidence on the same inspection:

| Evidence recorded | Derived queen_status |
|-------------------|----------------------|
| Eggs present **or** larvae present | `mated` |
| Neither | *(none — no status change)* |

Eggs or larvae in a mating nuc are proof the queen is mated, so the nuc no longer shows as a
virgin queen and the linked graft advances to `mated`. This matters downstream: the graft
status is what `DistributeGraftModal` uses to pick `distribution_type`, so without it a laying
queen was being distributed as a `virgin_queen` and created as a virgin in the recipient's records.

**Capped brood is deliberately excluded** — a mating nuc is often seeded with a frame of capped
brood at setup, so capped brood alone is not proof that *this* queen is laying.

An explicit dropdown selection **always wins**; the derivation only fills the gap when the field
is blank. Selecting `virgin` on a later inspection therefore still returns the nuc to `virgin`
(e.g. after a supersedure).

## Behaviour (since batch 15, 19/10/2026)
- **Save, edit and delete all replay every inspection of the nuc** in date order, with same-day ties broken by entry order. This is `syncNucFromInspections()` in `NucInspectionPanel.tsx`. The last status-bearing inspection decides the nuc and graft status. A backdated or edited inspection therefore can't roll a laying nuc (or its mated graft) back to virgin.
- The date fields come from all inspections: `queen_emerged_at` and `mating_confirmed_at` are the earliest, and `queen_last_seen_at` and `failed_at` the latest. Only inspections write these fields.
- **A notes-only inspection** (no queen status, no eggs or larvae) updates the dates only, never the status, so a status set by hand (`cell_introduced`, `graft_introduced`, `merged`) is kept. The same applies when you delete a notes-only inspection.
- **Deleting a status-bearing inspection** with none left resets the nuc to `setup` and the graft to `in_nuc`.
- If the inspections can't be read, nothing is written and the user sees an error (it used to reset the nuc to `setup`).
- A `sold` graft is never changed. The graft's `status_date` is the date of the deciding inspection.
- If the nuc has no linked graft (`graft_id` is null), only the nuc is updated.
- **The nuc list self-heal** (`MatingNucsTab.tsx`, `fetchNucs`) moves only `sealed`/`caged` cells in active nucs to `in_nuc`. It used to include `emerged`, which reset every virgin-seen graft on each load (C5a-01; 15 live grafts repaired on 19/10/2026).
- The `onInspectionChange` callback refreshes the parent nuc list so the UI reflects changes immediately.

## Files
- `src/components/batches/NucInspectionPanel.tsx` — `deriveQueenStatus` helper plus the status sync
  in `handleSubmit`; `handleDelete` replays the same rule over the remaining inspections
- `src/components/batches/MatingNucsTab.tsx` — passes `graftId` prop to `NucInspectionPanel`;
  `getNucDistributionType` treats both `laying` and `mating` as `mated_queen`

## Database
No migration required. All columns (`queen_emerged_at`, `mating_confirmed_at`) and statuses (`emerged`, `mated`, `virgin`, `failed`) already exist.
