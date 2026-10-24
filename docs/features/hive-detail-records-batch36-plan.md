# Batch 36: Hive Detail and Records

**Status:** Implemented 24/10/2026, waiting for the owner's test.
**Checklist:** `tasks/security-batch36-todo.html`
**Database:** no change.
**Findings:**
- **Fixed:** C3-08, C3-09, C3-10, C3-12, C3-18, C3-19 (hives area), C3-20, C4-13, C4-14, C4-15 (errors), C4-17, C4-18 and C4-19.
- **Not real:** the "unnamed embeds" half of C4-15.

This is Phase 2 fix batch 23. Three agents checked each finding against the code and the live database.

## A. Hive detail page: C3-08, C3-09

- **C3-09:**
  - **Before:** `hives/[id]/page.tsx` returned the full-page spinner whenever `loading` was true. Every refresh therefore unmounted the page: after a scale assign or change, and after an unarchive. The scale chart reset to its first range, and the page jumped to the top.
  - **Now:** `if (loading && !hive)` shows the spinner on the first load only.
- **C3-08:**
  - **Why it matters now:** with the page staying on screen, two refreshes could finish out of order.
  - **The fix:** `useHiveDetail.fetchHiveData` numbers each load (`fetchSeqRef`, the `useHivesList` pattern). Only the latest load may set state, toast an error or clear `loading`.

## B. Scale charts: C3-12

- **What changed:** `ScaleHistoryChart` (BEEP) and `WolfScalePanel` number each request (`fetchSeqRef`). A stale reply can't set history, error or `lastUpdated`, or clear the spinner.
- **Custom range:** fetched only when both dates are set and start ≤ end.
- **Not changed:** `WolfHistoryChart.tsx` is unused (a Low dead-file finding), so it was left alone.

## C. QR tags: C3-10, C3-18, C3-19, C3-20

- **C3-18:**
  - **The constant:** `src/lib/site-url.ts` exports `SITE_URL = 'https://www.hivecraic.com'`.
  - **Where it's used:** the hive and nuc QR codes, the QR tags batch print, and the jar (`/j/`) and batch trace (`/trace/`) labels. Before, these used `window.location.origin`, so a tag printed from a preview or local address kept that address.
  - **Not changed:** sign-in redirects (`login`, `forgot-password`) still use the current origin, which is correct for them.
- **C3-20:** `hive-scan/tag/[code]` covers three cases:
  - **Tag on a hidden hive or nuc:** a tag you can read whose hive or nuc you can't read now says "This tag is on a hive or mating nuc you don't have access to…". Before, it said "not yet assigned".
  - **Real errors:** errors other than PGRST116 (no row) now show "Failed to load tag data." instead of the access message.
  - **Tag not found:** the message now mentions access.
  - **Not done:** telling a missing tag apart from an unreadable one would need a security-definer RPC. That's not worth it.
- **C3-19:** the "Open hive" link on the apiary map panel (`HiveInspectorPanel`) carries the `fj-btn` classes itself, instead of wrapping a `<Button>`. The same pattern on the queens and CRM orders pages is left for those chunks.
- **C3-10:**
  - **The fix:** the hive page and records QR lookups sort `assigned_at desc nulls last, created_at desc`, matching `useHivesList`.
  - **Live:** no tag is undated, so nothing changes today.

## D. Records: C4-13, C4-14, C4-15, C4-17

- **C4-13:**
  - **The bug:** `useVoiceRecorder.startRecording` awaited `getUserMedia` without checking whether it had been cancelled. Closing the form during the permission prompt, or a double tap, left a live microphone.
  - **Now:** every start and every cleanup bumps `startIdRef`. A stream that arrives for a stale start, or after unmount, has its tracks stopped. A second start while one is pending or recording is ignored. A cancelled start that fails stays silent.
  - **Tests:** `tests/hooks/voice-recorder.test.tsx`; all three fail without the fix.
- **C4-14:**
  - **The waste:** `InspectionForm.handleHiveSelect` called `onHiveChange` → `records/page.handleHiveChange` → `handleFetchWeatherForHive`, and the result was thrown away. That is an apiaries select, up to two Nominatim geocodes and an Open-Meteo call per hive pick, even when editing.
  - **The fix:** the prop and handler are removed. The saved weather is still fetched once, at submit, for new inspections.
- **C4-15:**
  - **The bug:** `useRecordsData.getAccessibleHiveIds` ignored errors, so a failed own-hives lookup read as "no hives" and emptied every list without a word.
  - **The hive IDs:** the lookup now returns `null` on error. The record fetchers keep their current list, and `loadAllData` shows "Couldn't load your records…".
  - **The record fetchers:** treatments, checks, feedings and harvests check `error` and keep their list. Inspections no longer empties its list on error.
  - **The pickers:** `fetchHives` and `fetchApiaries` keep their lists if their own or shared lookup fails.
  - **Embeds:** checked against the live foreign keys. None is ambiguous (`inspections → profiles` is already named), so no change.
- **C4-17:** removing a logbook assessor sign-off (`logbook/page.tsx`) now asks first with `useConfirm` (danger).

## E. Sizes: C4-18, C4-19

- **C4-18:** the records date filters and the logbook stage select, assessor name, FIBKA number, date and notes go from `text-sm` to `text-base`.
- **C4-19:** every field and tap target in the area reaches 48px.
  - **Raw inputs:** in `InspectionForm`, `FeedingForm`, `HarvestForm`, `VarroaCheckForm` and `VarroaTreatmentForm`, raw inputs get `min-h-[48px]` (the forms' own idiom).
  - **Other files:** the filter selects, the "show archived" label, the logbook fields, the "New record" button and the tasks "All day" and "Enable reminder" labels get `min-h-12`.
  - **44px caps:** `min-h-[44px]` becomes 48px. On a styled `Button` or `IconButton` it was capping the 48px from `.fj-btn`/`.fj-icon-btn`, because those use zero-specificity `:where()`.
  - **Tablet shrink:** the `sm:` classes that shrank inspection buttons to 36px or 40px are removed.
  - **Super-fullness slider:** `h-12`.
  - **Small visuals inside a 48px area:** the QR chip on the inspection card and the two remove-photo buttons keep their small look inside a 48px tap area, the batch 30 pattern.
  - **Not changed:** `InspectionStepper` keeps `min-h-[44px]`, because its content already makes it about 59px.

## Rules

- Anything printed or scanned (QR tags, labels) uses `SITE_URL`, never `window.location.origin`.
- A page that refreshes in place needs a stale-response guard on its loader.
- Never treat a failed lookup as an empty result; keep what's on screen and say so.
- Async starts of devices (microphone, camera) must stop a stream that arrives after cancel or unmount.
