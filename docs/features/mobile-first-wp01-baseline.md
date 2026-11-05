# WP01 – Behavioural baseline for the mobile-first programme

**Date:** 04/11/2026. **Status:** Code pass and Chrome runs complete (04/11/2026); phone checklist pending.
**Plan:** [Mobile-first implementation plan](mobile-first-implementation-plan.html), WP01. **Evidence:** [Verification of findings](../reviews/mobile-first-findings-verification-2026-11-04.md).

This is the baseline that WP02–WP07 are measured against. It changes no app code. Each scenario has one result:

- **Passes / Fails** – observed in a run (where it was run is given).
- **Code-established** – the code makes the outcome certain, but it was not run. "(fails)" or "(passes)" says which way.
- **Untested** – not yet settled. Lack of access leaves a scenario untested, not failed.

Live runs use the demo account only (owner decision, 04/11/2026), never the owner's own account. Test records are deleted afterwards. Screenshots are kept out of the repository.

## 1. Exits and drafts

| ID | Scenario | Expected today, from the code | Result | Where to run |
|---|---|---|---|---|
| S01 | New inspection at 768 px and wider, typed into, then the Records **Home** button | Leaves without asking; draft kept minus up to 800 ms of typing (`records/page.tsx:1694-1698`, `InspectionForm.tsx:1060-1061`) | **Fails** (Chrome, 1528 px) | Chrome |
| S02 | Same, editing an existing inspection | Leaves without asking; the changes are lost (edits keep no draft) | **Fails** (Chrome, 1528 px) | Chrome |
| S03 | New inspection below 768 px: is the navbar Back reachable? | No: the form is full-screen above it (`globals.css:1520,1540-1551`) | Code-established (passes) | Phone (Chrome window could not narrow) |
| S04 | Dirty form, **Close** button | Asks before discarding (`records/page.tsx:175-188`) | **Passes** (Chrome): "Discard this inspection?" | Chrome |
| S05 | Dirty form, an in-app link (desktop) | Guard asks (`useNavigationGuard.ts:43-81`) | **Passes** (Chrome): same dialog from a sidebar link | Chrome |
| S06 | Dirty form, browser Back (desktop) | Not guarded, by design (`useNavigationGuard.ts:18-22`); new draft survives, edit lost | **Observed as designed** (Chrome): leaves, draft kept | Chrome |
| S07 | Dirty form, iOS swipe Back | Not guarded; new draft survives, edit lost | Untested | Phone |
| S08 | Dirty form, Android Back twice | First press caught by CloseWatcher; the second may leave (`useCloseWatcher.ts:29-33`) | Untested | Phone |
| S09 | Resume panel, **Start again** | Draft and its photos deleted at once, no confirmation (`InspectionForm.tsx:1115-1118`) | **Fails** (Chrome) | Chrome |
| S10 | Draft write fails (storage blocked or full) | Silent; nothing shown (`inspection-draft.ts:25-38`) | Code-established (fails) | Not run |
| S11 | Draft too big, saved without photos | Silent; the resume panel does not say photos are missing | Code-established (fails) | Not run |
| S12 | Stored draft cannot be read | Treated as no draft, then overwritten by autosave (`inspection-draft.ts:46-48`) | Code-established (fails) | Not run |

## 2. Saving and the outbox

