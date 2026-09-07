# Mark Queen from Nuc Inspection Panel

## Overview
Users can mark queens directly from the mating nuc view without navigating to the Batch Queen Tracking table. A "Mark Queen" button sits beside "Add Inspection" in the expanded nuc panel.

## How It Works
1. Expand a nuc that has a linked graft (cell).
2. Click **Mark Queen** — an inline form appears showing:
   - **Colour** — auto-determined from the batch emergence date using the international queen colour coding system (read-only).
   - **Queen #** — optional text input for a queen number/identifier.
3. Click **Save** to record the marking.

## What Gets Updated
- `mating_nucs.queen_marked_at` — set to today's timestamp.
- `batch_grafts.queen_marked` — set to `true`.
- `batch_grafts.queen_number` — set to the entered value (or `null` if left blank).

## Nuc Card Display
When a queen has been marked, the nuc card row shows:
- A colour dot matching the marking colour.
- "Marked: DD/MM/YYYY"
- The queen number in parentheses if one was entered (e.g. `(#Q42)`).

## Database Changes
- Added `queen_marked_at` (timestamptz, nullable) column to `mating_nucs`.

## Files Changed
- `src/components/batches/MatingNucsTab.tsx` — expanded interface, queries, props, and nuc card display.
- `src/components/batches/NucInspectionPanel.tsx` — added Mark Queen button, inline form, and save handler.

## Update — nucs with no linked graft

The gate on this button was `graftId`, so a nuc set up without a batch (a graft placed straight into
the nuc) could never be marked, and the number had nowhere to live because it was written to
`batch_grafts.queen_number`.

The button now also shows when the nuc has reached `virgin`/`mating`/`laying`. With no graft the save
handler calls `ensure_nuc_reared_queen` instead, which mints the queen into the Queen Register and
stamps `mating_nucs.queen_marked_at` itself. The colour also falls back to the nuc's own
`queen_emerged_at` when there is no batch emergence date, instead of rendering "Unknown".

Marking remains **optional** and is not a prerequisite for distributing the queen.

See [`nuc-reared-queen.md`](nuc-reared-queen.md) for the full design.

## Update — a queen number implies the marking (07/09/2026)

`batch_grafts.queen_number` and `batch_grafts.queen_marked` used to be written independently. The
Queen Tracker's **Queen #** field set only the number, so a graft could carry a number while
`queen_marked` stayed `false`.

That broke the nuc card subtitle in `MatingNucsTab.tsx`, which only swaps the cell reference for the
queen's identity when `queen_marked` is true. Nuc 124 (batch TQRQB_RZ06) had queen number 48 but read
`TQRQB_RZ06 · Cell #6 · …`, showing an irrelevant cell number for a queen that already had her own
number. Nine graft rows were in this state; eleven others were legitimately marked with a colour but
no number.

### The rule

**A queen number implies the marking.** A queen can only carry a number because someone marked her to
put it there, so `queen_number` present ⇒ `queen_marked = true`. The reverse does not hold: marking a
queen with colour alone, and no number, remains valid.

### How it is enforced

- **Write path** — `updateGraftQueenNumber` (`src/hooks/useBatchGrafts.ts`) sets `queen_marked: true`
  alongside the number. The value is trimmed at this chokepoint so a whitespace-only entry cannot
  claim the queen is marked. Clearing the number omits `queen_marked` from the payload entirely,
  rather than re-sending a locally held value that could clobber a change made in another tab.
- **Unmark path** — unticking **Queen Marked** clears the queen number with it, in both
  `updateGraftQueenMarked` and the bulk `handleTableBulkQueenMarked`. Leaving the number behind would
  put the row straight back into the state this rule exists to prevent. The number is not recoverable
  from anywhere else, so both paths confirm first, and the bulk one says how many numbers will go.
  The checkbox itself stays clickable.
- **Both marking records** — the nuc card treats `mating_nucs.queen_marked_at` as proof of marking in
  its own right (`queenMarked = queen_marked_at || batch_grafts.queen_marked`), so unmarking clears
  that date on the linked nucs as well. Clearing only the graft flag would leave the card reading
  `Marked <Colour>` for a queen the tracker had just unmarked — the same contradiction in a new place.
  The graft write is not rolled back if the nuc write fails; the partial failure is reported instead.
- **Zero-row writes** — both paths ask for the affected row back with `.select('id')` and treat an
  empty result as an error. PostgREST reports a zero-row update as a success, so a deleted row or an
  RLS refusal would otherwise leave the optimistic UI showing a change that never landed.
