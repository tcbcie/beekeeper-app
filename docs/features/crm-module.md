# CRM Module (Customers, Orders & Sales)

## Overview

A subscription-gated CRM module for tracking customers, taking and fulfilling
orders, and recognising sales revenue inside the existing income/expense ledger.
There is **no inventory tracking** — the module is built around selling queens,
honey, nucs and related products.

The module lives under `/dashboard/crm`; the Customers, Orders and Sales Insights
nav links sit in the **Activity** group (after Tasks & Events), gated by
`feature: 'crm'` on the nav items. They are **completely hidden for users
without an active subscription** who haven't opted in.

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
- **Navigation:** the Customers/Orders items carry `feature: 'crm'` in
  `src/lib/navigation.ts`; `Sidebar` / `MobileDrawer` drop them via
  `filterByFeatures` unless `crmEnabled` is true (the bottom nav bar never shows
  CRM — it isn't flagged `bottomNav`). Mirrors the existing
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
`paid_date`, `total_amount` (derived), `amount_paid` (cumulative payment,
`0 ≤ amount_paid ≤ total_amount`), `notes`. `payment_status` stays **binary**
— it flips to `paid` only when `amount_paid >= total_amount`; a part-paid
deposit keeps it `unpaid` and the "Part-paid" state is derived in the UI.

### `crm_order_items`
`order_id` (FK, cascade), `product_type`
(`queens` / `honey` / `nuc` / `wax` / `propolis` / `pollination` / `other`),
`description`, `quantity`, `unit_price`.

### `financial_records` (additive)
A nullable `crm_order_id uuid REFERENCES crm_orders(id) ON DELETE SET NULL`
column links auto-generated income rows back to their order.

### `crm_customer_summary` (view)
A `security_invoker = on` view that rolls each customer up with `order_count`,
`orders_total` and `last_order_date` (computed in Postgres, **excluding
cancelled orders**). Backs the customers list so the page never pulls every
order to the client. RLS is enforced via the invoker's policies on the
underlying tables.

## Customers list

Desktop table + mobile cards (mobile-first). A search box (name/company/email/
phone) and a sort dropdown (name, most recent order, most orders, highest total)
filter/sort the rolled-up rows client-side. Reads come from
`crm_customer_summary`; writes still target `crm_customers`. Money uses the
shared EUR/GBP rule (`is_uk_ni_resident`). The customer name links to the
customer detail page.

## Customer detail

`customers/[id]` — an overview of one customer: contact details, notes, lifetime
stats (order count, lifetime total, outstanding), and their full order history as
a clickable table/cards. Lifetime total excludes cancelled orders (mirroring
`crm_customer_summary`); outstanding sums the balance owed across non-cancelled
orders.

Header **quick-actions**:

- **New order** → `orders?customer=<id>`; the orders page reads the param after
  load and opens the new-order form with that customer pre-selected.
- **Edit** → `customers?edit=<id>`; the customers list reads the param once the
  list has loaded and opens that customer's edit form (the form lives there).
- **Delete** → inline (same confirm + cascade as the list), then redirects back
  to the customers list.

## Orders list

Desktop table + mobile cards (mobile-first), mirroring the customers list. The
table columns are Order, Customer, Date, Total, Status, Payment. Each row is
clickable for mouse users, and the order number is a real `<Link>` so the row is
keyboard-focusable/activatable (the link `stopPropagation`s to avoid a double
navigation). Mobile keeps the linked summary cards.

Orders carry their item `product_type`s (fetched via
`crm_orders → items:crm_order_items(product_type, quantity)`), which power the
client-side filtering and summary:

- **Search + filters:** a free-text search (order number, customer name or
  company), a status dropdown (all/pending/fulfilled/cancelled) and a product
  dropdown (Queens, Honey, Nuc, Wax, Propolis, Pollination, Other). An order
  matches a product filter if any of its line items is that type. The result
  footer shows the count **and the summed total** of the filtered set.
- **Outstanding balance:** a stat panel showing total money owed across all
  unpaid, non-cancelled orders, with the unpaid count and a hint of how many are
  over 30 days old (by `order_date`). Cancelled orders are excluded — they are
  forced unpaid but carry no recognised revenue, so nothing is owed.
- **Open orders to fulfil:** a summary panel above the filters showing, per
  product type, how many *pending* orders contain it and the total units to
  produce. An order is counted once per distinct type it contains; units sum the
  quantities. Each tile is clickable and pins the filters to that product +
  pending (click again to clear).
- **CSV export:** an *Export* button writes the **currently-filtered** orders to
  CSV (`src/lib/csv.ts`) — raw numeric amounts (no symbol) so spreadsheets can
  sum, ISO dates, and a currency column. Customers has the same on its filtered
  list. The CSV helper hardens against spreadsheet formula injection and emits a
  UTF-8 BOM for Excel.
- **Inline quick actions:** each row/card offers *Mark Fulfilled* (pending
  orders) and *Mark Paid* (unpaid, non-cancelled orders) without opening the
  order. These reuse the same fulfilment update and `crm_set_order_payment` RPC
  as the detail page, then refresh the list. Buttons `stopPropagation`/
  `preventDefault` so they don't trigger row/card navigation.
- **Outstanding balance** sums the **balance owed** (`total_amount − amount_paid`)
  across non-cancelled orders with a positive balance — so deposits reduce it.
- **Production context (read-only):** the "Open orders to fulfil" panel has a
  footer showing the user's current production counts (active queens, mating
  nucs) next to open queen/nuc demand. These are head-counts from `queens`
  (`status='active'`) and `mating_nucs`; there is deliberately **no "available"
  claim** because the app has no sold/reserved inventory flag.

