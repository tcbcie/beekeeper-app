# HiveCraic: mobile experience and visual design review

**Date:** 3 November 2026  
**Baseline:** working tree at `5dd9ecc9`  
**Status:** Assessment complete; recommendations for a subsequent plan, not approved implementation scope.

**Implementation planning:** The [consolidated implementation plan](../features/mobile-first-50-plus-consolidated-implementation-plan-2026-11-04.md) is now the single prioritised backlog. Its work packages supersede the separate candidate lists in the reviews; original findings remain the evidence record. Implementation awaits approval.

## Review extension: rendered screens and field study

The [rendered-screen addendum](mobile-first-rendered-review-2026-11-03.md) now includes live public-screen screenshots, computed measurements and five additional findings. The [dashboard screenshot review](mobile-first-dashboard-screenshot-review-2026-11-03.md) adds visual findings from six owner-supplied authenticated screenshots. The [hive list and cards review](mobile-first-hive-screenshot-review-2026-11-03.md) adds seven findings from five further owner-supplied screenshots. The [inspection screenshot review](mobile-first-inspection-screenshot-review-2026-11-04.md) adds seven findings from six images covering all five edit stages. Authenticated interaction checks, save outcomes and recovery screens remain pending. The [field-study pack](mobile-first-field-study-pack-2026-11-03.md) contains session materials; no participant sessions or field findings have been collected. The source-review methods and limitations below describe the original assessment.

## Overall assessment

HiveCraic has a credible mobile foundation and a recognisable field-journal identity. Its labelled bottom navigation, generous shared controls, seasonal guidance, staged inspections and local inspection storage are valuable assets. A replacement framework or wholesale redesign is not justified by this review.

The main weakness is uneven application of those foundations. Secondary forms bypass accessible shared patterns; recovery has some silent or destructive outcomes; visual styling mixes semantic tokens with local colour decisions. The next investment should make the app feel consistently readable, predictable and dependable, while retaining its warmth and beekeeping character.

Look and feel should be treated as part of usability: users should recognise the main action, understand what is selected and feel confident their observations are safe. Visual polish alone will not resolve those problems, but neither will technically correct markup deliver an attractive, comfortable experience by itself.

**Recommended sequence:** protect work and expose accurate save states; resolve field semantics and colour gaps; refine mobile layouts and visual consistency; validate the result with representative beekeepers.

## Scope and confidence

Three reviewers examined complementary areas: navigation and inspection recovery; shared controls and secondary forms; dashboard composition, themes, visual foundations and external guidance. This is a sampled source-code review of the application foundations and important workflows, not an exhaustive audit of every route.

Reviewed areas include the dashboard, bottom navigation and drawer, inspection stepper, drafts and outbox, shared buttons, fields and dialogs, purchase and financial forms, global styling, viewport configuration, theme handling and existing remediation documentation. The installed stack is Next.js 15, React 19, Tailwind 4 and custom shared UI, with Dexie for local storage.

**No authenticated screens were rendered during this review.** No device, screen-reader, outdoor, performance or participant sessions were run. Therefore aesthetic judgements concern the implemented design language and likely presentation, not a screenshot-based certification. Source-confirmed defects, conditional risks and design hypotheses are labelled separately below. No builds, application changes, database queries or dependency installations were performed.

People aged 50+ are not one ability group. Design for varying vision, dexterity, confidence, experience and device familiarity, alongside situational challenges such as sunlight, gloves, interruptions and poor signal. W3C identifies substantial overlap between older users' needs and existing accessibility standards; age alone should not trigger a simplified or patronising interface. [W3C: older users](https://www.w3.org/WAI/older-users/)

## What should be retained

