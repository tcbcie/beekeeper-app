# Full App Audit: Phase 2 Findings (in progress)

**Started:** 18/10/2026. These are read-only best-practice findings; no fixes have been made yet.
**Status:** Complete on 18/10/2026. Batch 0 and all 13 chunks were audited: about 470 findings, about 59 High. The three new security findings (C7a-02, C9a-01 and C2-31) were fixed in security batch 13 on 18/10/2026. The data-loss bugs in records, batches, Tools and the export were fixed in batch 14 on 19/10/2026; the mating nuc ones (C5a-01 to C5a-03) in batch 15 on 19/10/2026. The double-submit findings were fixed in batch 16 on 19/10/2026 with the shared `useSubmitLock` hook. Mel's status filters and the report date bugs (C9b-01 to C9b-07, C9b-20) were fixed in batch 17 on 19/10/2026. The tooling findings (B0-1 to B0-8, B0-18) were fixed in batch 18 on 22/10/2026: 0 failing tests, 0 type errors, and lint and typecheck now run in CI. The shared foundations (embed reads, local dates, 48px targets) were fixed in batch 19 on 22/10/2026. The shared API sign-in check (`requireUser`/`requireAdmin`) followed in batch 20 on 22/10/2026. Heavy panels and libraries load on demand since batch 21 (22/10/2026). The main page request chains and double loads were fixed in batch 23 (22/10/2026). The public GDD embed, Mel's tools and the group reports followed in batch 24 (22/10/2026), and the admin, Tools, research and export chains in batch 25 (22/10/2026). Batch 25 also fixed a new data-loss bug: the settings and member exports stopped at 1,000 rows per table. Batch 26 (23/10/2026) added database guards against queen lineage loops and duplicate pending invitations, and made the dashboard use the Irish date. Batch 28 (23/10/2026) fixed the remaining data-correctness High findings. Batch 27 (23/10/2026) moved the server to Irish dates: task reminders had been arriving an hour late all summer, and database "today" fill-ins, invitation e-mail dates and the scale chart ranges were fixed. Other fixes follow in approved batches.

## Chunk 3: dashboard home, hives, scales (36 findings: 4 High, 16 Medium, 16 Low)

### High
- **C3-01** `hooks/useHivesList.ts:211-272`: the list fetches full record history for all hives in one query. Supabase caps a query at 1000 rows, so with about 293 hives the older hives' cards show "Never" and lose their queen, egg, super and treatment data. Fix: one RPC returning per-hive aggregates (`DISTINCT ON (hive_id)`). *Fixed in batch 28 (23/10/2026): paged and chunked history reads.*
- **C3-02** `app/dashboard/hives/page.tsx:639-642` with `useHivesList.ts:57,532`: the ownership filter fires a fetch with the old value and then another, so the last response wins and the list can be wrong. Fix: remove the manual call, and ignore stale responses with a request ID. *Fixed in batch 28 (23/10/2026).*
- **C3-03** `components/hive/HiveFormSection.tsx:118-345, 367-373, 961-966`: there's no in-flight guard, so a double tap creates duplicate hives. Fix: a `submittingRef`, and disable the submit buttons while saving. *Fixed in batch 16 (19/10/2026), `useSubmitLock`.*
- **C3-04** `components/dashboard/ApiaryWeatherRow.tsx:458`: reads the `dropdown_values` embed as an array, but it's an object, so the user's own bloom records never show as confirmed. Fix: handle both shapes and name the FK. *Fixed in batch 19 (22/10/2026).*

### Medium, key items
- **C3-05:** a `JSON.stringify` comparison means almost every save counts as a configuration change, so "Last changed by" is wrong.
- **C3-06:** updates have no `.select()`, so an update RLS blocks fails silently.
- **C3-07 / C3-29:** UTC dates via `toISOString`, so "today" is yesterday just after midnight in Irish Summer Time. *Fixed in batch 19 (22/10/2026).* Client side; the dashboard's "due today" count comes from the `get_dashboard_overview` RPC (`current_date` in UTC). *The RPC was fixed in batch 26 (23/10/2026): it uses the Europe/Dublin date.*
- **C3-08 / C3-09:** stale responses aren't discarded in `useHiveDetail`, and a refetch unmounts the whole page.
- **C3-10:** the QR ordering puts nulls first. **C3-11:** a scale can end up assigned to two hives. **C3-12:** scale charts don't cancel or debounce their requests. **C3-13:** failed results are cached as empty.
- **C3-14 / C3-15 / C3-16:** sequential request waterfalls. *Fixed in batch 23 (22/10/2026).* **C3-17:** chart.js is loaded statically on the hive detail page. *Fixed in batch 21 (22/10/2026), load on demand.*
- **C3-18:** the QR code uses `window.location.origin` instead of a canonical site URL. **C3-19:** buttons are nested inside a `<Link>`. **C3-20:** the tag page says "not assigned" when the real problem is no access.

