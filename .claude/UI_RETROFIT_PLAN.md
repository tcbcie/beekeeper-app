# UI Guidelines Retrofit Action Plan

## Overview
This document outlines the prioritized action plan for applying the UI skill guidelines retrospectively to the HiveCraic beekeeper application.

## Current State Analysis

### Files to Update
- **23 pages** in `src/app/`
- **12 components** in `src/components/`
- **1 global CSS** file
- **Total: ~36 files**

### Current Issues (vs Guidelines)

| Category | Current State | Guideline Requirement | Priority |
|----------|--------------|----------------------|----------|
| Color Scheme | Amber/yellow primary, white backgrounds | Deep slate/dark theme, emerald accents | HIGH |
| Navigation | Left sidebar, top navbar | Bottom-anchored, mobile-first | HIGH |
| Touch Targets | Inconsistent sizing | Minimum 48x48px (3rem) | HIGH |
| Forms | Standard text inputs | Keyboard-free (steppers, buttons) | MEDIUM |
| Typography | Standard Tailwind scale | Custom responsive scale | MEDIUM |
| Layouts | Desktop-first | Mobile-first responsive | HIGH |
| Cards | Standard white cards | Glassmorphic with blur | LOW |
| Animations | Basic/minimal | Micro-interactions, transitions | LOW |

---

## Priority 1: Foundation (Must Do First)

### 1.1 Global CSS & Theme Setup
**File:** `src/app/globals.css`
**Effort:** 1-2 hours

Changes needed:
- [ ] Update CSS variables for dark theme colors
- [ ] Add custom color palette (slate, emerald, terracotta)
- [ ] Add glassmorphism utilities
- [ ] Update focus states to emerald
- [ ] Add animation keyframes

```css
/* New root colors */
:root {
  --background: #0a0f1a;
  --foreground: #f1f5f9;
  --surface: #111827;
  --accent-primary: #10b981;
  --accent-secondary: #f97316;
}
```

### 1.2 Navigation Restructure
**Files:**
- `src/components/Sidebar.tsx`
- `src/components/MobileDrawer.tsx`
- `src/components/Navbar.tsx`
- `src/app/dashboard/layout.tsx`

**Effort:** 4-6 hours

Changes needed:
- [ ] Convert to bottom-anchored navigation on mobile
- [ ] Implement floating action button (FAB)
- [ ] Dark theme for all navigation
- [ ] Large touch targets (min 48px)
- [ ] Remove left sidebar pattern

### 1.3 Core Layout Updates
**File:** `src/app/dashboard/layout.tsx`
**Effort:** 2-3 hours

Changes needed:
- [ ] Dark background (`bg-slate-950`)
- [ ] Mobile-first responsive container
- [ ] Bottom-heavy action placement

---

## Priority 2: High-Impact Pages

### 2.1 Login Page
**File:** `src/app/login/page.tsx`
**Effort:** 2-3 hours

Changes needed:
- [ ] Dark theme with glassmorphic card
- [ ] Larger touch targets for buttons
- [ ] Updated color scheme (no amber)
- [ ] Emerald accent for primary actions

### 2.2 Dashboard Home
**File:** `src/app/dashboard/page.tsx`
**Effort:** 4-6 hours

Changes needed:
- [ ] Dark theme
- [ ] Asymmetric layout
- [ ] Data visualization as primary visuals
- [ ] Responsive grid system
- [ ] Updated stat cards

### 2.3 Hives List & Detail
**Files:**
- `src/app/dashboard/hives/page.tsx`
- `src/app/dashboard/hives/[id]/page.tsx`

**Effort:** 4-6 hours

Changes needed:
- [ ] Dark theme cards
- [ ] Mobile-first layouts
- [ ] Touch-optimized action buttons
- [ ] Updated status colors

### 2.4 Records/Forms Page
**File:** `src/app/dashboard/records/page.tsx`
**Effort:** 6-8 hours (largest form)

Changes needed:
- [ ] Keyboard-free inputs (steppers, buttons)
- [ ] Dark theme
- [ ] Mobile-optimized form layout
- [ ] Touch-friendly date pickers
- [ ] Rating buttons instead of dropdowns

---

## Priority 3: Secondary Pages

### 3.1 Apiaries Page
**File:** `src/app/dashboard/apiaries/page.tsx`
**Effort:** 2-3 hours

