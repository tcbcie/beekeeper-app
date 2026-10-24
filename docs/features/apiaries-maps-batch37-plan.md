# Batch 37: Apiaries and Maps

**Status:** Implemented 24/10/2026, waiting for the owner's test.
**Checklist:** `tasks/security-batch37-todo.html`
**Database:** no change.
**Findings:** C7a-06, C7a-08 to C7a-15 and C7a-18 to C7a-21 are fixed. C7a-16 is accepted (the owner's decision). This is Phase 2 fix batch 24. Three agents checked each finding against the code.

## A. Apiaries list (`apiaries/page.tsx`)

- **C7a-06:**
  - **The bug:** `if (categoryFilter === 'shared' && !isTeamMember) setCategoryFilter('all')` ran during render. `isTeamMember` starts false, so a saved "Shared" choice was overwritten on every load.
  - **The fix:** it is now an effect gated on `!loading`.
- **C7a-08:**
  - **The bug:** the conservation area upsert read `formData.latitude/longitude`. Save may geocode the Eircode into local `latitude/longitude`, so an Eircode-only apiary got no conservation area, or lost its existing one.
  - **The fix:** it now uses the resolved values.
  - **Also fixed:** a conservation area error after the apiary row is saved now shows a warning and closes the form. Before, it was thrown, the form stayed in "new" mode, and saving again inserted a duplicate apiary. The save's error message now reads `.message` from Supabase's plain-object errors.
- **C7a-11:**
  - **The bug:** the active hives and their inspections were read in one request each. Past 1,000 rows the oldest dropped, and long `.in()` lists can overflow the URL.
  - **The fix:** they now read through `fetchInChunks` + `fetchAllPages`. The newest date per apiary is kept explicitly, because chunks merge out of order.
- **C7a-12 / C7a-13:**
  - **Loads are numbered:** `fetchApiaries` numbers each load (`fetchSeqRef`). An error on the apiaries, hives or inspections query keeps the current list and shows "Couldn't load your apiaries…".
  - **One load per visit:** the start-up effect depends on `[router]` only (the request-chains rule), so the list loads once, not twice.

## B. Apiary detail (`useApiaryDetail`, `apiaries/[id]/page.tsx`)

- **Load guard:** `mountedRef` is replaced by a load sequence ref, which unmount retires.
- **Load errors:** a load error other than PGRST116 sets `loadError`. The page then shows "Couldn't load this apiary" with **Try again** and **Back to Apiaries**. A PGRST116 error (no visible row) still shows "Apiary not found".
- **Recent records:** failed recent-record queries show "Some recent records couldn't be loaded" rather than passing "No inspections yet" off as fact.

## C. Location picker (`MapLocationPicker.tsx`)

- **C7a-09:**
  - **The bug:** the map's click handler is registered once, so it held the first render's `updateOverlapLayer` (with `mapLoaded` false). The purple overlap zones were never drawn on tap, drag or initial load.
  - **The fix:** every parent echoes `onLocationChange` back as props, so the coordinates effect now recalculates the overlap and draws the zones with fresh closures.
- **Found on the way:** `otherApiaries` was a new array each render. That re-created `updateCircle` and re-ran the coordinates effect, with its `flyTo`, on every render. It is now `useMemo`'d, and the omitted-prop default is a shared `NO_APIARIES` constant.
- **C7a-10:**
  - **The fix:** `flyTo` now only runs when the pin is off-screen or the map is below zoom 10 (the zoom-6 Ireland view). It flies to `max(currentZoom, 14)`, so it never zooms out. "Use my location" still flies.
- **Bottom controls:** moved to `bottom-8` so they don't cover the Mapbox credit.

## D. Apiary layout map

- **C7a-14:** `useApiaryMap.reload` no longer calls `setLoading(true)`. A reload after a failed bench move, resize or delete updates the canvas in place instead of unmounting it.
- **C7a-15:**
  - **The fix:** `entranceRelation` (exported from `HiveInspectorPanel`) scales the % offsets by `dims.widthUnits/depthUnits` before `atan2`.
  - **Where `dims` comes from:** `YardMap` and `YardScene3D` pass `dims={yardDims}`.
  - **Test:** `tests/components/apiaries/entrance-relation.test.ts`.
- **C7a-19/20:** sizes go to 48px:
  - the hive and bench turn handles (`h-12 w-12`; the hive handle moves to `-top-[64px]`)
  - the bench grab tab (`h-12`)
  - the "3D view", "2D map" and "Open 2D apiary map" links (`min-h-[48px]`)
  - the 3D hive picker buttons (`min-h-[48px]`)

## E. Community map

- **C7a-18:**
  - **The fix:** the DCA popup is built as DOM. The escaped markup goes into a `div`, the "Drones seen" / "No drones" buttons are created with listeners, and the popup uses `setDOMContent`.
  - **What's removed:** the `window.__dcaConfirm` global and its effect.
  - **Errors:** a failed save shows a toast.
  - **CSP:** it still worked under today's CSP (`'unsafe-inline'`), but would have broken under nonces.
- **C7a-19/20:**
  - **Popup text:** inline popup font sizes go from 10–12px to 14px. `globals.css` sets `.mapboxgl-popup-content { font-size: 14px }`, because popups inherited the map's 12px.
  - **Toggles:** layer toggle labels go to 14px, with 16px eye icons.
  - **DCA controls:** the DCA buttons are 14px/48px, and "Predict DCAs" is 48px.
  - **Other controls:** the radius and time selects are 48px tall; the map style, fullscreen and close buttons are 48px wide.
- **C7a-16 (accepted):** toggles still rebuild every marker. It's a few dozen markers, and "all apiaries" is one clustered layer. Splitting the 450-line effect next to the batch 30 style-reload fix was judged not worth the risk.

## F. Credits: C7a-21

- **Trace map:** the Leaflet map on the public trace pages (`ApiaryAreaMap`) had `attributionControl: false` and no tile attribution. It now shows "© OpenStreetMap contributors", as the OSM tile policy requires.
- **Mapbox maps:** these already showed their credit.

## Rules

- A component's derived arrays used in effect or callback dependencies must be memoised. An omitted array prop needs a module-level default, not `= []`.
- Map popups with buttons are built as DOM with listeners, never inline `onclick` or window globals.
- Directions on the apiary map use real proportions (`YardDims`), not raw percentages.