### Low
Covers missing try/finally, a misleading RLS comment, touch targets and inputs below 48px or 16px, US spelling ("Color"), browser `confirm()`, inline styles, `text-xs`, `select('*')`, dead files (`WolfHistoryChart.tsx`, `WolfSensorDisplay.tsx`), a hardcoded version string, duplicate scale fetches, custom modals without dialog semantics, and data access inside UI files.

### Cross-cutting patterns
1. No stale-response handling. `useDashboardStats` has the pattern to reuse.
2. Aggregates are computed client-side from unlimited history.
3. Writes can fail silently (no `.select()`, saves not atomic, no double-tap guards).
4. Date handling is inconsistent.
5. Hand-written UI skips the shared `TextInput`, `ModalShell` and `fj-control` components.

## Chunk 7a: apiaries, maps, community map (35 findings: 5 High, 16 Medium, 14 Low)

### High
- **C7a-02 (SECURITY, new; confirmed):** `src/components/MapLocationPicker.tsx:441`. The popup uses `setHTML` with an unescaped `apiary.name`. The list includes team-shared apiaries, so a team member's apiary name can run script in your session (stored XSS). Fix: build the popup with `textContent` and `setDOMContent`. **Fixed in batch 13.**
- **C7a-01:** `community-map/page.tsx:1068-1109`. Fullscreen renders a different tree, so the Mapbox container is destroyed and the map stays blank. Fix: one stable tree, switching with classes.
- **C7a-03:** `useApiaryDetail.ts:124-139`. The `hives(hive_number)` embed is an object, so `?.[0]` is undefined and every Recent Activity row has no hive number. *Fixed in batch 19 (22/10/2026).*
- **C7a-04:** `useApiaryDetail.ts:14-18,95` and `apiaries/[id]/page.tsx:211`. The `queens` embed is an object, so the queen never shows in the apiary's hive list. *Fixed in batch 19 (22/10/2026).*
- **C7a-05:** `community-map/page.tsx:756-774`. `setStyle` wipes all overlay layers and they are never re-added. Toggles during style load throw, and the terrain source is added twice.

### Medium, key items
- **C7a-06:** setState during render resets the saved "Shared" filter.
- **C7a-07:** a double tap creates duplicate apiaries. *Fixed in batch 16 (19/10/2026), `useSubmitLock`.*
- **C7a-08:** the conservation area uses the form's coordinates instead of the resolved ones.
- **C7a-09 / C7a-10:** a stale click closure means overlap zones never draw, and `flyTo` resets the zoom on every tap.
- **C7a-11:** unbounded inspection fetch, hitting the 1000-row cap.
- **C7a-12 / C7a-13:** errors are ignored or shown as "not found", and there is no unmount guard.
- **C7a-14:** reload unmounts the dnd canvas.
- **C7a-15:** the entrance bearing is calculated in % space.
- **C7a-16:** markers are rebuilt on every toggle.
- **C7a-17:** mapbox-gl is imported statically. *Fixed in batch 21 (22/10/2026), load on demand.*
- **C7a-18:** `window.__dcaConfirm` with inline onclick.
- **C7a-19 / C7a-20:** controls and handles are below the 14px / 48px rules.
- **C7a-21:** OpenStreetMap attribution has been removed.

### Low
Covers native `confirm()`, bench delete with no confirmation, the rollback race, the elevation backfill, lat/lng validation, the default marker, missing map error states, a stuck cursor, error caching in `useYardMapEnabled`, "yard" wording in user copy, Link wrapping a Button, pill links at 32px, `select('*')`, and static `proj4` with Haversine duplicated three times.

## Chunk 5a: Queen Tracker and Mating Nucs (35 findings: 5 High, 16 Medium, 14 Low)

### High
- **C5a-01:** `MatingNucsTab.tsx:301-318`. Every `fetchNucs` (a read) sets sealed, caged and emerged grafts to `in_nuc`, so the graft status 'emerged' never persists. *Fixed in batch 15 (19/10/2026).* 15 affected grafts repaired, with the owner's approval.
- **C5a-02:** `NucInspectionPanel.tsx:192-239`. Insert and edit apply *that* inspection's status, so a backdated or edited inspection rolls the nuc and graft backwards. Fix: derive the status from all inspections, as delete already does. *Fixed in batch 15 (19/10/2026).*
- **C5a-03:** `useMatingNucBulk.ts:194-255`. Bulk create is four writes with no transaction, which leaves orphan rows. Fix: an RPC. *Fixed in batch 15 (19/10/2026).* Uses `create_mating_nuc_bulk`.
- **C5a-04 / C5a-05:** field actions are 28px icons, and the cell controls are 10px text with a ~22px Fail button.

