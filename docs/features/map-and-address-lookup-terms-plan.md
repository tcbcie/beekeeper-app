# Map and address lookups within their terms — plan

**Status:** approved 15/11/2026 (C1-a) and built · **Date:** 15 November 2026 · **From:** batch 3 of the technology stack review (`tasks/todo.html`, S2–S4, H4)

## Why

HiveCraic is a paid app, and it uses two free OpenStreetMap services in ways their usage policies don't allow:

- **The trace page map:** the jar-label trace page draws its map from OpenStreetMap's volunteer tile servers, which are not meant for apps. They can block a site without warning, and the map on every jar's page would go blank.
- **Address lookups:** in three places the app asks Nominatim, OpenStreetMap's free address service, straight from the user's phone. Its policy allows only light use and needs an identification a browser can't send.

## Correction to the stack review

The review said Mapbox's place-name lookup (v5) was "replaced by v6". Mapbox's documentation (read 15/11/2026) says v5 can still be used for places "without interruption", with no end date; only its points-of-interest data was removed. So it stays on v5. The real fault is that the call has **no time limit**.

## What changes

### A. Trace page map: OpenStreetMap tiles → Mapbox (removes Leaflet)

- `src/components/maps/ApiaryAreaMap.tsx` is rewritten with Mapbox GL, the map library the app already uses. It shows the same picture:
  - the same approximate centre (already blurred twice for privacy, unchanged)
  - the same amber 5 km circle
  - the map fitted to the circle
  - no panning or zooming
  - the map credit shown, as Mapbox requires
- It stays loaded only on demand (the existing wrapper) and only when the apiary shares its location.
- The circle helper, `createCircleGeoJSON`, exists as two identical copies (location picker and community map). It moves to one shared file, `src/lib/geo-circle.ts`, used by all three.
- `leaflet` and `@types/leaflet` are removed.
- No security-policy change: Mapbox is already allowed. The only visible difference is the map style, which matches the rest of the app.
- Trace page map views now count towards the Mapbox account's free monthly map loads (low traffic expected).

### B. Apiary form: no Nominatim fallback

- `src/app/dashboard/apiaries/page.tsx` already asks the app's own server route first: Google, signed in, rate-limited. UK postcodes go to postcodes.io first.
- Nominatim is only a last resort, for a place name or UK postcode that Google missed. That step is removed.
- On a miss, the form shows the existing "Drop a pin on the map instead" message and opens the map, as it does for Eircodes today.

### C. Inspection weather for apiaries without a map position

`src/lib/apiary-weather.ts` uses saved coordinates. Only when an apiary has an Eircode but no coordinates does it ask Nominatim. **14 of 108 apiaries are in that state** (live database, 15/11/2026).

That path also has a known fault (`docs/features/dashboard-apiary-weather.md`): when the lookup fails, it records **Dublin or Belfast weather** for the inspection without saying so.

**Decision needed (C1):**

| Option | What happens for those 14 apiaries | Change |
|---|---|---|
| **C1-a (recommended)** | The Eircode is looked up through the app's own route (Google, the same lookup the apiary form uses). If that fails (no signal, signed out, limit reached), the inspection gets **no** weather rather than the wrong city's. | about 15 lines in `apiary-weather.ts` |
| C1-b | No lookup at all: those apiaries get no automatic weather until a map pin is set. | Remove the lookup |

Either way the wrong-city fallback goes.

### D. Map pin place name: add a time limit

`src/components/MapLocationPicker.tsx`, the town name filled in when you tap the map:

- add an 8-second time limit
- add a check that the reply was successful

On poor signal it could otherwise hang without end. It stays on Mapbox v5 (see the correction above).

### E. Tidy-up

- The security policy drops `nominatim.openstreetmap.org`.
- The privacy page entry "Google, postcodes.io and OpenStreetMap" becomes "Google and postcodes.io".
- Feature documents updated:
  - `honey-traceability.md`: the map is Mapbox, and it is not interactive.
  - `irish-grid-reference.md`: message wording.
  - `dashboard-apiary-weather.md`.
- The stack review is ticked.

## Your check after deployment

- **Trace page:** open a jar label's trace page. The map shows the amber circle, with the map credit visible.
- **Apiary by place name:** add or edit an apiary with only a town name, then press "Get coordinates". Then the same with a UK postcode, ticking "UK/NI".
- **Map pin:** tap a spot. The town name fills in.
- **Inspection weather (C1-a):** start an inspection for an apiary with an Eircode but no map pin. Weather fills in.

## Risks

- **Address lookups:** a place name that Nominatim found but Google doesn't will now go to the map pin. The pin is already the reliable path.
- **Shared rate limit (C1-a):** weather lookups share the 60-per-hour lookup allowance with the apiary form. One inspection uses one lookup, so it is unlikely to matter.
- **Tests:** `tests/app/dashboard/records-weather.test.tsx` tests its own copy of the old Nominatim code, not the app's. It keeps passing but no longer describes the app. Flagged here; per the QA rules I don't rewrite tests unless you ask.

## Not in this batch: a terms question for you

Mapbox's documentation says ordinary lookup results "may not be retained" (storing them needs Mapbox's paid permanent option). Google's terms also limit how long looked-up coordinates may be kept; that part is from my own knowledge, not read today.

HiveCraic saves the town name from the map tap, and the coordinates from Google, in the apiary record. The beekeeper confirms them, so the practical risk is low. It is worth a look at the Mapbox and Google terms, or a question to them, before the app grows. I am not changing anything about it in this batch.