| Foundation | Evidence | Why it matters |
| --- | --- | --- |
| Labelled mobile navigation | Bottom navigation uses equal-width slots with a 48px minimum height; the drawer has dialog semantics and closed-state inertness. | Familiar destinations remain visible and touchable. |
| Generous shared controls | Shared buttons, including compact variants, retain a 3rem minimum height; icon controls have 3rem dimensions. | Small visual variants do not automatically imply small touch targets. |
| Readable baseline and identity | System sans-serif fonts, a restrained serif greeting, warm light surfaces, dark text and semantic colour variables. | A coherent identity can be improved without downloading decorative fonts or replacing the brand. |
| Seasonal, actionable dashboard | Seasonal guidance asks a beekeeping question and offers contextual actions; tasks and apiaries have dedicated sections. | The dashboard already moves beyond a generic collection of statistics. |
| Inspection support | Named stages, progress, validation, error focus and save support throughout the flow. | Reduces the burden of a long form. |
| Real local saving | New inspection payloads can be queued locally, including photographs and follow-up tasks. | Offline capability is present; the next work concerns reliability and understanding, not starting from zero. |
| Accessibility infrastructure | Zoom remains enabled, reduced-motion styles exist, and shared dialogs include naming and focus restoration. | Preserve these behaviours during visual changes. |

## Prioritised findings

Priority indicates proposed planning order, not a formal accessibility conformance verdict. **P1** means address early because of lost-work or access barriers; **P2** means the next quality pass; **P3** means supporting documentation. Effort is relative: **S** is a bounded change, **M** spans related components or states. Estimates exclude full device validation.

### F01 — Draft storage can fail without telling the user

**P1 · M · Confirmed implementation, conditional on storage failure.** Draft persistence retries without photographs if the initial write fails; a second failure only logs an error. Its caller receives no outcome to present. A user can continue believing the inspection is recoverable when photographs or the entire draft are not stored.

Return a structured persistence result and present concise states such as “Draft saved on this phone”, “Photographs could not be saved on this phone” and “Draft could not be saved”. Preserve live form contents and provide an actionable recovery route. Do not confuse a draft with a queued or server-saved inspection.

**Acceptance:** blocked/full storage produces a visible, announced outcome; successful text-only fallback explicitly identifies missing photograph protection; success wording follows a completed write. **Evidence:** E01.

### F02 — “Start again” silently discards the existing draft

**P1 · S · Confirmed.** The recovery choice immediately clears the stored draft without confirmation or undo. The label does not communicate irreversible deletion.

Keep “Carry on” prominent. Rename the alternative to explain the consequence and confirm deletion of the named inspection, with “Keep draft” as the safe choice. An undo mechanism would also work, but confirmation is the smaller change.

**Acceptance:** one accidental tap cannot permanently remove the recoverable inspection or its photographs. **Evidence:** E02.

### F03 — Secondary forms lack associated labels and selected-state semantics

**P1 · M · Confirmed in sampled forms.** Purchase category and financial date labels are not programmatically associated with their controls. Purchase priority and Income/Expense choices change styling without exposing their selected state through radio or pressed semantics.

Reuse the shared field semantics. Prefer a labelled radio group for mutually exclusive values, with a visible selected indicator as well as colour. Preserve a large clickable label area.

**Acceptance:** screen readers announce every sampled field's name and the current choice; tapping a label focuses its control; keyboard operation follows the chosen native pattern. Extend the inventory to sibling tool forms before estimating a whole-app migration. **Evidence:** E03.

### F04 — Green text links retain a contrast gap

**P1 · S · Source colour calculation; rendered verification outstanding.** Dashboard links use `text-forest-600`, whose value is `#16a34a`. This gives approximately **3.30:1 on white** and **3.11:1 on the warm page background**. The sampled links use small text, for which the normal-text threshold is 4.5:1. Existing overrides darken `text-green-600` and white-on-forest buttons, but do not correct this forest text utility.

Use a dedicated accessible link colour with a persistent recognisable affordance. Check every actual surface and state instead of globally assuming all green styling is defective. Existing white-on-amber overrides already correct the dashboard ticket badge; that pairing is not reported as a defect here.

