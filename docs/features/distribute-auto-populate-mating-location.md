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
| Mated queen       | Batch mating apiary (genuinely mated there) | Batch eircode |
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
