# Filter & selection persistence

## Problem

Filters and apiary/hive pre-selections were not persistent. Returning to a page
reset every filter to its default, so users had to re-pick the apiary/hive (and
other filters) again and again. Only the Hives page persisted anything, and it
used `sessionStorage`, which is wiped when the browser tab/app is closed.

## Approach

Two small, reusable building blocks, applied page-by-page with minimal change to
each page (only the filter declarations move; rendering/filtering logic is
untouched).

### 1. `usePersistentState` — `src/hooks/usePersistentState.ts`

A drop-in replacement for `useState` whose value is mirrored to `localStorage`
(so it survives navigation **and** a full browser/app restart). Return shape is
identical to `useState`.

- SSR-safe: returns the default on the server and reads storage on the client.
  Dashboard filter UIs only mount client-side (behind the auth loading gate), so
  there is no hydration mismatch.
- Optional `validate(value)` callback rejects corrupt or no-longer-valid stored
  values (e.g. an enum option that has been removed), falling back to the default.
- Keys are namespaced under `hivecraic:filters:` to avoid collisions.

### 2. `SelectionContext` — `src/contexts/SelectionContext.tsx`

An app-wide shared "current selection" (`selectedApiaryId`, `selectedHiveId`)
backed by `usePersistentState`. Choosing an apiary/hive on one page carries over
to others. Convention: `''` means "no specific selection" (i.e. all). Pages that
use a different sentinel (e.g. `'all'`) map to/from `''` at their own boundary.

Provided in `src/app/dashboard/layout.tsx` so every dashboard page can consume it.

## What each page now does

| Page | Apiary / hive selection | Other filters |
| --- | --- | --- |
| **Hives** | Shared (`SelectionContext`) | `ownership`, `archive`, `scales`, `sort` persisted per-page (replaces the old `sessionStorage`) |
| **Tasks** | Shared (`SelectionContext`, mapping `'all'` ↔ `''`) | `type`, `category`, `status`, `ownership` persisted per-page |
| **Records** | Shared (`SelectionContext`) | Other record filters (period, ownership, type, archived) persisted per-page; stale shared hive/apiary cleared once data loads |
| **Apiaries** | — | `category` persisted per-page |
| **Queens** | — | `ownership`, `assignment`, `status`, `role`, `apiary`, plus table `sortKey`/`sortDir` persisted per-page (free-text search stays ephemeral) |
| **Reports** (sub-reports) | Shared (`SelectionContext`) | Date window (`timePeriod`/`startDate`/`endDate`) persisted per-report; the chosen report `section` persisted **and** mirrored to `?section=` |
| **Batches / Queen Rearing** | — | `status`, `year`, `apiary`, `period` (+ custom start/end dates) persisted per-page; the active tab continues to live in `?tab=` |
| **CRM Customers** | — | `sort` persisted per-page (search ephemeral) |
| **CRM Orders** | — | `status`, `product` persisted per-page (search ephemeral) |
| **QR tags** | — | `type`, `assigned` persisted per-page |

### Reports — `useReportFilters` hook (`src/hooks/useReportFilters.ts`)

The five date-based reports (Varroa, Archived Hives, DAFM Varroa, Harvest, Hive
Inspection Summary) shared an identical local `filters` object. They now use a
small `useReportFilters(storageKey, defaultDates)` hook that:

- sources `apiaryId`/`hiveId` from the shared `SelectionContext` (so an apiary
  picked on Hives/Tasks carries into reports, and between reports);
- persists the date window per-report via `usePersistentState`;
- returns the same `[filters, setFilters]` shape, routing apiary/hive changes to
  the shared store and date changes to the persisted store — so the existing
  `setFilters(prev => ({ ...prev, ... }))` call sites needed no change.

`ApiaryOverview` (apiary-only, no dates) binds its selector directly to the
shared apiary selection.

### Staleness handling

A persisted/shared apiary or hive id can point at a record that has since been
deleted. To avoid silently filtering out everything:

- **Hives** clears the shared apiary selection if it is not in the account's
  apiary list once apiaries load.
- **Records** (`useRecordFilters`) clears the shared hive/apiary selection if it
  is not present in the account's (comprehensive) hive list once hives load.

## Records — shared selection

Records sources `apiaryId`/`hiveId` from `SelectionContext` (like Hives, Tasks
and Reports) while persisting its other filters per-page. Its `FilterState`
object is one value, so `useRecordFilters` keeps the public
`[filters, setFilters]` + individual-setter API unchanged: apiary/hive setters
route to the shared store, the rest to the persisted store, and `filters` is a
memoised composition of the two (memoised so downstream filtering memos keep a
stable dependency).

