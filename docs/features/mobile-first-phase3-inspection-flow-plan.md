# Feature: Mobile-First Phase 3 — Focused Inspection Workflow
**Date:** 31/08/2026
**Status:** Implemented — pending build verification by the owner

## 1. Overview

Phase 3 of the mobile-first remediation programme, following Phases 1 and 2. It turns the inspection form from a single ~850-line scroll into a focused, stepped flow with explicit progress, validation the user can act on, and a review before saving.

A four-agent read-only audit was completed before writing this plan: a structural map of the form, an audit of how the records page hosts it, a feasibility study for local drafts, and a review of every prior design decision affecting this screen.

That last audit is the reason this plan does **not** propose a rewrite. Section 3 explains.

## 2. Scope & Simplicity

* **In Scope:**
  - Present the existing inspection fields as five steps with progress, Previous/Next and a review before saving.
  - Validate each step in JavaScript, announce errors, and move focus to the first invalid field.
  - Complete the label association Phase 1 deliberately left unfinished.
  - Guard in-app route changes, which Phase 1 explicitly deferred to here.
  - Collapse the duplicated form header and the duplicated discard confirmation.
* **Out of Scope:**
  - Rewriting field markup, control components or layout. See section 3.
  - Server-synchronised drafts. The parent plan requires a separate approved design.
  - Changing any field, its semantics, its defaults or the submitted payload.
  - Applying the stepped shell to the other four record forms. They are flat, 260–530 lines, and have no content meriting steps.
  - Hives and Records screens (Phase 4) and the dashboard (Phase 5).
  - New runtime dependencies, and any database, RLS or API change. None are required.
* **Existing Code Impact:**
  - `src/components/records/forms/InspectionForm.tsx` — step gating around existing blocks, validation, review step, label completion.
  - `src/components/records/forms/InspectionStepper.tsx` — new, presentational chrome only.
  - `src/app/dashboard/records/page.tsx` — header de-duplication, route-change guard, consolidated discard confirmation.

### Simplicity rules applied

1. Move blocks; do not rewrite them.
2. Keep all state lifted where it already is, so every existing effect keeps working untouched.
3. Complete label association mechanically, with `id`/`htmlFor` pairs, without restructuring markup.
4. Fix the duplication this programme itself introduced before adding anything new.

## 3. Technical Design

### Why this is a re-arrangement, not a rewrite

The audit of prior work found roughly twenty-five committed behaviours and eight defects already fixed once in this form. Among them: signed plus/minus entry for the six Given/Taken fields; wrap-safe rating rows and drone grids below `sm`; mobile-first stacking for cell toggles so "Supercedure Cells" stops colliding with its buttons; the `-1` sentinel that distinguishes an unrecorded drone level from a zero one; deterministic right-sized-frames prefill hardened against inspection history arriving after hive selection; `NULL` versus `0` in honey-super fullness, where a stale array length once ratcheted; the varroa invariant that brood-type flags require `varroa_seen_in_brood`; the `unstyled` button prop that stops shared styling fighting custom control states; and the replacement of interpolated Tailwind classes with static maps because interpolation breaks in optimised builds.

Rewriting the markup puts every one of those back in play at once, in a form whose fields a beekeeper relies on being correct. The structural map confirms a rewrite is unnecessary: every top-level block already carries `md:col-span-2`, so the two-column grid is unused and blocks can be regrouped without touching their internals.

**The design is therefore: keep every block's JSX, its handlers and its helper renderers exactly as they are, and change only which step each block appears in.**

### A. Step gating

All state stays in `InspectionForm`. This is the load-bearing constraint. The audit found the hive selection drives at least six effects that write into other steps' fields — right-sized-frames prefill, honey-super slider count, scale weight auto-fill, brood-box reconciliation, apiary sync, and the follow-up task default due date. Every one continues to work unmodified provided steps are conditionally-rendered chunks rather than separately-stateful components. Splitting state per step would break most of them.

`<form id="inspection-form">` stays mounted on every step. The top Save button lives outside the form and is associated by the `form` attribute, which resolves by id against the live DOM; unmounting the form would silently break that link.

Inactive steps are **conditionally rendered, never CSS-hidden**. A hidden-but-present `required` field blocks native submission with a validation bubble anchored to something invisible, which presents as a dead button with no explanation.

### B. Validation

Three fields carry `required`: hive, date and time, all in step 1. Because inactive steps unmount, those fields are absent from the DOM when the form is submitted from the review step, so native validation would not run at all. Native validation is therefore unusable in both directions, and validation moves into JavaScript.

Each step declares which fields it requires. Advancing runs that step's check; failing it renders an error against the offending field, announces it, and moves focus there. The review step re-runs every step's check before enabling Save, so a user who reaches the end with an incomplete step 1 is told which step to return to rather than meeting a silent no-op.

This is where the `label`, `helpText` and `error` props added to `TextInput` and `SelectField` in Phase 1 are finally consumed. That work was recorded then as built and unused; Phase 3 is the phase it was built for.

### C. Review step

The review step summarises what will be saved: hive and visit details, then only those observations actually recorded, so a common inspection does not present fifty empty rows. Each group links back to its step. Save is explicit and appears only here.

`handleSubmit` is untouched. It already reads the full `formData`, `givenTakenDrafts` and `followUpDrafts` regardless of what was rendered, so submitting from the review step needs no change to the submit path.

### D. Completing the label association

Phase 1 associated the seven visit fields and deliberately left the other twenty-two labels unassociated, on the stated expectation that Phase 3 would rewrite that markup anyway. This plan does not rewrite it — so the gap is closed directly instead, by adding `id`/`htmlFor` pairs to the remaining labelled controls.

