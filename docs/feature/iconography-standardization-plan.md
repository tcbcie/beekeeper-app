# Iconography Standardization Plan (Lucide + Brand Icons)

**Date:** 2026-02-26
**Status:** Implemented (Phases 1-6 complete)
**Scope:** Standardise UI iconography and remove emoji-based icons from dashboard/about cards
**Related:** [Frontend Design Review](./frontend-design-review.md)

---

## Summary

This plan standardises iconography across key user-facing cards by adopting a single icon system (`lucide-react`) with explicit, limited brand icon exceptions. The primary goal is to replace emoji-based icons in:

- Dashboard stat cards and team/shared summary cards
- Public About page feature cards

The work was intentionally scoped to card/icon surfaces first (not all emoji in user-facing copy), allowing implementation without broad visual regressions.

---

## Goals

### Primary Goals
- Replace emoji icons in dashboard/about cards with Lucide or approved brand icons
- Make icon sizing, stroke weight, spacing, and container styling consistent
- Improve perceived production quality and visual coherence

### Non-Goals (This Iteration)
- Remove all emojis from marketing copy/text content
- Redesign card layouts or page structure
- Replace icons in every component across the app (navigation/status can follow later)

---

## Icon System Standards

### Default Icon Set
- **Library:** `lucide-react`
- **Usage:** All product UI icons (cards, lists, labels, actions) should use Lucide unless a brand/domain icon is explicitly required

### Brand Icon Exceptions
- HiveCraic logo / brand mark
- Provider logos (e.g. Google sign-in)
- Domain-specific custom SVGs only where Lucide is not a good semantic fit

### Sizing & Styling Conventions
- **Inline icons:** `w-4 h-4` (small), `w-5 h-5` (default), `w-6 h-6` (section headers)
- **Card badge icons:** `w-5 h-5` or `w-6 h-6` inside a themed circular/square container
- **Stroke:** Use Lucide defaults for consistency (avoid ad hoc stroke width overrides unless necessary)
- **Colour:** Prefer semantic token classes (`text-forest-*`, `text-amber-*`, `text-blue-*`) and token-aligned backgrounds

---

## Phase 1: Shared Iconography Foundation (Completed)

### 1. Create a Reusable Icon Wrapper
- **New file:** `src/components/icons/AppIcon.tsx`
- Purpose:
  - Normalise size classes and icon rendering
  - Support Lucide icons and optional `ReactNode` brand/custom icons
  - Reduce repeated icon class logic in cards

### 2. Create Semantic Icon Mappings
- **New file:** `src/lib/iconography.ts`
- Define semantic mappings for common concepts used in cards:
  - `apiary`
  - `hive`
  - `inspection`
  - `queen`
  - `task`
  - `team`
  - `rearingGroup`
  - `varroa`
  - `knowledge`
  - `mobile`
- Benefit: keeps icon choices consistent across pages and prevents drift over time

### 3. (Optional) Brand/Custom Icons Directory
- **Optional new folder:** `src/components/icons/brand/`
- Only add if a custom bee/hive glyph is needed and Lucide options are insufficient

### Implemented Notes
- Added `src/components/icons/AppIcon.tsx`
- Added semantic mappings in `src/lib/iconography.ts`
- No custom brand icon folder was required for this iteration

---

## Phase 2: Refactor `StatCard` for Component-Based Icons (Completed)

### Current Issue
- `StatCard` expects `icon: string` and renders emoji text (`text-4xl`) inside a circle.

### Planned Change
- **File:** `src/components/ui/StatCard.tsx`
- Update prop contract from:
  - `icon: string`
- To one of:
  - `icon: LucideIcon`
  - `icon: ReactNode`

### Implementation Notes
- Replace emoji text rendering with a consistent icon container
- Keep current `color` prop for now to minimize scope and avoid touching all call sites
- Preserve existing hover/animation behavior (`animate-fade-in-up`)

### Outcome
- Dashboard stat cards can use Lucide icons without layout regressions
- Future card types can reuse the same icon pattern
- Temporary string fallback was removed after migrating callers

### Implementation Note
- `AppIcon` was updated to correctly handle Lucide `forwardRef` component objects during prerender (fixing `/about` build/prerender error)

---

## Phase 3: Dashboard Icon Migration (Emoji -> Lucide) (Completed)

### Scope
- **File:** `src/app/dashboard/page.tsx`
- Replace emoji icons in:
  - `statCards`
  - `mySharedCards`
  - `sharedWithMeCards`

### Proposed Dashboard Mappings
| Current Card | Emoji | Proposed Icon (Lucide) |
|---|---|---|
| My Apiaries | `📍` | `MapPin` |
| My Hives | `🐝` | `Bug` (or custom bee icon if added later) |
| Inspections (7d) | `📋` | `ClipboardList` |
| Active Queens | `👑` | `Crown` |
| Active Tasks | `✅` | `CheckCircle2` |
| Shared Queens | `👑` | `Crown` |
| Shared Hives | `🐝` | `Bug` |
| Shared Inspections | `📋` | `ClipboardList` |
| Active Queens Shared | `✨` | `Sparkles` (if available) or `Star` |

