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

## Correction — Mating Station / Mated-at on distributed cells & virgins

Previously, the recipient's queen record always inherited the **batch's** mating apiary as its
`mating_station` and `mated_at_eircode`, even for sealed cells and virgin queens. That is wrong:
an unmated queen has not mated at the breeder's batch station — it will mate at the destination
apiary it was assigned to.

### Corrected derivation (`createQueenForRecipient` + `create_queen_for_distribution` RPC)

| Distribution type | Mating station | Mated at (eircode) |
|-------------------|----------------|--------------------|
| Mated queen       | The distribution's recorded `mating_location` (the nuc's actual site), else the batch mating apiary | Eircode of the apiary matching that location, else the batch eircode |
| Cell / Virgin **with** destination apiary | Destination apiary name | Destination apiary eircode |
| Cell / Virgin **without** destination apiary | Blank until mated | Blank until mated |

- The destination eircode is resolved **server-side** inside the `SECURITY DEFINER` RPC
  (`create_queen_for_distribution`, new `p_recipient_apiary_id` param). The breeder client never
  receives a recipient's eircode — only the apiary name (via `get_recipient_apiaries`), which is
  used to build the lineage string consistently.
- The lineage string for distributed cells/virgins now references the **destination** apiary name
  instead of the batch station.
- `promote_distributed_queen_on_mating` now prefers the location confirmed at mating
  (`COALESCE(mating_location, mated_at_eircode)`) so a corrected location can replace the value
  stamped at distribution time (previously a stale value always won).

### Files changed

| File | Change |
|------|--------|
| `create_queen_for_distribution` (RPC) | Add `p_recipient_apiary_id`; for cell/virgin, set station + eircode from that apiary |
| `promote_distributed_queen_on_mating` (RPC) | Prefer confirmed `mating_location` over a stale eircode |
| `src/hooks/useGraftDistributions.ts` | Branch station/eircode by distribution type; resolve destination apiary name; thread `recipient_apiary_id` to the RPC |

## Correction 2 — Mated queen inherits the nuc's actual mating site, not the batch default

**Symptom.** Queen 21 (batch `TQRQB_RZ03`) matured in nuc 120, which was sited at
`AP03 - Stephen` (eircode `H91 073H`), but its queen record showed the batch's default station
`TBKA Kilcornan` (`H91RHH4`).

**Root cause.** For `mated_queen` distributions, `createQueenForRecipient` hard-coded the mating
station/eircode to the **batch's** `mating_apiary_id`, ignoring the true per-nuc location that is
recorded on the distribution row (`graft_distributions.mating_location`) and shown on the nuc card.
That location was never threaded into the queen-creation path, so the batch default always won
whenever a nuc had been sited away from the batch's default apiary.

**Fix (`src/hooks/useGraftDistributions.ts`).**
- The distribution's `mating_location` is now passed into `createQueensForRecipient`
  (`matingLocationOverride`).
- For a mated queen, when that location differs from the batch apiary it becomes the queen's
  `mating_station`, and its eircode is resolved from the breeder's own apiaries by name
  (best effort — a free-text location with no matching apiary simply carries no eircode, which is
  preferable to a wrong one). Otherwise the batch default is retained (unchanged behaviour).
- The mating station also flows into the lineage and drone-source strings, so all derived text
  stays consistent.

**Data.** Queen 21's `mating_station`, `mated_at_eircode`, `lineage`, and
`distributed_drone_source` were corrected to `AP03 - Stephen` / `H91 073H`. A scan of all
mated-queen distributions found no other affected records.

**Known limitation.** The bulk-distribution path (`createQueensForRecipient` from a multi-graft
insert) still defaults `matingLocationOverride` to null, because a single shared field cannot
represent several nucs sited at different apiaries. Single mated-queen distribution — the reported
and common case — is fully covered.
