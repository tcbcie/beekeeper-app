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

## Workflow: queenless reason and queen-record reconciliation

Marking a hive queenless on the Edit Hive form now requires a reason. The
reason is chosen from an inline dropdown that appears beneath the toggle
when it is switched on; the form save is the confirmation.

Reasons:

| Reason | Maps queen.status to |
|---|---|
| Swarmed | `swarmed` |
| Superseded | `superseded` |
| Queen died | `dead` |
| Failed (drone-laying / poor laying) | `retired` |
| Removed (requeening) | `retired` |
| Unknown | `retired` |

On save, **only when the hive transitions to queenless on that save**
(`formData.is_queenless = true && editingHive.is_queenless !== true`):

1. The hive's `queen_id` is cleared. The hive shows no queen.
2. The previously-linked queen's `status` is updated to the mapped value.
3. The hive's `queenless_reason` is persisted.

Re-editing an already-queenless hive does **not** re-touch the queen — the
queen_id was cleared on the original transition, so there is nothing to
update. Toggling queenless off clears `queenless_reason` on the hive but
does not "revive" the previous queen; her record stands as her history.

The badge surfaces (card, hive detail, apiary list) read the
`queenless_reason` and render it inline with the pill:
"Queenless (Swarmed)", "Queenless (Dead)", etc. Unknown/null produces
just "Queenless".

The full reason list and the reason→queen-status mapping live in
`src/lib/queenless.ts` so the form options, the submit handler, and
the badge formatter all read from one source of truth.

## Deliberate non-decisions

- We do **not** auto-flip `is_queenless` from an inspection's
  `queen_seen=false`. "Confirmed" implies a deliberate user action.
- We do **not** "revive" a previously-linked queen if the user toggles
  queenless off. The queen's record has already been told the story.
- The flag is *user state*, not derived state. Nothing else writes to it.

## Database

```sql
ALTER TABLE public.hives
  ADD COLUMN is_queenless boolean NOT NULL DEFAULT false;
ALTER TABLE public.hives
  ADD COLUMN queenless_reason text;  -- nullable; required when is_queenless = true
```

Migrations applied via Supabase MCP:
- `add_is_queenless_to_hives`
- `migrate_queenless_status_to_is_queenless_flag` (legacy data reconciliation)
- `add_queenless_reason_to_hives`
