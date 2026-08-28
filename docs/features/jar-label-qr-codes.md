# Jar Label QR Codes

Permanent QR codes for printed jar labels, so labels can be printed commercially in bulk — one design per jar size — long before the batches they will carry exist.

## The problem this solves

The original traceability QR code encodes a **batch**: `/trace/{trace_code}`, where `trace_code` lives on the `batch_runs` row. That works when you print labels per bottling run, but not when you order thousands of labels from a commercial printer with one design per jar size, to be applied across many batches over months.

A printed QR cannot name a batch that does not exist yet. So it names something permanent instead, and the batch is resolved **at scan time**.

```
Printed label (thousands)  →  Jar Label code (permanent)  →  Batch (re-pointed each bottling)
```

This is the same indirection the app already uses for hives: a [QR Tag](../feature/qr-tags.md) is a permanent badge code reassigned to whichever hive it is stuck to.

## Scale

You need **one code per label design, not one per jar**. Two jar sizes means two rows in `trace_labels`, permanently. There is no bulk code generation and no per-jar tracking.

## Concepts

| Thing | Permanent? | Holds |
|---|---|---|
| **Jar Label** | Yes — printed into the QR | Product name, jar size, net weight, presentation settings |
| **Batch** (`batch_runs`) | No — a new one per bottling run | Lot code, bottled date, best before, origins, floral sources |
| **Lot code** (`batch_code`) | Printed or written on each jar | The EU lot mark, e.g. `L-2026-08-001` |

## The honesty problem, and how it is handled

A label reused across bottling runs **cannot** honestly claim a batch for a jar bought months ago — by then the label points at a later run. Silently showing the current batch would eventually tell a customer their honey came from a batch it did not, which is the one thing a traceability feature must never do.

The lot code is on every jar anyway (EU labelling requires the lot mark and best-before date on the pack; a QR pointing at a web page satisfies neither). So every scan carries a **lot finder**: a list of the producer's public batches in that jar size, plus a box to type the lot code from the jar.

Two rules make this safe:

- An explicit `?lot=` **never falls back** to the current batch when it fails to resolve. Showing a different batch than the one asked for would be worse than showing none.
- A lot that does not exist and a lot that exists but is not public return **the same answer**, so a private batch cannot be enumerated.

## Creating and managing labels

**Tools → Honey Provenance → Jar Labels**

| Field | Notes |
|---|---|
| **Label name** | Your own reference, e.g. "Wildflower 340 g". Never shown to customers |
| **Jar size (ml)** / **Net weight (g)** | Printed on the label, so the scan page does not repeat them. Net weight is what matches this label to the right batches in the lot finder |
| **Currently bottling into** | The batch this design is being filled with now. Editable straight from the card — re-pointing is the routine bottling-day action and should not need the form opened |
| **Title / Origin line / Story** | Presentation overrides — see resolution below |
| **Display toggles** | Six switches controlling what a scan shows |
| **Active** | Turn off to retire a design. Scans then show "not found", so only do this once the jars are out of circulation |

The form warns in two cases that would otherwise fail silently:

- Pointing at a **non-public batch** — a scan would show product copy and no batch information at all.
- Pointing at a batch with **no jars matching the label's net weight** — usually the wrong batch picked from the list.

The **Batches** tab warns in the mirror case: editing a batch that printed labels currently point at.

### QR download

The QR panel offers **SVG** and **PNG**. Send the SVG to a commercial printer — it is vector, so it stays sharp at any label size without the resampling fringes that make a bitmapped QR harder for a phone to read.

The code never changes, so **one print run lasts for every batch to come**.

## What a scan shows

### Copy resolution — label wins, blank falls through

Each of title, origin and story resolves independently:

```
Jar label's own wording  →  the batch's wording  →  a built-in default
```

A printed label is a product whose name is on the jar in ink, so the page must not contradict it. Leaving a label field **blank** falls through to the batch's own wording, which is how a per-harvest story still gets told.