### Medium, key items
- **C5a-06 / C5a-07:** multi-breeder breeder leakage, and the card has no fallback breeder.
- **C5a-08 / C5a-09:** moving or deleting a nuc wipes the graft data, and the order of writes and ignored errors.
- **C5a-10:** the double-tap guard ref is set during render. *Fixed in batch 16 (19/10/2026): the ref is now the lock and is updated by `lockRow`/`unlockRow`.*
- **C5a-11:** clearing Mated has no confirmation and wipes the location.
- **C5a-12 / C5a-13 / C5a-14:** sync errors are hidden, there's no try/catch, and a stale fetch race.
- **C5a-15 / C5a-16 / C5a-17:** over-fetching, `select('*')`, and an unpaginated ledger.
- **C5a-18:** UTC dates. *Fixed in batch 19 (22/10/2026).*
- **C5a-19 / C5a-20:** 14px inputs, and the table only works on desktop.
- **C5a-21:** about 6k lines of tabs are imported statically. *Fixed in batch 21 (22/10/2026), load on demand.*

### Low
Covers the breeder option list, hand-rolled modals, native `confirm()`, equipment status, docs drift, time-of-check races, failed-guard gaps, mutation-vs-fetch races, comment-length mismatches, re-renders, the redirect page, `aria-label`s, an unused prop, the QR element id, and the date locale.

## Chunk 1: app shell, auth, PWA, contexts, shared UI (35 findings: 3 High, 19 Medium, 13 Low)

### High
- **C1-01:** `accept-invitation/page.tsx:213,220` and `accept-rearing-group-invitation/page.tsx:200,207` pass a full URL as `redirect`. The login page drops anything that doesn't start with `/`, so invitees land on `/dashboard` and the invite round-trip is broken. Fix: pass `pathname + search`.
- **C1-02:** `login/page.tsx:55` and `auth/callback/route.ts:73`. `pendingRedirect` is only honoured for `/dashboard…`, Google sign-in ignores it, and a stale value fires later. Fix: an allow-list of paths, carried through OAuth `redirectTo`, cleared after use.
- **C1-03:** `contexts/AuthContext.tsx:38-56`. The offline fallback reads the old `supabase.auth.token` localStorage format, but `@supabase/ssr` uses cookies, so the fallback never works. If the token has expired, opening the app offline sends the user to /login.

### Medium, key items
- **C1-04 / C1-05:** the update banner and the notification banner both ignore the user's "Later".
- **C1-06 / C1-07:** notification permission is requested without a user tap, and notification timers are never cleared.
- **C1-08 / C1-09:** the service worker caches every GET (including RSC payloads and pages) with no limit, and the Mapbox tile cache is never pruned.
- **C1-11:** the dashboard `ErrorBoundary` never resets on navigation, and there's no `error.tsx`.
- **C1-12:** `TOKEN_REFRESHED` replaces `user` about hourly, so pages refetch.
- **C1-13:** the root page redirect is a client waterfall that uses `push`.
- **C1-14:** pressing Enter on the login form always submits Login, even in sign-up mode.
- **C1-16:** the reset-password page has non-standard inputs and is unreadable in dark mode.
- **C1-18:** the shell components make 5–7 duplicate profile, role and subscription requests on each load.
- **C1-19:** the Navbar warnings are hover-only, so they can't be read on a phone.
- **C1-23:** the theme provider causes a hydration mismatch.
- **C1-24 / C1-25:** ConfirmDialog buttons are 40px, and the design tokens set a 44px minimum rather than 48px. *Fixed in batch 19 (22/10/2026).*
- **C1-26:** ImageZoomModal can't be panned on touch, and has no dialog semantics.
- **C1-27:** `en-US` dates and "expiration date" in the subscription UI.
- **C1-30:** the offline toast covers the Logout button.

### Low
Covers the service worker push parse and click handling, the auth callback ignoring `?error=`, the login decode and hard-coded version, the sessionStorage loop and "Logout" copy, the drawer scroll lock, `startsWith` on nav items, "-5 days", the unused associations query, the BottomSurface flag, InstallPrompt try/catch, raw errors on the invite pages, `global-error.tsx` unstyled, and skeleton layout shift.

### Cross-cutting
One shell-profile hook with a cache, one `safeInternalPath()` redirect helper, shared timer and scroll-lock and storage hooks, 48px design tokens, and one owner module for the PWA. No new security issues.

## Chunk 5b: batches, grafts, distributions (32 findings: 4 High, 16 Medium, 12 Low)

### High
- **C5b-01:** `BatchFormSection.tsx:431,975` and the modals. The grafts section and three modals are inside the batch `<form>`, so pressing Enter (or "Go" on a phone) in any queen number, weight or modal field submits and closes the batch editor. Fix: render the grafts outside the form and portal the modals. *Fixed in batch 14 (19/10/2026).* Enter in an input inside the grafts section now commits the field instead.
- **C5b-02:** `BatchFormSection.tsx:189-220`. The timeline effect recalculates every date on any change, so manual edits to Acceptance, Cage and Hatch are overwritten. Saved custom dates are replaced on re-save. *Fixed in batch 14 (19/10/2026).*
- **C5b-03:** `useBatchGrafts.ts:231-284`. Counts are saved before distributions load (or after their fetch fails), so the hatched and mated counts in `rearing_batches`, which feed NIHBS, are written too low. *Fixed in batch 14 (19/10/2026).* Also fixed: a failed grafts fetch no longer saves zero counts.
- **C5b-04:** `useGraftDistributions.ts:367,613`. The `create_queen_for_distribution` error is never checked, so the recipient's queen can go missing while the UI says "recorded". *Fixed in batch 14 (19/10/2026).*

