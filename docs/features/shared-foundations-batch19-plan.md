# Batch 19: Shared Foundations

**Status:** Done 22/10/2026. The owner tested it; committed and pushed.
**Checklist:** `tasks/security-batch19-todo.html`
**Findings:** C3-04, C7a-03, C7a-04, C9a-06, C6-04 (embeds); C3-07/C3-29 (client side), C5a-18, C5b-05, C8b-07, C9a-04 (dates); C1-24, C1-25 (touch targets). This is Phase 2 fix batch 7. The API `requireUser()` clean-up is batch 20.

## Linked records (`src/lib/embed.ts`)

`firstOf(value)` returns the single record of a PostgREST to-one embed (FK on the selecting table), accepting an object or an array. These embeds arrive as an **object** at runtime, so `x?.[0]` was always undefined.

| Where | Was blank | Fix |
|---|---|---|
| `useApiaryDetail` hives | the queen on the apiary page's hive list | normalised to `queens: [queen]` at fetch, as `useApiaryMap` does |
| `useApiaryDetail` recent activity | hive numbers | `firstOf(r.hives)` |
| `ApiaryWeatherRow` | own bloom records as "confirmed" | `firstOf`, and the FK is named (`dropdown_values:vegetation_type_id(value)`) |
| `UpcomingEvents` | apiary names | `firstOf(task.apiaries)` |
| `useQueenDetail` sightings | hive numbers | `firstOf(s.hives)` |

The queen compare page now imports the shared `firstOf`. The CRM order page keeps its own `unknown`-typed version.

**Rule:** read to-one embeds with `firstOf()`, never `?.[0]`.

## Local dates (`src/lib/date-utils.ts`)

- `getCurrentDate()` and `formatDateForInput()` now return the **local** calendar date (`toLocalDateString`). They used `toISOString()`, the UTC date, which is yesterday between midnight and 1am in Irish Summer Time.
- Every client `new Date().toISOString().split('T')[0]` ("now") is now `getCurrentDate()`: 52 sites in 28 files, covering form defaults and status dates for nucs, the queen tracker, grafts, records, colonies, the logbook, CRM, finance and exports.
- Local `Date` objects that were shifted and then serialised now use `toLocalDateString(d)`:
  - the six report pages and `types/reports.ts`;
  - GDD, foraging and scale "today";
  - registration-code expiry options;
  - the "tomorrow" varroa task;
  - the team activity window.
- **C5b-05:** a distributed queen's fallback birth date (graft date + 12) was built from local midnight but serialised in UTC, so it was **a day early all summer**. It is now `toLocalDateString(d)` in `useGraftDistributions`.
- **CRM:** both `today()` helpers now use `getCurrentDate()`. The order detail page's overdue badge was UTC while the list page was local.
- **Deliberately left in UTC:**
  - TBR maths (`tbr-model.ts`, `TBRPlanner`);
  - `InspectionForm`'s date-string arithmetic;
  - `useQueenDetail`'s UTC cutoff;
  - the conversion of stored expiry values (`UserManagement`, `RegistrationCodeManagement`; these round-trip as UTC midnight);
  - `DiagnosisImagesTab`, `export-utils` `formatForCSV(Date)`, and `wolf-waagen-api` (the vendor API parameters).
- **Still open:** the dashboard's "tasks due today" comes from the `get_dashboard_overview` RPC, which uses the database's `current_date` (UTC). It is server-side and will be done with server date handling.

**Rule:** use `getCurrentDate()` / `toLocalDateString(d)` on the client, and `todayInDublin()` in Mel's server tools. Never use `toISOString().split('T')[0]` for a calendar date.

## Touch targets (48px)

- `globals.css`: `.fj-btn-sm`, `.fj-btn-xs`, `.fj-icon-btn` (all 53 `IconButton` users) and `.min-touch-target` go from 44px to **48px**. The compact sizes keep their padding and font.
- `ConfirmDialog` buttons: `min-h-[40px]` → `min-h-12`.
- Feeding, Harvest, Treatment and Varroa Check card buttons: 40px → 48px.
- `tests/styles/contrast-tokens.test.ts` now asserts 48px.
- **Later sweep:** 56 hand-written `min-h-[44px]` classes in 19 files.

## User Management expiry (C9a-04)

The expiry date input saved on every change, so typing a year wrote 0002, 0020, 0202 and 2026, each with a list refresh. It is now uncontrolled (`defaultValue`, keyed on the stored value) and saves once, on blur or Enter, only when the date changed.

## Verification

- `tsc --noEmit` shows 0 errors, `eslint src` is clean, and the test suite gives 808 passed and 23 skipped.
- qa-engineer found no issues.