> **Note:** an earlier draft of the plan had this the other way round (batch first). It was wrong: every existing public batch already carries a `public_title`, so a batch-first rule would have meant the label's copy fields could never fire. Label-first is also strictly more expressive — to use the batch's wording you leave the label field blank, whereas batch-first offered no way to make a label title win short of blanking it on every batch.

### Display toggles

| Toggle | Controls |
|---|---|
| **Story** | The whole story section |
| **Origin map** | Foraging-area map, if the apiary shares its location |
| **Apiary photo** | See the asymmetry below |
| **Floral sources** | Whether the auto-built story mentions what the bees foraged on. Has no effect when a custom story is set |
| **Lot and dates** | Bottled date, best before, lot code |
| **Feedback form** | The customer rating form |

**Apiary photo asymmetry:** `get_public_batch_info` only fetches the image when the **batch** has `show_apiary_image` set. A label's photo toggle can therefore *hide* a photo but never *reveal* one the batch has switched off. The toggle's hint in the form says so.

**Feedback:** the batch's own `show_feedback` still applies. The label toggle can hide the form, never re-enable one switched off for a batch.

### Net weight is not shown

The jar size and net weight are printed on the label beside the QR, so repeating them would be noise. There is no `?w=` parameter on this route — that deep-link remains only for legacy per-batch QRs already on jars.

## Payment links

A jar label can show a **Pay for this jar** panel **below** the provenance card. It replaces the separate payment sticker that used to go on the jar.

**Placement was corrected after testing.** It was originally put above the provenance on the reasoning that at a stall, paying is why you scanned. In practice most people scanning a jar have *already* paid for it, and leading with a price reads as a demand rather than the story they came for. The panel is a fallback for the ones who have not paid — an honesty box, an unattended stall — so it sits after the provenance.

The panel names the product using the same public title as the provenance card. It never shows the jar label's internal **name**: that is the producer's own reference ("Summer all Apiary Batch") and is not for customers.

**Revolut only** for now. Stripe and SumUp were considered and deferred - see below.

### Setting it up

The payment account lives on the **profile**, not the label, because it describes who you are paid as rather than what is in the jar:

**Dashboard -> Profile -> Selling your honey** - switch on *Accept payments on jar labels*, paste your `revolut.me` link and set a currency. Set once, shared by every label.

Then, per label, in the Jar Labels form: switch on *Let customers pay for the jar* and set the **price** for that jar size, plus an optional note ("Collection from Athenry").

**The price is required.** A `revolut.me` link does not carry an amount - the payer types it - so the displayed price is the only thing telling the customer what to send. A missing price means quiet underpayment, so the form refuses to save without one, and the panel says *"Please enter this amount in Revolut"*.

### Why the price is on the label and the link is on the profile

A Revolut link is **per person**; a price is **per jar size**. Splitting them that way means the link is entered once and the 227 g and 454 g designs still charge different amounts.

This is also why there is no per-label link override. Stripe would have needed one - a Stripe Payment Link is per *price*, so each jar size would need its own - but with Revolut alone the question does not arise.

### Three gates before anything is shown

The payment block leaves the database only when **all** of these hold:

1. `profiles.enable_jar_payments` is on, **and**
2. `profiles.sales_revolut_url` is set, **and**
3. the label's `show_payment` is on.

Any one missing and the RPC emits no payment data at all - not a block of nulls. Switching off at the profile instantly disables payment across every label.

### The host allowlist

`src/lib/payment-links.ts` holds the accepted hostnames and is enforced **twice**: when the profile saves, and again before the public page renders.

Both are needed. `profiles` is writable directly through PostgREST by its owner, so form validation alone does not guarantee what is in the row. The page is a server component, so its check runs server-side and cannot be skipped by the viewer. A link failing validation is dropped silently on the public page - a customer must never see a payment button we do not trust - while the producer gets a clear error naming the accepted hosts.

Without this, any account could paste any URL and use a page on hivecraic.com, carrying the trust badge and a named producer, to lend credibility to a fake payment page. The checks reject non-HTTPS links, hosts that merely *contain* a provider name (`evilrevolut.com`, `revolut.me.evil.io`), and credentials disguising the real host (`https://revolut.me@evil.example/`).

