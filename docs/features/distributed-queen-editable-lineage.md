# Distributed Queen — Editable Mother, Mated-at & Lineage

## Problem

When editing a **distributed queen** (one created from a distribution, carrying the
amber "Distributed Queen — Provenance" banner), three things were wrong:

1. **Mother Queen** was locked **and empty** — even though we know the source batch, so
   the batch's breeder/mother queen is recoverable.
2. **Mated at (Eircode)** was locked. A virgin queen is distributed only with the
   recipient's apiary; the recipient may actually mate her somewhere else, so this must
   be correctable.
3. **Lineage** showed only the open-mating drone source + breeder (e.g.
   `Open-mated at TBKA Kilcornan (H91RHH4). Breeder: Rico Zmarzly.`). The most important
   lineage fact — the **Queen Mother** — was missing.

## Behaviour now

On the Edit Queen form for a distributed queen:

- **Mother Queen** is unlocked and **auto-filled** from the source batch's
  `mother_queen_id` when it is empty — but only if that mother is one of the user's own
  queens, so we never write a dangling cross-user reference. (For queens received from
  another breeder, the batch is not in the recipient's list, so it safely stays blank.)
- **Mated at (Eircode)** is unlocked and editable. On save it is validated against the
  Eircode format (`src/lib/eircode.ts`); a malformed value is rejected with a toast, while
  an empty value is allowed (the field is optional). This applies to all queens, not just
  distributed ones.
- **Lineage** retains the **Mother + Drone + Breeder** shape. When auto-filling the
  mother, a `Mother: <number> (<colour> <year> <subspecies>)` prefix is added to the
  lineage if one isn't already present, so the field reflects the queen mother. It is
  free text, so the user can adjust before saving.
- The provenance banner note is updated to say mother queen, mated-at, and lineage stay
  editable.
- The self/descendant **cycle guard** now also applies to distributed queens, since the
  mother dropdown is editable for them.

Still locked for distributed queens (to preserve breeder provenance): birth date,
marking colour, source, subspecies, father queen, source batch.

## Mother display fallback

Distributed queens received from another breeder have a null `mother_id` (the breeder's
queen is not in the recipient's records, so no cross-user FK is written). The queens **list**
and **detail** pages now fall back to the `distributed_mother_queen` text snapshot when the
FK is absent — showing the mother's number (e.g. `76-DA`, full snapshot on hover) instead of
`N/A`/`Unknown`. On the **detail page** a distributed queen renders a **provenance panel**
(Breeder / Batch / Mother Queen / Drone Source) above the genealogy tree, mirroring the amber
banner on the edit form. The genealogy tree is shown for distributed queens too, with the
mother snapshot fed in as `motherFallback` (so the Mother slot reads `76-DA`, not "Unknown")
and still surfacing any locally-bred descendants. The textual `Lineage` field carries the
full `Mother: … Open-mated … Breeder: …` line in all cases.

Note: the snapshot is captured at distribution time. If the breeder later renames the mother
queen, the snapshot can go stale (one batch's queens had a mother numbered `n/a` at
distribution that was later corrected to `76-DA`; those snapshots were back-filled from the
batch's live mother).

## Lineage tree on the edit form

Previously the "Queen Lineage" tree was hidden entirely for distributed queens. It now shows
for them too: `QueenLineageTree` accepts an optional `motherFallback` prop, and the edit form
passes `distributed_mother_queen` so the Mother slot reads e.g. `76-DA` (full snapshot on
hover) rather than "Unknown". This keeps the tree consistent with the provenance banner and,
crucially, still surfaces any **daughters** bred locally from the distributed queen.

## Future distributions

The creation path (`useGraftDistributions.ts → createQueenForRecipient`) stores the
mother snapshot (`distributed_mother_queen`) and builds the
`Mother: … Open-mated at … Breeder: …` lineage when the batch has a mother queen at
distribution time.

It now **also links the real `mother_id` FK at creation** — but only for
**self-distributions** (the breeder distributing to their own apiary,
`recipientUserId === callerId`). For distributions to another app user the FK is left
null and only the text snapshot is kept, so a recipient never references a breeder's queen
they cannot see.

This is enforced in two places (defence in depth):
- Client: `p_mother_id` is sent only when `isSelfDistribution` is true.
- RPC `create_queen_for_distribution`: re-checks that the supplied mother queen belongs to
  the recipient (`user_id = p_recipient_user_id`) before writing `mother_id`; otherwise it
  stores null.

The edit-form auto-fill still backfills `mother_id` for any pre-existing distributed queen
when the breeder opens it.

## Files touched

- `src/types/queen.ts` — `Batch` gains optional `mother_queen_id`; new shared
  `formatQueenSnapshot` helper (single source of truth for the mother snapshot string,
  used by both the edit form and the distribution creation path).
- `src/app/dashboard/queens/page.tsx`:
  - `fetchBatches` selects `mother_queen_id`.
  - `handleEdit` auto-fills `mother_id` + lineage (via `formatQueenSnapshot`) for
    distributed queens.
  - `handleSubmit` persists `mother_id` and `mated_at_eircode` for distributed queens.
  - Cycle guard (`invalidParentIds`) applies to all edited queens.
  - Mother Queen and Mated-at inputs unlocked; banner note updated.

- `src/hooks/useGraftDistributions.ts` — fetch `mother_queen_id`, thread it + a
  self-distribution flag through, pass `p_mother_id` to the RPC for self-distributions.

DB migration `create_queen_for_distribution_add_mother_id` adds the `p_mother_id`
parameter and the recipient-ownership guard (replaces the previous 14-arg overload).
