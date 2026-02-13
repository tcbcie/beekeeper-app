# Navigation Restructure - Todo

## Tasks

- [x] **Step 1:** Create shared navigation config (`src/lib/navigation.ts`) — single source of truth for nav items, groups, types, and helpers
- [x] **Step 2:** Update desktop sidebar (`src/components/Sidebar.tsx`) — import shared config, render collapsible groups with expand/collapse, pin Profile/About to bottom
- [x] **Step 3:** Update mobile drawer (`src/components/MobileDrawer.tsx`) — import shared config, add visual group headers, separate bottom items with divider
- [x] **Step 4:** Create bottom nav bar (`src/components/BottomNavBar.tsx`) — 5-item fixed bottom bar for mobile (Hives, Records, Tasks, Tools, More)
- [x] **Step 5:** Wire into dashboard layout (`src/app/dashboard/layout.tsx`) — add BottomNavBar, add mobile bottom padding
- [x] **Step 6:** Hide hamburger on mobile (`src/components/Navbar.tsx`) — change `md:hidden` to `hidden` on hamburger button
- [x] **Step 7:** Adjust fixed bottom elements — bump bottom positions on 6 components to clear bottom nav bar
  - [x] `src/components/chat/ChatButton.tsx` — `bottom-6` → `bottom-22 md:bottom-6`
  - [x] `src/components/chat/ChatDialog.tsx` — `bottom-0` → `bottom-16 md:bottom-0`
  - [x] `src/components/ui/Toast.tsx` — `bottom-4` → `bottom-20 md:bottom-4`
  - [x] `src/components/UpdateNotification.tsx` — `bottom-4` → `bottom-20 md:bottom-4`
  - [x] `src/components/InstallPrompt.tsx` — `bottom-0` → `bottom-16 md:bottom-0`
  - [x] `src/components/NotificationPermissionBanner.tsx` — `bottom-4` → `bottom-20 md:bottom-4`
- [x] **Step 8:** Create feature documentation (`docs/features/navigation-restructure.md`)

## Review

### Summary of Changes

**2 new files created:**
- `src/lib/navigation.ts` — Shared nav config with types (`NavItem`, `NavGroup`, `NavGroupId`), data arrays, and helper functions (`getTopItems()`, `getGroupedItems()`, `getBottomItems()`)
- `src/components/BottomNavBar.tsx` — Fixed 5-item mobile bottom bar (Hives, Records, Tasks, Tools, More)

**10 files modified:**
- `Sidebar.tsx` — Replaced hardcoded items with shared config; added collapsible group headers with chevrons; group collapse state persisted in localStorage; Profile/About/Admin pinned below a divider
- `MobileDrawer.tsx` — Replaced hardcoded items with shared config; added non-collapsible group header labels; bottom items separated by divider
- `layout.tsx` — Added BottomNavBar import/render and `pb-20 md:pb-6` padding to content wrapper
- `Navbar.tsx` — Changed hamburger button from `md:hidden` to `hidden` (1 class change)
- 6 components with fixed-bottom positioning adjusted to clear the bottom nav on mobile

### Design Decisions
- Groups are **collapsible on desktop** (power users can customise) but **non-collapsible in the drawer** (faster to scan/tap)
- Bottom nav uses `pathname.startsWith(item.href)` for active state matching
- iOS safe area handled via `pb-[env(safe-area-inset-bottom)]`
- All touch targets maintain 48px minimum height
