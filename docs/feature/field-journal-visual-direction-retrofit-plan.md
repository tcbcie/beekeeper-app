# Field Journal Visual Direction Retrofit Plan

**Date:** 2026-02-26
**Status:** Implemented (core rollout + follow-up consistency passes completed)
**Scope:** Unify public + app visual language (typography, accents, background detail), then retrofit login/dashboard first
**Related:** [Frontend Design Review](./frontend-design-review.md)

---

## Summary

This plan formalises a single visual direction for HiveCraic across both public and authenticated surfaces: **Field Journal**.

The goal is to make the app feel like one product system by standardising:

- Typography hierarchy (serif display + sans UI text)
- Accent logic (forest for primary, amber for emphasis, semantic colors for status only)
- Background detail system (shared atmospheric texture + depth)
- Surface primitives (header/panel shells reused across pages)

Implementation started with **login** and **dashboard overview** and was then rolled out to `/about`, public/auth flows, and shared dashboard/settings components.

---

## Visual Direction: "Field Journal"

### Core Intent
- Practical fieldwork tool with editorial craftsmanship
- Warm, tactile surfaces in light mode
- Calm, focused night-planning mode in dark mode
- Utility-first interface without generic SaaS styling

### Why This Direction
- Matches the domain (beekeeping, outdoors, records, seasonal work)
- Aligns with the existing "Field Work / Evening Planning" theme concept already in `globals.css`
- Avoids the current split where public pages feel like a different design system

---

## Design System Rules

## Typography Hierarchy

### Display / Hero / Page Titles
- Use `font-serif` (DM Serif Display) for:
  - Login title
  - Major dashboard page headings (starting with dashboard overview)
  - Public hero headlines (future phase)

### UI / Body Text
- Use `font-sans` (DM Sans) for:
  - Form labels and inputs
  - Tables, cards, controls
  - Secondary content and descriptions

### Mono / Metadata
- Use `font-mono` sparingly for:
  - Version/build chips
  - IDs/codes (when helpful)

### Rule of Thumb
- One serif emphasis per major surface (header/title), not everywhere

---

## Accent Logic

### Accent Roles
- **Primary actions / brand emphasis:** Forest green (`--accent-primary`)
- **Secondary highlights / editorial warmth:** Amber (`--accent-secondary`)
- **Status semantics only:** Blue (info), amber (warning), red (error), green (success)

### Practical Rule
- Do not mix multiple decorative accents within the same section
- If a section uses status colors, keep surrounding UI neutral/token-based

---

## Background Detail System

### Base Layer
- Keep existing theme base colours:
  - Light: warm cream (`--background`)
  - Dark: deep blue-black (`--background` in `.dark`)

### Atmosphere Layer
- Shared, subtle visual detail utilities for:
  - soft radial glows
  - low-opacity grain/pattern texture
  - ambient top-edge fade for page depth

### Surface Layer
- Reusable panel shells with:
  - `bg-surface` / `bg-surface-elevated`
  - token borders (`border-border`)
  - soft shadow
  - optional blur on elevated overlays

---

## Phase 1: Shared Primitives + Utilities (Completed)

### New Components
- **`src/components/ui/PageShell.tsx`**
  - Shared page background/detail wrapper
  - Supports centered auth layouts and standard page content

- **`src/components/ui/PageHeader.tsx`**
  - Eyebrow label
  - Serif title
  - Supporting description
  - Optional right-side actions slot

- **`src/components/ui/Panel.tsx`**
  - Standard surface shell for sections/cards that need consistent framing

### CSS Utilities (`src/app/globals.css`)
- Add shared background/detail utilities for the Field Journal atmosphere
- Add reusable surface helpers for page shells/panels

### Implemented Follow-on Primitives (Added During Rollout)
- `src/components/ui/ModalShell.tsx`
- `src/components/ui/FormActionRow.tsx`
- `src/components/ui/FieldLabel.tsx`
- `src/components/ui/TextInput.tsx`
- `src/components/ui/SelectField.tsx`
- `src/components/ui/TextAreaField.tsx`
- `src/components/ui/CheckboxInput.tsx`
- `src/components/ui/RadioInput.tsx`
- `src/components/ui/RadioChoiceGroup.tsx`
- `src/components/ui/InfoPanel.tsx`
- `src/components/ui/AlertPanel.tsx`

---

## Phase 2: Login Retrofit (Completed)

### File
- `src/app/login/page.tsx`

### Changes
- Wrap page with `PageShell` (centered layout)
- Replace isolated auth card styling with shared `Panel` surface treatment
- Apply unified typography hierarchy:
  - serif title
  - sans labels/body text
- Align button variants to accent logic:
  - primary = forest
  - secondary = neutral/surface