| ID | Scenario | Expected today, from the code | Result | Where to run |
|---|---|---|---|---|
| S13 | New inspection saved in flight mode | "Saved on this phone. It will send by itself when there is signal."; sends when the app opens, comes online or becomes visible | Untested | Phone |
| S14 | Transient failure while online and visible | Not retried until the next open/online/visible event (`InspectionOutbox.tsx:22-53`) | Code-established | Not run |
| S15 | Queue write fails and the send waits | Entry discarded, uploaded photos deleted, message says it is "still here on this phone" (`records/page.tsx:96-97,866-869`) | Code-established (fails) | Not run |
| S16 | Response lost after the row saved, queue entry kept | Retry reuses the stored ID; duplicate key counted as success (`inspection-outbox.ts:141,180`) | Code-established (passes) | Not run |
| S17 | Response lost after the row saved, queue write had failed | New IDs on resubmit: duplicate inspection, first one pointing at deleted photos | Code-established (fails) | Not run |
| S18 | Crash between clearing the super change and the RPC | Super change skipped; documented trade-off (`inspection-outbox.md`) | Code-established | Not run |
| S19 | Super RPC on a hive the user cannot see | Returns NULL with no error; no warning shown (`inspection-outbox.ts:158-165`) | Code-established (fails) | Not run |
| S20 | Follow-up task refused | Passing toast only; queue entry removed (`inspection-outbox.ts:181-184,207`) | Code-established (fails) | Not run |
| S21 | Waiting because of expired session, server error or another tab | Still says "Still no signal" (`inspection-outbox.ts:63-72,223-224`) | Code-established (fails) | Not run |
| S22 | Same inspection edited in two tabs | Last save wins, no warning; inspections have no version column | Code-established (fails) | Not run: would mean saving edits to demo records |

## 3. Context, progress and focus

| ID | Scenario | Expected today, from the code | Result | Where to run |
|---|---|---|---|---|
| S23 | Hives screen filtered to one apiary, then **New inspection** | No apiary passed (`hives/page.tsx:997`); Records preselects the remembered or first apiary and hive | Code-established (fails) | Phone (bar shows only at phone widths) |
| S24 | Dashboard quick action on a touch phone | Selection mode; page scrolls to the apiaries (`dashboard/page.tsx:130-134,355-362`); focus not moved, nothing announced | Untested | Phone |
| S25 | Open step 3, go back to step 1 without entering anything | Step 3 shows a tick: ticks mean visited (`InspectionStepper.tsx:141`) | **Confirmed** (Chrome): step 3 ticked, "already visited" | Chrome |
| S26 | Which hive is this? On steps 2 to 4 | Hive shown only on step 1 and the review step | **Fails** (Chrome) | Chrome |
| S27 | Edit mode, review step wording | "Nothing has been recorded yet." (`InspectionForm.tsx:2553`) | **Fails** (Chrome) | Chrome |
| S28 | Footer: Next versus Save | Same colour, #166534 | **Fails** (Chrome): both rgb(22, 101, 52) | Chrome |
| S29 | Dialog: Tab and Shift+Tab round the focus loop | Shift+Tab from the panel itself escapes (`useDialogA11y.ts:145`) | **Fails** (Chrome): Shift+Tab from the panel lands on "Open Mel" | Chrome |
| S30 | Stepper and footer at 320 px | "Update Inspection" likely wraps to two lines; stepper columns about 57 px | Untested | Phone (Chrome window could not narrow) |
| S31 | Phone text size enlarged, installed app | Unknown | Untested | Phone |
| S32 | Footer with the on-screen keyboard open | Footer sits above the keyboard (`--keyboard-inset`) | Untested | Phone |

Phone widths could not be reached in Chrome on 04/11/2026: the window stayed 1528 CSS px wide when resized, and the site correctly refuses to be shown inside a frame. Phone-width scenarios (S03, S23, S30) therefore moved to the phone checklist.

## 4. What each value means today (DB01 contract)

This is the current behaviour, recorded so that later changes keep old records readable. It is not a proposal. "New" is a new inspection; "edit" is an existing one opened for editing.

| Field | Form starts at | Not recorded | "No" / absent | 0 | On save | Database |
|---|---|---|---|---|---|---|
| Queen seen, eggs present | false (unticked) | Cannot be told apart from "no": stored NULL becomes false on edit | false | – | false | Nullable; 0 NULL in the owner's 436 inspections |
| Brood pattern, temperament, population, calmness, swarming | 0 | 0 | – | Means not recorded | 0 kept | No range check. Defaults: calmness and swarming 3, the others none. Client zeroes override defaults |
| Recapping, VSH, SMR | 0 | 0 (column comment agrees) | – | Means not recorded | 0 kept | Default 3; comment says 0 = not recorded |
| Disease ratings (AFB, EFB, chalkbrood, nosema, DWV, IAPV/CBPV) | 0 | 0 | – | Means not recorded; 1–5 is severity, more is worse | 0 kept | Default 0; comment says 0 = not recorded |
| Drones present | -1 | -1 in the form | 0 | A recorded "none" | -1 becomes NULL | 0–3 check, default 0 |
| Propolis | -1 | -1 in the form | – | Lowest level | -1 becomes NULL | -1 to 3 check, **default -1**: inserts that omit it store -1 (65 rows) |
| Drone brood present | NULL | NULL | false | – | Kept | Default false. NULL and false both show unticked; the review summary tells them apart |
| Stores level | NULL | NULL | – | A real reading of 0 | Kept | 0–100 check, NULL = not recorded. **Record stores** seeds the last reading or 50 |
| Super fullness | NULL, or the last visit's readings (new) | NULL | – | Also produced for unrecorded supers (three paths) | Non-numbers become 0 | JSON array, NULL = not recorded |