This is mechanical and independent of layout: it changes attributes, not structure, so it carries none of the regression risk that motivated the re-arrangement approach. It does mean the two goals are met separately rather than as a side effect of one another, which is the honest way round.

### E. Guarding route changes

Phase 1 covered five in-page exit paths plus browser unload, and explicitly deferred in-app `Link` navigation to Phase 3 on the assumption the flow would become a focused route where guarding is natural.

The App Router still offers no supported navigation-interception API. Rather than intercept, the flow is presented as a full-screen panel on mobile that owns the viewport while active, so leaving it is a deliberate act through its own controls, which are already guarded. Where a stray in-app link remains reachable, the existing dirty state is used to intercept the click at the point of navigation.

### F. Header and confirmation de-duplication

The records page wraps the form in a panel with a title and a close button, and the form renders its own card, title and Save/Cancel inside that. A stepped shell must not become a third layer, so the two existing headers collapse into one.

Phase 1 also left the discard confirmation in two places with identical copy: `confirmDiscardInspection` on the page, and `handleCancel` inside the form. That duplication was introduced by this programme and is consolidated here.

A pre-existing defect found during the audit is fixed at the same time: the form's internal title reads "Edit Inspection" whenever `initialData?.hive_id` is truthy, which is also true for a **new** inspection started from a hive deep link. The page's own header gets this right by checking `editingInspection`, which is why the two disagree today.

### Database Connections (MCP Server)

None. Phase 3 changes presentation, client-side validation and component structure. No schema, RLS policy, RPC or submitted payload is altered. Should local drafts later require server synchronisation, the parent plan's stop-and-seek-approval procedure applies.

## 4. Edge Cases & Risks

* **Prefill races become more visible.** Right-sized frames and super fullness are prefilled by effects keyed on hive selection, hardened once against history arriving late. With hive selection on step 1 and the prefilled fields on a later step, the user now reaches those fields after a delay rather than simultaneously. The effects are unchanged, but the timing is more observable and should be checked.
* **A narrower step container makes mobile clipping more likely, not less.** Rating rows, drone grids and cell toggles were each fixed once for overflow. They must be re-checked inside the step container at 320px.
* **Weather is fetched only at submit.** `handleHiveChange` fetches on hive selection and discards the result, and `fetchingWeather` is set only during submit. A stepped flow could use the earlier fetch properly, but that is a behaviour change and is deliberately not made here.
* **Step state must reset on every transition that resets the form.** Edit-to-new, new-record-while-dirty and open-another-inspection all reset form state today; each must also return the flow to step 1, or a user lands mid-flow in a form that has been replaced underneath them.
* **The review summary must not imply a save has happened.** It is a preview of unsaved work.
* **Voice extraction fills fields across every step at once.** It writes a partial `formData` covering roughly forty fields. It keeps working because state is lifted, but a user dictating on step 1 may populate fields they will not see until step 3, and the flow should acknowledge that rather than appear to have done nothing.
* **Follow-up task due dates derive from the visit date** on step 1 while the tasks live on step 4. Unchanged by lifting, but a dependency across a step boundary.
* **`required` attributes should stay on the markup** for semantics even though JavaScript performs the checks; they simply must not be the only line of defence.

## 5. Implementation Phases

1. Phase 3A: **Step shell and gating** — the stepper component, step assignment of existing blocks, progress, Previous/Next, and step reset on every form-reset path.
2. Phase 3B: **Validation and focus** — per-step checks, error display through the Phase 1 field props, announcement and focus movement.
3. Phase 3C: **Review step** — summary of recorded values only, links back to each step, explicit Save.
4. Phase 3D: **Label completion and de-duplication** — the remaining `id`/`htmlFor` pairs, one header, one discard confirmation, and the edit-title fix.
5. Phase 3E: **Navigation guarding** — close the in-app route-change gap deferred from Phase 1.
6. Phase 3F: **Tests and documentation** — step gating, validation, review contents, and that the submitted payload is byte-for-byte unchanged.

## 6. Decisions Required Before Implementation

Four decisions are needed. Three are domain judgements about where a field belongs; the fourth is a scope choice.

1. **Honey Super Fullness has no home.** The parent plan's five stages do not mention it. It is a collapsible, optional section whose slider count derives from the hive's configured supers.
2. **`population_strength` straddles a boundary.** It is rendered with the four behaviour ratings, but it describes colony state rather than behaviour.
3. **`swarm_cells` straddles a boundary.** It sits in the Queen Cells block with cups, supercedure and emergency cells, but swarming is a stage 3 concern.
4. **Local draft persistence.** The parent plan asks for it "where technically safe". The feasibility audit found it is less safe here than it looks: the photograph is a `File` that cannot be stored, images run to 10MB against a ~5MB quota; there is no existing draft precedent to follow; and impersonation switches the live Supabase session *before* the page reloads, creating a window in which one user's in-progress inspection could be written under another user's key. Phase 1 already prevents the loss this feature was meant to prevent, across six exit paths.

## 7. Audit Findings Worth Recording

* **The parent plan's five stages do not cover every block.** Honey Super Fullness is unassigned, and two blocks straddle boundaries.
* **A pre-existing title defect**: a new inspection opened from a hive deep link is labelled "Edit Inspection".
* **Dead weather wiring**: the hive-change weather fetch discards its result, and `fetchingWeather` is set only during submit.
* **`scrollIntoView` is duplicated five times** across the record-opening handlers on the records page.
* **The double header** predates this programme; the double discard confirmation was introduced by Phase 1.
* **Reported, not fixed**: honey-supers auto-sync silently failed for non-owner team members until an RLS policy fix. Any new data path introduced here should be checked against team-member access, not only owner access. Phase 3 introduces none.
