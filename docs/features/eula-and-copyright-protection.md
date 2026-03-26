# EULA & Copyright Protection Plan

## Goal
Add End-User Licence Agreement (EULA) protections and explicit copyright notices to HiveCraic.

## Context
- The app already has a **Terms of Service** page (`/terms`) and **Privacy Policy** page (`/privacy`)
- The footer already shows `© {year} HiveCraic. All rights reserved.`
- There is **no** root `LICENSE` file, **no** EULA, and **no** reverse-engineering/decompilation restrictions
- `package.json` has `"private": true` but no `license` field

## What We Need

### 1. EULA — Forbid Reverse-Engineering
Add a new section to the **existing Terms of Service** page that explicitly forbids:
- Reverse-engineering
- Decompiling
- Disassembling
- Extracting source code or underlying algorithms

This keeps all legal terms in one place rather than creating a separate EULA page.

### 2. Copyright — Protect the Expression
Add explicit copyright protections:
- A `LICENSE` file in the project root (proprietary/all rights reserved)
- A new "Intellectual Property & Copyright" section on the Terms of Service page
- A copyright header comment in key source files (optional — discussed below)

---

## Todo

- [x] **1. Add EULA section to Terms of Service page** — Added "Software Licence Restrictions (EULA)" section with 6 restriction items
- [x] **2. Add Copyright/IP section to Terms of Service page** — Added "Intellectual Property & Copyright" section with 5 ownership/restriction items
- [x] **3. Create root LICENSE file** — Created proprietary `LICENSE` file (all rights reserved, tcbc.ie)
- [x] **4. Add EULA link to footer** — Added "Licence (EULA)" anchor link in footer Legal section pointing to `/terms#licence`
- [x] **5. Update docs** — This document

---

## Review

### Changes Made

**Files modified:**
- `src/app/(public)/terms/page.tsx` — Added two new sections (EULA + Copyright) with data arrays and Panel components. Added `Lock` and `Copyright` icon imports.
- `src/app/(public)/layout.tsx` — Added "Licence (EULA)" link in footer Legal section.

**Files created:**
- `LICENSE` — Proprietary licence file in project root.
- `docs/features/eula-and-copyright-protection.md` — This plan document.

### Design Decisions
- **No new routes** — Both sections added to existing `/terms` page to keep all legal terms centralised.
- **Anchor link** — The EULA Panel has `id="licence"` so the footer link scrolls directly to it.
- **Consistent styling** — Used the same `Panel` + `SimpleList` pattern as existing sections, with purple (EULA) and emerald (Copyright) colour accents.
- **British English** — "Licence" used throughout.