The allowlist lives in TypeScript rather than a DB `CHECK` because providers add domains over time and a constraint would mean a migration each time. The database enforces only what never changes - HTTPS and length.

### What we never claim

**HiveCraic never takes or verifies a payment.** Revolut settles entirely outside the app, so we cannot know whether a customer paid. The page therefore never shows a tick or says "paid", and there is deliberately no "payments received" view that would look like a ledger it cannot honestly keep.

No payment field ever appears on a HiveCraic page - Revolut takes the payment on its own domain, which keeps PCI scope at zero. The panel names the destination ("You'll be taken to Revolut to pay securely") because a payment button appearing after a QR scan is otherwise exactly the shape of a scam.

### Stripe and SumUp - deferred, not removed

`PAYMENT_PROVIDERS` still carries specs for both, and the validation is provider-generic, so bringing them back is a UI change rather than a rewrite. They were dropped for now because:

- A Stripe Payment Link is per price, so each jar size needs its own link and a per-label override.
- Reconciling card payments automatically needs a webhook from the *beekeeper's* Stripe account. The existing `/api/stripe/webhook` is bound to HiveCraic's own account for app subscriptions, so this would need Stripe Connect or a per-user webhook secret - a project in its own right.

### Recording a sale in the P&L

**HiveCraic never learns whether a customer paid** - Revolut settles entirely outside the app - so nothing is ever booked automatically. Booking a tap as income would write revenue that may never have arrived into your accounts, and from there into your tax return.

Instead, each label card carries a **Record a jar sale** button (wallet icon). It opens a short form pre-filled from the label:

| Field | Pre-filled with |
|---|---|
| Jars sold | 1 |
| Price per jar | The label's payment amount |
| Date | Today |
| Note | Blank, e.g. "Athenry market" |

The total is quantity x price, rounded to the penny before it is shown so the figure on screen is exactly the figure stored. Saving writes one **income** row to `financial_records` under the existing **Honey Sales** category, described as e.g. `Wildflower 340 g x 5 (L-2026-08-001)` - the label name, the quantity, and the lot the label currently points at.

Selling five jars at a stall is therefore one record, not five, and no typing beyond the count.

Notes on the implementation:

- `financial_records.category_id` is **NOT NULL**, so the Honey Sales category is resolved by name before saving. If it is missing the form says so and refuses to save rather than writing a broken row.
- The P&L records in euro. If your selling currency is not EUR the form says so and asks for the euro value you actually received - there is no conversion, because we have no rate to trust.
- No webhook, no automatic reconciliation, and deliberately no "payments received" view. A `revolut.me` link has no API, so an automated path does not exist - not now, not later. Card providers could support one, which is a reason to revisit Stripe if reconciliation ever matters more than simplicity.

### Retail channels

Payment is a per-label switch, so a design sold through shops can keep it off while a market-stall design has it on. This matters if you ever wholesale: a payment link lets a customer standing in a shop buy direct from you instead.

## URLs

| URL | Resolves | Status |
|---|---|---|
| `/j/{code}` | Jar label → its current batch | New |
| `/j/{code}?lot=L-2026-08-001` | Jar label → that specific batch | New |
| `/trace/{trace_code}` | A specific batch | **Unchanged** — jars already in circulation keep working |
| `/trace/{trace_code}?w={grams}` | One jar size within that batch | **Unchanged** |

`/j/` is deliberately shorter than `/trace/`: a shorter URL makes a denser QR, which prints smaller and scans better on a curved jar.

## What goes on the printed label

```
+----------------------------------+
|        WILDFLOWER HONEY          |  pre-printed
|         Pure Irish Honey         |  pre-printed
|                                  |
|   NET WEIGHT           340 g     |  pre-printed - one design per size
|                                  |
|   +----------+   LOT  .........  |  <- printed per run, or hand-written
|   | QR code  |   BBD  .........  |  <- printed per run, or hand-written
|   |          |                   |
|   +----------+   Scan to trace   |  pre-printed, never changes
|                  this honey      |
|                                  |
|   Rico Zmarzly, Co. Galway       |  pre-printed
+----------------------------------+
```

