# Mobile-first review: verification of findings and plan

**Date:** 04/11/2026. **Status:** Verification complete; corrections applied to both plan documents on 04/11/2026. No application code, data or schema changed; no builds run.

## Method

Five parallel read-only agents checked the 39 review findings and the code side of DB01–DB05 against the current source, each after reading the relevant `docs/features` notes. The live database facts were rechecked directly through the Supabase MCP connection (read-only, owner-scoped aggregates). Every correction and every newly reported defect below was spot-checked in the source before being accepted. Contrast ratios were computed with the WCAG relative-luminance formula from the actual colour values.

Verdicts: **Confirmed** (code or database shows it), **Partly** (real, but overstated or mis-described), **Not confirmed**, **Needs a device** (only settleable on a real phone or with the owner).

## Summary

| | Confirmed | Partly | Not confirmed | Needs a device |
|---|---|---|---|---|
| Review findings (39) | 27 | 11 | 0 | 1 |
| Database findings (5) | 4 | 1 | 0 | 0 |

No finding was fabricated. The common faults are: scope too narrow (the real problem is wider than one screen), parts already fixed or already built, and a few mis-described mechanisms. Verification also found **22 issues the reviews missed**, several of them concrete defects (section "Newly found").

All 33 files named in the plan exist, and all 39 finding IDs are mapped to a work package.

## Verdicts by finding

### Main review (F01–F12)

| ID | Verdict | What the code shows / correction |
|---|---|---|
| F01 | Confirmed | `saveInspectionDraft` returns nothing; failures only log (`inspection-draft.ts:25-38`), callers `void` it (`InspectionForm.tsx:1044-1048`, `:1189`). The text-only fallback is also silent. The real false assurance is the outbox message "it is still here on this phone" (`records/page.tsx:96-97`), shown when nothing was kept (`:866-869`). |
| F02 | Confirmed | `startAgain` clears the draft and its photos immediately, no confirmation (`InspectionForm.tsx:1115-1118`). |
| F05 | Partly | The navbar Back cannot be reached while the form is open: below 768px the form is `fixed; inset:0; z-index:45` (`globals.css:1520,1540-1551`); at 768px+ the navbar Back is `md:hidden`. **The real unguarded exit is the desktop Records Home button** (`records/page.tsx:1694-1698`, `router.push` with no guard). Browser/swipe Back stays open by design. |
| F06 | Confirmed | Sends trigger only on open, online and visible (`InspectionOutbox.tsx:22-53`). Copy list incomplete: also `InspectionOutbox.tsx:82`, `records/page.tsx:872`, `OfflineIndicator.tsx:57`. "Waiting" also covers expired session, server errors and another tab holding the lock, yet always says "Still no signal". |
| F07 | Confirmed (understated) | Two-column grid plus a four-button non-wrapping priority row (`PurchaseItemForm.tsx:99,121`). Estimated to squeeze the category field at normal text size on 360–390px phones, not only at 200%. Same pattern at `:142`, `:172` and `FinancialRecordForm.tsx:121`. Device check could justify P1. |
| F08 | Confirmed (latent) | Focus list skips only disabled controls (`useDialogA11y.ts:35-42`). Also: Shift+Tab from the focusable panel itself escapes (`ModalShell.tsx:93`, `useDialogA11y.ts:145`). No live dialog found that triggers it today. |
| F09 | Partly | Selection mode confirmed (`dashboard/page.tsx:355-362`), but the page already scrolls the apiaries into view (`:130-134`, added 30/10). Only focus move and announcement are missing. |
| F10 | Partly | Accurate design assessment; add that there is no link colour token at all (`TextLink`, `globals.css:1007`). |
| F11 | Partly | Clock-based Auto confirmed (`theme-provider.tsx:29-32`, `layout.tsx:19-20`) and is the default. But the switcher already labels it "Auto · 6am-8pm" (`theme-switcher.tsx:13`). Gaps: no "Use device setting" option, and new users get the clock by default. |
| F12 | Confirmed (under-listed) | Also out of date: `mobile-first-over-50-ux-remediation-plan.md:520`, `inspection-drafts.md:10,57`. Old offline claims remain true for edits and other record types. |

### Public screens (R01–R05)