Derived summaries: hive averages and selection scoring skip 0; queen averages included it until WP04 (04/11/2026) and now skip it too.

**Rating words (WP04, 04/11/2026)**, shown under the stars and read with the first and last star: Population 1 Very weak – 5 Very strong; Temperament 1 Very defensive – 5 Very gentle; Brood pattern 1 Very patchy – 5 Solid; Swarming 1 Very low – 5 Very high; Calmness 1 Very nervous – 5 Very calm; diseases and Varroa 1 Minimal – 5 Severe; Recapping, VSH, SMR 1 Very low – 5 Very high. 0 still means not recorded; stored values are unchanged.

**Decided 04/11/2026, built in WP04:** super fullness starts as not recorded, with the last reading shown as a hint; once one super is set, the others are saved as 0% and shown as such.

## 5. Phone checklist for the owner

Use the demo account. For each row note the phone, operating system version, browser or installed app, and what happened.

1. **S07** – iPhone: start a new inspection, type a note, swipe Back from the left edge. Reopen Records: is the draft offered?
2. **S08** – Android: same, press Back once, then again. Does the second press leave? Is the draft offered?
3. **S13** – Turn on flight mode, finish and save a new inspection. Read the message. Turn flight mode off with the app open: does it send by itself? Then repeat with the app closed and reopened.
4. **S24** – Dashboard: tap Add inspection. Where does the screen move, and is it clear what to tap next?
5. **S30/S31** – Set the phone's text size to its largest. Open an inspection: do the step names and the footer buttons fit and stay readable?
6. **S32** – On step 1, tap the notes field. Is the footer visible above the keyboard, and are the fields still reachable?
7. **S23** – Hives: choose an apiary in the filter, then tap New inspection. Which apiary and hive does the form start with?
8. **Hives with large text** – set the phone's text to its largest, open Hives with New inspection showing at the bottom, and scroll to the end. Is the last hive fully visible above the bar?
9. **Login with large text and zoom** – open the login page with the largest phone text, then with the browser zoomed in. Is anything cut off?
10. Repeat 1 and 5 in the installed app (Home Screen), if it is installed.

## Results log

### Chrome run – 04/11/2026

Chrome on Windows, desktop window 1528 × 698 CSS px, demo account on www.hivecraic.com. Every result matched what the code predicted.

| Scenario | What happened |
|---|---|
| S01 | Home went straight to the dashboard, no question. The draft survived, and the dashboard showed "Unfinished inspection". A weight changed just before pressing Home was lost: the draft kept the earlier value. |
| S02 | Editing an existing inspection, then Home: left with no question; the change was lost. Nothing was saved. |
| S04, S05 | Close and a sidebar link both asked "Discard this inspection?" with Keep editing and Discard. |
| S06 | After in-app navigation, browser Back left without asking and the draft survived. After a full page load, Chrome's own "Leave site?" appeared instead. |
| S09 | Start again cleared the draft at once with no question. |
| S25 | Visiting step 3 and returning without entering anything ticked step 3 ("already visited"); step 2, skipped, had no tick. |
| S26 | Step 3 did not name hive 29-DA anywhere. |
| S27 | Edit mode review step read "Nothing has been recorded yet."; the button read "Update Inspection". |
| S28 | Next and Save Inspection both rgb(22, 101, 52); Previous rgb(240, 235, 226). |
| S29 | Tab cycled between Keep editing and Discard. Shift+Tab with focus on the dialog panel (reachable by clicking its text) moved focus to "Open Mel" outside the dialog. |

