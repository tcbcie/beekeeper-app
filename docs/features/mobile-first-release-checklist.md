# Mobile-first (50+) release checklist – WP12

**Created:** 05/11/2026 · **Plan:** [mobile-first-implementation-plan.html](./mobile-first-implementation-plan.html) (WP12, the release gate) · **Baseline:** [mobile-first-wp01-baseline.md](./mobile-first-wp01-baseline.md)

This is the single list to work through before the WP02–WP10 changes count as released. Results go in the WP01 baseline with a date. Rules:
- Live checks use the demo account only, never a real beekeeper's account. Test records are deleted afterwards.
- Screenshots and recordings stay out of the repository.
- No participant result is written unless it came from a real session.
- The build and the version number are the owner's manual steps.

## 1. Release gate: critical scenarios

These protect against lost work, being locked out, and misunderstanding what was saved. Each must pass, or be written down as a known limit in section 5, before release. "Desktop" means Chrome on the demo account. "Phone" means the owner's phone checklist (section 3). "Code" means reasoned from the code because it cannot safely be forced live.

| Area | Scenario | How checked | Expected now | Result |
|---|---|---|---|---|
| Losing work | S01, S02: typed-into inspection, then Home (wide screen) | Desktop | Asks "Discard…?" before leaving (WP02) | Pass, desktop 05/11/2026 |
| Losing work | S04, S05, S06: Close, in-app link, browser Back on a changed form | Desktop | Close and links ask; Back leaves and keeps the draft | S04, S05 pass 05/11/2026; S06 not re-run (automation) |
| Losing work | S09: resume panel, Start again | Desktop | Asks before deleting the draft (WP02) | Pass, desktop 05/11/2026 |
| Losing work | S10, S11: draft cannot be written, or only without photos | Code | A notice says the draft is not kept, or kept without photos (WP02) | |
| Losing work | S07, S08: iOS swipe Back, Android Back twice | Phone | Draft offered again; no silent loss | |
| Losing work | S32: footer with the keyboard open | Phone | Footer stays above the keyboard | |
| Saving | S13: save in flight mode, then back online (app open, and closed then reopened) | Phone | "Waiting to send" wording; it arrives once, with no duplicate | |
| Saving | S15, S17: queue write fails, or the response is lost after a failed queue write | Code | Text says the inspection is still in the form; no duplicate on retry (WP02) | |
| Understanding saves | S19, S20, S21: super change refused, follow-up task refused, session expired | Code | A warning stays on screen until dismissed (WP03) | |
| Understanding saves | S27: review step in edit mode | Desktop | Says what will be saved, not "Nothing has been recorded yet" (WP03) | Pass, desktop 05/11/2026 |
| Access | S03, S30, S31: Back reachable, stepper and footer at 320px, largest text in the installed app | Phone | Nothing cut off; buttons reachable | |
| Access | Login with browser zoom and the phone's own text size | Phone | Nothing cut off (WP06) | |
| Access | S29: Shift+Tab inside a dialog | Desktop | Focus stays in the dialog (WP04) | Pass, desktop 05/11/2026 |

## 2. Owner build test (WP02–WP10)

Run the build, then check:

1. **WP02 unfinished work.** Home and Start again ask before discarding. A draft that cannot be saved says so. An inspection waiting to send is reused, not duplicated.
2. **WP03 wording.** The winter card says "Winter: just check food". The review step says what is saved. The login text follows its mode. Waiting inspections no longer claim "no signal". Warnings stay until dismissed.
3. **WP04 fields and ratings.**
   - Purchase and Profit & Loss labels focus their fields. Priority and Type are green radio choices.
   - Every star scale says what 1 and 5 mean. Steps are numbered.
   - Super fullness starts "Not set", with last time's reading as a hint.
4. **WP05 colour.** Green text is darker in light mode and readable in dark. Field edges are easy to find. The Full Size badge, voice button and Mel button are legible in both themes.
5. **WP06 narrow screens.**
   - Login, reset and reactivate wrap instead of clipping. Secondary form rows stack on a phone.
   - Hives shows "Add" and Clear filters on a phone. The photo picker is reachable with Tab.
6. **WP07 inspection flow.**
   - Next is solid and Save is outlined until the last step. The hive line shows from step 2. Close stays pinned on a phone.
   - Hives → New inspection keeps the apiary and leaves the hive to choose.
   - The dashboard quick-action instruction is announced and has its own Cancel.
7. **WP08 visuals.**
   - Seasonal pills say a state (Lighter, No reading, Not yet, Sudden drop).
   - Hive cards lead with the hive, with line icons. Login has no badge and the credits sit at the bottom.
   - Photo boxes say "Add photos" or "Add a photo". Mel is announced as the beekeeping assistant.
