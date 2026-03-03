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
