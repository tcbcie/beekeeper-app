# Fix App-Wide Contrast Issues - Global CSS Override (Round 3)

## Tasks

- [x] 1. Read current `globals.css` structure
- [x] 2. Add light-mode-only CSS overrides for all coloured text classes
- [x] 3. Update feature documentation
- [ ] 4. User to verify on Galaxy Tab A9+ 5G (light mode + dark mode)

## Review

### Summary
Replaced the previous per-file approach (16 files, ~55 class changes) with a single global CSS override block in `globals.css`. This adds ~35 lines of CSS that darken all coloured text utilities (`text-{colour}-600` through `-800`) in light mode only, fixing all 300+ instances at once.

### Changes Made

**1 file changed: `src/app/globals.css`**
- Added `:root:not(.dark)` block with nested class overrides
- Covers: green, amber, orange, red, blue, purple, yellow, emerald
- Each `-600` shifted to `-800` equivalent colour value
- Each `-700` shifted to `-900` equivalent colour value
- Each `-800` shifted to `-900` equivalent colour value

### Why This Approach
- Previous rounds fixed files individually but kept missing elements (300+ instances across 50+ files)
- CSS class overrides catch every instance automatically, including future components
- Only text utilities affected (`.text-*`), not backgrounds (`.bg-*`) or borders
- Dark mode completely unaffected (uses `dark:text-*` which are separate classes)
- Zero risk of breaking functionality

### Verification Needed
- Test on Galaxy Tab A9+ 5G in Chrome, light mode
- Key areas: Profile page green "Connected" boxes, Dashboard badges, Tasks equipment text, Records edit/delete buttons
- Verify dark mode still looks correct
