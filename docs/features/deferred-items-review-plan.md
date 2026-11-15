# Items left for later — review and plan

**Status:** L1 done 15/11/2026; L2, T1, T2, U1/U2 waiting for decisions · **Date:** 15 November 2026 · **From:** the technology stack review (`tasks/todo.html`), "left for later"

Three items were left over after batches 1–4:

1. the lint findings from the new React rules
2. whether the app may keep the coordinates and town names it looks up
3. Turbopack and React 19.3

All three were researched on 15/11/2026 (code read in full, official documentation fetched).

---

## 1. React rule findings (lint)

`eslint-config-next` 16 added six React Compiler rules. They found 207 issues in existing code, all set to warnings for now.

### 1a. The 38 findings outside `set-state-in-effect`

Every one was read. None misbehaves today: no lost state or focus, no wrong render, no hydration mismatch.

| Rule | Count | What it is | Fix |
|---|---|---|---|
| `immutability` | 9 | 8: an effect calls a function declared *below* it (works, effects run later). 1: a running total kept in a loop variable (`Hive3D.tsx`). | Move each effect below its function; a plain `for` loop in `Hive3D`. |
| `static-components` | 8 | Small sort-arrow icons defined inside a component, so they are rebuilt every render (`DistributionList`, `AssociationManagement`, `GDDTracker`). | Move them to module level and pass the sort state as props. |
| `refs` | 8 | The "latest value" ref written during render (7). A ref read once in a `useState` initialiser (1). | Write the ref in `useLayoutEffect`; in `usePersistentState`, drop the ref and use the value directly. |
| `purity` | 7 | `Date.now()` during render for "days since" and "over 2 years old" (5). `Date.now()`/`randomUUID()` inside tap handlers (2; false positives). | Read the time once per screen with `useState(() => Date.now())`. Handler cases: no change, or a small helper. |
| `preserve-manual-memoization` | 6 | `useMemo`/`useCallback` the React Compiler cannot verify (GDD charts, inspection form). Harmless without the compiler. | Read each exact message, then the smallest change or a disable comment with a reason. |

**Plan L1 (done 15/11/2026):** fix all 38 (24 files, mostly mechanical moves), then switch these **five rules back to errors**, so new code can't reintroduce them.

Done: 35 fixed in code. Three are marked with an explained `eslint-disable` comment because the rule is wrong about them: two clock reads in tap handlers (`records/page.tsx`, `tools/page.tsx`) and the brood box memo in `InspectionForm.tsx`, which must stay a memo for the effect below it. The five rules are errors again; lint has 0 errors. `set-state-in-effect` went from 169 to 177 warnings: the 8 effects moved below their functions can now be analysed, and they are the usual load-in-an-effect pattern.

### 1b. The 168 `set-state-in-effect` findings

| Pattern | About | Real effect today |
|---|---|---|
| Loading flag or fetch started in an effect | 75 | One extra render. Some are false positives. |
| State that is really derived from other state | 22 | **One render with a stale value** (e.g. a filtered list lagging) |
| Reset when an id, prop or dialog changes | 15 | **Stale first render** (e.g. an edit form showing the previous hive for a moment) |
| Clearing results when input is too short | 16 | One extra render |
| Address-bar values copied into state | 14 | One frame of the default tab |
| Browser-only values read after start-up | 11 | Needed; avoids a mismatch |
| Form pre-fill, one-off start-up | 14 | None |

**Recommendation L2:** keep `set-state-in-effect` as a **warning** and don't rewrite 168 places. Most are a style preference of the React Compiler, which HiveCraic doesn't use.

The ~37 "derived state" and "reset" cases cause a real one-render flash. They are worth fixing as a later, separate batch, starting with the field screens: inspection form, records, hive detail.

---

## 2. Keeping looked-up locations (terms)

### Mapbox: the town name from tapping the map

Mapbox's documentation is explicit:

- "Temporary results are not allowed to be cached, while Permanent results are allowed to be cached and stored indefinitely."
- The standard lookup is temporary.
- Permanent needs a card on the Mapbox account. Pricing (read from Mapbox's pricing page, to be confirmed at checkout) is about **$5 per 1,000 lookups, no free tier**. HiveCraic does a handful a month (one per map tap while setting an apiary location), so pennies.

HiveCraic saves that town name in the apiary record, which the temporary lookup does not allow.

| Option | Change |
|---|---|
| **T1-a (recommended)** | Ask for a permanent result: the v6 lookup with `permanent=true`. Needs a card on the Mapbox account (you). About 10 lines. |
| T1-b | Stop filling the town in automatically; the beekeeper types it. Removes a convenience. |
| T1-c | Leave it (low practical risk, but against the terms as written). |

### Google: coordinates from "Get coordinates"

Google's policy page (`developers.google.com/maps/documentation/geocoding/policies`) says latitude and longitude may be cached "for up to 30 consecutive calendar days, after which you must delete the cached coordinates". Place IDs may be stored indefinitely.

HiveCraic saves the coordinates permanently. Google's fuller terms page could not be read, so two things are unconfirmed:

- whether showing Google results on a Mapbox map is allowed
- whether a location the beekeeper confirms counts differently

Google is kept because it is the only service found that resolves Eircodes correctly (`irish-grid-reference.md`).

| Option | Change |
|---|---|
| T2-a | "Get coordinates" only **moves the map pin** to Google's suggestion. The saved position is the pin the beekeeper confirms. Whether that makes it the beekeeper's own data is not stated in what could be read. |
| T2-b | Store Google's place ID as well and refresh coordinates within 30 days: complex, and not sensible for a location that doesn't move. |
| **T2-c (recommended for now)** | Keep as is, and get a definitive answer. Read the Service Specific Terms (Geocoding section) yourself in a browser, or ask Google, and decide then. |

---

## 3. Turbopack and React 19.3

| Item | Findings | Recommendation |
|---|---|---|
| **Turbopack** | Sentry uploads source maps under Turbopack. But its tree-shaking (stripping debug and tracing code) is "not supported for Turbopack builds at the moment", so the app download grows. Other differences: chunk naming (the service worker caches `/_next/static/`), CSS rounding, and untested libraries (Mapbox worker, 3D, PDF). The benefit is faster builds for the developer only; nothing changes for beekeepers. | **Not now.** Revisit when Sentry supports tree-shaking on Turbopack. |
| **React 19.3** | Released 09/09/2026, no breaking-changes section. Makes **View Transitions** stable, which is what the native-feel plan's Phase F needs. Needs `@react-three/fiber` 9.8.2 (adds 19.3 support). Whether Next.js 16.4 has been tested with it is not stated. | **Do it together with the View Transitions work (Phase F),** not on its own, since that is its only benefit. |

---

## Decisions needed

- [x] **L1:** fix the 38 findings and switch those five rules back to errors (done 15/11/2026)
- [ ] **L2:** keep `set-state-in-effect` as a warning; schedule the ~37 real one-render flashes as a later batch (recommended)
- [ ] **T1:** Mapbox town name: a) permanent lookup, needs a card on the Mapbox account (recommended); b) stop auto-filling; c) leave
- [ ] **T2:** Google coordinates: a) pin-confirm; c) keep and check the terms yourself (recommended)
- [ ] **U1/U2:** Turbopack not now; React 19.3 with Phase F (recommended)