**Acceptance:** normal link text reaches 4.5:1 on its rendered background in both themes, including hover/focus states. **Evidence:** E04. [W3C: contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

### F05 — Navigation protection does not cover all programmatic exits

**P1 investigation · M · Conditional risk, not a reproduced mobile loss.** The app Back hook calls router navigation directly, whereas the dirty-form guard intercepts anchors. Existing-inspection edits do not have the new-inspection draft fallback. This leaves a protection gap where a dirty form can reach that exit.

The mobile records form is a full-screen surface and also uses CloseWatcher; therefore the source evidence does **not** establish that its underlying navbar Back button is reachable during editing. Map actual exits before changing history behaviour. Route reachable app-owned exits through shared confirmation; assess native Back separately and avoid trapping users with artificial history entries.

**Acceptance:** each reachable exit from a dirty new or edited inspection either preserves work or clearly asks before discarding it. Record platform-specific behaviour, including where CloseWatcher is unavailable. **Evidence:** E05.

### F06 — Outbox copy suggests stronger automatic sending than the trigger model provides

**P2 · M · Confirmed trigger/copy mismatch; frequency unmeasured.** “Sends by itself when there is signal” does not explain the app-open requirement. Automatic attempts are driven by mount, online and visibility events. A transient failure while the browser remains online and the app stays visible need not generate another event. Manual retry is already available.

Clarify “Saved on this phone; open the app with a connection to send”. Distinguish waiting, retrying, action required and server-confirmed states. Consider bounded retries with backoff while visible; do not promise background delivery unless implemented and verified.

**Acceptance:** transient failure has a recoverable, understandable state; local save never appears equivalent to server receipt; repeated attempts do not duplicate inspections. **Evidence:** E06.

### F07 — Secondary form layout squeezes choices into half the phone width

**P2 · S · Source-confirmed structure; reflow failure not rendered.** Purchase category and priority remain in two columns, with four priority buttons in one unwrapped row inside the second column. This competes directly with larger text and clear choice labels.

Stack these fields on phones and use a wrapping or two-column priority group. Essential action and choice labels should generally be 16px or larger; retain 14px for genuinely secondary metadata where comfortable. These are proposed product defaults, not WCAG minimum font sizes.

**Acceptance:** all choices and their selected states remain readable at 320 CSS pixels and with text enlarged to 200%, without page-level horizontal scrolling or clipped controls. **Evidence:** E07. [W3C: reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [text resizing](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html)

### F08 — Dialog focus discovery includes hidden candidates

**P2 · S/M · Shared-hook risk; no affected live dialog reproduced.** Focus candidates exclude disabled controls but are not filtered for hidden or inert descendants. Initial focus and Tab boundaries can therefore select an element that cannot receive focus.

Filter actual focusable candidates, cover focus on the container and retain existing stack and restoration behaviour. Only consider a primitive-library replacement if maintaining this correctly proves materially harder than adopting one.

**Acceptance:** initial focus and forward/reverse traversal remain inside the active dialog with hidden sections, nested surfaces and an empty control set. **Evidence:** E08.

### F09 — Mobile quick actions change into an indirect selection mode

**P2 · S/M · Confirmed behaviour; usability impact is a hypothesis.** On a coarse-pointer device with apiaries, “New inspection” prevents normal navigation and activates an apiary-selection mode. On other configurations it navigates. The instruction appears with the apiary list, below intervening dashboard content.

Evaluate a direct, labelled apiary chooser at the point of activation, or immediately scroll/focus to the selection instruction. Make mode state explicit. Keep the existing shortcut if participants understand it; do not assume fewer screens always means less effort.

**Acceptance:** participants can start an inspection unaided and correctly identify which apiary/hive they are recording; selection does not require discovering an instruction outside the visible area. **Evidence:** E09.

### F10 — Visual language needs fewer competing rules

**P2 · M · Design assessment from source.** Shared panels use translucent surfaces, blur, inset highlights and shadows; some dashboard sections use independent bordered/shadowed cards and multiple colour families. Button tones name colours rather than roles. These ingredients can create inconsistency, although their perceptual impact must be judged in rendered screens.

Retain the warm field-journal character. Standardise the roles of primary action, secondary action, destructive action, selected choice and status. Use opaque working surfaces as the default candidate, quieter boundaries and fewer decorative colour changes. Keep green for principal actions/positive states with clear labels; reserve amber and red for meaningful warnings and destructive consequences. Do not strip useful colour from weather or colony status merely to satisfy a minimal aesthetic.

**Acceptance:** the same action/state has the same appearance across dashboard, hive, inspection and tool forms; users can identify the primary action without being told; light and dark screen comparisons show coherent spacing, surfaces and hierarchy. No claim of a rendering-performance improvement is made without measurement. **Evidence:** E10.

### F11 — “Auto” theme follows the clock rather than the user's system preference

**P2 · S/M · Confirmed policy; preference impact requires validation.** Both bootstrap and provider choose light from 06:00 to 20:00, dark otherwise. Clock time is an imperfect proxy for actual light in Ireland and does not represent the device's chosen appearance. A theme can change during work.

Offer clearly labelled Light, Dark and Use device setting. If scheduled switching remains useful, label it as a separate schedule. Preserve explicit user choices and synchronise bootstrap/provider logic. A bright theme should be easy to select outdoors, but should not override the user's accessibility preference.

**Acceptance:** each setting does exactly what its label implies, survives reopening and applies consistently to native controls and app surfaces. **Evidence:** E11.

### F12 — Old review material understates current capability

**P3 · S · Confirmed documentation drift.** The earlier validation pack says there is no local save and that an offline inspection will fail. Current new-inspection queuing supersedes that claim; newer outbox documentation explains the app-open constraint.

Mark superseded sections and update future validation to distinguish draft, local queue, server receipt and edit behaviour. Do not scope an offline rebuild from the older report.

**Acceptance:** one current capability matrix identifies supported operations, limitations and outstanding device checks. **Evidence:** E12.

## Proposed look and feel direction

**A calm, practical field journal:** recognisably HiveCraic, with enough warmth to feel personal and enough clarity to use beside a hive. Keep the existing serif accent where it gives character; use the system sans-serif for working content. There is no need for a new font family or a generic native-app imitation.

| Design dimension | Recommended direction | What to validate |
| --- | --- | --- |
| Typography | Start with 16–18px working text, 16px essential choices and a limited heading scale. Use weight and spacing before adding sizes. | Real reading comfort, long names, 200% text and language expansion. |
| Colour | Warm neutral ground, opaque surfaces, dark ink, restrained forest accent and distinct labelled statuses. | Actual contrast in both themes; outdoor viewing, rather than assuming cream automatically reduces glare. |
| Hierarchy | Keep recovery/warnings prominent when relevant, followed by the day's meaningful action and apiary context. | Whether greetings, support badges or secondary sections displace the task users came to do. |
| Spacing | Consistent 4/8px-based rhythm, generous separation between unrelated controls, large tap areas. | Avoid both crowded forms and excessive scrolling. |
| Navigation | Stable labelled destinations, explicit Back/Cancel behaviour, contextual inspection actions. | Familiarity and recognition rather than hidden gestures or radial menus. |
| Lists | Name, meaningful status, last visit and next action first; secondary detail on demand. | Distinguishing similar hive names and finding a hive in a long apiary list. |
| Feedback | Quiet persistent save/sync status; transient messages for supplementary confirmation. | Users accurately explaining what is safe locally and what reached the server. |
| Motion and imagery | Brief purposeful transitions respecting reduced motion; real apiary/hive photographs where useful. | Motion must not distract; imagery must not displace controls or slow field work. |

Before committing to a visual pass, compare current and proposed versions of four screens: dashboard, apiary/hive list, inspection step and recovery/error state. Include narrow phones, large text and dark mode. This report does not invent visual scores for screens it has not rendered.

## Lessons from exemplary mobile products

These are selected pattern references, not an unsupported ranking or a claim that each app is universally accessible or best for every older user. Transfer the behaviour that fits beekeeping; do not copy their branding.

| Reference | Documented pattern | Application to HiveCraic |
| --- | --- | --- |
| Apple Reminders | Smart Lists gather work into recognisable categories such as Today and Scheduled. | Refine the existing seasonal/task hierarchy around what needs attention now; keep specialist tools available without putting everything on the opening screen. [Apple guide](https://support.apple.com/en-lamr/guide/iphone/iphe882772ed/27/ios/27) |
| Google Maps | Explicit offline downloads, an identifiable offline inventory and stated limits on offline functions. | Make readiness and limitations visible before a field visit; distinguish stored apiary data, saved inspections and online-only functions. [Google guide](https://support.google.com/maps/answer/6291838) |
| NHS App | Accessibility is an ongoing product responsibility, with audits and published known limitations. | Maintain a current accessibility/capability record and a clear way to report barriers. Use its component/pattern system as a clarity reference, not a reason to reproduce NHS branding or assume its legal obligations apply here. [NHS App guidance](https://design-system.nhsapp.service.nhs.uk/get-started/accessibility-in-the-nhs-app/) |

Apple's accessibility guidance also emphasises supporting larger text. Android recommends at least 48dp touch targets. These support the app's generous-control direction, but native points/dp and web CSS pixels are different units and should not be represented as interchangeable compliance rules. [Apple guidance](https://developer.apple.com/design/human-interface-guidelines/accessibility), [Android guidance](https://support.google.com/accessibility/android/answer/7101858)

## Skills, standards and framework choices

| Resource | Recommended use | Boundary |
| --- | --- | --- |
| WCAG 2.2 AA | Accessibility baseline: contrast, reflow, text resizing, names/states, focus, error recovery and target sizing. | Conformance requires a wider audit than this sample. The AA target rule is 24×24 CSS pixels with exceptions; retain 48×48 as the app's stronger product target. [WCAG target guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) |
| Apple HIG and Android accessibility guidance | Mobile expectations, larger text and forgiving controls. | Adapt to the web/PWA platform; native frameworks are not required. |
| Local UI skill | Outdoor context, large controls and thumb-friendly layout. | Revise advice favouring unexpected/radial navigation and clock-based auto themes. Familiarity and user preference take priority. Claims that pure black inherently reduces readability are not an accessibility standard. |
| Web Design Guidelines skill | Repeatable code-review checklist for labels, focus, feedback and browser behaviour. | Supplement with rendered and assistive-technology evaluation. [Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) |
| Design Taste app-screen guidance | Clear purpose, honest data, restrained decoration and consistent visual identity. | Its source study is desktop-based; do not import its compact 27–40px controls or 11–14px label norms into field workflows. Its no-navy preference is aesthetic, not a reason to replace a working dark theme. |
| Existing React/shared UI | Extend current Button, field semantics, Surface and ModalShell patterns. | Avoid introducing another full design system or migrating to native solely for this review. |

Treat skills as aids, not competing authorities. The project's user needs and measured accessibility outcomes should resolve conflicts. A useful working framework is: **task success → error recovery → accessibility → visual coherence → measured performance**. Visual coherence remains part of every stage rather than a decorative final layer.

## Candidate work packages for the later plan

| Package | Findings | Dependency | Completion gate |
| --- | --- | --- | --- |
| A. Protect observations | F01, F02, F05 | Inventory reachable exits and persistence states first. | No silent loss in agreed recovery scenarios. |
| B. Consistent accessible forms | F03, F04, F07, F08 | Agree control/field roles and text defaults. | Sample journeys pass labels, state, contrast, focus and reflow checks. |
| C. Honest connection feedback | F06, F12 | Use the persistence-state model from A. | Users distinguish draft, queued and sent; current documentation agrees. |
| D. Visual and interaction refinement | F09, F10, F11 | Review representative screenshots and user tasks. | Four agreed screen patterns work in both themes and enlarged text. |
| E. Field validation | All | Baseline before changes, repeat after each relevant package. | Evidence supports shipping; unresolved barriers are explicit. |

These are candidate packages, not an implementation commitment. A later plan should name exact files, owners, dependencies and estimates after the conditional findings have been reproduced.

## Validation needed before claiming the experience is ready

Use real iPhone/Safari and Android/Chrome devices in browser and installed-PWA modes, including a modest Android handset. Cover 320, 360, 390 and 430 CSS-pixel layouts; portrait/landscape; large text; keyboard-open states; light/dark themes; reduced motion; VoiceOver/TalkBack and external keyboard navigation. Verify safe-area and bottom-action behaviour rather than assuming fixed positioning is sufficient.

Recruit an initial 6–8 participants across the 50–59, 60–69 and 70+ ranges, varying phone confidence, eyesight, dexterity and beekeeping experience. This is a formative sample, not a statistically representative claim. Include outdoor sessions and realistic interruptions. W3C recommends involving older people and people with accessibility needs during development. [W3C: involving users](https://www.w3.org/WAI/planning/involving-users/)

Ask participants to find a hive, begin and complete a common inspection, correct an error, resume interrupted work, save without signal, interpret queue status, retry a failed send, and distinguish archive from deletion. Ask them which screen feels clearer and why; record comments about appearance as well as task success.

Proposed gates for the later plan:

- No accidental data loss in the agreed scenarios, including storage failure, app closure and editing an existing inspection.
- At least 90% unaided completion of core tasks in the formative sample, reported with raw participant counts; investigate every failure rather than treating the percentage as certification.
- Correct understanding of local versus server save status by every participant before leaving the task.
- Normal text at least 4.5:1 contrast; meaningful control boundaries/indicators assessed against applicable non-text criteria; aim for stronger contrast on critical outdoor text.
- Working content remains usable at 200% text sizing and reflows at 320 CSS pixels; maps/tables have appropriately scoped alternatives or exceptions.
- Essential standalone controls aim for at least 48×48 CSS pixels; assess actual hit areas, not icon dimensions or utility names.
- Record real-device loading and interaction behaviour on weak networks before deciding whether performance work is needed. This review makes no measured speed claim.

## Evidence index

Paths are included only here for engineering traceability. Line numbers refer to the reviewed baseline and will drift as code changes.

| Reference | Source locations |
| --- | --- |
| E01 | `src/lib/inspection-draft.ts:29`; `src/components/records/forms/InspectionForm.tsx:1044` |
| E02 | `src/components/records/forms/InspectionForm.tsx:1115`, `:1534` |
| E03 | `src/components/tools/PurchaseList/PurchaseItemForm.tsx:101`, `:123`; `src/components/tools/ProfitLoss/FinancialRecordForm.tsx:95`, `:123`; shared alternative `src/components/ui/fieldSemantics.tsx:95` |
| E04 | `src/app/dashboard/page.tsx:608`, `:646`; forest token `src/app/globals.css:56`; contrast overrides `src/app/globals.css:1380`, `:1437` |
| E05 | `src/components/Navbar.tsx:76`; `src/hooks/useBackNavigation.ts:31`; `src/hooks/useNavigationGuard.ts:43`; `src/components/records/forms/InspectionForm.tsx:1053`; mobile mitigations `src/app/dashboard/records/page.tsx:1668`, `:1747` |
| E06 | `src/components/records/InspectionOutbox.tsx:43`, `:119` |
| E07 | `src/components/tools/PurchaseList/PurchaseItemForm.tsx:99`, `:121`; `src/app/globals.css:627`, `:634` |
| E08 | `src/hooks/useDialogA11y.ts:35`, `:95`, `:129` |
| E09 | `src/app/dashboard/page.tsx:354`, `:423` |
| E10 | `src/components/ui/Button.tsx:5`; `src/components/ui/Surface.tsx:36`; `src/app/globals.css:589`; `src/app/dashboard/page.tsx:235`, `:517` |
| E11 | `src/app/providers/theme-provider.tsx:27`; `src/app/layout.tsx:19` |
| E12 | `docs/features/mobile-first-phase5-validation-pack.md:34`, `:110`; `docs/features/mobile-first-over-50-ux-remediation-plan.md:518`; `docs/features/inspection-outbox.md:58`; implementation `src/app/dashboard/records/page.tsx:840`, `:857` |
| Strengths | `src/components/BottomNavBar.tsx:33`; `src/components/MobileDrawer.tsx:119`; `src/components/ui/ModalShell.tsx:90`; `src/components/records/forms/InspectionStepper.tsx:119`; `src/components/dashboard/SeasonalLeadCard.tsx:76`; `src/app/globals.css:13`, `:611`, `:735`, `:1503`; `src/app/layout.tsx:38` |

The contrast figures were calculated from the declared sRGB colours using relative luminance. They are not sampled screenshot measurements. All external sources were consulted on 3 November 2026.


## Read-only database follow-up - 04/11/2026

The [database evidence review](mobile-first-database-review-2026-11-04.md) resolves rating/unknown mappings, activity dates, grouped jobs and stores freshness, and identifies save-recovery scenarios. The consolidated plan and HTML incorporate these refinements. No production data or application code changed; field-study and failure-recovery evidence remain outstanding.
