# Batch 25: Admin, Tools and Exports (Request Chains)

**Status:** Implemented 22/10/2026, waiting for the owner's test.
**Checklist:** `tasks/security-batch25-todo.html`
**Findings:** C2-10 and C2-15, C9a-20, C9a-21 and C9a-23 (admin), C8a-08 to C8a-10 and C8b-18 (Tools, CRM), C7b-20, C7b-21 and C7b-02 (research), the race part of C8b-13, and a new data-loss bug in the exports. This is Phase 2 fix batch 12, and the last request-chain batch after batches 23 and 24.

## Exports: the 1,000-row data loss and C2-10

Supabase returns at most 1,000 rows per request. The settings export for regular users and the member export (profile page, JSON and CSV) both read each table with a plain `select('*')`, so larger tables were cut to 1,000 rows with no error. Live tables already over that size:

| Table | Rows |
|---|---|
| `knowledge_base` | 5,609 |
| `changelog` | 2,397 |
| `inspections` | 1,888 |

- **`fetchAllRows(client, table, filter?)`** (`src/lib/database-export.ts`): pages with `.range()` (`EXPORT_PAGE_SIZE = 1000`) until a short page comes back.
  - **Order:** pages are ordered by `id`. `batch_breeder_queens` is the only export table without `id` (checked live), so it is ordered by its primary key `(batch_id, queen_id)`.
  - **Assumption:** this relies on PostgREST's row limit staying at 1,000 or more, the same as the admin route.
- **Settings export (regular users):** 72 tables one after another → 6 at a time with `mapInGroups`, every row. The SQL is still written in table order.
- **Member export:** `fetchUserExportData` already loaded its tables together; each now reads in full.
- **Admin export route (C2-10):**
  - The 13 schema look-ups run together in one `Promise.all`. The nine required ones still fail the export on error. The four optional ones (`auth.users`, `auth.identities`, storage buckets and policies) go through `optionalRead`, which records the error for the summary exactly as the old try/catch blocks did.
  - The 72 tables run 4 at a time. Each table's pages stay in order, and the output keeps the table order.
- **Shared helper:** `mapInGroups(items, fn, size)` moved from Mel's scale tools into `src/lib/supabase-chunk.ts`.
- **Pre-existing, not changed:** the settings export's `profiles` table fails, because `profiles` has column-level grants and `select('*')` is refused. It shows under "tables with export errors", as before.

## Admin (C9a-20, C9a-21, C9a-23, C2-15)

- **`TicketManagement` fallback:** one or two `profiles` look-ups per ticket → one `fetchInChunks` look-up for every submitter and resolver. The fallback now also applies the status filter (it showed every ticket whatever filter was selected).
- **`UserManagement` transfer dialog:** `/api/admin/user-apiaries` and `/api/users/list` load together.
- **`/api/admin/user-apiaries` (C2-15):** one count query per apiary → `select('id, name, city, hives(count)')`. There is exactly one foreign key from `hives` to `apiaries` (checked).

## Tools, finance and traceability (C8a-08 to C8a-10, C8b-18)

- **`fetchDropdownValues(categoryKey)`** (`src/lib/dropdown-values.ts`): returns the active values of one category in display order. It's one query, `dropdown_categories!inner(category_key)`, instead of the category id followed by its values (one foreign key, checked). It's used by:
  - Profit & Loss (4 sequential round trips → 1)
  - Purchases
  - Traceability jar sizes
  - Research key events
  - the GDD tracker

  Record Jar Sale uses the same join inline for its single "Honey Sales" value. Errors are logged; before, they silently gave empty lists.
- **GDD tracker** (apiaries, vegetation types, records) and **containers** (harvests and linked harvests): their independent loads run in one `Promise.all`, and errors are logged.
- **Traceability batch preview:**
  - The profile and apiary look-ups run together.
  - The harvests look-up is removed, because `floral_source` already comes with the containers' harvests (`TraceabilityTool.fetchContainers`).
  - A `cancelled` flag in the effect cleanup stops an older preview overwriting a newer one (the race part of C8b-13; the lb→kg part stays open).
  - The batch list no longer embeds `container:bulk_containers(*)`, which nothing read.
- **CRM order page (C8b-18):** recipient labels load together with the customer, their order totals and credit (3 steps → 2).
- **CRM invoice:** the customer is embedded in the order query (`customer:crm_customers(*)`, read with `firstOf`), which removes a second round trip. The order and its customer always share an owner (11 of 11 live).

## Research and profile (C7b-20, C7b-21, C7b-02)

- **`DiagnosisImagesTab`:**
  - Images and comments load together.
  - The comments query drops its `.in()` of every image id, which broke the URL after a few hundred images. The read policy `Users can view comments on images they can see` already returns exactly the comments on images the user can see (checked live). Comments are still matched to the loaded images.
  - Commenter names use `fetchInChunks`.
  - try/finally always stops the spinner.
- **`WildColoniesTab` (C7b-02):** both lists load together. try/finally stops the spinner on errors; before, an early return left it running for good. The pending-list error is now logged.
- **Profile page:** `initUser` no longer calls `supabase.auth.getUser()` and `getUserRole()`. Both results went into state the page never read, and the page waited for both before showing.

## Not changed

- **`QueenProductivityTracker`** is imported nowhere and queries `harvest_records` and queen columns (`name`, `installation_date`, `hive_id`) that don't exist (checked). It belongs to the dead-component clean-up (C8a-05).
- **`/api/users/list`** returns no `email`, so the transfer dialog's confirmation can't show one. This is minor and separate.

## Verification

- `tsc --noEmit`: 0 errors.
- `eslint` on all 21 changed files: clean.
- Tests: 818 passed, 23 skipped.
- qa-engineer: no Critical or High issues.

## Rules

- An export, or any read that must be complete, uses `fetchAllRows` (paged). A plain `select('*')` stops at 1,000 rows without an error.
- A dropdown category's values come from `fetchDropdownValues`, never a category look-up followed by a values look-up.
- Many tables or vendor calls go through `mapInGroups` (a few at a time, results in order).
