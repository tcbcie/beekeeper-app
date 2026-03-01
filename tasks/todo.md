# Task: CLS (Cumulative Layout Shift) Fixes
**Date:** 01/03/2026
**Status:** Completed

## 1. Objective
Reduce CLS across 4 routes flagged by Vercel Speed Insights (dashboard, hives, login, records) with minimal, targeted changes.

## 2. Execution Plan

- [x] **Fix 1:** Remove `translateY` from `fade-in-up` keyframe in `globals.css` — keep opacity-only fade
- [x] **Fix 2:** Add quick-actions and alerts skeleton placeholders to dashboard loading state
- [x] **Fix 3a:** Always render "Forgot Password?" link on login, use `invisible` in sign-up mode
- [x] **Fix 3b:** Always render message container on login with `min-h-[40px]`, use `invisible` when empty
- [x] **Fix 4:** Add `min-h-[280px]` to HiveListCard container

## 3. Post-Task Review

**Summary of Changes:**
- `src/app/globals.css` — Removed `transform: translateY(12px)` and `transform: translateY(0)` from `fade-in-up` keyframe. Elements now fade in without vertical movement, eliminating CLS from staggered animations on dashboard, tools, and other pages.
- `src/app/dashboard/page.tsx` — Added `Skeleton` import and inserted quick-actions row (6 chip placeholders) and alerts bar placeholder between stat cards and recent activity in the loading skeleton, matching the real content layout.
- `src/app/login/page.tsx` — "Forgot Password?" link now always renders with `invisible` class when in sign-up mode. Message container always renders with `min-h-[40px]` and `invisible` when empty, reserving space to prevent layout shift.
- `src/components/hive/HiveListCard.tsx` — Added `min-h-[280px]` to card container for consistent grid row heights.

**Notes:** All changes are CSS/layout only — no logic, API, or schema changes. Deploy and monitor Vercel Speed Insights over the next few days.
