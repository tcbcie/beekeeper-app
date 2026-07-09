# Customer Credit from Order Overpayments

When a customer pays more than an order's total, the surplus is kept on record as **customer credit**.
The credit is visible on the customer account and can be optionally applied to another order as payment.

## Behaviour

- **Overpayment sweep:** an order's `amount_paid` stays within `[0, total_amount]`. Any surplus is
  captured into a credit ledger entry linked to the source order (idempotent — repeated edits reconcile
  the single entry rather than duplicating credit).
- **Customer credit balance** = `SUM(crm_customer_credit.amount)` for the customer, always `>= 0`. Shown
  on the customer account with a credit-history list.
- **Applying credit:** a manual action on an order (`crm_apply_credit_to_order`) debits the ledger and
  raises that order's `amount_paid`, capped at the order's remaining balance so credit never creates a new
  overpayment.
- **Revenue is unchanged:** revenue is booked per order at the **order total**, never `amount_paid`.
  Surplus cash is a credit/liability, not income; it only becomes revenue when applied to an order that
  then fully pays — so there is no double-counting.

## Data model

New table `crm_customer_credit` (RLS `user_id`-scoped, mirroring the other `crm_*` tables):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | uuid | FK auth.users, RLS scope |
| `customer_id` | uuid | FK crm_customers ON DELETE CASCADE |
| `order_id` | uuid null | FK crm_orders ON DELETE SET NULL (source or target order) |
| `amount` | numeric(10,2) | signed: `+` credit added, `−` credit applied |
| `reason` | text | `order_overpayment` \| `applied_to_order` \| `manual_adjustment` |
| `created_at` | timestamptz | |

## Scope

- Customer-level credit, applied optionally to another order via the order detail page.
- Out of scope (v1): applying credit at order-creation time, refunds / paying credit out as cash, a
  per-payment cash ledger, cross-customer transfers.

## Key integration points

- **DB RPCs:** modify `crm_set_order_amount_paid` (sweep surplus to ledger, guard against reducing
  already-consumed credit); new `crm_apply_credit_to_order`; extend `crm_customer_summary` with
  `credit_balance`.
- `src/types/crm.ts` — `CustomerCreditEntry`, `credit_balance` on `CustomerSummary`.
- `src/lib/crm-credit.ts` (new) — balance / per-order helpers.
- `src/app/dashboard/crm/customers/[id]/page.tsx` — credit balance panel + credit history.
- `src/app/dashboard/crm/orders/[id]/page.tsx` — overpayment/credit messaging + "Apply credit" control.
