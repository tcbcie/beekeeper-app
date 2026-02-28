# Feature: Offline Font Loading for Local Development
**Date:** 28/02/2026
**Status:** Implemented

## 1. Overview
This change removes reliance on Google Fonts during local startup so the application can run offline without font DNS failures while keeping existing typography variable hooks stable.

## 2. Scope & Simplicity
* **In Scope:** Replace `next/font/google` usage in the app layout and provide local/system fallback values for existing font CSS variables.
* **Out of Scope:** Bundling custom font assets, redesigning typography, or changing component-level font usage patterns.
* **Existing Code Impact:** Limited to `src/app/layout.tsx` and `src/app/globals.css`, plus planning/task documentation.

## 3. Technical Design
### Architecture
The root layout currently initialises fonts through `next/font/google`, which triggers remote fetches during dev/build. The change removes those loaders and retains the same CSS custom property names, with values defined in global CSS using offline-safe system stacks.

### Database Connections (MCP Server)
No database queries or schema changes are required for this feature.

## 4. Edge Cases & Risks
* Visual typography may differ slightly from the online Google font rendering.
* Any place expecting exact DM/Geist metrics may have minor spacing differences.
* If future features require exact brand fonts offline, local font files should be committed and loaded with `next/font/local`.

## 5. Implementation Phases
1. Phase 1: Remove remote font loader usage from the root layout.
2. Phase 2: Define offline-safe CSS variable font stacks and confirm no unresolved font variables remain.

## 6. Implementation Notes
* Removed `next/font/google` imports and loader initialisation in `src/app/layout.tsx`.
* Preserved app-wide font variable names and set offline-safe font stacks in `src/app/globals.css`.
* Kept typography wiring unchanged for components that already depend on `--font-dm-sans`, `--font-dm-serif`, and `--font-geist-mono`.