| ID | Verdict | What the code shows / correction |
|---|---|---|
| R01 | Confirmed (device check for real text settings) | No wrapping on the brand block, overflow hidden (`login/page.tsx:173,182-187`, `PageShell.tsx:18`). Evidence came from a root-font stress test; repeat with browser zoom and phone font settings. |
| R02 | Partly | Description and button emphasis do not follow the mode (`login/page.tsx:192,261-278`). **Enter is already consistent** (`requestSubmit`, `:202-212`). P2, not P1: a wrong tap gives a recoverable error. |
| R03 | Partly | Order confirmed (`:175-199`), but the version already sits last. Only the credits and extra framing need moving. |
| R04 | Confirmed (too narrow) | "Forgot Password?" ~112×20px (`:230-235`). Also small: "Request reactivation" (`:285-290`) and "Back to Login" (`forgot-password/page.tsx:110-116`). |
| R05 | Confirmed | Field borders 1.26:1 light, 1.42:1 dark. `--border-color` is shared with panels and cards, so a separate field-border token is needed. |

### Dashboard (D01–D08)

| ID | Verdict | What the code shows / correction |
|---|---|---|
| D01 | Confirmed | Band is fixed "Winter: nothing to do" for November–February (`seasonal-lead.ts:167`). Clashes when a scale hive lost ≥2 kg in 7 days ("needs a look" + "Record feed") and, more mildly, with "Heft" rows. **The label is in the agreed spec** (`dashboard-today-screen.md:39`), so the change needs owner sign-off and a doc update. |
| D02 | Partly | Rows already carry Recorded/Suggested/Task/Scale labels (`TodoList.tsx:50`). Queenless rows are current flags, not history. Missing: dates on queenless, varroa and grouped-task rows. |
| D03 | Confirmed (P2) | To do already stops at 5 with "Show all"; apiaries with jobs already sort first. |
| D04 | Confirmed | Three different card treatments (`globals.css:592`, `ApiaryWeatherRow.tsx:682`, `dashboard/page.tsx:632`). |
| D05 | Confirmed (partly done) | Recent visits is already 5 with "View All Records". Monthly guidance shows the whole list. Upcoming Events was missed. |
| D06 | Partly | Pills are plain non-interactive spans. The issue is wording: "Heft", "Check", "To do" are instructions styled as statuses. |
| D07 | Confirmed | Assistant button uses `bg-forest-600` (`ChatButton.tsx:28`), missed by the white-on-green fix. Accessible name is "Open Mel", which names but does not explain it. |
| D08 | Confirmed: measured failure | "View All Records" and "View Changes" at ~3.1–3.3:1. Merge into F04. |

### Hives (H01–H07)

| ID | Verdict | What the code shows / correction |
|---|---|---|
| H01 | Confirmed (stronger) | Badge is inspection-only, icon + "23d" with no word (`HiveListCard.tsx:248-267`). Three different "overdue" rules exist (see V11). |
| H02 | Confirmed | Full-width "Overview & Records" before the hive name (`HiveListCard.tsx:140-158`). |
| H03 | Confirmed | Setup always expanded; the new model/photo row (03/11) likely made cards longer than the screenshots show. |
| H04 | Partly | "+" already has the name "Add Hive" (`hives/page.tsx:884`); filter count and Clear already exist. Gap: visible label, and Clear only inside the opened filter panel on phones. |
| H05 | Confirmed (concrete) | New inspection link carries no apiary (`hives/page.tsx:997`). Records then preselects the remembered or first apiary and hive, which can differ from the one being viewed. |
| H06 | Partly: badge is a measured failure | Full Size badge has dark-only colours, **1.74:1 in light** (`HiveListCard.tsx:443-447`). P1. |
| H07 | Confirmed | Thresholds match. Date shows without year or "estimate". List rows show stores only below Enough, never dated (`HiveListRow.tsx:91-93`). |

### Inspection form (I01–I07)