**Other observations**
- The resume panel says "on this phone" on a desktop as well.
- On a desktop, the dashboard's New inspection opens the form directly. The two-tap selection mode is touch-only, as the code says.
- With no hive chosen, tapping step 3 in the stepper did not move to step 3. Whether a message explained why was not checked; look for one on the phone run.

**Clean-up:** both test drafts discarded. Database check afterwards: no new inspections or tasks on the demo account, and the edited inspection unchanged.

### Expected after WP02 – 04/11/2026 (not yet re-run)

WP02 changed the code behind these scenarios. Their results above stay as the baseline until they are re-run on the new build.

| Scenario | Now expected |
|---|---|
| S01, S02 | Home asks "Discard this inspection?" first. Leaving another way writes any waiting change straight away |
| S09 | Start again asks "Delete the unfinished inspection?" (Keep it / Delete it) |
| S10, S11 | A line under the step bar says the phone could not keep a copy, or kept it without photos; Carry on says "Photos were not kept." |
| S15 | Photos are kept, and the message says the work is still in the form |
| S17 | Save again with nothing changed reuses the same id: no duplicate. A changed form can still produce one |

### Expected after WP03 – 04/11/2026 (not yet re-run)

| Scenario | Now expected |
|---|---|
| S19 | The super count not changed because the hive cannot be seen gives a warning. A hive that can be seen but not changed still reports success (needs a database change) |
| S20 | The follow-up task warning stays until closed (not after a reload) |
| S21 | Waiting no longer claims "no signal": "Could not send it just now. It will try again when the app is next open with signal." |
| S27 | Edit mode review step: "Check your changes below, then tap Update Inspection. They are not saved until you do." |

### Expected after WP04 – 04/11/2026 (not yet re-run)

| Scenario | Now expected |
|---|---|
| S25 | Visited steps show their number, shaded, with no tick |
| S29 | Shift+Tab from the dialog panel wraps to the last control |

### WP05 – 04/11/2026

Colour only; no WP01 scenario changes. Contrast changes are listed in `contrast-fix.md` (Round 4).

### WP06 – 04/11/2026

Layout changes on the access screens, secondary forms, Hives top bar and the photo picker. S30, S31 and the new checklist steps 8 and 9 decide whether the step bar, the footer or the Hives bar need changing. Nothing was changed there without a reproduced problem.

### Expected after WP07 – 04/11/2026 (not yet re-run)

| Scenario | Now expected |
|---|---|
| S23 | From Hives, the apiary being viewed is chosen and no hive is preselected |
| S24 | The quick-action instruction receives focus, is read out, and has its own Cancel |
| S26 | Steps 2-5 show "Hive X · Apiary · date" |
| S28 | Save is outlined on steps 1-4; Next is the solid green button |

### WP08 – 05/11/2026

Presentation and wording only; no WP01 scenario changes. Hive cards put the hive first with an outlined Overview & Records; login credits moved below the sign-in methods; Mel's spoken name says what Mel is.

### WP09 – 05/11/2026 (not yet re-run)

No WP01 scenario changes its steps. What a re-run should now show:

- Hives (November to February): no "Need inspection" in the summary and grey inspection badges; from March, "Need inspection (over 14 days)" matches the red badges exactly.
- Badges read "Inspected N days ago" and change at local midnight, not UTC (V11).
- DB01 value table, stores: a new inspection starts "Not recorded" and stays NULL unless the slider is moved; the "Last reading" hint shows only readings since 1 August (V12).
- Dashboard: high varroa and task rows give a date; a shared apiary's page no longer says "no recorded concerns" (V13).

### WP10 – 05/11/2026 (not yet re-run)

No WP01 scenario changes. For the phone checklist: with nothing saved, the app now follows the phone's light or dark setting, and the browser bar should match the app in every combination (phone light or dark, app Light, Dark, Use device setting or Light by day) (V21).
