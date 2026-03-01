# Feature: Records Card Badge Contrast Fix
**Date:** 01/03/2026
**Status:** Implemented

## 1. Overview
Improve readability of record type badges on the Records page by enforcing stronger text contrast on tinted badge backgrounds, preventing washed-out labels in dark-theme usage.

## 2. Scope & Simplicity
* **In Scope:** Update badge text colour classes in records card components so each badge uses an explicit, contrast-safe colour pair.
* **Out of Scope:** Any theme-system refactor, global Tailwind dark-mode strategy changes, layout updates, or broader visual redesign.
* **Existing Code Impact:** `src/components/records/cards/VarroaCheckCard.tsx`, `src/components/records/cards/TreatmentCard.tsx`, `src/components/records/cards/FeedingCard.tsx`, `src/components/records/cards/HarvestCard.tsx`.

## 3. Technical Design
### Architecture
This is a targeted styling adjustment within existing records card components. The approach replaces theme-dependent foreground badge text with explicit semantic text colours aligned to each badge background.

### Database Connections (MCP Server)
No database queries, schema changes, or MCP database interactions are required for this UI contrast fix.

## 4. Edge Cases & Risks
* Colour choices must remain legible in both light and dark themes.
* Badge colour identity must stay clear (for example, varroa check remains orange-coded).
* Over-correction could create overly harsh visual contrast against the existing card design language.

## 5. Implementation Phases
1. Phase 1: Apply explicit high-contrast text classes to all records card type badges that currently rely on foreground text.
2. Phase 2: Validate visual consistency across card variants and finalise documentation updates.

## 6. Implementation Notes
* Updated badge classes in:
  * `src/components/records/cards/VarroaCheckCard.tsx`
  * `src/components/records/cards/TreatmentCard.tsx`
  * `src/components/records/cards/FeedingCard.tsx`
  * `src/components/records/cards/HarvestCard.tsx`
* Replaced theme-dependent `text-foreground` badge text with explicit high-contrast semantic colour pairs (`text-*-900` in light mode, `dark:text-*-100` in dark mode) plus subtle badge borders for clearer edge definition.
* No logic, data, or schema changes were made.
