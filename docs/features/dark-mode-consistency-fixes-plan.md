# Feature: Dark Mode Consistency Fixes
**Date:** 27/02/2026
**Status:** Implemented

## 1. Overview
This feature hardens dark mode consistency by adding missing semantic theme tokens, reducing theme hydration flicker, and correcting light-only colour treatments on priority dashboard surfaces. The value is a more reliable, readable interface in both light and dark contexts.

## 2. Scope & Simplicity
* **In Scope:** Add missing theme tokens, improve initial theme application, and patch audited page-level colour classes that currently lack dark variants.
* **Out of Scope:** Full visual redesign, broad component refactors, new theming architecture, or additional feature work outside dark mode consistency.
* **Existing Code Impact:** Limited to global theme files and the specific audited pages/components with confirmed class-level gaps.

## 3. Technical Design
### Architecture
The fix remains within the current token-based theming model. Missing semantic tokens are introduced in global CSS and exposed through Tailwind theme mappings. Theme initialisation is made deterministic with an early document class bootstrap and provider-side synchronisation. Page-level class fixes adopt existing `dark:` variants and semantic colours.

### Database Connections (MCP Server)
No database access or schema changes are required for this feature.

## 4. Edge Cases & Risks
* Theme mismatch during hydration if bootstrap logic and provider state diverge.
* Over-darkening status badges if contrast is not balanced between themes.
* Inconsistent browser chrome colour on mobile if theme colour metadata is not kept in sync.

## 5. Implementation Phases
1. Phase 1: Added missing semantic colour tokens and colour-scheme handling in global CSS.
2. Phase 2: Improved theme bootstrap/hydration behaviour and synchronised browser theme colour with resolved theme.
3. Phase 3: Applied targeted dark-variant fixes on audited pages for alerts, badges, and status chips.
4. Phase 4: Recorded the implementation outcomes in this feature note.

## 6. Implementation Summary
### Global Theming
* Added missing semantic tokens to support existing utility usage:
  * `--surface-secondary`
  * `--text-muted`
  * `--muted`
  * `--muted-foreground`
* Exposed matching Tailwind theme aliases:
  * `--color-surface-secondary`
  * `--color-text-muted`
  * `--color-muted`
  * `--color-muted-foreground`
* Added explicit `color-scheme` support for both `.light` and `.dark`.

### Theme Bootstrap & Hydration
* Added an early theme bootstrap script in root layout to set the resolved class before hydration.
* Added browser `theme-color` synchronisation so mobile browser chrome follows the resolved app theme.
* Updated theme provider initial state to read persisted theme and resolve on first render.
* Added storage-event synchronisation for cross-tab theme consistency.

### Page-Level Dark Mode Fixes
* Patched light-only status/badge/alert styles on the audited priority pages.
* Updated shared/team cards, support form selection states, admin response blocks, subscription payment badges, reactivation status blocks, invitation expiry chips, and reset-password feedback panels.
* Updated queen marking colour badges on both hive and queen detail pages to include dark variants.

## 7. Files Updated
* `src/app/globals.css`
* `src/app/layout.tsx`
* `src/app/providers/theme-provider.tsx`
* `src/app/dashboard/page.tsx`
* `src/app/dashboard/support/page.tsx`
* `src/app/dashboard/settings/page.tsx`
* `src/app/dashboard/settings/subscription-history/page.tsx`
* `src/app/dashboard/hives/[id]/page.tsx`
* `src/app/dashboard/queens/[id]/page.tsx`
* `src/app/dashboard/apiary-team/page.tsx`
* `src/app/dashboard/rearing-team/page.tsx`
* `src/app/reset-password/page.tsx`

## 8. Manual Verification Checklist
1. Toggle `Light`, `Dark`, and `Auto` on Profile and confirm no visible flash during page refresh.
2. Confirm browser theme chrome updates correctly on mobile for light/dark.
3. Validate status badges and alert panels on:
   * Dashboard overview shared-data cards
   * Support ticket page (type selectors, admin response block, ticket-type badge)
   * Settings reactivation requests
   * Subscription history payment badges and transaction chip
   * Apiary Team / Rearing Team pending invitation rows
   * Reset password success/error banners
4. Validate queen marking colour chips on:
   * Hive detail page
   * Queen detail page

## 9. Notes
* No database changes were required.
* No build/test execution was performed by the agent, per project instruction.
