# Typography Upgrade & Micro-animations

**Date:** 2026-02-11
**Priority:** P1 (Typography) + P5 (Micro-animations)
**Related:** [Frontend Design Review](./frontend-design-review.md)

---

## Typography

### Before
- **Body font:** Geist Sans (generic, commonly associated with AI-generated projects)
- **Monospace:** Geist Mono

### After
- **Body font:** DM Sans — warm, geometric sans-serif with excellent readability
- **Display/heading font:** DM Serif Display — available via `font-serif` Tailwind utility for editorial headings
- **Monospace:** Geist Mono (unchanged)

### CSS Variables
| Variable | Value |
|---|---|
| `--font-dm-sans` | DM Sans (set by next/font) |
| `--font-dm-serif` | DM Serif Display (set by next/font) |
| `--font-geist-mono` | Geist Mono (unchanged) |

### Tailwind Theme Mapping
- `font-sans` resolves to DM Sans
- `font-serif` resolves to DM Serif Display
- `font-mono` resolves to Geist Mono

### Usage
- Body text uses DM Sans automatically via the body font-family
- For editorial/display headings, add `font-serif` class to use DM Serif Display
- Code blocks continue to use `font-mono`

---

## Micro-animations

### New Keyframe: `fade-in-up`
Combines a subtle 12px upward slide with opacity fade. Duration 0.4s, ease-out.

### Utility Classes
| Class | Effect |
|---|---|
| `.animate-fade-in-up` | Entrance animation (fade + translateY) |
| `.stagger-1` to `.stagger-6` | Incremental animation-delay (0ms, 80ms, 160ms, 240ms, 320ms, 400ms) |

### Applied To
- **StatCard** — All stat cards now have entrance animation
- **Dashboard stat grid** — Cards stagger in sequence using `stagger-1` through `stagger-3`

---

## Sidebar

### Active State Colour
Changed from `bg-emerald-600` / `border-emerald-400` to `bg-forest-600` / `border-forest-400` to align with the project's custom forest green design tokens.

---

## Files Modified
1. `src/app/layout.tsx` — Font imports and CSS variables
2. `src/app/globals.css` — Theme font vars, body fallback, animation keyframe + utilities
3. `src/components/ui/StatCard.tsx` — Entrance animation class + className prop
4. `src/app/dashboard/page.tsx` — Stagger delays on stat cards
5. `src/components/Sidebar.tsx` — Active state colour aligned to forest token