| ID | Verdict | What the code shows / correction |
|---|---|---|
| I01 | Confirmed | "Nothing has been recorded yet." in edit mode too (`InspectionForm.tsx:2553`); also `:2602` uses "recorded" differently. |
| I02 | Confirmed (stronger) | Next (`bg-forest-800`) and save (`fj-btn-success`, `#166534`) are **the same colour** (`globals.css:57,676`). Last step already makes save the only main button. `FormActionRow.tsx` is not used here. |
| I03 | Confirmed (missed a worse case) | No anchors (`InspectionForm.tsx:1332-1367`). Disease stars mean more = worse (`:2157-2170`). **`RatingButtons.tsx` is unused**: fix belongs in `renderStarRating`. |
| I04 | Confirmed | Tick means "opened and not current" (`InspectionStepper.tsx:141`); variable misleadingly named `isComplete`. No reproduction needed; it is a presentation decision. |
| I05 | Partly | Hive context only on step 1 and review; header with Close scrolls away. Previous/Close already have names, and Close already asks before discarding. |
| I06 | Confirmed | Voice button purple; dark purple-500 is 4.12:1. "Click to upload / or drag and drop" also in three other files. The file input is `hidden` inside a label: not keyboard reachable. |
| I07 | Needs a device | At 320px "Update Inspection" likely wraps to two lines; stepper columns ~57px. The 256px/45px assumption in the stepper doc is out of date. |

### Database (DB01–DB05)

All live figures were reproduced exactly: 436 inspections, 0 NULL queen/eggs, 235 brood-pattern and 423 recapping zeroes, 65 propolis −1, 18 stores readings (30–100, all multiples of 5), 22 active hives, 5 with feeding newer than inspection, 4 without stores, 2 with stale stores, 2 queenless, 19 eligible due tasks (all `event_type = task`). No range checks on core ratings; no `updated_at` on inspections; only primary-key uniqueness on inspections and tasks.

| ID | Verdict | Correction |
|---|---|---|
| DB01 | Confirmed | **Propolis −1 is the database's own default** (`propolis_level DEFAULT -1`), so the 65 values most likely come from saves that omitted the field, not an "old historical representation". Queen averaging is a calculation defect, not a test candidate: it skews the queen comparison table (`QueenCompareTable.tsx:39`). Super fullness has three paths to false zeroes, not one. |
| DB02 | Confirmed | Same-day ties order by date then ascending ID: arbitrary, not chronological. Line drift `useHivesList.ts:404` → `:405`. |
| DB03 | Partly | The count also includes the in-season visit suggestion and up to two scale alerts per scale hive. The apiary page shows no total. Wrong cite: `ApiaryJobs.tsx:43` → `:101-103`, `:147`. |
| DB04 | Confirmed | Seed is not season-bound (see V12). |
| DB05 | Confirmed | `adjust_hive_honey_supers` confirmed: row lock, `GREATEST(0, …)`, no operation ID. Skipping the super change after a crash is a documented deliberate trade-off (`inspection-outbox.md:38,60`). |

## Newly found (not in any review)

Numbered V01–V22 so the plan can track them like the original IDs.

1. **V01 – Purchase form "Low" priority looks identical selected or not** (`PurchaseItemForm.tsx:60` vs `:131`).
2. **V02 – Failed queue write deletes uploaded photos and tells the user the inspection is "still here on this phone"** (`records/page.tsx:866-869`). If the row actually saved but the response was lost, it now points at deleted photos, and the retry creates a duplicate.
3. **V03 – Desktop Records Home button is an unguarded exit** (`records/page.tsx:1694-1698`).
4. **V04 – Closing the form loses up to 800ms of typing from the draft**: unmount cancels the pending save without writing it (`InspectionForm.tsx:1060-1061`).
5. **V05 – Queen averages include unrated zeroes** (`useQueenDetail.ts:112-116`), unlike hive averages and selection scoring.
6. **V06 – Super fullness false zeroes**: siblings set to 0 (`InspectionForm.tsx:704-713`), unrecorded shown as "0%" (`:2113`), non-numbers saved as 0 (`records/page.tsx:931`), and previous readings carried into a new inspection (`InspectionForm.tsx:925-930`).
7. **V07 – Disease stars (AFB, EFB, chalkbrood…) mean "more is worse"** with no anchor.
8. **V08 – `RatingButtons.tsx` is unused** in the app; the plan names it as a target.
9. **V09 – Next and Save are the same colour** on the inspection footer.
10. **V10 – 59 `text-forest-600` uses have no dark variant**: 4.45:1 on the dark surface (125 uses in all).
11. **V11 – Three different "overdue" rules**: hive list "Need inspection" is ≥14 days and never off in winter (`hives/page.tsx:739-744`); dashboard is >14 days, any record type, off November–February; hive day counts use UTC, so they read one day low between 00:00 and 01:00 in Irish summer time (`HiveListCard.tsx:72-74`).
12. **V12 – Stores seed can come from any past reading**, not just this season (`records/page.tsx:296-308`).
13. **V13 – A shared apiary's page shows no concerns** (overview is null, `useApiaryJobs.ts:19-20,59`).
14. **V14 – Full Size badge 1.74:1 in light** (`HiveListCard.tsx:443-447`).
15. **V15 – Voice button 4.12:1 in dark** (purple-500).
16. **V16 – Photo file input is not keyboard reachable** (`InspectionForm.tsx:2528-2535`).
17. **V17 – "View Changes" link is marked only by colour** inside a sentence (2.26:1 against the text, WCAG 1.4.1).
18. **V18 – Literal backticks** in the reset page copy (`forgot-password/page.tsx:64`).
19. **V19 – Super RPC returns NULL silently** when the hive is not visible; the client treats it as applied with no warning (`inspection-outbox.ts:158-165`).
20. **V20 – "Still no signal" shown for non-signal failures** (expired session, server error, another tab).
21. **V21 – Browser-bar colour**: two `theme-color` tags, only the first is updated (`layout.tsx:43-46`). Needs a device check.
22. **V22 – New inspection from Hives drops the chosen apiary** (`hives/page.tsx:997`).

