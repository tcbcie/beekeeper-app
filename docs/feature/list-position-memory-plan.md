# Feature Plan: Remember my place in a list (list position memory)

**Date:** 25/07/2026
**Status:** Planned — awaiting approval

## 1. User feedback

> "When I'm going through my hives and reviewing previous inspections or editing various things.
> When I hit update or back to hives it goes back up to the first hive. It would be good if it stayed
> on the hive you have just viewed or edited. So I can see the changes and move on to the next.
> There's a lot of screen sliding when you have numerous hives in apiary."

## 2. Key finding from exploration — the request splits in two

| Concern | Current state |
|---|---|
| **Filter persistence** | **Already built and documented** — `docs/features/filter-persistence.md`, via `usePersistentState` (localStorage, `hivecraic:filters:` namespace, wiped on sign-out) + `SelectionContext`. Hives, Tasks, Records, Apiaries, Queens, Reports already persist their filters. |
| **Position / "stay on the hive I just viewed"** | **Does not exist anywhere.** Zero scroll restoration in the repo — no `scrollRestoration`, no saved `scrollY`, no `scroll={false}`. |

So this is **not** mainly a filter-persistence job. The filters already survive; it is the *place in the list*
that is lost. Filter gap-fill is a smaller, secondary workstream (§6).

## 3. Why the hives list specifically loses your place

Four independent causes, all verified:

1. `src/app/dashboard/hives/[id]/page.tsx:181` returns via `router.back()`.
2. `src/app/dashboard/hives/page.tsx:328` renders a full-page spinner while `useHivesList` refetches
   (a large multi-table fetch). The document collapses to ~0 height, so **any** browser-native scroll
   restoration is discarded before the content exists.
3. `HiveListCard` renders **no DOM `id` and no `data-*` attribute** — there is literally no anchor to
   scroll back to. (Queens, Records, Tasks and Nucs all have one; Hives is the odd one out.)
4. **The edit flow actively scrolls to the top.** `hives/page.tsx:61-72` `handleEdit` opens the inline
   form and calls `scrollIntoView({ block: 'start' })` — so editing any hive always jumps to the top.
   This is the "when I hit update" half of the complaint.

## 4. Approach — anchor to the *item*, not to a pixel offset

Restoring a raw `scrollY` is unreliable here (the list remounts, refetches, and collapses to a spinner;
filters/sorting can reorder rows). Instead, remember **which item you were last on** and scroll to it
once it is actually rendered.

This also matches the app's existing, proven convention (deep link → apply minimum filters →
`scrollIntoView` → brief highlight), used in `tasks/page.tsx:644-656` and `records/page.tsx:477-489`.
That "Variant A" is the robust one — it waits for the item to exist in the *filtered* list and uses
`requestAnimationFrame` rather than racing a `setTimeout`.

### New shared hook — `useListPositionMemory(scope)`

```ts
// scope e.g. 'hives' | 'queens' | 'apiaries'
const { lastVisitedId, remember, clear } = useListPositionMemory('hives')
```
- Backed by the existing `usePersistentState` under `hivecraic:filters:<scope>:lastVisited`, so it
  inherits the namespace, the sign-out wipe (`clearPersistedFilters`), and the SSR-safe read.
- `remember(id)` is called when navigating to a detail view or saving an inline edit.
- On list mount, once the filtered list contains `lastVisitedId`, scroll it into view
  (`block: 'center'`, `behavior: 'smooth'`) and apply the existing highlight ring briefly.
- A `hasRestoredRef` guard ensures it runs **once** per mount, so it never fights the user's own
  scrolling afterwards.

### New shared hook — `useScrollToListItem` (extraction, not new behaviour)

The highlight-and-scroll effect is currently duplicated **5×** (tasks, records, queens, MatingNucsTab,
ManageNucsTab) in two competing variants. Extract the robust variant once and reuse it for both the
existing deep links and the new position memory. Pure refactor for those call sites.

## 5. Workstream A — the actual fix (Hives first)

1. Add a stable anchor: `id={`hive-card-${hive.id}`}` on `HiveListCard`'s root (matching
   `task-card-*` / `record-card-*` naming).
2. `remember(hive.id)` when opening a hive ("Overview & Records" → `router.push`) **and** when opening
   the inline edit form.
3. On the hives list, restore to `lastVisitedId` after load.
4. **Fix the edit-jumps-to-top behaviour**: after a successful inline update, return the user to that
   hive's card instead of leaving them at the top of the page.

Then apply the same three lines to the other detail-bearing lists: **Queens**, **Apiaries**
(Queens already has refs + a `?id=` scroll effect to reuse; Apiaries has no anchor yet, like Hives).

## 6. Workstream B — filter-persistence gap-fill (secondary)

Extend the *existing* convention (no new mechanism) to pages that still reset:

