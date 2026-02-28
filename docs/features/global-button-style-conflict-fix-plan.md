# Feature: Global Button Style Conflict Fix
**Date:** 28/02/2026
**Status:** Implemented

## 1. Overview
Apply a global fix so custom button utility classes in the codebase are no longer masked by default shared button styles. This addresses recurring cases where buttons appear not to react correctly because intended `bg-*`, `text-*`, and hover styles are overridden.

## 2. Scope & Simplicity
* **In Scope:** CSS specificity adjustment for shared `.fj-btn` base and tone selectors in `src/app/globals.css`.
* **Out of Scope:** Database logic, data fetching, business rules, and bulk refactors of individual component files.
* **Existing Code Impact:** `src/app/globals.css` only (plus documentation/task tracking files).

## 3. Technical Design
### Architecture
The shared `Button` component composes `fj-btn` and tone classes (neutral by default). Many button instances also include custom Tailwind utility classes for colour and state. Because `.fj-btn*` selectors currently compete at equal specificity, defaults can override intended custom styles.

Use `:where(...)` wrappers on `.fj-btn` base and tone selectors to lower their specificity. This preserves default styling when no custom utility classes are supplied, while allowing explicit per-instance utility classes to take priority.

Implemented detail:
* Audited codebase `Button` usages and identified 79 candidate instances with custom visual classes likely to conflict with default neutral styling.
* Updated shared selectors in `src/app/globals.css` to `:where(...)` for `.fj-btn`, size variants, and tone variants (including hover/dark hover rules).
* Preserved existing default styles while ensuring custom utility classes (`bg-*`, `text-*`, `hover:*`, and compact icon styles) can override as intended.

### Database Connections (MCP Server)
No database interactions are required. This is a presentation-layer CSS fix.

## 4. Edge Cases & Risks
* Buttons that rely purely on default shared styles must remain visually unchanged.
* Hover states must still function in light and dark themes.
* Existing explicit `unstyled` button usage must remain unaffected.

## 5. Implementation Phases
1. Phase 1: Convert `.fj-btn`, size variants, and tone selectors to `:where(...)` in `globals.css`.
2. Phase 2: Re-audit codebase button usage patterns to confirm custom utility classes now reliably win over defaults.