## Plan corrections

**General**
- Add DB01–DB05 and V01–V22 to the coverage table, so they are tracked like the original IDs. (Applied 04/11/2026.)
- Change "measured candidates" to "confirmed" where ratios are now measured (D08, H06 badge, R05, voice button).

**WP01:** Replace "navbar Back reachable" with the desktop Home button. Add scenarios: failed queue write with lost response (duplicate + deleted photos), 800ms loss on close, unreadable draft, Android double-Back with CloseWatcher. Drop "check the meaning of step ticks": the code defines it.

**WP02:** Add: guard the Home button; rewrite the "still here on this phone" message; flush the draft on close; stop deleting photos when the outcome is uncertain.

**WP03:** Drop "Enter behaviour" (already correct). List every outbox copy location and separate "no signal" from other waiting reasons. Make the task-refusal warning persist. D01 needs owner sign-off because the label is in the agreed spec. Widen documentation fixes to `remediation-plan.md:520`, `inspection-drafts.md:10,57` and `inspection-save-any-step.md:26`.

**WP04:** Target `renderStarRating`, not `RatingButtons.tsx`. Add disease stars. Reuse `RadioChoiceGroup`/`RadioInput` for choices. Fix the Low priority bug. Change "verify zero exclusion in queen averages" to "fix" (use `averageRated`). Cover all three super-fullness zero paths. Remove the WP01 dependency for ticks.

**WP05:** Scope is app-wide: 125 `text-forest-600` uses. Use forest-800 in light (forest-700 fails on elevated cream at 4.45:1) and forest-300/400 in dark. Underline in-sentence links. Add the assistant button, the Full Size badge and the dark voice button. Separate field-border token from `--border-color`.

**WP06:** Stack all three purchase rows and the financial Date/Amount row; F07 may be P1 after a device check. Widen R04 to the reactivation and Back to Login links. Add hive: visible label (the name exists). Show Clear without opening Filters. Make the photo input keyboard reachable.

**WP07:** Next and Save share a colour, so give them different emphasis. H05 becomes a definite fix: pass the selected apiary. F09: only focus and announcement remain. I05: keep only the hive context line and Close reachability.

**WP08:** D06 is a wording fix. The assistant's name can be judged now ("Open Mel"). Upload copy is in four files.

**WP09:** Job count = grouped tasks + concerns + in-season visit suggestion + scale alerts. Add the hive-list overdue rule (≥14, no winter off) and UTC day counts. Build on the existing Recorded/Suggested/Task/Scale labels. Add dates to concern rows. Owner decision: should "Need inspection" also switch off in winter?

**WP10:** Acknowledge "6am-8pm" is already shown. Cover users with no saved preference (they default to clock Auto). Add the `theme-color` device check.

**WP11:** Three candidates already exist (To do capped at 5, View all records, List as phone default). Compare tighter limits, not new features. Add Upcoming Events and the new model/photo row to the evidence.

## Owner decisions surfaced

1. Change the agreed "Winter: nothing to do" label?
2. Should the hive list's "Need inspection" also switch off in winter, matching the dashboard?
3. Should previous super-fullness readings carry into a new inspection?
4. Should a hive remembered from earlier today still be preselected when starting from Hives?