### Medium, key items
- **C5b-05:** the recipient queen's birth date is a day early in summer time (UTC). *Fixed in batch 19 (22/10/2026).*
- **C5b-06:** bulk distribution drops the mating location and installed date.
- **C5b-07:** a mixed bulk selection records every graft as a mated queen.
- **C5b-08:** mated-date edits never sync to the recipient queen.
- **C5b-09:** distributed grafts can be deleted or have their status changed, and `sold` can be set by hand.
- **C5b-10 / C5b-11:** double initial fetch, and the tab bounces. *Fixed in batch 23 (22/10/2026).*
- **C5b-12 / C5b-14:** double tap on save and on generate, and the save is not atomic. *Double taps fixed in batch 16 (19/10/2026); the non-atomic save is still open.*
- **C5b-13:** single-breeder cells don't stamp the mother, and the dropdown isn't locked.
- **C5b-15:** stuck on "Loading grafts…" with no retry.
- **C5b-16:** the selection scoring refetches on every tap and counts missing ratings as 0.
- **C5b-17:** the page is 1,091 lines and the tabs are imported statically. *Fixed in batch 21 (22/10/2026), load on demand.*
- **C5b-18 / C5b-19 / C5b-20:** data access in UI files, modal accessibility, and `select('*')`.

### Low
Covers UTC "today", the sequential list fetches, the distribution list disappearing on refresh, unnamed embeds, batch delete feedback, notification permission and timers, redistribution leaving a queen behind, unmemoised stats, TBR ignoring shared apiaries, row callback re-renders, the search counter, and tap targets.

## Chunk 7b: research, GDD, wild colonies, embed (35 findings: 5 High, 21 Medium, 9 Low)

### High
- **C7b-01:** `GDDDataTab.tsx:403` and `PublicGDDTab.tsx:293`. The monthly average treats a `null` temperature as 0, so the current month reads too low. This shows on the public tcbc.ie embed. *Fixed in batch 24 (22/10/2026).*
- **C7b-02:** `WildColoniesTab.tsx:161-164`. An early return skips `setLoading(false)`, so the spinner never stops. *Fixed in batch 25 (22/10/2026).*
- **C7b-03:** `ForagingHoursTab.tsx:239,245`. Deselecting the last year during a load leaves the spinner stuck. *Fixed in batch 28 (23/10/2026).*
- **C7b-04:** GDD and public tabs. Up to 11 sequential Open-Meteo calls per view (the same archive is fetched three times), for every anonymous embed visitor. *Fixed in batch 24 (22/10/2026): shared `fetchArchiveDaily`, one call per year.*
- **C7b-05:** `KeyEventsOverlay.tsx:390-403`. Edit and delete are about 21px, with no label, and delete has no confirmation.

### Medium, key items
- **C7b-06:** no abort or stale guard.
- **C7b-07:** the embed calls Open-Meteo directly from every browser. It should be server-fetched and cached.
- **C7b-08:** state is sorted in place during render.
- **C7b-09:** double tap creates duplicate colonies. *Fixed in batch 16 (19/10/2026), `useSubmitLock`.*
- **C7b-10:** lat/lng are not validated.
- **C7b-11 / C7b-12 / C7b-13:** the weather fetch loops, 0°C shows as blank or a stray "0", and setState during render.
- **C7b-14:** the research page gets stuck, or goes blank on disallowed sections.
- **C7b-15:** per-card weather and GDD duplicates, with polling while the tab is hidden.
- **C7b-16 / C7b-17:** the GDD formula is copied five times, and `PublicGDDTab` is a ~1k-line clone.
- **C7b-18:** a stale chart stays when no year is selected.
- **C7b-19:** chart.js is loaded on every research tab. *Fixed in batch 21 (22/10/2026), load on demand.*
- **C7b-20 / C7b-21:** N+1 profile lookups, and the diagnosis list is unpaged with an `.in()` URL limit. *The request chain and the `.in()` limit were fixed in batch 25 (22/10/2026); the list is still unpaged.*
- **C7b-22 (check):** `get_shared_gdd_records` returns every shared record nationally with `user_id`, then filters to 20 km in the browser. The coordinates are already obfuscated (batch 4); the leftover `user_id` and scale issues should move to SQL.
- **C7b-23 / C7b-24 / C7b-25 / C7b-26:** touch targets of 20–28px, 12px text and 9–10px chart labels with no dark mode, a 12-column table with no phone layout, and the diagnosis modal can double-post. *The double-post was fixed in batch 16 (19/10/2026).*

### Low
Covers Wolf battery NaN, being unable to deselect the last year, date locale and UTC handling, "Behavior" spelling, `select('*')`, quadratic chart lookups, the KeyEventsOverlay hook returning JSX, `minTemperature &&` treating 0 as false, and foraging-hours NaN guards with the iframe `postMessage` target.

