# Navigation Restructure

## Overview

Restructured the main navigation to improve usability on both desktop and mobile. The sidebar had grown to 14+ items, making it hard to scan. On mobile, users had to open a hamburger drawer and scroll through all items — not ideal for in-field use.

## Changes

### Shared Navigation Config (`src/lib/navigation.ts`)

Single source of truth for all nav items, groups, and helper functions. Eliminates the duplicated `baseNavItems` arrays that previously existed in both `Sidebar.tsx` and `MobileDrawer.tsx`.

**Groups:**
| Group | Items |
|-------|-------|
| *(ungrouped)* | Overview |
| **Manage** | Apiaries, Hives, Queens, Queen Rearing |
| **Activity** | Records, Tasks & Events |
| **Tools** | Tools, QR Tags |
| **Insights** | Reports, Research, Community Map |
| *(pinned bottom)* | Profile, About |

### Desktop Sidebar — Collapsible Groups

- Items are organised into labelled, collapsible groups with chevron indicators
- Collapse state persists in `localStorage` (`sidebar-collapsed-groups`)
- When sidebar is in icon-only mode, groups are rendered as a flat icon list (no headers)
- Profile, About, and Admin Settings are separated by a divider at the bottom

### Mobile Drawer — Visual Groups

- Same group labels appear as small section headers (non-collapsible for fast scanning)
- Bottom items separated by a divider

### Bottom Navigation Bar (`src/components/BottomNavBar.tsx`)

Fixed 5-item bar at the bottom of the screen on mobile (`md:hidden`):

| Label | Icon | Action |
|-------|------|--------|
| Hives | Archive | `/dashboard/hives` |
| Records | ClipboardList | `/dashboard/records` |
| Tasks | Calendar | `/dashboard/tasks` |
| Tools | Wrench | `/dashboard/tools` |
| More | Menu | Opens MobileDrawer |

- Safe area inset for iOS home indicator
- 48px minimum touch targets
- Active state highlighting based on current path

### Hamburger Button Hidden

The hamburger button in the Navbar is now hidden since the bottom nav bar's "More" button replaces its function.

### Fixed Bottom Elements Adjusted

All components with `fixed bottom-*` positioning were adjusted to clear the bottom nav on mobile:

- `ChatButton.tsx` — `bottom-22 md:bottom-6`
- `ChatDialog.tsx` — `bottom-16 md:bottom-0`  (mobile dialog sits above bottom nav)
- `Toast.tsx` — `bottom-20 md:bottom-4`
- `UpdateNotification.tsx` — `bottom-20 md:bottom-4`
- `InstallPrompt.tsx` — `bottom-16 md:bottom-0`
- `NotificationPermissionBanner.tsx` — `bottom-20 md:bottom-4`

## Files Changed

| File | Action |
|------|--------|
| `src/lib/navigation.ts` | Created |
| `src/components/Sidebar.tsx` | Modified |
| `src/components/MobileDrawer.tsx` | Modified |
| `src/components/BottomNavBar.tsx` | Created |
| `src/app/dashboard/layout.tsx` | Modified |
| `src/components/Navbar.tsx` | Modified |
| `src/components/chat/ChatButton.tsx` | Modified |
| `src/components/chat/ChatDialog.tsx` | Modified |
| `src/components/ui/Toast.tsx` | Modified |
| `src/components/UpdateNotification.tsx` | Modified |
| `src/components/InstallPrompt.tsx` | Modified |
| `src/components/NotificationPermissionBanner.tsx` | Modified |

## Testing Checklist

- [ ] Desktop: sidebar groups expand/collapse, state persists on refresh
- [ ] Desktop: icon-only mode still works (flat icons, no group headers)
- [ ] Mobile: bottom nav bar visible with 5 items
- [ ] Mobile: "More" button opens the drawer
- [ ] Mobile: active states highlight correctly on bottom nav
- [ ] Mobile: drawer shows grouped items with headers
- [ ] Mobile: ChatButton, Toast, notifications not hidden behind bottom nav
- [ ] iOS: bottom nav clears the home indicator
- [ ] Dark mode: all new elements styled correctly