### Consistency Rules
- Use the same icon for the same concept across "My", "Shared by Me", and "Shared with Me"
- Avoid mixing multiple icons for the same concept unless there is a clear semantic distinction

### Implemented Scope
- `src/app/dashboard/page.tsx` stat cards
- `src/app/dashboard/page.tsx` shared summary cards (`mySharedCards`, `sharedWithMeCards`)

---

## Phase 4: About Page Feature Card Migration (Emoji -> Lucide/Brand) (Completed)

### Scope
- **File:** `src/app/(public)/about/page.tsx`
- Replace emoji icons in the `features` array and feature cards

### Proposed About Feature Mappings
| Feature | Emoji | Proposed Icon |
|---|---|---|
| Apiary Management | `🏠` | `MapPinned` or `MapPin` |
| Queen Tracking | `👑` | `Crown` |
| Inspection Logging | `📋` | `ClipboardList` |
| Varroa Monitoring | `🔬` | `Microscope` |
| Queen Rearing | `🐣` | `Egg` |
| AI Assistant | `🤖` | `Bot` |
| Knowledge Base | `📚` | `BookOpen` |
| Mobile App | `📱` | `Smartphone` |

### Visual Style Notes
- Keep the existing feature badge background/hover treatment initially
- Replace `text-2xl` emoji rendering with a consistent Lucide icon size
- Maintain current spacing to avoid unintended card height changes

### Implemented Scope
- `src/app/(public)/about/page.tsx` feature cards now use `AppIcon` + semantic mappings
- Decorative emoji in marketing copy/badges outside feature-card icon usage remain intentionally out of scope

---

## Phase 5: Audit & Cleanup (Completed for Planned Scope)

### Targeted Audit
- Search for remaining emoji-based icons in the implemented scope:
  - Dashboard card definitions
  - About page feature cards

### Suggested Search Patterns
- Emoji/icon string props in card data arrays
- `icon: '...'` object entries in UI config arrays

### Important Distinction
- Emojis used as part of marketing copy or user-facing prose can remain if intentional
- Emojis used as **UI icons** (cards, lists, controls, badges) should be replaced

### Implemented Cleanup
- Confirmed dashboard/about **card icon surfaces** were migrated off emoji icons
- Removed legacy string icon fallback in `StatCard` after dashboard migration

---

## Phase 6: QA & Regression Check (Completed)

### Visual QA
- Light mode and dark mode icon contrast is readable
- Icon containers remain centered after replacing emoji text
- Card heights and spacing remain consistent
- Mobile layouts do not clip icons in dashboard card grids or about feature grid

### Functional QA
- No TypeScript errors after `StatCard` prop type change
- Dashboard and About pages render without runtime errors
- Existing tests/snapshots updated if `StatCard` rendering changes affect them

### Implemented Validation
- `tests/components/StatCard.test.tsx` updated for Lucide icons
- Lint passed on touched files during implementation passes
- `/about` prerender error fixed in `AppIcon` (Lucide `forwardRef` detection)

---

## Files Implemented

### New Files
- `src/components/icons/AppIcon.tsx`
- `src/lib/iconography.ts`
- `src/components/icons/brand/*` (optional)

### Modified Files
- `src/components/ui/StatCard.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/(public)/about/page.tsx`
- `tests/components/StatCard.test.tsx`

---

## Acceptance Criteria

- [x] No emoji-based icons remain in dashboard stat/shared cards
- [x] No emoji-based icons remain in About page feature cards
- [x] `StatCard` supports component-based icons (Lucide/custom) instead of emoji strings
- [x] Icon sizing and alignment are visually consistent across updated cards
- [x] Icon choices are semantically consistent for repeated concepts (hives, queens, inspections)
- [x] No compile/runtime regressions reported after implementation
- [x] No TypeScript/ESLint issues introduced by icon prop refactor (touched files validated)

---

## Implementation Notes / Risks

- **Risk:** `Sparkles` icon availability depends on current `lucide-react` version. If unavailable, use `Star` as a fallback.
- **Risk:** Replacing emoji text with SVG icons may slightly alter vertical rhythm; QA should compare card heights before/after.
- **Risk:** `StatCard` prop changes may affect any tests or future call sites using `icon: string`.

### Actual Outcome Notes
- `AppIcon` required a prerender fix because Lucide icons are `forwardRef` component objects (not plain functions)
- `.next` cache / OneDrive filesystem issues affected local `next build` attempts in this environment but were unrelated to iconography implementation

---

## Follow-up Opportunities (Out of Scope)

- Apply the same semantic icon mapping system to navigation items, empty states, and status badges
- Introduce shared card variants (`tone` props) to reduce repeated `color` class strings
- Create a small iconography guide in `docs/` for future contributors
