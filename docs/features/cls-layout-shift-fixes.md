# CLS (Cumulative Layout Shift) Fixes

**Date:** 01/03/2026
**Type:** Performance — Layout Stability

## Problem
Vercel Speed Insights flagged 4 routes with CLS-related score issues:
- `/dashboard` (79) — staggered `translateY` animation on stat cards
- `/dashboard/hives` (71) — variable-height hive cards causing reflow
- `/login` (88) — conditional "Forgot Password?" link and message area toggling
- `/dashboard/records` (89) — inherited animation CLS

## Changes

### 1. Opacity-only fade-in animation
**File:** `src/app/globals.css`

Removed `transform: translateY(12px)` from the `fade-in-up` keyframe. Elements now fade in at their final position without vertical movement, eliminating CLS from staggered animations across the app.

### 2. Dashboard skeleton parity
**File:** `src/app/dashboard/page.tsx`

Added quick-actions chip row (6 placeholders) and alerts bar placeholder to the loading skeleton so it matches the real content structure. Prevents layout shift when the skeleton transitions to live content.

### 3. Login form space reservation
**File:** `src/app/login/page.tsx`

- "Forgot Password?" link always renders; hidden with `invisible` during sign-up mode to reserve its line height.
- Message container always renders with `min-h-[40px]`; hidden with `invisible` when no message is present.

### 4. Hive card minimum height
**File:** `src/components/hive/HiveListCard.tsx`

Added `min-h-[280px]` to the card container so all cards in a grid row have consistent minimum height, preventing reflow as the browser calculates variable content.

## Verification
- Run `npm run build` to check for errors
- Toggle Login/Sign Up on login page — layout should not shift
- Dashboard stat cards should fade in without vertical movement
- Hives page card grid should have consistent row heights
- Monitor Vercel Speed Insights after deploy
