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

## Behaviour
- Only triggers on **new** inspections (not edits).
- If the nuc has no linked graft (`graft_id` is null), only the nuc status is updated.
- The `onInspectionChange` callback refreshes the parent nuc list so the UI reflects changes immediately.

## Files
- `src/components/batches/NucInspectionPanel.tsx` — status sync logic in `handleSubmit`
- `src/components/batches/MatingNucsTab.tsx` — passes `graftId` prop to `NucInspectionPanel`

## Database
No migration required. All columns (`queen_emerged_at`, `mating_confirmed_at`) and statuses (`emerged`, `mated`, `virgin`, `failed`) already exist.