## List position memory (added later)

Filters surviving navigation was only half the problem: returning from a hive's detail page (or
closing its edit form) still dumped the user at the **top** of the list. On a large apiary that meant
a lot of scrolling to get back to where they were.

`src/hooks/useListPositionMemory.ts` remembers **which item** the user was last working on, rather
than a pixel offset — the list remounts, refetches behind a spinner (collapsing the document to ~0
height, which discards any native scroll restoration) and can reorder under filters/sorting, so an
offset is not durable.

```ts
const { remember, highlightedId } = useListPositionMemory({
  scope: 'hives',            // → hivecraic:filters:hives:pendingRestore
  items: filteredHives,      // the *filtered* list actually rendered
  ready: !loading,
  elementIdPrefix: 'hive-card-',
})
```

Behaviour and guarantees:

- **Only restores when returning from that item.** The marker is written by `remember(id)` when
  opening the detail view or closing the edit form, is **consumed on first use**, and **expires after
  30 minutes** — so arriving at the list fresh from the navigation behaves exactly as before.
- **Never widens filters to reveal the target.** If the remembered item is not in the current
  filtered list, nothing happens. (Quietly unhiding records to reveal a deep-link target caused a
  past regression.)
- Scrolls with `block: 'center'` and applies a brief ring highlight, so the landing spot is obvious.
- The highlight timer lives in its own effect so unrelated re-renders cannot cancel it.

Applied to **Hives** and **Apiaries** (cards carry `id="hive-card-<id>"` / `id="apiary-card-<id>"`).
**Queens** already had a `?id=` → scroll-into-view effect, so its detail page simply returns to
`/dashboard/queens?id=<id>` and reuses that existing machinery rather than duplicating it.

## Manual testing checklist

- [ ] On Hives, pick an apiary + change ownership/sort; navigate away and back —
      selections remain. Fully close and reopen the browser — still remembered.
- [ ] Pick an apiary on Hives, then open Tasks — the same apiary is pre-selected.
- [ ] On Records, set hive/period/type filters; navigate away and back — remembered.
- [ ] Pick an apiary/hive on Hives or Tasks, then open Records — the same
      apiary/hive is applied (and vice versa).
- [ ] On Apiaries and Queens, change the dropdown filters; navigate away and
      back — remembered.
- [ ] Delete a selected apiary/hive, return to the page — the stale selection is
      cleared (you are not stuck on an empty list).
- [ ] On a report, set the apiary/hive + change the date window; switch to
      another report section and back — the date window is remembered and the
      apiary/hive is shared across reports.
- [ ] Pick an apiary on Hives, then open a report — the same apiary is applied.

### List position memory

- [ ] Scroll down the Hives list, open a hive, then come back — the list lands on that hive,
      briefly highlighted, instead of at the top.
- [ ] Edit a hive from the list and hit Update — after saving you are returned to that hive's card,
      not the top of the page.
- [ ] Cancel an edit — same return behaviour.
- [ ] Open Hives fresh from the sidebar — the list starts at the top (no surprise jump).
- [ ] Open a hive, come back, then leave it 30+ minutes and revisit Hives — starts at the top.
- [ ] Open a hive, come back, then change the apiary filter so it is hidden — no jump, no filter
      is silently changed.
- [ ] Repeat the first check on Apiaries, and on Queens (via the back arrow on a queen).

### Gap-fill round

- [ ] On Batches, set status/year/apiary/period; navigate away and back — remembered.
- [ ] On Reports, open a non-default report (e.g. Queen Failures); navigate away and back — the
      same report reopens. Refresh the page — still the same. Browser back/forward moves between
      reports (the URL carries `?section=`).
- [ ] On CRM Customers change the sort, and on CRM Orders the status/product filters; navigate away
      and back — remembered. Typed search text is **not** remembered (by design).
- [ ] On QR tags change both filters; navigate away and back — remembered.
- [ ] On Queens sort a column, navigate away and back — the sort column and direction are kept.
- [ ] From an apiary's detail page use "View hives" — the Hives list opens filtered to that apiary,
      and the `?apiary=` parameter is stripped from the URL so changing the filter afterwards sticks.
- [ ] Sign out and back in as another account — none of the above are inherited.
- [ ] On Batches select a specific year, then delete the last batch for that year — the year filter
      falls back to "All Years" rather than showing an empty list behind a blank dropdown. Same for
      a persisted apiary that is later deleted.
