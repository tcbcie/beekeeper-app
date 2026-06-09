# CRM Module (Customers, Orders & Sales)

## Overview

A subscription-gated CRM module for tracking customers, taking and fulfilling
orders, and recognising sales revenue inside the existing income/expense ledger.
There is **no inventory tracking** — the module is built around selling queens,
honey, nucs and related products.

The module lives under `/dashboard/crm` and appears in navigation as a **Sales**
group (Customers, Orders). It is **completely hidden for users without an active
subscription**.

## Access Gating

The CRM is shown only when **both** conditions hold:

1. **Active subscription** — `profiles.subscription_expires_at` / `is_active` via
   the `get_subscription_status` RPC (the same check that gates Data Export).
2. **Opt-in preference** — `profiles.enable_crm` (boolean, **default `false`**).
   Active subscribers turn it on under Profile → Preferences → *Sales / CRM*. The
   toggle row only appears to active subscribers.

- **Composed gate:** `src/hooks/useCrmEnabled.ts` returns
  `{ crmEnabled, loading }` where `crmEnabled = activeSubscription && enable_crm`.
  Both inputs are cached at module scope (deduped across nav surfaces) and the
  gate **defaults to `false` (locked)** on any error. It refreshes live via the
  `crm-pref-changed` window event (fired by `notifyCrmPrefChanged`) so the
  persistent sidebar updates the instant the toggle is flipped — no reload.
  - `src/hooks/useHasActiveSubscription.ts` provides the cached
    `resolveActiveSubscription()` primitive reused here.
