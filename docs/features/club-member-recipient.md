# Club-Member Recipient Flag

## Problem

Mated-queen pricing/prizes differ for **club members**, but the app had no way to record whether a
distribution recipient was a club member. Recipient type (Group Member / App User / Public) is
*derived* from the relationship and is **orthogonal** to club membership — an app user or an
external beekeeper may or may not be a club member. There is no external club-members list to look
the recipient up against.

## Solution

Capture club membership **per distribution**, at distribution time, via a checkbox in the
Distribute / Redistribute modal, and surface it in the Queen Tracker as a distinct **Club** badge
alongside the existing recipient-type dot (not replacing it, since the two are independent).

## Data model

New column on `graft_distributions` (migration
`add_recipient_is_club_member_to_graft_distributions`):

```sql
recipient_is_club_member boolean NOT NULL DEFAULT false
```

Existing rows default to `false` — the flag is captured going forward; there is no reliable way to
backfill historical club membership.

## Capture

`DistributeGraftModal.tsx` gains a **"Recipient is a club member"** checkbox (state `clubMember`),
shown for every recipient mode (group / app user / external). It is written to
`recipient_is_club_member` through all three write paths:

- `createDistribution` (single) — via the spread of `CreateDistributionData`.
- `createBulkDistributions` (multi-graft) — added to each row.
- `redistributeQueen` (existing-queen redistribution) — added to the UPDATE.

`CreateDistributionData` and `BulkDistributionData` both carry `recipient_is_club_member: boolean`.

## Display (Queen Tracker)

`useQueenTracker` selects and maps `recipient_is_club_member` onto `TrackedQueen`.
`QueenTrackerTab.tsx`:

- A green **Club** chip next to the recipient name in the DISTRIBUTION column when the flag is set.
- A **Club member: Yes/No** line in the expanded detail.

The recipient-type dot (indigo/violet/fuchsia) is unchanged; the Club chip is additive.

## Files touched

| File | Change |
|------|--------|
| migration `add_recipient_is_club_member_to_graft_distributions` | new boolean column |
| `src/hooks/useGraftDistributions.ts` | field on `GraftDistribution` / `CreateDistributionData` / `BulkDistributionData`; written in create / bulk / redistribute; mapped in fetch |
| `src/hooks/useQueenTracker.ts` | select + `TrackedQueen` field + mapping |
| `src/components/batches/DistributeGraftModal.tsx` | club-member checkbox + submit wiring |
| `src/components/batches/QueenTrackerTab.tsx` | Club badge + detail line |

## Out of scope

- No maintained club-members list / auto-derivation (explicitly deferred — captured inline instead).
- No pricing/CRM logic yet; this only records and displays the flag.
- No backfill of historical distributions.