| Page | Not persisted today |
|---|---|
| Batches / Queen Rearing | `filterStatus`, `filterYear`, `selectedApiary`, `timePeriod` (only `activeTab` is, via `?tab=`) |
| Reports | `activeSection` is read from `?section=` but **never written back**, so it resets to DAFM |
| CRM Customers / Orders | `sortBy`, `statusFilter`, `productFilter` |
| QR tags | `tagTypeFilter`, `assignedFilter` |
| Queens | `sortKey` / `sortDir` |

Deliberately **excluded** (existing decisions to respect):
- **Free-text search stays ephemeral** — stated convention in `filter-persistence.md`.
- **Queens apiary filter stays page-local**, not folded into `SelectionContext` (`queens-apiary-filter.md`
  made this choice consciously).
- Transient UI state (selection mode, open menus, form state) is not persisted.

## 7. Risks / constraints

- **Do not fight the user's scroll.** Restore once per mount, never on refetch.
- **Do not unhide records to reveal a target.** A prior regression — *"dashboard record deep links
  unhide archived hives before filtering"* — came from exactly this. If the remembered hive is not in
  the current filter set, **do nothing** (no silent filter mutation).
- Stale ids: a remembered hive may be deleted/archived. Treat a miss as a no-op (the existing
  stale-selection pruning pattern in `useRecordFilters.ts:84-88` is the precedent).
- Respect reduced-eyesight users: `block: 'center'` plus a brief highlight makes the landing spot obvious.

## 8. Incidental bug found (small, worth fixing)

`src/app/dashboard/apiaries/[id]/page.tsx:165` links to `/dashboard/hives?apiary=<id>`, but the hives
page never reads `useSearchParams` — **the `?apiary=` parameter is silently ignored**. The list shows
whatever apiary is in the persisted shared selection instead.

## 9. Out of scope

- True pixel-level scroll restoration across the whole app.
- Virtualising long lists (a separate performance concern).
- Reworking navigation structure or the detail pages themselves.

## 10. Confirmed decisions

- **Restore trigger:** *only when returning from that item* — never on a fresh visit from the sidebar.
  Implemented as a **consume-once pending marker** (`{ id, ts }`) with a **30-minute TTL**, so a marker
  left over from yesterday cannot jump the list.
- **Scope:** Hives first (including the edit-jumps-to-top fix), then Queens and Apiaries.
- **Filter gap-fill (§6):** deferred to a separate follow-up.

Two distinct mechanisms fall out of this:
- **Cross-navigation** (detail → back): the persisted pending marker.
- **Inline edit save** (same page, no navigation): scroll straight back to the card once the form
  closes — no persistence needed.

## 11. Review

Implemented per the confirmed decisions.

- **New `src/hooks/useListPositionMemory.ts`** — consume-once, 30-minute-TTL pending marker stored via
  the existing `usePersistentState` (so it inherits the `hivecraic:filters:` namespace and the
  sign-out wipe). Waits for the target to appear in the *filtered* list; if the filters exclude it,
  does nothing rather than widening them. Exposes `remember(id)` and `highlightedId`, plus a
  `scrollToListItem` helper. The highlight timer sits in its own effect so re-renders of `items`
  cannot cancel it, and the guard is keyed on the marker timestamp (not once-per-mount) so a second
  edit on the same mount still restores.
- **Hives** — `HiveListCard` gained `id="hive-card-<id>"`, a `highlighted` ring and an `onOpen` hook
  called before `router.push`. The page wires the memory hook, and `closeForm` now remembers the
  edited hive so the user is returned to its card after Update/Cancel (routed through the same
  marker because saving refetches behind a spinner, unmounting the card).
- **Apiaries** — same treatment (`id="apiary-card-<id>"`, `highlighted`, `onOpen` on the title Link).
- **Queens** — no new machinery: the detail page's back arrow now returns to
  `/dashboard/queens?id=<id>`, reusing the page's existing scroll-into-view effect.
- **Docs** — `docs/features/filter-persistence.md` extended with a "List position memory" section and
  manual test checklist items.
- **Verification** — `tsc --noEmit` and `eslint` clean on all changed files.

Deliberately unchanged: `handleEdit` still scrolls up to the form (the form *is* at the top — that
part is correct); only the return path was wrong. Filter gap-fill (§6) remains a follow-up.

### Post-implementation QA hardening

- **Marker write raced the unmount (High).** `remember()` only set React state, and
  `usePersistentState` persists via an effect — but every caller navigates away in the *same tick*.
  The write survived solely because React happens to flush passive effects before the unmount commit;
  had it not, the feature would silently do nothing (precisely the reported symptom). Added
  `writePersistedValue(key, value)` to `usePersistentState.ts` for a synchronous write into the same
  namespace (so the sign-out wipe still covers it), and `remember()` now uses it alongside the state
  update.
- **`prefers-reduced-motion` ignored (Medium).** `scrollToListItem` always animated. It now degrades
  to an instant jump when the OS requests reduced motion — relevant for this audience.
