# Nuc Inspection → Status Auto-Sync

## Overview
When a nuc inspection is saved with a `queen_status`, the mating nuc and linked batch graft statuses are automatically updated to stay in sync.

## Mappings

| Inspection queen_status | Nuc status | Graft status | Nuc date field |
|------------------------|------------|--------------|----------------|
| `virgin` | `virgin` | `emerged` | `queen_emerged_at` |
| `mated` | `mating` | `mated` | `mating_confirmed_at` |
| `laying` | `laying` | `mated` | `mating_confirmed_at` |
| `dead` / `missing` | `failed` | *(no change)* | *(none)* |

## Derived queen status (blank dropdown)

When the beekeeper leaves the **Queen Status** dropdown blank, the status is derived from the brood
evidence on the same inspection:

| Evidence recorded | Derived queen_status |
|-------------------|----------------------|
| Eggs present **or** larvae present | `laying` |
| Neither | *(none — no status change)* |

Eggs or larvae in a mating nuc are proof the queen mated and is laying, so the nuc no longer shows
as a virgin queen and the linked graft advances to `mated`. This matters downstream: the graft
status is what `DistributeGraftModal` uses to pick `distribution_type`, so without it a laying
queen was being distributed as a `virgin_queen` and created as a virgin in the recipient's records.

**Capped brood is deliberately excluded** — a mating nuc is often seeded with a frame of capped
brood at setup, so capped brood alone is not proof that *this* queen is laying.

An explicit dropdown selection **always wins**; the derivation only fills the gap when the field
is blank. Selecting `virgin` on a later inspection therefore still returns the nuc to `virgin`
(e.g. after a supersedure).

## Behaviour
- Runs on both new and edited inspections, using the values on the inspection just saved.
- If the nuc has no linked graft (`graft_id` is null), only the nuc status is updated.
- The `onInspectionChange` callback refreshes the parent nuc list so the UI reflects changes immediately.

## Files
- `src/components/batches/NucInspectionPanel.tsx` — `deriveQueenStatus` helper plus the status sync
  in `handleSubmit`; `handleDelete` replays the same rule over the remaining inspections
- `src/components/batches/MatingNucsTab.tsx` — passes `graftId` prop to `NucInspectionPanel`;
  `getNucDistributionType` treats both `laying` and `mating` as `mated_queen`

## Database
No migration required. All columns (`queen_emerged_at`, `mating_confirmed_at`) and statuses (`emerged`, `mated`, `virgin`, `failed`) already exist.