Only the lot and best-before date vary per batch, and both must be on the pack by law regardless. Whether printed into the run or written into a placeholder, they cost nothing extra — and they are what makes the lot finder always work.

## Database

### `trace_labels`

Applied via Supabase MCP migration `create_trace_labels`. **There is no SQL file in the repo.**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner → `profiles(id)`, CASCADE |
| `code` | TEXT | Unique. `CHECK` enforces `HJ-` plus 6 characters from an alphabet with no `0/O` or `1/I/L` |
| `name` | TEXT | Non-blank; internal reference only |
| `jar_size_ml`, `jar_weight_g` | INTEGER | Positive when set. Not displayed publicly; `jar_weight_g` keys the lot finder |
| `current_batch_id` | UUID | → `batch_runs(id)`, SET NULL on delete |
| `resolve_mode` | TEXT | `current` \| `pick` \| `landing`. **Only `current` is rendered today** |
| `is_active` | BOOLEAN | Retiring a design without deleting it |
| `public_title`, `public_origin`, `public_story` | TEXT | Presentation overrides |
| `show_story`, `show_origin_map`, `show_apiary_image`, `show_floral`, `show_lot_details`, `show_feedback` | BOOLEAN | Default true |
| `show_payment` | BOOLEAN | Default **false** at the column, so nothing starts asking for money unattended. The form defaults a new label on |
| `payment_amount` | NUMERIC(10,2) | Display price for this jar size. Positive when set |
| `payment_note` | TEXT | <=300 chars, e.g. "Collection from Athenry" |

The payment **account** lives on `profiles`, not here: `enable_jar_payments`, `sales_revolut_url` (`CHECK` enforces HTTPS and <=500 chars) and `sales_currency`. The `sales_` prefix keeps them clear of `stripe_customer_id`, which is HiveCraic's own subscription billing.
| `created_at`, `updated_at`, `assigned_at` | TIMESTAMPTZ | No trigger — the client stamps `updated_at`, and `assigned_at` moves only when the pointer actually changes |

**RLS:** owner-only for all operations. The scan page never reads this table directly — it goes exclusively through the two `SECURITY DEFINER` RPCs below, which bypass RLS. An earlier public-SELECT policy (copied from `qr_tags`, whose scan page *does* read its table directly) was removed: it let anyone enumerate every producer's payment links, internal label names and batch pointers, and bought nothing.

### RPCs

Applied via migration `create_public_jar_label_rpcs`. Both are `SECURITY DEFINER` with `search_path = public, extensions`, `REVOKE ALL FROM PUBLIC` then `GRANT EXECUTE TO anon, authenticated`.

**`get_public_jar_label_info(p_code text, p_lot text default null)`**

Resolves a label to a batch and returns `{ label, batch, requested_lot, lot_found }`. It **delegates to `get_public_batch_info`** for the batch half, so the two public routes cannot drift apart in shape. Returns `NULL` for an unknown or inactive code. `batch` is `null` when the label is unassigned, the batch is not public, or a requested lot did not resolve.

**`get_public_label_lots(p_code text)`**

The lot finder's list: the owner's public batches whose `batch_jars` carry a matching `jar_weight_g` (falling back to the legacy `batch_runs.jar_weight_g` for batches predating `batch_jars`). Capped at 50, newest first.

There is deliberately **no assignment-history table**. The derived list is the same set in practice and avoids a second table plus the write path needed to keep it correct.

### `resolve_mode` — reserved, not yet built

The column carries a `CHECK` listing all three values so the other two can be switched on later without a migration and without reprinting labels. No UI control exists for it, because offering modes that do nothing would be a trap.

| Mode | Behaviour | Status |
|---|---|---|
| `current` | Show the assigned batch, with the lot finder beneath | **Built** |
| `pick` | Show the lot chooser first | Deferred — nearly free once the chooser exists |
| `landing` | Product and producer only, no batch claim at all | Deferred |

## Privacy and security