## Invoice

`orders/[id]/invoice` — a print-friendly invoice for a single order, reached via
the **Invoice** button on the order detail page. It renders a From block (seller
details from the user's `profiles` row — name, `producer_address`, email,
`mobile_number`, `breeder_code`), a Bill-to block (customer details), a line-item
table, the total, and notes. The on-screen toolbar (back link + *Print / Save as
PDF*, which calls `window.print()`) is marked `.no-print`; the invoice body uses
the shared `.print-container` / `.print-table` print styles so the dashboard
chrome is hidden when printing.

### Emailing the invoice (PDF attachment)

The invoice toolbar also has **Email invoice**, which opens a modal pre-filled
with the customer's email (when on file, still editable) and sends the invoice
as a real PDF attachment:

- **`POST /api/crm/invoice-email`** (`runtime = 'nodejs'`) authenticates via the
  bearer access token → `auth.getUser` → profile **subscription gate** (mirrors
  the voice-notes route). It loads the order/items/customer **scoped to the
  authenticated user** (a crafted `orderId` can't reach another account).
- The PDF is generated server-side as a **vector** document by
  `renderInvoicePdf` in `src/components/crm/InvoicePdf.tsx` (uses
  `@react-pdf/renderer` primitives + built-in Helvetica — no fonts/network).
  `@react-pdf/renderer` is in `serverExternalPackages` (next.config.ts) and is
  imported only by the server route, so it never reaches the client bundle.
- Delivery reuses **Resend** (`info@hivecraic.com`), `reply_to` set to the
  seller's profile email, with the PDF as a base64 attachment named
  `{order_number}.pdf`.
- **Env:** the route needs `RESEND_API_KEY` available to the **Vercel**
  deployment (the edge functions have their own copy in Supabase secrets). If it
  is absent the route returns `503` and the UI shows an error.

## Order detail

The header is the order number + status/payment badges + order date — no
customer name (that lived in two places before). All customer context sits in a
single **Customer** panel: the name links to `customers/[id]`, with company,
contact details, a "View customer →" link, and a stat row (**Orders · Lifetime ·
Outstanding**) computed by the shared `summariseCustomerOrders` helper (same
figures as the customer detail page). Full order history is reached via the
link, not embedded here.

## Sales Insights

`crm/insights` — a cash-basis sales overview, computed client-side from the
user's orders (`+ items`) and `crm_customer_summary`:

- **Headline stats:** paid this year, paid this month, outstanding balance, and
  open (pending) order count. "Paid" counts only **fully-paid** orders, dated by
  `paid_date` — matching the income ledger. Outstanding is the summed
  `orderBalance` across live orders (so deposits sit here until cleared).
- **Sales by product (year):** paid line items grouped by product type, shown as
  a ranked bar list.
- **Top customers:** the top five by lifetime total from `crm_customer_summary`,
  each linking to the customer detail page.

## Order Lifecycle

`status` (fulfilment) and `payment_status` are **independent**:

- **Fulfilment:** Pending → Fulfilled (sets `fulfilled_date`) and back (Reopen).
- **Payment:** tracked by a cumulative `amount_paid` via
  `crm_set_order_amount_paid(order, amount)` (deposit / part / full). The order
  detail page has a Payment panel (Total / Paid / Balance + an *Amount paid*
  input); *Mark Paid* / *Mark Unpaid* remain as binary shortcuts that set
  `amount_paid` to the total or zero. The server clamps `amount_paid` to
  `[0, total]` and derives `payment_status` (`paid` iff `amount_paid >= total`).
- **Cancel:** sets `status = cancelled`, forces `payment_status = unpaid`,
  `amount_paid = 0`, and reverses any recognised revenue. Cancelled orders are
  read-only.

Order numbers are generated per account as `ORD-YYYY-NNN`
(`src/lib/crm-orders.ts`); the `UNIQUE (user_id, order_number)` constraint is the
final guard.

## Revenue Recognition (Finance Integration)

Revenue is recognised **only when an order is fully paid**
(`amount_paid >= total_amount`), purely in SQL:

1. Line items are grouped by `product_type` → income category and summed.
2. One `financial_records` income row is inserted **per category**, dated to
   `paid_date`, described as `Order {number} — {customer}`, tagged with
   `crm_order_id`.
3. Dropping below full payment (part payment, **Unpaid**, **Cancelled**) removes
   the rows tagged with that `crm_order_id`. Re-recognition is idempotent
   (reverse then re-insert), so totals never double up. **Deposits/part payments
   post nothing** — income appears only once the balance clears.
4. Editing a paid order's items re-derives state from `amount_paid`: if the new
   total now exceeds what's been paid, the order reverts to unpaid and its income
   is removed until the balance is settled (no silently-assumed payment).
5. **Deleting** an order keeps its recognised income (`ON DELETE SET NULL`) as
   historical fact — use Unpaid/Cancel to un-recognise.

The "fully paid ⇒ recognise, else reverse" rule lives in **one** internal
helper, `_crm_apply_payment_state`, called by every path that can change the
total or the amount paid.

All money mutations run inside **atomic Postgres functions** (single
transaction, `SECURITY INVOKER` so RLS applies, `search_path = public` — never
`''`, which breaks RLS policies referencing unqualified tables). EXECUTE is
granted to `authenticated`/`service_role` only (revoked from `PUBLIC`/`anon`),
and order creation takes a per-user advisory lock so concurrent calls can't
collide on the same order number. There is no multi-step client orchestration
that could half-fail:

| Function | Action |
|----------|--------|
| `crm_create_order` | Allocates order number (numeric max, race-safe) + inserts order & items |
| `crm_save_order_items` | Replaces items, recomputes total, re-derives payment state |
| `crm_set_order_amount_paid` | Sets cumulative `amount_paid` (deposit/part/full); clamps to `[0, total]`; gates on subscription only when it fully pays |
| `crm_set_order_payment` | Binary mark paid/unpaid — thin wrapper that sets `amount_paid` to total or zero |
| `crm_cancel_order` | Cancels, zeroes `amount_paid` + reverses revenue |
| `_crm_apply_payment_state` | Internal: the single "fully paid ⇒ recognise, else reverse" rule; keeps `amount_paid ≤ total` |
| `_crm_recognise_revenue` | Internal: posts income rows; **raises** if the order isn't `paid` (invariant holds even if called directly) or if any product type can't map to a category (no silent under-posting) |
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
| Navigation | `src/lib/navigation.ts` (`feature: 'crm'` items + `filterByFeatures`) |
| Route guard | `src/app/dashboard/crm/layout.tsx` |
| Customers page | `src/app/dashboard/crm/customers/page.tsx` |
| Customer detail | `src/app/dashboard/crm/customers/[id]/page.tsx` |
| Orders list | `src/app/dashboard/crm/orders/page.tsx` |
| Order detail | `src/app/dashboard/crm/orders/[id]/page.tsx` |
| Order invoice | `src/app/dashboard/crm/orders/[id]/invoice/page.tsx` |
| Sales insights | `src/app/dashboard/crm/insights/page.tsx` |
| Components | `src/components/crm/OrderItemsEditor.tsx`, `OrderBadges.tsx` |

## Scope (v1)

- No inventory tracking.
- Orders are standalone — not wired to specific queen/hive records.
- Smallest footprint: one additive column on `financial_records`, an isolated
  `crm/` route tree, and a separate gated nav array.
