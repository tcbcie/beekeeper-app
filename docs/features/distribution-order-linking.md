# Linking Distributions to CRM Orders

## Overview

When distributing a queen cell, virgin queen, or mated queen, the breeder can optionally
record the distribution against an **open CRM order** they already have on file. This ties
production output (the actual queens handed out) to the customer demand that prompted it,
without changing how orders are fulfilled or how revenue is recognised.

The link is **informational only** — selecting an order does not mark it fulfilled, decrement
any quantity, or recognise income. Those remain manual actions on the order itself
(see [crm-module.md](crm-module.md)).

## Database

A single nullable column on `graft_distributions`:

| Column | Type | Description |
|--------|------|-------------|
| crm_order_id | UUID | FK to `crm_orders(id)`, `ON DELETE SET NULL`. The open order this distribution fulfils. |

- Indexed (`idx_graft_distributions_crm_order_id`) for the order-detail lookup.
- `ON DELETE SET NULL` so deleting an order never deletes its distribution history — the link is simply cleared.
- Covered by the existing user-scoped RLS on `graft_distributions`; no new policy is needed. The dropdown only ever lists the user's own pending orders (RLS prevents reading others').

## UI

### Distribution dialogue (`DistributeGraftModal`)

An optional **"Record against order"** dropdown appears above Notes whenever the user has at
least one open (pending) order. It is shared by all three distribution contexts (single graft,
bulk grafts, mating nucs).

**Matching** — the list shows *all* open orders, but floats the most relevant to the top
(it never hides a valid choice):

1. **Recipient match** (highest) — the order's customer name or email equals the chosen
   recipient (app user `full_name`/email, or the external beekeeper's name/email). Tagged
   `✓ matches recipient`.
2. **Product match** — the order contains a `queens` line item (all distribution types map to
   the CRM `queens` product). Tagged `• queens`.
3. Otherwise newest-first.

The selected order id is passed through `CreateDistributionData` / `BulkDistributionData`
(`useGraftDistributions.ts`) and written to `graft_distributions.crm_order_id`.

### Order detail page (`/dashboard/crm/orders/[id]`)

A read-only **"Distributions linked to this order"** panel lists each linked distribution —
cell number (or "Queen"), distribution type, recipient, and date. It only renders when at
least one distribution is linked.

## Files

| File | Role |
|------|------|
| `src/components/batches/DistributeGraftModal.tsx` | Optional order dropdown + match sorting |
| `src/hooks/useGraftDistributions.ts` | `crm_order_id` on the two save types + inserts |
| `src/app/dashboard/crm/orders/[id]/page.tsx` | Linked-distributions panel |

## Out of scope

- No automatic order fulfilment or quantity reconciliation.
- No permanent customer↔recipient mapping; matching is computed at selection time by name/email.
- No change to payment or revenue-recognition logic.