### 3.2 Queens Page
**File:** `src/app/dashboard/queens/page.tsx`
**Effort:** 2-3 hours

### 3.3 Tasks Page
**File:** `src/app/dashboard/tasks/page.tsx`
**Effort:** 3-4 hours

### 3.4 Profile Page
**File:** `src/app/dashboard/profile/page.tsx`
**Effort:** 4-5 hours

### 3.5 Settings Page
**File:** `src/app/dashboard/settings/page.tsx`
**Effort:** 2-3 hours

---

## Priority 4: Supporting Pages & Components

### 4.1 UI Components
**Files in `src/components/ui/`:**
- `LoadingSpinner.tsx` - Update colors
- `StatCard.tsx` - Dark theme, glassmorphism
- `RatingButtons.tsx` - Already good, minor updates
- `NumberSelector.tsx` - Already good, minor updates

**Effort:** 2-3 hours

### 4.2 Other Components
- `UpcomingEvents.tsx`
- `SubscriptionStatusCard.tsx`
- `SubscriptionWarningBanner.tsx`
- `RenewSubscriptionModal.tsx`
- `SubscriptionHistoryTable.tsx`

**Effort:** 3-4 hours

### 4.3 Utility Pages
- `src/app/page.tsx` (landing)
- `src/app/forgot-password/page.tsx`
- `src/app/reset-password/page.tsx`
- `src/app/reactivate/page.tsx`
- `src/app/accept-invitation/page.tsx`
- `src/app/decline-invitation/page.tsx`
- `src/app/dashboard/about/page.tsx`
- `src/app/dashboard/support/page.tsx`
- `src/app/dashboard/tools/page.tsx`
- `src/app/dashboard/batches/page.tsx`

**Effort:** 4-6 hours

---

## Implementation Strategy

### Phase 1: Foundation (Days 1-2)
1. Update `globals.css` with new theme
2. Create reusable dark theme classes
3. Update navigation components

### Phase 2: Core Pages (Days 3-5)
1. Login page
2. Dashboard home
3. Hives pages

### Phase 3: Forms & Data Entry (Days 6-8)
1. Records page (keyboard-free forms)
2. Profile page
3. Tasks page

### Phase 4: Polish (Days 9-10)
1. Remaining pages
2. Components
3. Testing and fixes

---

## Color Mapping Reference

| Current | New |
|---------|-----|
| `bg-amber-*` | `bg-emerald-*` |
| `bg-yellow-*` | `bg-terracotta-*` (sparingly) |
| `bg-white` | `bg-slate-900` / `bg-surface-dark` |
| `bg-gray-50` | `bg-slate-950` |
| `text-amber-*` | `text-emerald-*` |
| `border-amber-*` | `border-emerald-*` |
| `hover:bg-amber-*` | `hover:bg-emerald-*` |

---

## Testing Checklist

### Mobile Testing (Priority)
- [ ] iPhone SE (320px) - smallest viewport
- [ ] iPhone 12/13/14 (390px)
- [ ] Android phones (360-412px)
- [ ] iPad Mini (768px)

### Touch Testing
- [ ] All buttons minimum 48px
- [ ] No hover-only interactions
- [ ] Swipe gestures work
- [ ] Bottom sheet menus accessible

### Desktop Testing
- [ ] 1280px+ layouts
- [ ] Keyboard navigation
- [ ] Hover states present

---

## Notes

1. **Incremental Deployment**: Each phase can be deployed separately
2. **Testing Required**: Each page should be tested on mobile before moving on
3. **User Feedback**: Consider beta testing with select users after Phase 2
4. **Rollback Plan**: Keep previous commits accessible for quick revert

---

## Estimated Total Effort

| Phase | Hours | Days |
|-------|-------|------|
| Foundation | 8-12 | 1-2 |
| Core Pages | 10-15 | 2-3 |
| Forms | 10-12 | 2 |
| Polish | 6-8 | 1-2 |
| **Total** | **34-47** | **6-9** |

---

## Quick Wins (Can Do Immediately)

1. Update `globals.css` color variables
2. Change focus states from amber to emerald
3. Update login page colors
4. Add dark mode to dashboard layout background

These can be done in 2-3 hours and provide immediate visual impact.