- **Existing data** — migration `backfill_graft_queen_marked_when_numbered` set `queen_marked = true`
  on the nine numbered-but-unmarked graft rows.

The nuc-reared-queen path needed no change: `ensure_nuc_reared_queen` already stamps
`mating_nucs.queen_marked_at` when it mints the queen record.

### Knock-on effects (all intended)

Those nine queens now show as marked wherever `queen_marked` is read: the nuc card subtitle
(`Marked <Colour> #48` in place of `Cell #6`), the Queen Tracker's marking chip, the nuc panel button
(now "Edit Marking"), the CRM order line, and `ensure_reared_queen_record`, which now assigns a
marking colour when promoting such a queen into the breeder register.

### Changing which cell a nuc points to

The nuc edit form's cell selector stamps `queen_marked_at` from the newly chosen cell. It previously
stamped only when that cell was `emerged` **and** marked, and cleared the date only when the cell was
removed entirely. Switching a nuc from a marked cell to a different, unmarked one therefore left the
old cell's marking date on the nuc, so the card read `Marked <Colour>` — with no number, since the
number lives on the graft — for a queen who had never been marked. The old cell is reset to `sealed`
with its marking wiped on the same save, so the nuc was asserting a marking nothing backed.

The date now keys on `queen_marked` alone, which is the field that actually records a marking, and is
cleared for any cell that does not carry one. Dropping the `emerged` check also fixes the opposite
miss: `MARKABLE_STATUSES` is `emerged`, `in_nuc` and `mated`, so a queen marked in a mated cell was
never getting her date stamped either.

That same save reverts the old cell to `sealed` and clears its `queen_marked`/`queen_number`, so the
queen number recorded against it is lost. The form now confirms before that happens, matching the
Queen Tracker's prompt when unmarking. The check runs before any of the writes, so cancelling leaves
the nuc and both cells untouched rather than half-applied.

### Changing the batch

`handleBatchChange` resets `graft_id` to detach the nuc from its cell, but left `queen_marked_at`
untouched, so the same stale-date defect survived through a second entry point: change the **Batch**
on a nuc whose queen was marked and the old cell is reverted on save while the nuc keeps its marking
date, leaving a card that reads `Marked <Colour>` with no cell and no marked queen behind it. The
handler now clears the date along with the cell.

Every writer of the two marking records has been walked:

| Path | Unmarks a graft? | Nuc date handled |
| --- | --- | --- |
| `updateGraftQueenMarked` | yes | clears it |
| `handleTableBulkQueenMarked` | yes | clears it |
| `MatingNucsTab` cell selector | via save | recomputed from the new cell |
| `MatingNucsTab` batch selector | via save | cleared with the cell |
| `handleDelete` | yes | nuc row is deleted |
| `handleRetire` | no | only sets `retired_at` |
| `useMatingNucBulk` | no | only sets graft `status` |

### Trimming, both doors

`handleMarkQueen` has two branches: a graft cell holds the number, or `ensure_nuc_reared_queen` does.
The RPC applies `nullif(btrim(...), '')` to what it is given; the graft branch wrote
`markQueenNumber || null` raw. So the same form trimmed or did not trim depending on whether the nuc
had a cell behind it. Untrimmed, `"  "` sets `queen_marked` on an effectively empty number — the state
the `updateGraftQueenNumber` chokepoint trims to prevent — and `" 48"` registers as a different queen
from `"48"` while looking identical in the UI. Both branches now trim.

### Queen numbers are trimmed wherever they are entered

The register form (`QueenFormSection`) had the same untrimmed input, and it was the source of the one
padded value in the data: a queen numbered `"M5 - 1 "`. The trim now happens in `dataToSubmit`,
which is the single object feeding both the insert and the update, alongside the existing
`origin_breeder_code` trim.

Migration `trim_padded_queen_numbers` corrected the stored value. It skips any row whose trimmed form
would collide with another queen the same user already holds, so it is safe to re-run. Both
`queens.queen_number` and `batch_grafts.queen_number` are now free of surrounding whitespace.

Note the register form has no required-check on the queen number, so a blank one is still accepted —
that is pre-existing and unchanged here. Any new rejection would have to sit in the pure-validation
block at the top of `handleSubmit`, before `ensure_reared_queen_record` runs, or a promoted reared
queen would be left stranded by the rejection.
