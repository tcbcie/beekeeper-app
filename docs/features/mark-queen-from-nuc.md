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
