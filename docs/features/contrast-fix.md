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

## Round 4 – Forest text, field edges and stragglers (WP05, 04/11/2026)

Measured with the WCAG formula from the actual colour values.

| What | Before | After |
|---|---|---|
| `text-forest-600` in light (123 uses) | 3.30:1 on white | forest-800, 7.13:1 (6.33:1 on elevated cream) |
| `text-forest-700` in light (50 uses) | 4.45:1 on elevated cream | forest-800 |
| forest-600/-700 text in dark with no `dark:text-*` of its own | 4.45:1 on slate-800 | forest-400, 8.42:1 |
| Field edges (`--field-border`) | 1.26:1 on white, 1.42:1 dark | #857d74, at least 3.59:1 light; #71809a, at least 3.66:1 dark |
| Full Size badge (light) | 1.74:1 | emerald-800 on emerald-100, 6.78:1 |
| Voice note button | dark 4.12:1, Transcribing 2.64:1 | purple-600 (5.38:1) both themes, Transcribing purple-700 (6.98:1) |
| Mel button | forest-600 fill, 3.30:1 | forest-800, 7.13:1 |

How it works:
- **Forest, light:** two lines added to the `:root:not(.dark)` block. Forest goes to -800 for both -600 and -700, as forest-700 still fails on elevated cream.
- **Forest, dark:** `.dark .text-forest-600:not([class*="dark:text-"])` (and -700). The attribute test leaves alone any element that sets its own dark text colour.
- **Field edges:** `--field-border` is used by `.fj-control`, and by plain `input`/`select`/`textarea` elements with `border-border` when not focused. Cards, panels and dividers keep `--border-color`.
- **Links inside sentences** are underlined, not only coloured. "View Changes" on the dashboard was 2.26:1 against the text around it.
- **Known side effect:** in light mode, `hover:text-forest-700` no longer changes shade (18 uses). The override is unlayered, as are the other colour overrides here.
