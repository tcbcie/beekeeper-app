# Fix Apiary Photo Not Rendering in Edit Form

## Problem
Two related issues:
1. When editing an apiary, the existing photo doesn't render in the form (blank area appears)
2. When selecting a new photo, the preview also doesn't display — so the user thinks it's not working until they click "Update Apiary"

## Root Cause
Both issues stem from a CSS layout bug. The image container structure is:
```html
<div class="relative inline-block group">        <!-- outer: shrink-wraps to content -->
  <div class="relative w-full max-w-xs h-48">    <!-- inner: 100% of parent width -->
    <Image fill ... />                            <!-- absolute positioned: 100% x 100% -->
  </div>
</div>
```

The outer div is `inline-block` (shrink-wraps to content width). The inner div uses `w-full` (100% of parent). Since the `Image` component with `fill` is `position: absolute` and doesn't contribute to document flow, the inner div has no intrinsic content width. This creates a circular dependency where both divs collapse to **0px width**. The image renders at 0px wide — invisible.

In contrast, `ApiaryCard` uses explicit `w-20 h-20` (80px × 80px) on the image parent, which avoids this issue.

## Fix

- [x] Fix the image container in `src/app/dashboard/apiaries/page.tsx` — replace `inline-block` on the outer div with `max-w-xs` so it has a constrained block width, and the inner `w-full` resolves correctly

**File:** `src/app/dashboard/apiaries/page.tsx` (line ~453)

Change:
```html
<div className="relative inline-block group">
  <div className="relative w-full max-w-xs h-48">
```
To:
```html
<div className="relative max-w-xs group">
  <div className="relative w-full h-48">
```

This makes the outer div a block element capped at 320px. The inner div's `w-full` correctly resolves to 100% of that. The X button's `absolute top-2 right-2` stays within the image bounds.

## Review

### Change Made
| File | Change |
|------|--------|
| `src/app/dashboard/apiaries/page.tsx` (line 453) | Changed outer image container from `relative inline-block group` to `relative max-w-xs group`, and inner div from `relative w-full max-w-xs h-48` to `relative w-full h-48` |

### What This Fixes
- Existing apiary photos now render when opening the edit form
- Newly selected photo previews display immediately after file selection
- The X (remove) button stays correctly positioned within the image bounds
