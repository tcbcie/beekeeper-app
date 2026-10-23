# Batch 30: Community Map, Tap Targets and Sign-in Deep Links

**Status:** Implemented 23/10/2026, waiting for the owner's test.
**Checklist:** `tasks/security-batch30-todo.html`
**Findings:** C7a-01, C7a-05, C5a-04, C5a-05 and C7b-05, plus the batch 29 deep-link follow-up. This is Phase 2 fix batch 17. Only the tooling High items remain after this.

## A. Community map (`src/app/dashboard/community-map/page.tsx`, mapbox-gl 3.17)

- **C7a-01, blank fullscreen:**
  - **The problem:** fullscreen returned a different tree, so the div holding the Mapbox canvas was unmounted. The map stayed bound to the detached div, and the init effect never ran again.
  - **Now:** there is one tree. The map frame's className switches between the card and `fixed inset-0 z-50`. An effect on `isFullscreen` calls `map.resize()` in the next frame; Mapbox only resizes with the window.
- **C7a-05, overlays lost on style change:**
  - **The problem:** `setStyle` wiped the GeoJSON layers (flight radii, conservation areas, DCA), and nothing redrew them. Toggling during a load threw. `once('style.load')` per click could add `mapbox-dem` twice, and a no-op style change never fired `style.load`, leaving the listener pending.
  - **Persistent handler:** a `style.load` handler, registered at init, marks `styleReadyRef`, adds terrain only if `getSource('mapbox-dem')` is empty, and bumps `styleVersion`.
  - **Gated overlay effect:** the overlay effect waits for `styleReadyRef` and has `styleVersion` in its deps, so it redraws after every style load.
  - **`handleStyleChange`:** ignores the current style, clears `styleReadyRef`, and calls `setStyle(…, { diff: false })` so a full rebuild, and so `style.load`, always happens.
  - **Typing:** the options are typed via `Parameters<typeof map.current.setStyle>[1]`. Mapbox's type also requires the font fields, and passing them would replace the map's defaults.
  - **Why a ref, not `isStyleLoaded()`:** in v3 that also stays false while tiles load, which would skip redraws.

## B. Tap targets (C5a-04, C5a-05, C7b-05)

- **Nuc actions and tracker outcome icons:** `MatingNucsTab` (Distribute, History, Edit, Delete, Retire) and `QueenTrackerTab`'s `OutcomeActionIcon` now have a 48×48 button with the same 28px circle inside (an inner span). Icons go from 13 to 15px, and each button has an `aria-label`. The tracker's four icons sit in a 2×2 grid to keep the column narrow, and the nuc row already wraps.
- **`CellFrame`:**
  - The status `<select>` and date input go from 10px text at about 22px tall to `text-sm` at `min-h-12`, with `aria-label`s.
  - The cup goes from 40 to 48px; the breeder label from 10px to `text-sm`.
  - Fail gets `min-w-12`, an 18px icon and an `aria-label`. It now asks first (`useConfirm`), because one tap marked a cell failed.
  - Cells are a fixed `w-24`, so the frame scrolls sideways (`overflow-x-auto`, as before) instead of squashing.
- **`KeyEventsOverlay`:** Edit and Delete go from about 21px with no label to 48px buttons with `aria-label`s and 16px icons. Delete asks "Delete this event?" through `useConfirm` before removing. The list grows from `max-h-40` to `max-h-64`.

## C. Back to the right page after signing in

- **Correction to batch 29:** the dashboard layout renders a skeleton, not the page, until a user is known. So signed-out visitors never reach the pages' own `router.push('/login')`; the layout's 1.5-second redirect is the only one that runs.
- **`src/lib/login-path.ts`, `loginPath()`:** returns `/login?redirect=<current path>` when `safeRedirectPath` allows the path and it isn't `/dashboard` itself; otherwise plain `/login`. Browser only.
- **Layout:** the redirect uses it, so a hive or nuc QR code (`/dashboard/hive-scan/tag/<code>`) scanned while signed out returns to the hive after sign-in.
- **Unchanged:** sign-out, deactivation, account deletion and password reset still go to a plain `/login`. Leaving the dashboard unmounts the layout and cancels its timer.
- **Docs corrected:** `docs/features/hive-qr-scanning.md` named the deleted `hive-scan/[id]` page, and the batch 29 note is corrected.

## Verification

- `tsc --noEmit`: 0 errors.
- `eslint` on the 7 changed files: clean.
- Tests: 818 passed, 23 skipped.
- qa-engineer: no Critical or High issues.

## Rules

- A Mapbox container must stay mounted. Switch its frame with classes, never by rendering a different tree.
- Redraw style layers on `style.load`, gated by a ready flag; add sources only after `getSource` finds none.
- Icon buttons get a 48px tap area (an inner span can keep the small visual) and an `aria-label`. Destructive one-tap actions ask first with `useConfirm`.
- A signed-out redirect to login uses `loginPath()`; sign-out flows use a plain `/login`.
