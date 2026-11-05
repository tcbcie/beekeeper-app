---
name: ui
description: HiveCraic visual and interaction design system reference (light-first, high contrast for outdoor field use, tokens in globals.css, custom UI primitives). Use when designing, building or restyling any HiveCraic screen or component.
---

# HiveCraic design system (light-first field edition)

HiveCraic is used outdoors, often in bright sunlight, by beekeepers who are mostly 50+ with reduced eyesight. The default look is light with high contrast; dark mode is for evening planning and indoor work. This file describes the system as it is in the code. Where it ever disagrees with `src/components/ui` or `src/app/globals.css`, the code wins. For any phone screen, follow the `mobile-screen` skill first; for the design process, use `hivecraic-frontend-design`.

## Technology

- **Framework**: Next.js 15 (App Router), React 19.1
- **Styling**: Tailwind CSS 4. Tokens are CSS variables in `src/app/globals.css` (`:root` for light, `.dark` for dark) and exposed to Tailwind in its `@theme inline` block. There is **no `tailwind.config`**.
- **Components**: custom primitives in `src/components/ui`, no Radix
- **Fonts**: each device's own system font via `--font-ui-sans`, `--font-ui-serif`, `--font-ui-mono`. Nothing is downloaded (owner decision, batch 47).
- **Icons**: Lucide React (line icons)
- **Charts**: Chart.js (`react-chartjs-2`) with `themeChartOptions()` from `src/lib/chart-theme.ts`. There is no Recharts.

## Mobile-first principles

1. **Design for thumbs**: primary actions in the bottom two-thirds of the screen, usable one-handed.
2. **Touch targets at least 48 × 48px** (`.min-touch-target` in `globals.css`). Never smaller.
3. **Gestures are shortcuts only**: every swipe needs a visible button that does the same job.
4. **Minimal typing**: prefer pickers, toggles and choices over free text.
5. **Outdoor readability**: light theme, high contrast, AAA colour pairs where possible.
6. **Use `dvh`, never `min-h-screen` or `vh`**, for full-height layouts on phones.

## Colour tokens

Use the semantic classes. They switch automatically under `.dark`, so **never write paired light/dark classes** for these (no `bg-x-light dark:bg-x-dark`).

| Purpose | Class | Light value |
|---|---|---|
| Page background | `bg-background` | `#faf8f5` warm cream |
| Card / panel | `bg-surface` | `#ffffff` |
| Raised or tinted area | `bg-surface-elevated`, `bg-surface-secondary` | cream tints |
| Main text | `text-text-primary` | `#1a1a1a` |
| Secondary text | `text-text-secondary` | `#374151` |
| Labels, metadata | `text-text-tertiary` | `#555555` |
| Dividers, outlines | `border-border` | |
| Form field edges | `var(--field-border)` | `#857d74` |
| Brand / selected | `forest-*` scale (`forest-600`, `forest-700` …) | green |
| Warnings | `amber-*` scale | |
| Charts and status | `viz-health`, `viz-warning`, `viz-alert`, `viz-info`, `viz-neutral` | |

**Selections are green** (forest). Do not invent new colours; add a token to `globals.css` if one is truly missing, with a dark-mode value.

## Typography

- **Minimum 14px text**, 16px inside inputs (stops iOS zooming). **No `text-xs`.**
- Responsive scale in `globals.css`: `.text-responsive-sm` … `.text-responsive-3xl` (14px to 24px on phones, up to 30px on desktop). Do not go beyond this for app screens.
- **Sentence case** everywhere. No all-caps labels and no `.toUpperCase()` on labels. No emoji in titles.

## Theme

- `src/app/providers/theme-provider.tsx`: `Theme = 'light' | 'dark' | 'system' | 'auto'`.
- The default is **`system`**, which follows the device's own setting. `auto` is the clock schedule, shown as "Light by day". A saved choice is kept.
- The switcher is `src/components/theme-switcher.tsx`. The provider also updates the `theme-color` meta tags.
- In charts, read the theme with `isDarkMode()` and keep it in the `useMemo` dependencies.

## Navigation and layout

- **Phones**: `src/components/BottomNavBar.tsx` is a fixed bar with four destinations (Home, Hives, Records, Tasks, marked `bottomNav: true` in `src/lib/navigation.ts`) plus More. Labels are `text-sm`.
- **Desktop**: `src/components/Sidebar.tsx`, a left sidebar.
- **Bottom spacing**: use `.pb-bottom-nav` for page bottom padding and `.above-bottom-nav` for anything fixed above the bar. Both use `--bottom-nav-inset`, which includes the safe area. Left and right safe areas are handled on `body`.
- Pages use `PageShell` and `PageHeader`. One title bar and one primary action per screen.
- Do not nest cards inside cards. Use `Card`, `Panel` and `Surface` for grouping, not a rounded card around every element.

## Primitives (`src/components/ui`)

Always use these before building anything new.

| Need | Primitive |
|---|---|
| Buttons | `Button` (`tone`: neutral, blue, purple, success, amber, danger; `size`: md, sm, xs; `fullWidth`), `IconButton`, `TextLink` |
| Number entry | `NumberSelector` |
| Choices | `SegmentedControl`, `RadioChoiceGroup`, `RadioInput`, `CheckboxInput`, `ToggleRow`, `RatingButtons`, `Chip` |
| Form fields | `TextInput`, `SelectField`, `TextAreaField`, `FieldLabel` |
| Form actions | `FormActionRow`, `StickyActionBar` |
| Dialogs | `ModalShell`, `ConfirmDialog` with `useConfirm` (never `window.confirm`), `ImageZoomModal` |
| Grouping | `Card`, `Panel`, `Surface`, `CollapsibleSection`, `FilterDisclosure`, `DetailRow` |
| Page frame | `PageShell`, `PageHeader`, `NavTabButton` |
| Feedback | `Toast`, `AlertPanel`, `InfoPanel`, `Badge`, `EmptyState`, `Skeleton`, `LoadingSpinner`, `CachedDataNotice` |

**Buttons**: use `<Button tone="…">`. Never use the `fj-btn-*` classes directly in new code (some older pages still do).

**Saving**: every create/save button uses `useSubmitLock` (`src/hooks/useSubmitLock.ts`), so double taps cannot save twice.

## Motion

Motion only explains what changed (opening, expanding, confirming). Screen transitions use `useScreenTransition`. Respect reduced motion. No decorative animation.

## Checklist before finishing a screen

- [ ] Works on a phone first; desktop is the enhancement
- [ ] Touch targets 48px or more; main action in thumb reach
- [ ] No text under 14px, inputs at 16px, sentence case
- [ ] Only semantic tokens, checked in light and dark
- [ ] Existing primitives used; `Button tone` rather than `fj-btn-*`
- [ ] Fixed bars use `.above-bottom-nav` / `.pb-bottom-nav`
- [ ] Keyboard focus visible, reduced motion respected
- [ ] Every gesture has a visible alternative
