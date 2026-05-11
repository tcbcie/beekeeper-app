# Hive Queenless Flag

## Problem

After a swarm, the old queen has left the hive. The colony is still active —
it has bees, brood, and may even raise a new queen — but it currently has no
queen. Beekeepers need to record this state clearly so they can plan a
follow-up (introduce a queen, leave it to make one, combine the colony, etc.).

Previously the only way to express this was the `status` enum, which had
three values: `active`, `queenless`, `retired`. That conflated two concepts —
*operational status* (active vs retired) and *queen presence* (queen vs no
queen) — and forced them to be mutually exclusive. A queenless hive was no
longer "active", which was wrong: it is still a live colony.

## Design

Add an orthogonal boolean flag `hives.is_queenless`. The two concepts are
now independent:

| `status` | `is_queenless` | Meaning |
|---|---|---|
| `active` | `false` | Healthy queen-right hive |
| `active` | `true` | Live colony, currently queenless (post-swarm, requeening, etc.) |
| `retired` | any | Hive taken out of service |

`status='queenless'` is removed from the dropdown. The legacy data — 12 rows
at migration time — was reconciled to `status='active' + is_queenless=true`.

## UX

- **Edit Hive form** — a single full-width "Confirmed Queenless" toggle
  sits directly below the Status dropdown. Red when on, with a short
  explanatory hint. When ticked, the Queen Marked / Mated / Clipped toggles
  are hidden (those traits describe a queen that isn't there).
- **Hive card** (`/dashboard/hives`) — a red **Queenless** pill appears
  beside the green `active` pill when the flag is on. Archived hives do not
  show the pill (the queenlessness is no longer relevant once retired).
- **Hive detail page** (`/dashboard/hives/[id]`) — same red badge alongside
  the Status row.
- **Apiary detail page** (`/dashboard/apiaries/[id]`) — same red badge on
  each hive in the apiary's hive list.

## Deliberate non-decisions

- We do **not** auto-clear the linked `queen_id` when marking a hive
  queenless. The historical link to the previous queen record is useful
  for lineage tracking.
- We do **not** auto-flip the flag from an inspection's `queen_seen=false`.
  "Confirmed" implies a deliberate user action.
- The flag is *user state*, not derived state. Nothing else writes to it.

## Database

```sql
ALTER TABLE public.hives
  ADD COLUMN is_queenless boolean NOT NULL DEFAULT false;
```

Migration `add_is_queenless_to_hives` and reconciliation
`migrate_queenless_status_to_is_queenless_flag` applied via Supabase MCP.
