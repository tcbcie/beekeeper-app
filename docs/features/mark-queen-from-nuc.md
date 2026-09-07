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
- **UI** — the **Queen Marked** checkbox in `QueenTrackingSection.tsx` (both the table and card views)
  is disabled while a queen number is recorded, since unticking it would contradict the number still
  shown beside it. Clear the number first to unmark her.
- **Existing data** — migration `backfill_graft_queen_marked_when_numbered` set `queen_marked = true`
  on the nine numbered-but-unmarked graft rows.

The nuc-reared-queen path needed no change: `ensure_nuc_reared_queen` already stamps
`mating_nucs.queen_marked_at` when it mints the queen record.

### Knock-on effects (all intended)

Those nine queens now show as marked wherever `queen_marked` is read: the nuc card subtitle
(`Marked <Colour> #48` in place of `Cell #6`), the Queen Tracker's marking chip, the nuc panel button
(now "Edit Marking"), the CRM order line, and `ensure_reared_queen_record`, which now assigns a
marking colour when promoting such a queen into the breeder register.