- Improve message banners (success/error) to be token-aligned in both themes
- Fix existing polish issues:
  - duplicate/conflicting dark classes
  - inconsistent Google button hover/dark styles

### Result
- Login feels like part of the same product as the dashboard
- Establishes the visual pattern for future public pages

---

## Phase 3: Dashboard Overview Alignment (Completed + Extended)

### File
- `src/app/dashboard/page.tsx`

### Changes
- Introduce `PageHeader` for the dashboard overview top section
- Wrap major sections in shared `Panel` shell where practical:
  - recent activity
  - teams
  - rearing groups
  - shared-by/shared-with sections (with section-specific border accents preserved)
- Preserve data/status semantics while reducing decorative inconsistency

### Result
- Dashboard starts using the same typography and surface framing language as login/public pages
- Follow-up passes extended utility/token cleanup into dashboard clusters (`profile`, `records`, `tasks`, `apiaries`, `settings`) and shared shell-adjacent components (`Navbar`, `Sidebar`, `MobileDrawer`, `BottomNavBar`, `VersionDisplay`)

---

## Phase 4: Public Surface Rollout (Completed)

### Initial Target
- `src/app/(public)/about/page.tsx`

### Changes Implemented
- Replaced separate amber-marketing style shell with Field Journal background/detail system
- Reused `PageHeader` / `Panel` patterns on public pages and supporting auth/public flows
- Kept public flavor within the same shared visual system

### Additional Public/Auth Rollout (Completed)
- `src/app/(public)/layout.tsx`
- `src/app/(public)/about/page.tsx`
- `src/app/(public)/privacy/page.tsx`
- `src/app/(public)/terms/page.tsx`
- `src/app/forgot-password/page.tsx`
- `src/app/reactivate/page.tsx`
- Invitation accept/decline flows (including rearing-group variants)
- Shared invitation response shell (`src/components/invitations/InvitationResponseShell.tsx`)

---

## Files Implemented (Representative)

### New Files
- `src/components/ui/PageShell.tsx`
- `src/components/ui/PageHeader.tsx`
- `src/components/ui/Panel.tsx`
- `src/components/ui/ModalShell.tsx`
- `src/components/ui/FormActionRow.tsx`
- `src/components/ui/FieldLabel.tsx`
- `src/components/ui/TextInput.tsx`
- `src/components/ui/SelectField.tsx`
- `src/components/ui/TextAreaField.tsx`
- `src/components/ui/CheckboxInput.tsx`
- `src/components/ui/RadioInput.tsx`
- `src/components/ui/RadioChoiceGroup.tsx`
- `src/components/ui/InfoPanel.tsx`
- `src/components/ui/AlertPanel.tsx`
- `src/components/invitations/InvitationResponseShell.tsx`

### Modified Files
- `src/app/globals.css`
- `src/app/login/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/layout.tsx`
- `src/app/(public)/layout.tsx`
- `src/app/(public)/about/page.tsx`
- `src/app/(public)/privacy/page.tsx`
- `src/app/(public)/terms/page.tsx`
- `src/app/forgot-password/page.tsx`
- `src/app/reactivate/page.tsx`
- `src/components/Navbar.tsx`
- `src/components/Sidebar.tsx`
- `src/components/MobileDrawer.tsx`
- `src/components/BottomNavBar.tsx`
- `src/components/VersionDisplay.tsx`
- `src/app/dashboard/profile/page.tsx`
- `src/app/dashboard/records/page.tsx`
- `src/app/dashboard/tasks/page.tsx`
- `src/app/dashboard/apiaries/page.tsx`
- `src/app/dashboard/settings/page.tsx`
- `src/components/settings/*` (multiple admin/settings UIs)

---

## Acceptance Criteria

- [x] Login and dashboard overview share a clear visual language (same heading hierarchy + surface styling)
- [x] Serif display typography is applied intentionally to major headings (not body UI)
- [x] Accent usage is consistent: forest for primary, amber for emphasis, semantic colors for status
- [x] Shared background detail system is implemented as reusable utilities/components
- [x] No compile errors after rollout (manual visual verification reported good)
- [x] Lint passes for touched files during implementation passes

---

## Risks / Notes

- `PageHeader` / `Panel` integration remains intentionally flexible for dense pages with page-specific controls
- The rollout included gradual utility extraction (`fj-btn`, `fj-badge`, `fj-chip`, `fj-control`, etc.) to avoid large regressions
- Remaining work is incremental polish, not structural theming:
  - broader token cleanup in untouched pages/components
  - optional conversion of utility classes into typed React wrappers
  - broader accessibility sweep beyond already-fixed hover-only tooltip patterns