8. **WP09 time and stores.**
   - November to February: no "Need inspection" in the Hives summary, and the badges are grey.
   - Badges read "Inspected N days ago".
   - The stores dial says "Estimated 28 August". On a new inspection the stores slider starts "Not recorded".
   - Varroa and task rows carry dates, and there is a jobs line under To do. A shared apiary page carries its note.
9. **WP10 appearance.**
   - Profile → Appearance offers Light, Dark, Use device setting and Light by day. Use device setting follows the phone straight away.
   - No flash on refresh. In a private window, the app follows the device.

## 3. Phone checklist

On the demo account, note the phone, OS version, browser or installed app, and what happened.

1. **S07** iPhone: type a note, swipe Back. Is the draft offered?
2. **S08** Android: press Back once, then again. Does the second press leave?
3. **S13** Flight mode on, save, read the message. Turn flight mode off with the app open, then again with it closed and reopened.
4. **S24** Dashboard → New inspection: where does the screen move, and is the instruction read out?
5. **S30/S31** Largest text size: do the step names and footer buttons fit?
6. **S32** Notes field: is the footer above the keyboard?
7. **S23** Hives, filter to an apiary, New inspection: which apiary and hive does it start with?
8. **Hives with large text:** is the last hive fully visible above the bar?
9. **Login with large text and zoom:** is anything cut off?
10. Repeat steps 1 and 5 in the installed app.
11. **WP09:** the Hives badges are grey and there is no "Need inspection" (November–February).
12. **WP10 / V21:** with the phone in dark mode and the app on Light (and the reverse), does the browser bar match the app?
13. From the WP01 Chrome run: with no hive chosen, tapping step 3 does not move. Is there a message explaining why?

## 4. Desktop re-run (Chrome, demo account)

S01, S02, S04, S05, S06, S09 and S25–S29, plus the visible WP08–WP10 changes. **Done 05/11/2026:** all passed, except S06, which was not re-run (browser Back is not available in the automation tab). Details are in the baseline under "WP12 desktop re-run".

## 5. Known limits and deferred items

| Item | Source | What would close it |
|---|---|---|
| No automatic retry while the app stays open (S14) | WP03 | First make the super-count change safe to retry (record "done" before the call), then add retry |
| Same inspection edited in two tabs: the last save wins (S22) | WP03, database review | A database proposal for a version column, for separate approval |
| A super change on a hive you can see but not change reports success (S19) | WP03, `inspection-outbox.md` | A database proposal (the RPC should report 0 rows), for separate approval |
| Queen seen / Eggs present cannot say "not checked" | WP04 | A design review of a new data state |
| Step bar, footer and Hives bottom space at the largest text | WP06, WP07 | Change only if phone checklist steps 5 and 8 show a problem |
| An unreadable stored draft (S12) is left as it is | WP02 | Not planned; it is rare and needs device evidence |
| Small text long tail (`text-xs` held by a ratchet test) | Typography stage | Its own stage |
| Dashboard order, folding and the Cards default | WP11 | Evidence from the field study (pack §7a); until then nothing changes |
| Browser bar colour on a real phone (V21) | WP10 | Phone checklist step 12 |

## 6. Release notes draft (for the owner's version bump)

The bump script would otherwise use the commit messages. These are shorter, written for beekeepers, and grouped by type to match the `changelog` table. Paste them in or adjust them; nothing has been written to the database.

**Improvements**
- Your unfinished inspection is safer: leaving or starting again now asks first, and the app tells you if a draft could not be kept.
- Inspections waiting to send say so plainly, and warnings stay on screen until you close them.
- Every star rating says what 1 and 5 mean, and the inspection steps are numbered.
- Super fullness and stores start as "Not recorded" on each visit, with last time's reading shown as a hint, so nothing is copied by accident.
- Easier to read: darker green text, clearer field edges and better contrast in dark mode.
- Small screens and large text: sign-in pages and forms wrap instead of cutting off, and links are bigger to tap.
- The inspection flow is clearer: Next leads, the hive shows on every step, and Close stays in reach on a phone.
- Hive cards put the hive first. Badges say "Inspected 23 days ago" and turn grey in winter, when no inspection is due.
- To do jobs show their dates, and stores readings show the day they were estimated.
- Appearance: choose Light, Dark, Use device setting (the new default) or Light by day.

**Bug fixes**
- Day counts no longer read one day short just after midnight in summer.
- The latest of two records on the same day is now the one entered last.
- A shared apiary's page no longer says it has no concerns.
- Queen averages ignore ratings that were left blank.
- The browser bar colour now matches the app on a phone set to dark mode. (Keep this line only once phone checklist step 12 passes.)