- **Map coordinates** are offset by up to ±0.01°, derived from a **stable hash** of the apiary rather than a fresh random value per request. A per-request random offset leaks the true position to anyone who loads the page repeatedly and averages the results — and this page is built to be scanned many times over.
- **`/j/` is `force-dynamic`.** A label's batch pointer is meant to change; a cached page could serve a stale pointer, which is precisely the failure this feature exists to prevent.
- **`?lot=` is bounded to 20 characters** (`batch_code` is `varchar(20)`), so nothing longer can match a real lot and an unbounded value cannot be reflected onto a page whose job is to look authoritative.
- Only **public** batches (`is_public = true`) ever surface. Non-existent, non-public and unmatched lots are indistinguishable.

## Files

| File | Role |
|---|---|
| `src/app/(trace)/j/[code]/page.tsx` | The scan page |
| `src/components/trace/TraceCard.tsx` | The provenance card, shared by `/j` and `/trace` so the two cannot drift |
| `src/components/trace/LotFinder.tsx` | Lot chooser + "type your lot" box. A plain GET form, so it works with JavaScript disabled and yields a shareable URL |
| `src/components/tools/traceability/JarLabelsTab.tsx` | Management UI |
| `src/components/trace/PaymentPanel.tsx` | Point-of-sale panel, rendered above the provenance card |
| `src/lib/payment-links.ts` | Provider allowlist and URL validation, shared by the profile form and the public page |
| `src/app/dashboard/profile/page.tsx` | "Selling your honey" setup |
| `src/components/tools/traceability/RecordJarSaleModal.tsx` | Records a sale into the P&L, pre-filled from the label |
| `src/lib/qr-download.ts` | QR download as PNG (rasterised) or SVG (vector, for printers) |
| `src/lib/qr-tags.ts` | `generateTagCode('HJ')` — reused for label codes |
| `src/types/traceability.ts` | `TraceLabel`, `ResolveMode`, `PublicTraceLabel`, `PublicLabelLot`, `PublicJarLabelInfo`, `PublicBatchInfo`, `BatchLabelPointer` |

## Limitations

- **`pick` and `landing` resolve modes** are not rendered (see above).
- **No producer-level copy defaults.** The label layer already removes the per-batch retyping this would have solved; with a handful of designs a third layer earns nothing.
- **No assignment history.** The lot finder's list is derived from jar size, not from what the label actually carried.
- **No payment reconciliation.** Payment hands off to Revolut; HiveCraic never learns whether it completed. Sales reach the P&L only through the manual **Record a jar sale** form.
- **Revolut only.** Stripe and SumUp are deferred - see the payment section.

## Related documentation

- [honey-traceability.md](./honey-traceability.md) — batches, bulk honey, and the per-batch trace page
- [print-labels.md](./print-labels.md) — thermal printing for bulk-container and queen labels
- [qr-tags.md](../feature/qr-tags.md) — the same permanent-code indirection, for hives

## Changelog

### 27 August 2026 (later)

- Added point-of-sale **payment links** (Revolut): account on `profiles` (`enable_jar_payments`, `sales_revolut_url`, `sales_currency`), price per label (`show_payment`, `payment_amount`, `payment_note`), with a shared hostname allowlist enforced on save and again at render
- `get_public_jar_label_info` now returns a `payment` block, emitted only when the producer has enabled selling, a link is set, and the label has payment on
- Added **Record a jar sale**: writes one income row to `financial_records` under Honey Sales, pre-filled from the label and its current lot
- Restricted `trace_labels` SELECT to the owner; the scan path never needed public table reads

### 27 August 2026

- Added `trace_labels` table, `get_public_jar_label_info()` and `get_public_label_lots()` (Supabase MCP migrations)
- Added the **Jar Labels** tab to the Traceability tool, with per-card re-pointing and SVG/PNG QR download
- Added the `/j/[code]` public scan page with the lot finder
- Extracted `TraceCard` from the trace page and shared it between both public routes; `/trace` behaviour unchanged
- Batch form now warns when printed jar labels point at the batch being edited
- Map coordinate fuzzing changed from per-request random to a stable per-apiary hash, closing an averaging attack that also affected `/trace`
