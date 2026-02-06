# Contrast Fix (Light Mode)

## Problem
Poor text contrast on light pastel backgrounds across the app. Particularly noticeable on Android tablets (Galaxy Tab A9+ 5G) in Chrome. Light backgrounds (`bg-*-50`, `bg-*-100`) paired with mid-tone text (`text-*-600`, `text-*-700`, `text-*-800`) produced contrast ratios of 3-5:1, failing WCAG AA standards (4.5:1 required for small text).

## Solution

### Round 1-2 (Previous): Per-File Tailwind Class Changes
Changed individual classes across 16 files (~55 changes). This missed many instances because the problem exists in 300+ places across 50+ files.

### Round 3 (Current): Global CSS Text Colour Overrides
Single block of CSS in `globals.css` that overrides coloured text utility classes in light mode only.

**How it works:**
- Tailwind's `text-green-600` generates `.text-green-600 { color: ... }`
- Our CSS adds `.text-green-600 { color: #166534; }` (green-800 value) scoped to `:root:not(.dark)`
- This darkens the text by 2 shade steps, achieving WCAG AA contrast ratios
- Only affects `.text-*` classes, not `.bg-*` or border classes
- Dark mode uses `dark:text-*-300/400` classes which are completely separate

**Colours covered:** green, amber, orange, red, blue, purple, yellow, emerald

**Shift pattern:**
- `-600` → uses `-800` colour value
- `-700` → uses `-900` colour value
- `-800` → uses `-900` colour value

## Contrast Ratios (After Fix)

| Pattern | Old Ratio | New Ratio | WCAG AA |
|---|---|---|---|
| `text-green-600` on `bg-green-50` | ~3.4:1 | ~7.2:1 | Pass |
| `text-green-800` on `bg-green-100` | ~5.2:1 | ~7.4:1 | Pass |
| `text-amber-800` on `bg-amber-100` | ~5.7:1 | ~10.2:1 | Pass |
| `text-red-600` on `bg-red-100` | ~4.0:1 | ~6.8:1 | Pass |
| `text-blue-600` on white | ~4.7:1 | ~9.2:1 | Pass |

## File Changed
- `src/app/globals.css` (~35 lines added)

## Future-Proofing
Any new components using standard Tailwind colour classes automatically get the contrast fix. No per-file changes needed.