- **Navigation:** `crmNavItems` + `crmNavGroupLabel` in `src/lib/navigation.ts`,
  rendered only when `crmEnabled` is true in `Sidebar`, `MobileDrawer` (the bottom
  nav bar never shows CRM — it isn't flagged `bottomNav`). Mirrors the existing
  `userRole === 'Admin'` gate for the Settings item.
- **Route guard:** `src/app/dashboard/crm/layout.tsx` redirects to `/dashboard`
  unless `crmEnabled` — defence in depth for direct URL access.
- **Server-side enforcement:** the subscription is the actual entitlement, so the
  value-creating RPCs (`crm_create_order`, `crm_save_order_items`, and the
  mark-paid branch of `crm_set_order_payment`) call `_crm_require_subscription()`
  and raise `insufficient_privilege` if it has lapsed — the client gate alone is
  never trusted. Reversal/cleanup paths (cancel, mark-unpaid) stay open so a
  lapsed user can always wind orders down. `enable_crm` is a UI preference only
  and is deliberately **not** enforced server-side.
- **Cache safety:** the module-level subscription/preference caches are cleared on
  `supabase.auth.onAuthStateChange` so gated state can't leak across account
  switches within the same tab.

## Database

Three new tables (all UUID PK, `user_id`-scoped, RLS `auth.uid() = user_id` for
all four operations, `updated_at` triggers via `update_updated_at_column()`):

### `crm_customers`
`first_name` (NOT NULL) + `surname` are the single source of truth for a
customer's name. `name` is a **Postgres generated column**
(`GENERATED ALWAYS AS (btrim(coalesce(first_name,'') || ' ' || coalesce(surname,''))) STORED`)
— it cannot drift or be written directly, and remains the canonical display value
used by orders, cards, `.order('name')` sorting and revenue descriptions. Also
`company`, `email`, `phone`, optional shipping address (`address_line1/2`, `city`,
`county`, `postcode`, `country`), `notes`.

### `crm_orders`
`customer_id` (FK, cascade), `order_number` (unique per `user_id`),
`status` (`pending` / `fulfilled` / `cancelled`),
`payment_status` (`unpaid` / `paid`), `order_date`, `fulfilled_date`,
`paid_date`, `total_amount` (derived), `notes`.

### `crm_order_items`
`order_id` (FK, cascade), `product_type`
(`queens` / `honey` / `nuc` / `wax` / `propolis` / `pollination` / `other`),
`description`, `quantity`, `unit_price`.

### `financial_records` (additive)
A nullable `crm_order_id uuid REFERENCES crm_orders(id) ON DELETE SET NULL`
column links auto-generated income rows back to their order.

## Order Lifecycle

`status` (fulfilment) and `payment_status` are **independent**:

- **Fulfilment:** Pending → Fulfilled (sets `fulfilled_date`) and back (Reopen).
- **Payment:** Unpaid ↔ Paid (sets/clears `paid_date`).
- **Cancel:** sets `status = cancelled`, forces `payment_status = unpaid`, and
  reverses any recognised revenue. Cancelled orders are read-only.

Order numbers are generated per account as `ORD-YYYY-NNN`
(`src/lib/crm-orders.ts`); the `UNIQUE (user_id, order_number)` constraint is the
final guard.

## Revenue Recognition (Finance Integration)

Revenue is recognised **when an order is marked Paid** (`src/lib/crm-finance.ts`):

1. Line items are grouped by `product_type` → income category and summed.
2. One `financial_records` income row is inserted **per category**, dated to
   `paid_date`, described as `Order {number} — {customer}`, tagged with
   `crm_order_id`.
3. Marking the order **Unpaid** or **Cancelled** removes the rows tagged with
   that `crm_order_id`. Editing a paid order re-posts idempotently (reverse then
   re-insert), so totals never double up.
4. **Deleting** an order keeps its recognised income (`ON DELETE SET NULL`) as
   historical fact — use Unpaid/Cancel to un-recognise.

All money mutations run inside **atomic Postgres functions** (single
transaction, `SECURITY INVOKER` so RLS applies) — there is no multi-step
client orchestration that could half-fail:

| Function | Action |
|----------|--------|
| `crm_create_order` | Allocates order number (numeric max, race-safe) + inserts order & items |
| `crm_save_order_items` | Replaces items, recomputes total, re-posts revenue if paid |
| `crm_set_order_payment` | Sets paid/unpaid + recognises/reverses revenue |
| `crm_cancel_order` | Cancels + reverses revenue |
| `_crm_recognise_revenue` | Internal: posts income rows; **raises** if any product type can't map to a category (no silent under-posting) |
| `crm_product_income_category` | Single source of truth for the product→category map |

Manually-entered finance records are never touched. The rows flow straight into
the existing Profit & Loss tool and reports, accurate by category.

### Product type → income category

| Product type | Income category (`dropdown_values`) |
|--------------|-------------------------------------|
| queens       | Queen Sales |
| honey        | Honey Sales |
| nuc          | Nucleus Sales |
| wax          | Wax Sales |
| propolis     | Propolis Sales |
| pollination  | Pollination Services |
| other        | Other Income |

Category IDs are resolved inside SQL by `value` — never hard-coded.

## Currency

Amounts use the same EUR/GBP rule as the finance module
(`profiles.is_uk_ni_resident`), via `src/lib/crm-currency.ts`.

## Files

| Area | Path |
|------|------|
| Types | `src/types/crm.ts` |
| Subscription hook | `src/hooks/useHasActiveSubscription.ts` (cached, shared) |
| Atomic operations | Postgres functions (migration `crm_atomic_operations`) |
| Currency | `src/lib/crm-currency.ts` |
| Navigation | `src/lib/navigation.ts` (`crmNavItems`) |
| Route guard | `src/app/dashboard/crm/layout.tsx` |
| Customers page | `src/app/dashboard/crm/customers/page.tsx` |
| Orders list | `src/app/dashboard/crm/orders/page.tsx` |
| Order detail | `src/app/dashboard/crm/orders/[id]/page.tsx` |
| Components | `src/components/crm/OrderItemsEditor.tsx`, `OrderBadges.tsx` |

## Scope (v1)

- No inventory tracking.
- Orders are standalone — not wired to specific queen/hive records.
- Smallest footprint: one additive column on `financial_records`, an isolated
  `crm/` route tree, and a separate gated nav array.