## Chunk 9a: settings, admin, profile, about, support (35 findings: 4 High, 22 Medium, 9 Low)

### High
- **C9a-01 (SECURITY, new):** `profile/page.tsx:454-484`. The Change Password form asks for the current password but never checks it, so anyone with an unlocked session can change the password. Fix: re-authenticate (verify the current password, or use Supabase's reauthenticate nonce or "secure password change").
- **C9a-02:** `ProfileExport.tsx:126-130`. The user export runs `select('*')` on every table. The user's own `profiles` row fails because of the column grants, so it is silently missing. The export also includes global and team-visible rows and is truncated at max-rows. Fix: reuse the user-scoped export with `PROFILE_COLUMNS`, and page through results.
- **C9a-03:** `UserManagement.tsx:430-448`. Impersonation data is saved before `verifyOtp`, so it's left behind on failure. *Fixed in batch 28 (23/10/2026).*
- **C9a-04:** `UserManagement.tsx:1329-1332`. The expiry date input writes on every keystroke (several writes and refetches) and shows the UTC date. *Fixed in batch 19 (22/10/2026).* It now saves on blur or Enter.

### Medium, key items
- **C9a-05:** a null RPC payload makes a successful toggle show an error.
- **C9a-06:** the `UpcomingEvents` apiary embed is read as an array, so the name never shows. *Fixed in batch 19 (22/10/2026).*
- **C9a-07:** the subscription cache can leak across sign-in and out, and caches errors.
- **C9a-08:** profile preferences are stale and undo doesn't work.
- **C9a-09 / C9a-10:** the ticket fallback ignores the filter, and the stats are counted from the filtered list.
- **C9a-11:** RLS-blocked updates and deletes report success (no `.select()`).
- **C9a-12 / C9a-13 / C9a-14:** silent admin failures.
- **C9a-15:** the KB and news lists are capped at 100.
- **C9a-16:** PDFs are uploaded as base64 JSON, exceeding the 4.5 MB body limit.
- **C9a-17:** search has no abort.
- **C9a-18:** double tap creates duplicate tickets. *Fixed in batch 16 (19/10/2026), `useSubmitLock`.*
- **C9a-19:** CSV export has no escaping (formula injection).
- **C9a-20 / C9a-21 / C9a-23:** request waterfalls and N+1 queries. *Fixed in batch 25 (22/10/2026).*
- **C9a-22:** 13 managers imported statically. *Fixed in batch 21 (22/10/2026), load on demand.*
- **C9a-24:** `UserManagement` is 1,693 lines.
- **C9a-25 / C9a-26:** xs admin buttons, 14px inputs and 16px checkboxes.

### Low
Covers `window.prompt` and `confirm`, the subscription-history prefetch, dead filter buttons, being unable to clear admin notes, a stale ticket badge, swallowed errors in the changelog and history, the orphan `/support` route, date parsing in registration codes, and `en-US` dates with "Organization" spelling.

## Chunk 9b: reports and AI assistant (35 findings: 7 High, 20 Medium, 8 Low)

### High
- **C9b-01 / C9b-02 / C9b-03:** Mel's status filters don't match the stored values. `getQueenInventory` uses 'Active' but the app stores 'active'. Batch tools use capitalised or invented statuses, and `getNucsNeedingInspection` uses 'pending', which doesn't exist. These tools always answer "none". (Confirm with `SELECT DISTINCT status`.) *Fixed in batch 17 (19/10/2026).*
- **C9b-04:** `useReportFilters.ts:39` saves fixed dates for relative periods, so a week later the DAFM report silently leaves out recent treatments. *Fixed in batch 17 (19/10/2026).*
- **C9b-05:** the varroa monitoring report ignores the apiary filter when "All Hives" is chosen. *Fixed in batch 17 (19/10/2026).*
- **C9b-06:** the archived-hives report compares a timestamp with `lte(date)`, so today's archives are missing. *Fixed in batch 17 (19/10/2026).* `varroa_checks.check_date` had the same bug and is fixed too.
- **C9b-07:** raw UUIDs (`colony_id`, `mother_queen_id`) reach the model. *Fixed in batch 17 (19/10/2026).*

### Medium, key items
- **C9b-08 / C9b-09:** no cancel or try/finally in the report effects, and query errors show as "no data" on a compliance report.
- **C9b-10 / C9b-11 / C9b-12:** report waterfalls. *C9b-10 fixed in batch 23 (22/10/2026); C9b-11/12 fixed in batch 24 (22/10/2026).*
- **C9b-13 / C9b-14:** N+1 in 12 tools, and sequential scale calls. *Fixed in batch 24 (22/10/2026).*
- **C9b-15:** fuzzy `ilike` with `limit(1)` matches "hive 1" to "Hive 12".
- **C9b-16:** unbounded number arguments, and `year` is silently dropped.
- **C9b-17:** the router runs at temperature 0.7 with no JSON mode, and `tools[name]` accepts built-in object keys.
- **C9b-18:** three LLM calls per message.
- **C9b-19:** tool error strings are passed to the model as data.
- **C9b-20:** UTC "today" and `daysUntil` rounding. *Fixed in batch 17 (19/10/2026).*
- **C9b-21:** dead colonies show as still in their hive.
- **C9b-22:** inconsistent tool scoping.
- **C9b-23:** low-stores keywords also match "flow" and "flight".
- **C9b-24:** not-found shows as "database error".
- **C9b-25 / C9b-26:** chat error handling and dialog accessibility.
- **C9b-27:** recent activity is unordered.

### Low
Covers falsy-zero display, `classifyQuery` validation, harvests merged by hive number with unit mislabelled, duplicated helpers and a circular import, `any` in reports, `select('*')`, inline styles, and fire-and-forget logging.

## Chunk 8b: CRM, traceability, QR, labels, public trace (34 findings: 2 High, 16 Medium, 16 Low)

### High
- **C8b-01:** `BatchesTab.tsx:444-553`. No submit lock, so a double tap creates two batches that each use up a lot number and trace code. *Fixed in batch 16 (19/10/2026), `useSubmitLock`.*
- **C8b-02:** `crm/orders/page.tsx:130-165`. Order create is guarded only by state, so duplicate orders are possible. *Fixed in batch 16 (19/10/2026), `useSubmitLock`.*

### Medium, key items
- **C8b-03 / C8b-04:** duplicate jar-sale income rows, duplicate containers, and harvests linked to every bucket (weight counted N times).
- **C8b-05 / C8b-06:** order actions discard unsaved item edits, and an items fetch error leads to an empty editor that wipes the items on save.
- **C8b-07:** UTC "today" for order dates and the overdue check. *Fixed in batch 19 (22/10/2026).*
- **C8b-08:** a cleared number field snaps to 0, and negative prices are allowed.
- **C8b-09 / C8b-10 / C8b-11:** trace-code RPC errors are ignored, the `001` lot-code fallback collides, and batch create is not atomic.
- **C8b-12 / C8b-13:** the auto-tally overwrites the saved total on edit, and the preview race with missing lb→kg conversion. *The preview race was fixed in batch 25 (22/10/2026); the lb→kg conversion and C8b-12 are open.*
- **C8b-14:** "Ireland" is hard-coded on public trace pages, including for UK and NI producers.
- **C8b-15 / C8b-16 / C8b-17 / C8b-18:** buttons inside a Link, 34px icons, every QR rendered hidden, and the order waterfall. *The order waterfall (C8b-18) was fixed in batch 25 (22/10/2026).*

### Low
Covers the due-date update, invoice email double send, customer double insert, float line totals, enum labels, the `InvoicePdf` server-only guard, the category lookup by name, `useCrmEnabled` caching errors, the date locale, trace metadata, a second Supabase client, a duplicated QR download, the QR modal, three label layouts, insights totals, and the 50+ rules.

## Chunk 4: records, inspections, tasks, logbook (32 findings: 6 High, 14 Medium, 12 Low)

### High
- **C4-01:** a refetch shows the skeleton, which unmounts an open record form, so unsaved work is lost with no prompt. *Fixed in batch 14 (19/10/2026).* Also fixed: the five record forms no longer reset when the hive list or apiary filter changes.
- **C4-02:** the in-progress guard drops later calls, so a shared-hive deep link shows the wrong data. *Fixed in batch 28 (23/10/2026): the latest dropped request is queued.*
- **C4-03:** editing an inspection overwrites its weather with today's. *Fixed in batch 14 (19/10/2026).*
- **C4-04:** harvest `moisture_content` is never saved. *Fixed in batch 14 (19/10/2026).*
- **C4-05:** editing a task resets `completed:false` and changes `user_id`, so done tasks reopen. *Fixed in batch 14 (19/10/2026).*
- **C4-06:** the brood-box sync runs in edit mode and reshapes old frames. *Fixed in batch 14 (19/10/2026).*

### Medium, key items
- **C4-07:** RLS-blocked edits and deletes look like they worked.
- **C4-08:** varroa auto-task faults.
- **C4-09:** the tasks window and the 1000-row limit.
- **C4-10 / C4-11:** double submits. *Fixed in batch 16 (19/10/2026), `useSubmitLock`.*
- **C4-12:** a refetch resets the form and drops the photo.
- **C4-13:** the microphone can stay on.
- **C4-14:** a wasted weather call.
- **C4-15:** ignored errors and unnamed embeds.
- **C4-16:** a deleted treatment leaves its reminder behind.
- **C4-17:** no confirmation on sign-off removal.
- **C4-18 / C4-19:** 14px inputs and 44px targets.
- **C4-20:** false "unsaved" prompts.

### Low
Covers the UTC end date, period counts, the toggle race, `confirm()`, UTC defaults, keyboard access, inline styles, `select('*')`, spelling, orphaned photos, no redirect without a session, and files over 800 lines (`InspectionForm` 2,373; records 1,827; tasks 1,765).

## Chunk 6: queens, lineage, teams, rearing groups (32 findings: 4 High, 15 Medium, 13 Low)

### High
- **C6-01:** team delete, remove member and leave never call `clearTeamAccessCache()`, so a leaver still sees shared queens and hives. *Fixed in batch 28 (23/10/2026).*
- **C6-02:** remove and unshare only refresh `selectedTeam`, not the expanded panel, so a repeat remove deletes 0 rows and says "removed". *Fixed in batch 28 (23/10/2026).*
- **C6-03:** rearing-group ownership transfer is three updates with no transaction, so a failure leaves two owners. *Fixed in batch 28 (23/10/2026): `transfer_rearing_group_ownership` RPC.*
- **C6-04:** `useQueenDetail.ts:330-342`. The sightings hive embed is an object, so the hive number is always blank. *Fixed in batch 19 (22/10/2026).*

### Medium, key items
- **C6-05:** double init fetch. *Fixed in batch 23 (22/10/2026).*
- **C6-06:** redistribute is not atomic.
- **C6-07 / C6-08:** queen form double submit, and the cycle check runs after the RPC. *C6-07 fixed in batch 16 (19/10/2026). C6-08 was worse than first reported, because a reared daughter could be saved as her own mother's mother. Fixed in batch 26 (23/10/2026): the database trigger `queens_prevent_lineage_cycle` and the `queens_not_own_parent` check, plus the form checks before promotion and hides the queen's own reared daughters.*
- **C6-09:** duplicate invites. *Fixed in batch 16 (19/10/2026), `useSubmitLock`.* The pending-invitation index was added in batch 26 (23/10/2026). It replaced the old `(team/group, email, status)` rule, which also blocked former members from accepting a new invitation.
- **C6-10:** stale team detail race.
- **C6-11 to C6-15:** N+1 queries and waterfalls (lineage up to 8 sequential queries; the report hits the URL length limit). *C6-11, C6-13, C6-14 and C6-15 fixed in batch 23 (22/10/2026); C6-12 (Mel's lineage tool) fixed in batch 24 (22/10/2026).*
- **C6-16:** errors show as empty.
- **C6-17 to C6-19:** touch targets and 14px inputs.

### Low
Covers `text-xs`, `any`, `select('*')`, data access in UI files, the StrictMode sort updater, CSV formula and "Color", static modals, unmemoised lineage, error copy, the invite double send, Link wrapping a Button, empty `.in()`, and the timeout cleanup.

## Chunk 2: API routes and edge functions (35 findings: 3 High, 17 Medium, 15 Low)

### High
- **C2-01:** task reminders re-query all tasks per profile (users × tasks), so who gets reminded depends on loop order. *Fixed in batch 28 (23/10/2026): read once per frequency.*
- **C2-02:** knowledge-base and news ingestion make one embedding and insert per chunk in sequence, so large PDFs time out half-loaded. *Fixed in batch 28 (23/10/2026): batched embeddings, bulk insert, all or nothing.*
- **C2-03:** `database-export.ts:3-66`. The "complete" export's table list leaves out `crm_*`, `queen_assignments`, `queen_weights`, `yard_benches`, `batch_breeder_queens` and others, so a restore would lose data. *Fixed in batch 14 (19/10/2026).*

### Medium, key items
- **C2-04:** reminders query a non-existent `team_hive_access` table, so team members never get them. *Batch 28 (23/10/2026): the broken branch was removed (owner's decision); team reminders would be a new feature.*
- **C2-05:** Wolf's previous-24h figure is almost always null.
- **C2-06 / C2-07:** 7 vendor calls per scale view.
- **C2-08:** custom dates are not validated.
- **C2-09:** no `maxDuration` on any route.
- **C2-10 / C2-11:** export waterfall and in-memory string. *C2-10 fixed in batch 25 (22/10/2026); C2-11 open.*
- **C2-12 / C2-13:** fetch timeouts don't cover reading the body, and Resend has no timeout.
- **C2-14:** malformed JSON returns 500.
- **C2-15:** N+1 hive counts. *Fixed in batch 25 (22/10/2026).*
- **C2-16:** a new client per call.
- **C2-17:** orphan knowledge-base sources.
- **C2-30:** email settings links point at the Supabase host.
- **C2-31 (SECURITY, new, Low):** reminder and digest emails put the user's own task and batch text into HTML unescaped.

### Low
Covers limit clamping, admin email in logs, an ineffective try/catch, the duplicate impersonation query, OpenAI error detection, a BEEP array guard, beep disconnect error handling, the Wolf comment and battery lookup, the rate-limit bucket order, `classifyQuery`, `any`, "Unauthorized" spelling, email HTML logged, deprecated Deno std with mixed supabase-js pins, duplicated invitation functions, and the empty `auto-accept-invitations` folder.

### Cross-cutting
The auth block is copied in 22 routes. Proposal: `requireUser()` plus one service-role client singleton (about 500–600 fewer lines), *(done in batch 20, 22/10/2026: `src/lib/server/api-auth.ts`, 21 route files, about 650 lines removed)* `apiError`/`apiOk`, `audit()`, `fetchWithTimeout`, and shared email and chunking helpers.

## Chunk 8a: Tools (31 findings: 4 High, 13 Medium, 14 Low)

### High
- **C8a-01 / C8a-02:** the P&L and Purchases edit forms have no `key`. Editing record B while A's form is open saves A's values onto B. *Fixed in batch 14 (19/10/2026).*
- **C8a-03:** VarroaWeather refetches and unmounts on each apiary change, and can show the wrong apiary's forecast. *Fixed in batch 28 (23/10/2026).*
- **C8a-04:** all 8 tool panels (chart.js and QR included) are imported statically into the Tools landing page. *Fixed in batch 21 (22/10/2026), load on demand.*

### Medium, key items
- **C8a-05:** 8 dead tool components (~1,750 lines).
- **C8a-06 / C8a-07:** the GDD archive doesn't check `ok` (recent blooms get a null GDD), and silent delete and toggle failures.
- **C8a-08 to C8a-10:** waterfalls and `select('*')`. *Fixed in batch 25 (22/10/2026); the small user-scoped `select('*')` reads stay.*
- **C8a-11 / C8a-12:** two CSV writers have no formula-injection guard or BOM.
- **C8a-13:** export-to-image cleanup only runs on success.
- **C8a-14:** NIHBS drops saved overrides on a query failure.
- **C8a-16:** TBRPlanner is 1,011 lines.

### Low
Covers NIHBS `.in()` size, TBR dark mode, a dynamic Tailwind class, the tools auth round trip, latent NaN maths, the queen tracker embed, UTC dates, the Diagnosis timer and text, frame defaults, story-template markers, American spellings (some on public trace text), touch targets, `text-xs`, `confirm()`, and miscellaneous items.

## Batch 0: tooling

### Counts
- **Tests:** 137 failing out of 834 (18 files).
- **tsc:** 98 errors, all in `tests/` (0 in `src/`).
- **ESLint:** `eslint src` is clean; `eslint tests` has 129 errors; a bare `eslint .` gives about 21.8k problems from folders that shouldn't be linted.
- **`any` in src:** 19 occurrences.
- **Supabase calls:** 856 `.from` and 87 `.rpc`, none with a `Database` generic, about 255 casts.

### Test failure groups
| Group | Failures |
|---|---|
| Missing `ToastProvider`/`ConfirmProvider` wrapper | 90 |
| Old UI text or class assertions | 25 |
| Outdated PWA update mocks | 14 |
| Removed auth API | 6 |
| Ingest chunking | 2 |
| One file needs env stubs | 1 file |

### High
- **B0-1:** CI is red on every push (137 failing tests). *Fixed in batch 18 (22/10/2026).*
- **B0-2:** CI runs no lint, tsc or build. *Fixed in batch 18 (22/10/2026).* A new "Lint & typecheck" job runs `typecheck` and `lint:src`; no build step, because Vercel builds every push.
- **B0-3:** the coverage thresholds sit under the wrong key in `vitest.config.mts`, so they are never enforced. *Fixed in batch 18 (22/10/2026).* The misplaced values were removed; real thresholds come once CI reports a baseline.

### Medium
- **B0-4 / B0-5:** the ESLint ignores and the `lint` script crawl `coverage/`, `varroa-detector/venv/` and `public/`. *Fixed in batch 18 (22/10/2026).* A full `eslint .` now takes about 24 s; 145 problems remain in tests, scripts and root files.
- **B0-6 / B0-7 / B0-8:** test type errors, a removed auth API, and env stubs. *Fixed in batch 18 (22/10/2026).*
- **B0-9:** generated Supabase types would remove about 255 casts.
- **B0-10:** 5 migrations have no timestamp, so the CLI skips them.
- **B0-11:** a legacy `migrations/` folder.
- **B0-12 to B0-14:** `.claude/CLAUDE.md` is stale (Next 14, v1.4.11, the `sql/` workflow).
- **B0-18:** the obsolete PostCSS backup steps in CI. *Fixed in batch 18 (22/10/2026).*

### Low
- The CLAUDE.md folder tree and client description.
- The boilerplate README.
- The test suite runs twice in CI; the PR comment is fake; no `npm audit` step.
- Dead files: `WolfHistoryChart`, `WolfSensorDisplay`, `SubscriptionWarningBanner`, 8 tool components, `NumberSelector`, and `RatingButtons`/`StatCard` (used only by tests).
- 5 empty route folders.
- Loose root files (`npm`, `DEBUG_BROWSER_CONSOLE.js`, `fix-remaining-hives-tests.mjs`, `Update_versions.txt`) and root `.cmd` scripts.
- `MD/` docs sprawl.
- A local DB export in the OneDrive folder (gitignored).
- An unused `tests/setup.ts`, and a stray `test/data` PDF.
- Unneeded `@ts-expect-error` directives.
- tsconfig strictness and include scope.

### Quick wins
B0-4, B0-5, B0-18 and a shared `renderWithProviders` test helper. Together they bring lint to 0 and CI close to green.
