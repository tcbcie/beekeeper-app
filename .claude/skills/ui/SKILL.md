# Beekeeper App Design Skill

## Philosophy: Breaking Standard Web Application Design

This skill guides the visual and interaction design for a beekeeper application that deliberately breaks away from both typical agricultural software aesthetics AND standard web application patterns. The goal is to create a unique, memorable, and professional interface that respects the craft of beekeeping while embracing modern design innovation.

## Technology Stack

- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS 3+ (custom configuration)
- **UI Components**: Custom-built with Radix UI primitives
- **Typography**: Variable fonts (Inter, Geist, or custom)
- **Icons**: Lucide React (custom styled)

## 📱 Mobile-First Design Priority

**CRITICAL**: This app is designed MOBILE-FIRST. Beekeepers work in the field with phones, not at desks. Desktop is the enhancement, not the primary experience.

### Core Mobile-First Principles

1. **Design for thumbs** - All primary actions within thumb reach (bottom 2/3 of screen)
2. **One-handed operation** - Critical functions accessible with one hand
3. **Large touch targets** - Minimum 48x48px (3rem) for all interactive elements
4. **Swipe gestures** - Natural phone interactions (swipe to delete, pull to refresh)
5. **Bottom-heavy UI** - Important actions at bottom, not top
6. **Minimal typing** - Use pickers, toggles, and selections over text input
7. **Offline-capable** - Work in fields without consistent connectivity
8. **Fast loading** - Optimized for mobile networks

### Responsive Breakpoints Strategy

```typescript
// tailwind.config.ts
export default {
  theme: {
    screens: {
      // Mobile first - start with base styles for phones
      'sm': '640px',   // Large phones / small tablets (landscape)
      'md': '768px',   // Tablets (portrait)
      'lg': '1024px',  // Tablets (landscape) / small laptops
      'xl': '1280px',  // Desktops
      '2xl': '1536px', // Large desktops
    },
  },
}
```

### Design Adaptation Flow

```
📱 Phone (320-639px)
    ↓ Base design - single column, stacked, touch-optimized
    
📱 Large Phone/Small Tablet (640-767px)
    ↓ Slightly wider cards, 2-column grids where appropriate
    
📱 Tablet Portrait (768-1023px)
    ↓ More horizontal space, introduce sidebars
    
💻 Tablet Landscape/Laptop (1024-1279px)
    ↓ Multi-column layouts, floating navigation appears
    
🖥️ Desktop (1280px+)
    ↓ Full desktop experience with all features visible
```

---

## 🚫 AVOID: Standard Beekeeper App Clichés

### Visual Clichés to Eliminate
- ❌ Honey yellow/golden color schemes as primary colors
- ❌ Hexagonal patterns and honeycomb backgrounds everywhere
- ❌ Rustic, farmhouse, or "country" aesthetics
- ❌ Cartoon bees, mascots, or cute illustrations
- ❌ Wood textures and barn-inspired UI elements
- ❌ Script fonts trying to look "natural" or "organic"

### Standard Web App Patterns to Avoid
- ❌ Left sidebar navigation (predictable, overused)
- ❌ Generic card-based dashboards with white backgrounds
- ❌ Standard blue primary colors (Bootstrap blue, etc.)
- ❌ Rectangular, boxy layouts with hard corners everywhere
- ❌ Static, grid-locked content areas
- ❌ Conventional top-bar with logo left, menu right
- ❌ Standard modal dialogs that feel like alerts
- ❌ Generic "Material Design" or "iOS-like" components

---

## ✅ EMBRACE: Unique Design Direction

### Core Design Principles

1. **Organic Fluidity with Technical Precision**
   - Combine soft, flowing shapes with sharp data visualization
   - Balance natural curves with geometric accuracy
   - Think: museum exhibit meets scientific instrument

2. **Dark-First, High-Contrast Design**
   - Primary interface in deep, rich darks (not pure black)
   - High contrast for readability in outdoor/sunlight conditions
   - Strategic use of light themes for specific contexts

3. **Unexpected Navigation Patterns**
   - Bottom-anchored command palette
   - Radial menus for quick actions
   - Gesture-based navigation on mobile
   - Floating action button clusters

4. **Data as Art**
   - Charts and graphs become primary visual elements
   - Information density without clutter
   - Beautiful data visualization is the decoration

---

## 🎨 Color System

### Primary Palette: "Deep Earth & Sky"

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // Primary: Deep Slate (not standard blues)
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        
        // Accent: Forest Emerald (natural but sophisticated)
        emerald: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        
        // Secondary: Warm Terracotta (used sparingly)
        terracotta: {
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
        },
        
        // Data Visualization Palette
        viz: {
          health: '#10b981',    // Green
          warning: '#f59e0b',   // Amber
          alert: '#ef4444',     // Red
          info: '#3b82f6',      // Blue
          neutral: '#6b7280',   // Gray
        },
      },
      
      // Custom background colors
      backgroundColor: {
        'app-dark': '#0a0f1a',
        'app-light': '#fafafa',
        'surface-dark': '#111827',
        'surface-light': '#ffffff',
      },
    },
  },
}
```

### Color Usage Rules

- **Background**: `#0a0f1a` (custom deep blue-black) as primary
- **Surfaces**: `#111827` (slate-900) for elevated content
- **Text**: White/slate-100 for primary, slate-400 for secondary
- **Accents**: Emerald for positive actions, terracotta for highlights
- **NEVER**: Use yellow/amber as primary or background colors

---

## 📐 Layout Patterns: Fluid Mobile-to-Desktop

### 1. Adaptive Asymmetric Dashboard

The dashboard transforms fluidly from mobile to desktop:

**Mobile (< 768px)**: Single column, stacked cards
```jsx
<div className="flex flex-col gap-4 p-4">
  {/* All cards stack vertically on mobile */}
  <div className="rounded-3xl bg-surface-dark p-6">
    {/* Hero card - full width mobile */}
  </div>
  
  <div className="rounded-3xl bg-surface-dark p-6">
    {/* Small widget - full width mobile */}
  </div>
  
  <div className="rounded-3xl bg-surface-dark p-6">
    {/* Chart - full width mobile */}
  </div>
</div>
```

**Desktop (≥ 1024px)**: Asymmetric grid
```jsx
<div className="grid grid-cols-12 gap-6 p-8 auto-rows-min">
  {/* Hero card spans 8 columns, 2 rows on desktop */}
  <div className="col-span-12 lg:col-span-8 lg:row-span-2 
                  rounded-3xl bg-surface-dark p-8">
    {/* Primary content */}
  </div>
  
  {/* Small widget - full width on mobile, 4 cols on desktop */}
  <div className="col-span-12 lg:col-span-4 
                  rounded-3xl bg-surface-dark p-6">
    {/* Secondary content */}
  </div>
  
  {/* Another widget */}
  <div className="col-span-12 lg:col-span-4 
                  rounded-3xl bg-surface-dark p-6">
    {/* Tertiary content */}
  </div>
  
  {/* Chart - full width on all screens */}
  <div className="col-span-12 rounded-3xl bg-surface-dark p-6">
    {/* Wide data visualization */}
  </div>
</div>
```

**Key Principle**: Use `col-span-12` as base (mobile), then override with `lg:col-span-X` for desktop

### 2. Fluid Navigation Pattern

**Mobile**: Bottom Sheet Navigation (thumb-friendly)
```jsx
<div className="lg:hidden fixed inset-x-0 bottom-0 z-50 
                safe-area-pb">
  {/* Handle for pulling up */}
  <div className="flex justify-center py-2 bg-slate-900/80 backdrop-blur-xl">
    <div className="w-12 h-1.5 rounded-full bg-slate-600" />
  </div>
  
  {/* Navigation items - large touch targets */}
  <nav className="bg-slate-900/95 backdrop-blur-xl 
                  border-t border-slate-700/50 
                  px-4 pb-4 pt-2 
                  grid grid-cols-4 gap-2">
    {navItems.map(item => (
      <button 
        key={item.id} 
        className="flex flex-col items-center gap-2 py-3 px-2
                   active:scale-95 transition-transform">
        {/* Icon container - 48x48px minimum */}
        <div className="w-12 h-12 rounded-2xl bg-slate-800/50
                        flex items-center justify-center
                        group-active:bg-emerald-600/20">
          <item.icon className="w-6 h-6 text-slate-400" />
        </div>
        {/* Label - small but readable */}
        <span className="text-xs text-slate-500 font-medium">
          {item.label}
        </span>
      </button>
    ))}
  </nav>
</div>
```

**Desktop**: Floating Navigation Islands (elegant, space-efficient)
```jsx
<div className="hidden lg:block fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
  <nav className="flex gap-2 bg-slate-900/80 backdrop-blur-xl 
                  rounded-full px-6 py-3 border border-slate-700/50
                  shadow-2xl shadow-black/50">
    {navItems.map(item => (
      <button
        key={item.id}
        className="flex items-center gap-2 px-4 py-2 rounded-full
                   hover:bg-slate-800/50 transition-colors group">
        <item.icon className="w-5 h-5 text-slate-400 
                              group-hover:text-emerald-500" />
        <span className="text-sm text-slate-300 group-hover:text-slate-50">
          {item.label}
        </span>
      </button>
    ))}
  </nav>
</div>
```

### 3. Responsive Grid System

**Mobile-First Grid Pattern**:
```jsx
<div className="grid gap-4 
                grid-cols-1 
                sm:grid-cols-2 
                lg:grid-cols-12
                p-4 lg:p-8">
  
  {/* Card 1: Full width mobile, 8 cols desktop */}
  <div className="sm:col-span-2 lg:col-span-8 lg:row-span-2">
    <div className="rounded-2xl lg:rounded-3xl 
                    bg-surface-dark p-4 lg:p-8">
      {/* Content scales with screen size */}
    </div>
  </div>
  
  {/* Card 2: Full width mobile, 4 cols desktop */}
  <div className="sm:col-span-1 lg:col-span-4">
    <div className="rounded-2xl lg:rounded-3xl 
                    bg-surface-dark p-4 lg:p-6">
      {/* Content */}
    </div>
  </div>
  
  {/* Card 3: Appears below card 2 on mobile, next to it on desktop */}
  <div className="sm:col-span-1 lg:col-span-4">
    <div className="rounded-2xl lg:rounded-3xl 
                    bg-surface-dark p-4 lg:p-6">
      {/* Content */}
    </div>
  </div>
  
  {/* Card 4: Full width on all screens */}
  <div className="sm:col-span-2 lg:col-span-12">
    <div className="rounded-2xl lg:rounded-3xl 
                    bg-surface-dark p-4 lg:p-6">
      {/* Charts and wide content */}
    </div>
  </div>
</div>
```

---

## 🔤 Typography System

### Font Choices

**PRIMARY OPTION**: Variable Font System
```typescript
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

export default {
  theme: {
    fontFamily: {
      sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
      mono: ['var(--font-geist-mono)', 'monospace'],
    },
  },
}
```

**ALTERNATIVE**: Inter + JetBrains Mono
```typescript
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrains = JetBrains_Mono({ 
  subsets: ['latin'], 
  variable: '--font-mono' 
});
```

### Typography Scale

```css
/* Unconventional scale - not standard 1.25 ratio */
--text-xs: 0.7rem;      /* 11.2px */
--text-sm: 0.8125rem;   /* 13px */
--text-base: 0.9375rem; /* 15px - slightly larger base */
--text-lg: 1.125rem;    /* 18px */
--text-xl: 1.375rem;    /* 22px */
--text-2xl: 1.75rem;    /* 28px */
--text-3xl: 2.25rem;    /* 36px */
--text-4xl: 3rem;       /* 48px */
--text-5xl: 4rem;       /* 64px */
```

### Type Pairing Rules

```jsx
{/* Headings: Tight, bold, large tracking */}
<h1 className="text-4xl font-bold tracking-tight text-slate-50">
  Dashboard
</h1>

{/* Body: Comfortable, slightly loose */}
<p className="text-base leading-relaxed text-slate-300">
  Content text
</p>

{/* Data/Numbers: Mono, tabular */}
<span className="font-mono text-2xl font-semibold tabular-nums">
  42.5kg
</span>

{/* Labels: Uppercase, tiny, tracked out */}
<label className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
  Status
</label>
```

---

## 🎭 Component Design Patterns

### 1. Glassmorphic Cards (Non-Standard)

Ditch solid white cards - use translucent, layered surfaces:

```jsx
<div className="relative overflow-hidden rounded-3xl 
                bg-slate-900/40 backdrop-blur-xl 
                border border-slate-700/50
                p-8
                shadow-2xl shadow-black/20
                hover:bg-slate-900/50 transition-colors">
  {/* Gradient overlay */}
  <div className="absolute inset-0 bg-gradient-to-br 
                  from-emerald-500/5 to-transparent 
                  pointer-events-none" />
  
  {/* Content */}
  <div className="relative z-10">
    <h3 className="text-2xl font-bold text-slate-50">Content</h3>
  </div>
</div>
```

### 2. Responsive Data Display Cards

Make numbers and data the hero, adapting to screen size:

**Mobile Version** (< 768px):
```jsx
<div className="rounded-2xl bg-slate-900/60 p-4 
                border border-slate-700/30
                active:scale-98 transition-transform">
  {/* Compact label */}
  <p className="text-xs uppercase tracking-widest text-slate-500 
                font-semibold mb-2">
    Total Production
  </p>
  
  {/* Large but mobile-appropriate number */}
  <div className="flex items-baseline gap-2 mb-2">
    <span className="text-4xl font-bold text-slate-50 tabular-nums">
      342.7
    </span>
    <span className="text-xl font-medium text-slate-400">kg</span>
  </div>
  
  {/* Trend - compact on mobile */}
  <div className="flex items-center gap-2 text-sm">
    <svg className="w-4 h-4 text-emerald-500" /* Arrow */ />
    <span className="text-emerald-500 font-medium">+12.5%</span>
  </div>
</div>
```

**Desktop Version** (≥ 1024px):
```jsx
<div className="group relative rounded-2xl lg:rounded-3xl 
                bg-slate-900/60 p-4 lg:p-8 
                border border-slate-700/30
                hover:border-emerald-600/50 transition-all duration-300">
  {/* Small label */}
  <p className="text-xs uppercase tracking-widest text-slate-500 
                font-semibold mb-3">
    Total Production
  </p>
  
  {/* HUGE number on desktop */}
  <div className="flex items-baseline gap-2 mb-3">
    <span className="text-4xl lg:text-6xl font-bold text-slate-50 tabular-nums">
      342.7
    </span>
    <span className="text-xl lg:text-3xl font-medium text-slate-400">kg</span>
  </div>
  
  {/* Trend indicator with more detail on desktop */}
  <div className="flex items-center gap-2 text-sm lg:text-base">
    <svg className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-500" /* Arrow */ />
    <span className="text-emerald-500 font-medium">+12.5%</span>
    <span className="hidden lg:inline text-slate-500">vs last season</span>
  </div>
  
  {/* Mini sparkline - only on desktop hover */}
  <div className="hidden lg:block mt-6 h-16 opacity-0 
                  group-hover:opacity-50 transition-opacity">
    {/* SVG sparkline */}
  </div>
</div>
```

**Unified Responsive Component**:
```jsx
<div className="group relative 
                rounded-2xl lg:rounded-3xl 
                bg-slate-900/60 
                p-4 lg:p-8 
                border border-slate-700/30
                hover:border-emerald-600/50 
                active:scale-98 lg:active:scale-100
                transition-all duration-300">
  
  <p className="text-xs uppercase tracking-widest text-slate-500 
                font-semibold mb-2 lg:mb-3">
    Total Production
  </p>
  
  <div className="flex items-baseline gap-2 mb-2 lg:mb-3">
    <span className="text-4xl lg:text-6xl font-bold text-slate-50 tabular-nums">
      342.7
    </span>
    <span className="text-xl lg:text-3xl font-medium text-slate-400">
      kg
    </span>
  </div>
  
  <div className="flex items-center gap-2 text-sm lg:text-base">
    <svg className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-500" />
    <span className="text-emerald-500 font-medium">+12.5%</span>
    <span className="hidden lg:inline text-slate-500">vs last season</span>
  </div>
  
  {/* Desktop-only sparkline */}
  <div className="hidden lg:block mt-6 h-16 opacity-0 
                  group-hover:opacity-50 transition-opacity">
    {/* Chart */}
  </div>
</div>
```

### 3. Responsive Floating Action Buttons

**Mobile Pattern** (Touch-Optimized):
```jsx
{/* Large FAB in bottom-right - thumb-friendly */}
<button className="lg:hidden fixed bottom-24 right-6 z-40
                   w-16 h-16 rounded-full 
                   bg-gradient-to-br from-emerald-600 to-emerald-500
                   shadow-2xl shadow-emerald-900/50
                   flex items-center justify-center
                   active:scale-95 transition-transform
                   safe-area-bottom">
  <PlusIcon className="w-8 h-8 text-white" />
</button>

{/* Optional: Expandable FAB menu on mobile */}
<div className="lg:hidden fixed bottom-24 right-6 z-40">
  {/* Secondary actions - revealed when main FAB tapped */}
  {fabExpanded && (
    <div className="absolute bottom-20 right-0 flex flex-col gap-3 mb-3
                    animate-fadeInUp">
      <button className="w-14 h-14 rounded-full bg-slate-800/90
                         shadow-xl flex items-center justify-center
                         active:scale-95 transition-transform">
        <CameraIcon className="w-6 h-6 text-slate-300" />
      </button>
      <button className="w-14 h-14 rounded-full bg-slate-800/90
                         shadow-xl flex items-center justify-center
                         active:scale-95 transition-transform">
        <ClipboardIcon className="w-6 h-6 text-slate-300" />
      </button>
    </div>
  )}
  
  {/* Main FAB */}
  <button 
    onClick={() => setFabExpanded(!fabExpanded)}
    className={`w-16 h-16 rounded-full 
                bg-gradient-to-br from-emerald-600 to-emerald-500
                shadow-2xl shadow-emerald-900/50
                flex items-center justify-center
                active:scale-95 transition-all
                ${fabExpanded ? 'rotate-45' : 'rotate-0'}`}>
    <PlusIcon className="w-8 h-8 text-white" />
  </button>
</div>
```

**Desktop Pattern** (Integrated):
```jsx
{/* Desktop: Standard button in toolbar/header */}
<button className="hidden lg:flex items-center gap-2 
                   px-6 py-3 rounded-xl
                   bg-gradient-to-r from-emerald-600 to-emerald-500
                   hover:from-emerald-500 hover:to-emerald-400
                   text-white font-semibold shadow-lg
                   transform hover:scale-105 transition-all">
  <PlusIcon className="w-5 h-5" />
  New Inspection
</button>

{/* Or: Desktop floating action cluster */}
<div className="hidden lg:flex fixed bottom-8 right-8 gap-3 z-40">
  <button className="flex items-center gap-2 px-5 py-3 rounded-xl
                     bg-slate-800/90 hover:bg-slate-700
                     border border-slate-600
                     text-slate-300 hover:text-white
                     shadow-xl backdrop-blur-xl
                     transition-all">
    <CameraIcon className="w-5 h-5" />
    <span className="text-sm font-medium">Photo</span>
  </button>
  
  <button className="flex items-center gap-2 px-6 py-3 rounded-xl
                     bg-gradient-to-br from-emerald-600 to-emerald-500
                     hover:from-emerald-500 hover:to-emerald-400
                     text-white font-semibold
                     shadow-2xl shadow-emerald-900/50
                     transform hover:scale-105 transition-all">
    <PlusIcon className="w-5 h-5" />
    <span>New Inspection</span>
  </button>
</div>
```

### 4. Status Indicators with Personality

Avoid boring badges:

```jsx
{/* Pulsing, organic status indicator */}
<div className="relative inline-flex items-center gap-3 px-4 py-2 
                rounded-full bg-emerald-500/10 border border-emerald-500/20">
  {/* Pulsing dot */}
  <span className="relative flex h-3 w-3">
    <span className="animate-ping absolute inline-flex h-full w-full 
                     rounded-full bg-emerald-400 opacity-75" />
    <span className="relative inline-flex rounded-full h-3 w-3 
                     bg-emerald-500" />
  </span>
  
  <span className="text-sm font-medium text-emerald-400">Healthy</span>
</div>
```

---

## 📊 Mobile-Responsive Data Visualization

### Chart Styling for All Devices

```typescript
// Responsive chart theme
const chartTheme = {
  background: 'transparent',
  text: {
    fill: '#94a3b8', // slate-400
    fontSize: window.innerWidth < 768 ? 10 : 12, // Smaller on mobile
    fontFamily: 'var(--font-sans)',
  },
  grid: {
    stroke: '#334155', // slate-700
    strokeOpacity: 0.2,
  },
  tooltip: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(100, 116, 139, 0.3)',
    borderRadius: '12px',
    padding: window.innerWidth < 768 ? '8px' : '12px',
    backdropFilter: 'blur(12px)',
  },
  colors: {
    primary: ['#10b981', '#34d399', '#6ee7b7'],
    secondary: ['#3b82f6', '#60a5fa', '#93c5fd'],
    tertiary: ['#f59e0b', '#fbbf24', '#fcd34d'],
  },
};
```

### Responsive Chart Component

```jsx
'use client';

import { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
         CartesianGrid, Tooltip, Area } from 'recharts';

export default function HoneyProductionChart({ data }) {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return (
    <div className="rounded-2xl lg:rounded-3xl 
                    bg-slate-900/40 backdrop-blur-xl 
                    border border-slate-700/50 
                    p-4 lg:p-8">
      {/* Header - responsive text */}
      <div className="mb-4 lg:mb-6">
        <h3 className="text-lg lg:text-xl font-semibold text-slate-50 mb-1">
          Honey Production Trend
        </h3>
        <p className="text-sm text-slate-400">
          {isMobile ? 'Last 6 months' : 'Last 12 months across all hives'}
        </p>
      </div>
      
      {/* Chart with responsive height */}
      <div className="h-64 lg:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={isMobile ? data.slice(-6) : data}>
            <defs>
              <linearGradient id="colorProduction" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#334155" 
              strokeOpacity={0.2} 
            />
            
            <XAxis 
              dataKey="month" 
              stroke="#94a3b8"
              tick={{ 
                fill: '#94a3b8', 
                fontSize: isMobile ? 10 : 12 
              }}
              tickLine={false}
              axisLine={false}
              // Show fewer ticks on mobile
              interval={isMobile ? 1 : 0}
            />
            
            <YAxis 
              stroke="#94a3b8"
              tick={{ 
                fill: '#94a3b8', 
                fontSize: isMobile ? 10 : 12 
              }}
              tickLine={false}
              axisLine={false}
              // Mobile: hide Y-axis labels for space
              width={isMobile ? 30 : 60}
            />
            
            <Tooltip 
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(100, 116, 139, 0.3)',
                borderRadius: '12px',
                padding: isMobile ? '8px' : '12px',
                backdropFilter: 'blur(12px)',
                fontSize: isMobile ? '12px' : '14px',
              }}
              cursor={{ stroke: '#10b981', strokeWidth: 2 }}
            />
            
            <Area 
              type="monotone" 
              dataKey="production" 
              stroke="#10b981"
              strokeWidth={isMobile ? 2 : 3}
              fillOpacity={1}
              fill="url(#colorProduction)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Optional: Mobile summary stats below chart */}
      {isMobile && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="text-center">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-lg font-bold text-slate-50">127.5kg</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Average</p>
            <p className="text-lg font-bold text-slate-50">21.3kg</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Mobile Chart Best Practices

```jsx
{/* ✅ GOOD - Simplified mobile charts */}
// Mobile: Show last 6 months only
// Desktop: Show full 12 months

{/* ✅ GOOD - Larger touch areas on mobile */}
<Tooltip
  wrapperStyle={{ 
    touchAction: 'none', // Prevent scroll on tooltip
    pointerEvents: 'auto',
  }}
  // Mobile-optimized cursor
  cursor={{ 
    stroke: '#10b981', 
    strokeWidth: isMobile ? 40 : 2, // Wide touch area on mobile
    opacity: isMobile ? 0.1 : 1,
  }}
/>

{/* ✅ GOOD - Hide non-essential chart elements on mobile */}
<YAxis
  hide={isMobile} // Hide Y-axis labels on small screens
  // OR show but simplify
  tickCount={isMobile ? 3 : 6}
/>

{/* ✅ GOOD - Responsive margins */}
<LineChart 
  data={data}
  margin={{
    top: isMobile ? 5 : 10,
    right: isMobile ? 5 : 30,
    left: isMobile ? -20 : 0,
    bottom: isMobile ? 5 : 10,
  }}
>
```

### Alternative: Mobile-First Simple Visualizations

For very small screens, consider simplified visualizations:

```jsx
{/* Mobile: Bar visualization instead of line chart */}
{isMobile ? (
  <div className="space-y-3">
    {data.slice(-6).map((item, i) => (
      <div key={i} className="flex items-center gap-3">
        {/* Month label */}
        <span className="text-xs text-slate-500 w-12">
          {item.month}
        </span>
        
        {/* Bar */}
        <div className="flex-1 h-8 bg-slate-800/50 rounded-lg overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-500
                       rounded-lg transition-all duration-500"
            style={{ 
              width: `${(item.production / maxProduction) * 100}%` 
            }}
          />
        </div>
        
        {/* Value */}
        <span className="text-sm font-semibold text-slate-50 w-16 text-right
                         tabular-nums">
          {item.production}kg
        </span>
      </div>
    ))}
  </div>
) : (
  // Desktop: Full chart
  <ResponsiveContainer width="100%" height={400}>
    {/* Line chart as above */}
  </ResponsiveContainer>
)}
```

### Responsive Stat Cards with Mini Charts

```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
  <div className="rounded-2xl lg:rounded-3xl bg-slate-900/60 
                  p-4 lg:p-6 border border-slate-700/30">
    {/* Label */}
    <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">
      This Month
    </p>
    
    {/* Value - large but responsive */}
    <p className="text-3xl lg:text-4xl font-bold text-slate-50 mb-3
                  tabular-nums">
      42.5kg
    </p>
    
    {/* Mini chart - hide on very small screens */}
    <div className="hidden sm:block h-12 lg:h-16">
      {/* Simple sparkline SVG */}
      <svg viewBox="0 0 100 30" className="w-full h-full">
        <polyline
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          points="0,25 20,20 40,22 60,15 80,18 100,10"
        />
      </svg>
    </div>
    
    {/* Trend - always visible */}
    <div className="flex items-center gap-2 text-sm mt-2">
      <span className="text-emerald-500">↗ +8%</span>
      <span className="text-slate-500 text-xs">vs last month</span>
    </div>
  </div>
</div>
```

---

## 🎬 Animation & Interaction

### Micro-interactions

Add life to every interaction:

```jsx
{/* Hover lift effect */}
<button className="transform transition-all duration-200 
                   hover:-translate-y-1 hover:shadow-2xl
                   active:translate-y-0">
  Click me
</button>

{/* Ripple effect on click */}
<button className="relative overflow-hidden group">
  <span className="relative z-10">Action</span>
  <span className="absolute inset-0 bg-white/10 
                   scale-0 group-active:scale-100 
                   transition-transform duration-500 
                   rounded-full" />
</button>

{/* Stagger children animation */}
<div className="space-y-4">
  {items.map((item, i) => (
    <div 
      key={item.id}
      className="opacity-0 translate-x-4 animate-fadeInLeft"
      style={{ animationDelay: `${i * 100}ms` }}
    >
      {item.content}
    </div>
  ))}
</div>
```

### Custom Animations in Tailwind Config

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      animation: {
        'fadeInLeft': 'fadeInLeft 0.6s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeInLeft: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
}
```

---

## 📱 Touch Interactions & Mobile Patterns

### Touch Target Sizing

**CRITICAL RULE**: All interactive elements must be at least 48x48px (3rem) for comfortable touch.

```jsx
{/* ✅ GOOD - Large enough touch target */}
<button className="w-12 h-12 rounded-xl bg-emerald-600 
                   flex items-center justify-center">
  <PlusIcon className="w-6 h-6" />
</button>

{/* ❌ BAD - Too small for reliable touch */}
<button className="w-6 h-6 rounded bg-emerald-600">
  <PlusIcon className="w-4 h-4" />
</button>

{/* ✅ GOOD - Padding creates large touch area even with small visual */}
<button className="p-4 rounded-xl hover:bg-slate-800/50">
  <TrashIcon className="w-5 h-5 text-slate-400" />
</button>
```

### Swipe Gestures

Implement natural mobile gestures:

```jsx
{/* Swipe to delete pattern */}
<div className="relative overflow-hidden">
  <div 
    className="flex items-center justify-between p-4 
               bg-slate-900/40 rounded-xl
               touch-pan-x"
    onTouchStart={handleTouchStart}
    onTouchMove={handleTouchMove}
    onTouchEnd={handleTouchEnd}
    style={{ 
      transform: `translateX(${swipeOffset}px)`,
      transition: isReleased ? 'transform 0.3s ease' : 'none'
    }}
  >
    {/* Card content */}
  </div>
  
  {/* Delete action revealed on swipe */}
  <div className="absolute right-0 top-0 bottom-0 w-20
                  bg-red-600 rounded-r-xl
                  flex items-center justify-center">
    <TrashIcon className="w-6 h-6 text-white" />
  </div>
</div>

{/* Pull to refresh */}
<div 
  className="overflow-y-auto touch-pan-y overscroll-y-contain"
  onTouchStart={handlePullStart}
  onTouchMove={handlePullMove}
  onTouchEnd={handlePullEnd}
>
  {/* Refresh indicator */}
  {pullOffset > 0 && (
    <div 
      className="flex items-center justify-center py-4"
      style={{ height: `${pullOffset}px` }}
    >
      <div className={`text-slate-400 transition-transform
                       ${pullOffset > 80 ? 'rotate-180' : ''}`}>
        ↓ Pull to refresh
      </div>
    </div>
  )}
  
  {/* Content */}
</div>
```

### Mobile Form Optimization

Minimize typing, maximize selection:

```jsx
{/* ✅ GOOD - Native date picker (no typing) */}
<input 
  type="date"
  className="w-full px-4 py-4 rounded-xl 
             bg-slate-900/40 border border-slate-700/50
             text-slate-50 text-base
             focus:outline-none focus:border-emerald-500/50"
/>

{/* ✅ GOOD - Toggle switches instead of checkboxes */}
<button
  onClick={() => setEnabled(!enabled)}
  className={`relative w-14 h-8 rounded-full transition-colors
              ${enabled ? 'bg-emerald-600' : 'bg-slate-700'}`}
>
  <span className={`absolute top-1 w-6 h-6 rounded-full bg-white
                    transition-transform
                    ${enabled ? 'left-7' : 'left-1'}`} />
</button>

{/* ✅ GOOD - Segmented control for options */}
<div className="inline-flex gap-1 p-1 rounded-xl bg-slate-900/40">
  {['Week', 'Month', 'Year'].map(period => (
    <button
      key={period}
      className={`px-6 py-3 rounded-lg text-sm font-medium
                  transition-colors
                  ${selected === period 
                    ? 'bg-emerald-600 text-white' 
                    : 'text-slate-400 hover:text-slate-200'}`}
    >
      {period}
    </button>
  ))}
</div>

{/* ✅ GOOD - Bottom sheet picker for long lists */}
<button 
  onClick={() => setPickerOpen(true)}
  className="w-full px-4 py-4 rounded-xl 
             bg-slate-900/40 border border-slate-700/50
             text-left flex items-center justify-between"
>
  <span className="text-slate-50">{selectedHive || 'Select hive'}</span>
  <ChevronDownIcon className="w-5 h-5 text-slate-400" />
</button>

{pickerOpen && (
  <div className="fixed inset-0 z-50 bg-black/60 
                  flex items-end lg:items-center lg:justify-center">
    <div className="w-full lg:w-96 bg-slate-900 
                    rounded-t-3xl lg:rounded-3xl
                    max-h-[80vh] overflow-y-auto
                    animate-slide-up">
      {/* Picker content with large touch targets */}
      {hives.map(hive => (
        <button
          key={hive.id}
          onClick={() => selectHive(hive)}
          className="w-full px-6 py-4 text-left hover:bg-slate-800/50
                     flex items-center justify-between
                     border-b border-slate-800 last:border-0"
        >
          <span className="text-slate-50 text-base">{hive.name}</span>
          {selectedHive === hive.id && (
            <CheckIcon className="w-5 h-5 text-emerald-500" />
          )}
        </button>
      ))}
    </div>
  </div>
)}
```

### Floating Action Button (FAB) - Mobile Primary Action

```jsx
{/* Mobile: Bottom-right FAB */}
<button className="lg:hidden fixed bottom-20 right-6 z-40
                   w-16 h-16 rounded-full 
                   bg-gradient-to-br from-emerald-600 to-emerald-500
                   shadow-2xl shadow-emerald-900/50
                   flex items-center justify-center
                   active:scale-95 transition-transform">
  <PlusIcon className="w-8 h-8 text-white" />
</button>

{/* Desktop: Integrated into layout */}
<button className="hidden lg:flex items-center gap-2 
                   px-6 py-3 rounded-xl
                   bg-gradient-to-r from-emerald-600 to-emerald-500
                   hover:from-emerald-500 hover:to-emerald-400
                   text-white font-semibold shadow-lg">
  <PlusIcon className="w-5 h-5" />
  Add Inspection
</button>
```

### Responsive Typography Scale

Text sizes that work on both mobile and desktop:

```jsx
{/* Headings - scale down on mobile */}
<h1 className="text-3xl lg:text-5xl font-bold text-slate-50">
  Dashboard
</h1>

<h2 className="text-2xl lg:text-3xl font-bold text-slate-50">
  Section Title
</h2>

<h3 className="text-xl lg:text-2xl font-semibold text-slate-50">
  Card Title
</h3>

{/* Body text - 16px minimum on mobile for readability */}
<p className="text-base lg:text-lg text-slate-300 leading-relaxed">
  Body content that's readable on all devices
</p>

{/* Labels - still readable on mobile */}
<label className="text-sm lg:text-sm uppercase tracking-wider 
                  text-slate-500 font-semibold">
  Field Label
</label>

{/* Data/numbers - scale dramatically */}
<span className="text-4xl lg:text-6xl font-bold text-slate-50 
                 tabular-nums">
  342.7
</span>
```

### Adaptive Spacing

```jsx
{/* Container padding - smaller on mobile */}
<div className="px-4 py-6 lg:px-8 lg:py-12">
  {/* Content */}
</div>

{/* Card padding - comfortable on all screens */}
<div className="p-4 lg:p-8 rounded-2xl lg:rounded-3xl">
  {/* Content */}
</div>

{/* Grid gaps - tighter on mobile */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
  {/* Items */}
</div>

{/* Stack spacing - moderate on mobile, generous on desktop */}
<div className="space-y-4 lg:space-y-8">
  {/* Stacked content */}
</div>
```

### Mobile Menu Pattern (Bottom Sheet)

```jsx
{/* Menu trigger */}
<button 
  onClick={() => setMenuOpen(true)}
  className="lg:hidden w-12 h-12 rounded-xl bg-slate-800/50
             flex items-center justify-center">
  <MenuIcon className="w-6 h-6 text-slate-300" />
</button>

{/* Bottom sheet menu */}
{menuOpen && (
  <>
    {/* Backdrop */}
    <div 
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      onClick={() => setMenuOpen(false)}
    />
    
    {/* Sheet */}
    <div className="fixed inset-x-0 bottom-0 z-50
                    bg-slate-900/95 backdrop-blur-xl
                    rounded-t-3xl
                    animate-slide-up
                    safe-area-pb">
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-12 h-1.5 rounded-full bg-slate-600" />
      </div>
      
      {/* Menu items - large touch targets */}
      <nav className="px-4 pb-6">
        {menuItems.map(item => (
          <button
            key={item.id}
            className="w-full flex items-center gap-4 
                       px-4 py-4 rounded-xl
                       hover:bg-slate-800/50 active:scale-98
                       transition-all text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-800/50
                            flex items-center justify-center">
              <item.icon className="w-6 h-6 text-slate-400" />
            </div>
            <div className="flex-1">
              <p className="text-base font-medium text-slate-50">
                {item.label}
              </p>
              {item.description && (
                <p className="text-sm text-slate-500">
                  {item.description}
                </p>
              )}
            </div>
          </button>
        ))}
      </nav>
    </div>
  </>
)}
```

### Safe Area Handling (Mobile Notches)

```jsx
{/* Add safe area utilities to tailwind.config.ts */}
// In your global CSS:
@supports (padding: env(safe-area-inset-bottom)) {
  .safe-area-pb {
    padding-bottom: env(safe-area-inset-bottom);
  }
  .safe-area-pt {
    padding-top: env(safe-area-inset-top);
  }
}

{/* Use in components */}
<nav className="fixed inset-x-0 bottom-0 
                pb-4 safe-area-pb
                bg-slate-900/95">
  {/* Bottom navigation */}
</nav>
```

### Loading States - Mobile Optimized

```jsx
{/* Skeleton that works on all screen sizes */}
<div className="space-y-4 p-4 lg:p-8">
  {[1, 2, 3].map(i => (
    <div key={i} className="rounded-2xl lg:rounded-3xl 
                            bg-slate-900/40 p-4 lg:p-6
                            animate-pulse">
      {/* Mobile: Simpler skeleton */}
      <div className="space-y-3">
        <div className="h-4 bg-slate-800 rounded w-1/4" />
        <div className="h-8 lg:h-12 bg-slate-800 rounded w-1/2" />
        <div className="h-3 bg-slate-800 rounded w-3/4" />
      </div>
    </div>
  ))}
</div>
```

---

## 🎯 Keyboard-Free Form Design (Field Work Priority)

### CRITICAL DESIGN PRINCIPLE: No Keyboard Required

**Beekeepers work in the field with gloves, dirty hands, and need one-handed operation. Every input MUST work without keyboard interaction.**

### Input Philosophy

**❌ NEVER:**
- Require typing numbers
- Require typing text for common values
- Use small text inputs
- Assume keyboard availability

**✅ ALWAYS:**
- Provide +/- buttons for numbers
- Offer predefined value buttons (1-10, ranges)
- Use pickers/selectors for all options
- Make voice input available as alternative
- Support one-tap selections

---

### Number Input Pattern (NO KEYBOARD)

```jsx
{/* Standard number input with +/- controls */}
<div className="space-y-2">
  <label className="text-sm font-medium text-slate-300">
    Number of Honey Supers
  </label>
  
  <div className="flex items-center gap-3">
    {/* Minus button - large touch target */}
    <button
      type="button"
      onClick={() => setValue(Math.max(0, value - 1))}
      className="w-14 h-14 rounded-xl bg-slate-800/50
                 border-2 border-slate-700/50
                 flex items-center justify-center
                 active:scale-95 active:bg-slate-700/50
                 transition-all
                 disabled:opacity-30 disabled:cursor-not-allowed"
      disabled={value === 0}
    >
      <MinusIcon className="w-6 h-6 text-slate-300" />
    </button>
    
    {/* Value display - clear and prominent */}
    <div className="flex-1 min-w-[80px] h-14 rounded-xl 
                    bg-slate-900/60 border-2 border-slate-700/30
                    flex items-center justify-center">
      <span className="text-2xl font-bold text-slate-50 tabular-nums">
        {value}
      </span>
    </div>
    
    {/* Plus button */}
    <button
      type="button"
      onClick={() => setValue(value + 1)}
      className="w-14 h-14 rounded-xl bg-slate-800/50
                 border-2 border-slate-700/50
                 flex items-center justify-center
                 active:scale-95 active:bg-emerald-600/20
                 transition-all"
    >
      <PlusIcon className="w-6 h-6 text-slate-300" />
    </button>
  </div>
</div>

{/* With increment options (1, 5, 10) */}
<div className="space-y-2">
  <label className="text-sm font-medium text-slate-300">
    Frames of Honey
  </label>
  
  <div className="space-y-3">
    {/* Value display */}
    <div className="h-16 rounded-xl bg-slate-900/60 
                    border-2 border-emerald-600/30
                    flex items-center justify-center">
      <span className="text-3xl font-bold text-slate-50 tabular-nums">
        {frames}
      </span>
      <span className="text-lg text-slate-400 ml-2">frames</span>
    </div>
    
    {/* Control buttons - multiple increment sizes */}
    <div className="grid grid-cols-2 gap-3">
      {/* -10 */}
      <button
        type="button"
        onClick={() => setFrames(Math.max(0, frames - 10))}
        className="h-14 rounded-xl bg-slate-800/50 
                   border-2 border-slate-700/50
                   flex items-center justify-center gap-2
                   active:scale-95 transition-all
                   disabled:opacity-30"
        disabled={frames < 10}
      >
        <span className="text-lg font-semibold text-slate-300">-10</span>
      </button>
      
      {/* -1 */}
      <button
        type="button"
        onClick={() => setFrames(Math.max(0, frames - 1))}
        className="h-14 rounded-xl bg-slate-800/50 
                   border-2 border-slate-700/50
                   flex items-center justify-center gap-2
                   active:scale-95 transition-all
                   disabled:opacity-30"
        disabled={frames === 0}
      >
        <span className="text-lg font-semibold text-slate-300">-1</span>
      </button>
      
      {/* +1 */}
      <button
        type="button"
        onClick={() => setFrames(frames + 1)}
        className="h-14 rounded-xl bg-slate-800/50 
                   border-2 border-emerald-600/30
                   flex items-center justify-center gap-2
                   active:scale-95 active:bg-emerald-600/20
                   transition-all"
      >
        <span className="text-lg font-semibold text-emerald-400">+1</span>
      </button>
      
      {/* +10 */}
      <button
        type="button"
        onClick={() => setFrames(frames + 10)}
        className="h-14 rounded-xl bg-slate-800/50 
                   border-2 border-emerald-600/30
                   flex items-center justify-center gap-2
                   active:scale-95 active:bg-emerald-600/20
                   transition-all"
      >
        <span className="text-lg font-semibold text-emerald-400">+10</span>
      </button>
    </div>
    
    {/* Reset button */}
    <button
      type="button"
      onClick={() => setFrames(0)}
      className="w-full h-12 rounded-xl bg-slate-900/40
                 border border-slate-700/50
                 text-sm font-medium text-slate-400
                 active:scale-98 transition-all"
    >
      Reset to 0
    </button>
  </div>
</div>
```

### Predefined Value Buttons (1-10 Range)

```jsx
{/* Quick selection: 1-10 buttons */}
<div className="space-y-2">
  <label className="text-sm font-medium text-slate-300">
    Population Estimate (1-10)
  </label>
  
  {/* Grid of number buttons */}
  <div className="grid grid-cols-5 gap-2">
    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
      <button
        key={num}
        type="button"
        onClick={() => setPopulation(num)}
        className={`h-14 rounded-xl font-semibold text-lg
                    transition-all active:scale-95
                    ${population === num
                      ? 'bg-emerald-600 text-white border-2 border-emerald-500' 
                      : 'bg-slate-800/50 text-slate-300 border-2 border-slate-700/50'}`}
      >
        {num}
      </button>
    ))}
  </div>
  
  {/* Selected value display */}
  {population && (
    <div className="text-center py-2">
      <span className="text-sm text-slate-400">Selected: </span>
      <span className="text-lg font-bold text-emerald-400">{population}</span>
    </div>
  )}
</div>

{/* Alternative: Slider style 1-10 */}
<div className="space-y-2">
  <label className="text-sm font-medium text-slate-300">
    Hive Strength (1-10)
  </label>
  
  <div className="flex items-center gap-2">
    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
      <button
        key={num}
        type="button"
        onClick={() => setStrength(num)}
        className={`flex-1 h-16 rounded-lg font-bold
                    transition-all active:scale-95
                    ${strength >= num
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-800/50 text-slate-500'}`}
      >
        {num}
      </button>
    ))}
  </div>
</div>
```

### Temperature Input (Predefined + Custom)

```jsx
<div className="space-y-3">
  <label className="text-sm font-medium text-slate-300">
    Temperature (°C)
  </label>
  
  {/* Common temperature quick picks */}
  <div className="grid grid-cols-4 gap-2">
    {[15, 20, 25, 30].map(temp => (
      <button
        key={temp}
        type="button"
        onClick={() => setTemperature(temp)}
        className={`h-14 rounded-xl font-semibold
                    transition-all active:scale-95
                    ${temperature === temp
                      ? 'bg-emerald-600 text-white border-2 border-emerald-500' 
                      : 'bg-slate-800/50 text-slate-300 border-2 border-slate-700/50'}`}
      >
        {temp}°
      </button>
    ))}
  </div>
  
  {/* Fine control with +/- */}
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={() => setTemperature(Math.max(-10, temperature - 1))}
      className="flex-1 h-14 rounded-xl bg-slate-800/50
                 border-2 border-slate-700/50
                 text-lg font-semibold text-slate-300
                 active:scale-95 transition-all"
    >
      -1°
    </button>
    
    <div className="flex-1 h-14 rounded-xl bg-slate-900/60
                    border-2 border-slate-700/30
                    flex items-center justify-center">
      <span className="text-2xl font-bold text-slate-50 tabular-nums">
        {temperature}°C
      </span>
    </div>
    
    <button
      type="button"
      onClick={() => setTemperature(temperature + 1)}
      className="flex-1 h-14 rounded-xl bg-slate-800/50
                 border-2 border-emerald-600/30
                 text-lg font-semibold text-emerald-400
                 active:scale-95 transition-all"
    >
      +1°
    </button>
  </div>
</div>
```

### Weight/Quantity Input (Kilograms)

```jsx
<div className="space-y-3">
  <label className="text-sm font-medium text-slate-300">
    Honey Harvested (kg)
  </label>
  
  {/* Large value display */}
  <div className="h-20 rounded-2xl bg-gradient-to-br 
                  from-slate-900/60 to-slate-800/40
                  border-2 border-emerald-600/30
                  flex items-center justify-center">
    <span className="text-4xl font-bold text-slate-50 tabular-nums">
      {weight.toFixed(1)}
    </span>
    <span className="text-2xl text-slate-400 ml-2">kg</span>
  </div>
  
  {/* Coarse adjustments: ±10, ±5 */}
  <div className="grid grid-cols-2 gap-2">
    <button
      type="button"
      onClick={() => setWeight(Math.max(0, weight - 10))}
      className="h-14 rounded-xl bg-slate-800/50 border-2 border-slate-700/50
                 text-lg font-semibold text-slate-300
                 active:scale-95 transition-all"
    >
      -10 kg
    </button>
    <button
      type="button"
      onClick={() => setWeight(weight + 10)}
      className="h-14 rounded-xl bg-slate-800/50 border-2 border-emerald-600/30
                 text-lg font-semibold text-emerald-400
                 active:scale-95 transition-all"
    >
      +10 kg
    </button>
    <button
      type="button"
      onClick={() => setWeight(Math.max(0, weight - 5))}
      className="h-14 rounded-xl bg-slate-800/50 border-2 border-slate-700/50
                 text-lg font-semibold text-slate-300
                 active:scale-95 transition-all"
    >
      -5 kg
    </button>
    <button
      type="button"
      onClick={() => setWeight(weight + 5)}
      className="h-14 rounded-xl bg-slate-800/50 border-2 border-emerald-600/30
                 text-lg font-semibold text-emerald-400
                 active:scale-95 transition-all"
    >
      +5 kg
    </button>
  </div>
  
  {/* Fine adjustments: ±1, ±0.1 */}
  <div className="grid grid-cols-4 gap-2">
    <button
      type="button"
      onClick={() => setWeight(Math.max(0, weight - 1))}
      className="h-12 rounded-lg bg-slate-900/40 border border-slate-700/50
                 text-sm font-medium text-slate-300
                 active:scale-95 transition-all"
    >
      -1
    </button>
    <button
      type="button"
      onClick={() => setWeight(Math.max(0, weight - 0.1))}
      className="h-12 rounded-lg bg-slate-900/40 border border-slate-700/50
                 text-sm font-medium text-slate-300
                 active:scale-95 transition-all"
    >
      -0.1
    </button>
    <button
      type="button"
      onClick={() => setWeight(parseFloat((weight + 0.1).toFixed(1)))}
      className="h-12 rounded-lg bg-slate-900/40 border border-emerald-600/20
                 text-sm font-medium text-emerald-400
                 active:scale-95 transition-all"
    >
      +0.1
    </button>
    <button
      type="button"
      onClick={() => setWeight(weight + 1)}
      className="h-12 rounded-lg bg-slate-900/40 border border-emerald-600/20
                 text-sm font-medium text-emerald-400
                 active:scale-95 transition-all"
    >
      +1
    </button>
  </div>
</div>
```

### Date Selection (NO KEYBOARD)

```jsx
{/* Option 1: Native date picker (mobile optimized) */}
<div className="space-y-2">
  <label className="text-sm font-medium text-slate-300">
    Inspection Date
  </label>
  
  <input 
    type="date"
    value={date}
    onChange={(e) => setDate(e.target.value)}
    className="w-full h-14 px-4 rounded-xl 
               bg-slate-900/40 border-2 border-slate-700/50
               text-slate-50 text-base
               focus:outline-none focus:border-emerald-500/50"
  />
</div>

{/* Option 2: Quick date buttons */}
<div className="space-y-3">
  <label className="text-sm font-medium text-slate-300">
    When did you inspect?
  </label>
  
  <div className="grid grid-cols-2 gap-2">
    <button
      type="button"
      onClick={() => setDate(new Date())}
      className={`h-14 rounded-xl font-medium
                  transition-all active:scale-95
                  ${isToday(date)
                    ? 'bg-emerald-600 text-white border-2 border-emerald-500' 
                    : 'bg-slate-800/50 text-slate-300 border-2 border-slate-700/50'}`}
    >
      Today
    </button>
    
    <button
      type="button"
      onClick={() => setDate(subDays(new Date(), 1))}
      className={`h-14 rounded-xl font-medium
                  transition-all active:scale-95
                  ${isYesterday(date)
                    ? 'bg-emerald-600 text-white border-2 border-emerald-500' 
                    : 'bg-slate-800/50 text-slate-300 border-2 border-slate-700/50'}`}
    >
      Yesterday
    </button>
    
    <button
      type="button"
      onClick={() => setDate(subDays(new Date(), 2))}
      className={`h-14 rounded-xl font-medium
                  transition-all active:scale-95
                  ${isDaysAgo(date, 2)
                    ? 'bg-emerald-600 text-white border-2 border-emerald-500' 
                    : 'bg-slate-800/50 text-slate-300 border-2 border-slate-700/50'}`}
    >
      2 Days Ago
    </button>
    
    <button
      type="button"
      onClick={() => setShowCalendar(true)}
      className="h-14 rounded-xl font-medium
                 bg-slate-800/50 text-slate-300 
                 border-2 border-slate-700/50
                 active:scale-95 transition-all"
    >
      Other Date
    </button>
  </div>
  
  {/* Display selected date */}
  <div className="text-center py-3 px-4 rounded-xl bg-slate-900/40">
    <span className="text-base text-slate-400">Selected: </span>
    <span className="text-lg font-semibold text-slate-50">
      {format(date, 'MMM dd, yyyy')}
    </span>
  </div>
</div>
```

### Text Input - ONLY When Absolutely Necessary

```jsx
{/* For hive names - provide suggestions first */}
<div className="space-y-3">
  <label className="text-sm font-medium text-slate-300">
    Hive Name
  </label>
  
  {/* Predefined name suggestions */}
  <div className="grid grid-cols-3 gap-2">
    {['Hive 1', 'Hive 2', 'Hive 3', 'North Hive', 'South Hive', 'Queen Anne'].map(name => (
      <button
        key={name}
        type="button"
        onClick={() => setHiveName(name)}
        className={`h-12 rounded-xl text-sm font-medium
                    transition-all active:scale-95
                    ${hiveName === name
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-800/50 text-slate-300 border border-slate-700/50'}`}
      >
        {name}
      </button>
    ))}
  </div>
  
  {/* Voice input button */}
  <button
    type="button"
    onClick={startVoiceInput}
    className="w-full h-14 rounded-xl bg-slate-800/50 
               border-2 border-slate-700/50
               flex items-center justify-center gap-3
               active:scale-95 transition-all"
  >
    <MicIcon className="w-6 h-6 text-slate-300" />
    <span className="text-base font-medium text-slate-300">
      Speak Name
    </span>
  </button>
  
  {/* Fallback: keyboard input (but discouraged) */}
  <details className="mt-2">
    <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-400">
      Or type custom name
    </summary>
    <input 
      type="text"
      value={hiveName}
      onChange={(e) => setHiveName(e.target.value)}
      placeholder="Custom hive name"
      className="mt-2 w-full h-14 px-4 rounded-xl 
                 bg-slate-900/40 border-2 border-slate-700/50
                 text-slate-50 text-base
                 focus:outline-none focus:border-emerald-500/50"
    />
  </details>
</div>
```

### Notes/Comments - Voice First

```jsx
<div className="space-y-3">
  <label className="text-sm font-medium text-slate-300">
    Inspection Notes
  </label>
  
  {/* Voice input primary method */}
  <button
    type="button"
    onClick={startVoiceNote}
    className="w-full h-20 rounded-xl 
               bg-gradient-to-br from-emerald-600/20 to-emerald-500/10
               border-2 border-emerald-600/30
               flex flex-col items-center justify-center gap-2
               active:scale-98 transition-all"
  >
    <MicIcon className={`w-8 h-8 ${isRecording ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`} />
    <span className="text-base font-medium text-slate-50">
      {isRecording ? 'Recording...' : 'Tap to Record Note'}
    </span>
  </button>
  
  {/* Quick note templates */}
  <div className="space-y-2">
    <p className="text-xs text-slate-500">Or select common notes:</p>
    <div className="grid grid-cols-2 gap-2">
      {[
        'All looks good',
        'Queen active',
        'Building well',
        'Needs attention',
        'Added super',
        'Fed hive',
      ].map(note => (
        <button
          key={note}
          type="button"
          onClick={() => addQuickNote(note)}
          className="h-12 px-3 rounded-xl text-sm font-medium
                     bg-slate-800/50 text-slate-300 
                     border border-slate-700/50
                     hover:bg-slate-700/50
                     active:scale-95 transition-all
                     text-left"
        >
          {note}
        </button>
      ))}
    </div>
  </div>
  
  {/* Display accumulated notes */}
  {notes.length > 0 && (
    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-slate-500">
          Notes
        </span>
        <button
          type="button"
          onClick={clearNotes}
          className="text-xs text-red-400 hover:text-red-300"
        >
          Clear all
        </button>
      </div>
      <div className="space-y-2">
        {notes.map((note, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-sm text-slate-300">• {note}</span>
            <button
              type="button"
              onClick={() => removeNote(i)}
              className="ml-auto p-1"
            >
              <XIcon className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )}
  
  {/* Keyboard fallback (hidden by default) */}
  <details>
    <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-400">
      Type note instead
    </summary>
    <textarea
      rows={3}
      value={textNote}
      onChange={(e) => setTextNote(e.target.value)}
      placeholder="Type your note..."
      className="mt-2 w-full px-4 py-3 rounded-xl
                 bg-slate-900/40 border-2 border-slate-700/50
                 text-slate-50 text-base
                 focus:outline-none focus:border-emerald-500/50
                 resize-none"
    />
  </details>
</div>
```

---

### Complete Keyboard-Free Inspection Form Example

Here's a full inspection form using only taps, no keyboard:

```jsx
'use client';

export default function InspectionForm() {
  const [formData, setFormData] = useState({
    date: new Date(),
    temperature: 20,
    queenSeen: false,
    eggsSeen: false,
    larvaeSeen: false,
    population: 5,
    temper: 'calm',
    honeySupers: 0,
    framesOfHoney: 0,
    diseaseSign: false,
    pestSigns: false,
    fed: false,
    treated: false,
    notes: [],
  });
  
  return (
    <form className="space-y-6 p-4 lg:p-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-50 mb-1">
          Hive Inspection
        </h2>
        <p className="text-sm text-slate-400">
          All inputs are tap-based, no typing needed
        </p>
      </div>
      
      {/* Date - Quick buttons */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-700/30 space-y-3">
        <label className="text-sm font-semibold text-slate-300">
          When did you inspect?
        </label>
        
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setFormData({...formData, date: new Date()})}
            className={`h-14 rounded-xl font-medium transition-all active:scale-95
                        ${isToday(formData.date)
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-slate-800/50 text-slate-300 border border-slate-700/50'}`}
          >
            Today
          </button>
          
          <button
            type="button"
            onClick={() => setFormData({...formData, date: subDays(new Date(), 1)})}
            className={`h-14 rounded-xl font-medium transition-all active:scale-95
                        ${isYesterday(formData.date)
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-slate-800/50 text-slate-300 border border-slate-700/50'}`}
          >
            Yesterday
          </button>
        </div>
      </div>
      
      {/* Temperature */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-700/30 space-y-3">
        <label className="text-sm font-semibold text-slate-300">
          Temperature
        </label>
        
        {/* Quick picks */}
        <div className="grid grid-cols-4 gap-2">
          {[15, 20, 25, 30].map(temp => (
            <button
              key={temp}
              type="button"
              onClick={() => setFormData({...formData, temperature: temp})}
              className={`h-12 rounded-xl font-semibold transition-all active:scale-95
                          ${formData.temperature === temp
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-slate-800/50 text-slate-300 border border-slate-700/50'}`}
            >
              {temp}°
            </button>
          ))}
        </div>
        
        {/* Fine control */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFormData({...formData, temperature: formData.temperature - 1})}
            className="flex-1 h-12 rounded-xl bg-slate-800/50 border border-slate-700/50
                       text-slate-300 active:scale-95 transition-all"
          >
            -1°
          </button>
          
          <div className="flex-1 h-12 rounded-xl bg-slate-900/60 border border-slate-700/30
                          flex items-center justify-center">
            <span className="text-xl font-bold text-slate-50 tabular-nums">
              {formData.temperature}°C
            </span>
          </div>
          
          <button
            type="button"
            onClick={() => setFormData({...formData, temperature: formData.temperature + 1})}
            className="flex-1 h-12 rounded-xl bg-slate-800/50 border border-emerald-600/30
                       text-emerald-400 active:scale-95 transition-all"
          >
            +1°
          </button>
        </div>
      </div>
      
      {/* Queen Status - Toggles */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-700/30 space-y-1">
        <label className="text-sm font-semibold text-slate-300 mb-3 block">
          Queen Status
        </label>
        
        {[
          { key: 'queenSeen', label: 'Queen Seen' },
          { key: 'eggsSeen', label: 'Eggs Present' },
          { key: 'larvaeSeen', label: 'Larvae Present' },
        ].map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFormData({...formData, [item.key]: !formData[item.key]})}
            className="w-full flex items-center justify-between 
                       px-4 py-4 rounded-xl
                       bg-slate-900/40 border border-slate-700/30
                       hover:bg-slate-800/50 active:scale-98 transition-all"
          >
            <span className="text-base font-medium text-slate-50">{item.label}</span>
            
            <div className={`relative w-14 h-8 rounded-full transition-colors
                            ${formData[item.key] ? 'bg-emerald-600' : 'bg-slate-700'}`}>
              <span className={`absolute top-1 w-6 h-6 rounded-full bg-white
                                shadow-lg transition-transform
                                ${formData[item.key] ? 'left-7' : 'left-1'}`} />
            </div>
          </button>
        ))}
      </div>
      
      {/* Population - 1-10 scale */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-700/30 space-y-3">
        <label className="text-sm font-semibold text-slate-300">
          Population Strength (1-10)
        </label>
        
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => setFormData({...formData, population: num})}
              className={`flex-1 h-16 rounded-lg font-bold text-lg
                          transition-all active:scale-95
                          ${formData.population >= num
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-slate-800/50 text-slate-500 border border-slate-700/50'}`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
      
      {/* Temper - Segmented control */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-700/30 space-y-3">
        <label className="text-sm font-semibold text-slate-300">
          Hive Temper
        </label>
        
        <div className="flex gap-2 p-1 rounded-xl bg-slate-900/60">
          {['calm', 'defensive', 'aggressive'].map(temper => (
            <button
              key={temper}
              type="button"
              onClick={() => setFormData({...formData, temper})}
              className={`flex-1 py-3 px-4 rounded-lg font-medium capitalize
                          transition-all active:scale-95
                          ${formData.temper === temper
                            ? 'bg-emerald-600 text-white shadow-lg' 
                            : 'text-slate-400 hover:text-slate-200'}`}
            >
              {temper}
            </button>
          ))}
        </div>
      </div>
      
      {/* Honey Supers - +/- control */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-700/30 space-y-3">
        <label className="text-sm font-semibold text-slate-300">
          Number of Honey Supers
        </label>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFormData({...formData, honeySupers: Math.max(0, formData.honeySupers - 1)})}
            className="w-14 h-14 rounded-xl bg-slate-800/50 border-2 border-slate-700/50
                       flex items-center justify-center active:scale-95 transition-all
                       disabled:opacity-30"
            disabled={formData.honeySupers === 0}
          >
            <MinusIcon className="w-6 h-6 text-slate-300" />
          </button>
          
          <div className="flex-1 h-14 rounded-xl bg-slate-900/60 border-2 border-slate-700/30
                          flex items-center justify-center">
            <span className="text-2xl font-bold text-slate-50 tabular-nums">
              {formData.honeySupers}
            </span>
          </div>
          
          <button
            type="button"
            onClick={() => setFormData({...formData, honeySupers: formData.honeySupers + 1})}
            className="w-14 h-14 rounded-xl bg-slate-800/50 border-2 border-emerald-600/30
                       flex items-center justify-center active:scale-95 transition-all"
          >
            <PlusIcon className="w-6 h-6 text-slate-300" />
          </button>
        </div>
      </div>
      
      {/* Frames of Honey - Multiple increments */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-700/30 space-y-3">
        <label className="text-sm font-semibold text-slate-300">
          Frames of Honey
        </label>
        
        <div className="h-16 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5
                        border-2 border-amber-600/30
                        flex items-center justify-center">
          <span className="text-3xl font-bold text-slate-50 tabular-nums">
            {formData.framesOfHoney}
          </span>
          <span className="text-lg text-slate-400 ml-2">frames</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setFormData({...formData, framesOfHoney: Math.max(0, formData.framesOfHoney - 5)})}
            className="h-12 rounded-xl bg-slate-800/50 border border-slate-700/50
                       font-semibold text-slate-300 active:scale-95 transition-all"
          >
            -5
          </button>
          <button
            type="button"
            onClick={() => setFormData({...formData, framesOfHoney: Math.max(0, formData.framesOfHoney - 1)})}
            className="h-12 rounded-xl bg-slate-800/50 border border-slate-700/50
                       font-semibold text-slate-300 active:scale-95 transition-all"
          >
            -1
          </button>
          <button
            type="button"
            onClick={() => setFormData({...formData, framesOfHoney: formData.framesOfHoney + 1})}
            className="h-12 rounded-xl bg-slate-800/50 border border-emerald-600/30
                       font-semibold text-emerald-400 active:scale-95 transition-all"
          >
            +1
          </button>
          <button
            type="button"
            onClick={() => setFormData({...formData, framesOfHoney: formData.framesOfHoney + 5})}
            className="h-12 rounded-xl bg-slate-800/50 border border-emerald-600/30
                       font-semibold text-emerald-400 active:scale-95 transition-all"
          >
            +5
          </button>
        </div>
      </div>
      
      {/* Actions Taken - Quick toggles */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-700/30 space-y-2">
        <label className="text-sm font-semibold text-slate-300 mb-3 block">
          Actions Taken
        </label>
        
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'fed', label: 'Fed', icon: '🍯' },
            { key: 'treated', label: 'Treated', icon: '💊' },
            { key: 'diseaseSign', label: 'Disease', icon: '⚠️' },
            { key: 'pestSigns', label: 'Pests', icon: '🐛' },
          ].map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFormData({...formData, [item.key]: !formData[item.key]})}
              className={`h-16 rounded-xl font-medium flex flex-col items-center justify-center gap-1
                          transition-all active:scale-95
                          ${formData[item.key]
                            ? 'bg-emerald-600 text-white border-2 border-emerald-500' 
                            : 'bg-slate-800/50 text-slate-300 border border-slate-700/50'}`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Notes - Voice primary */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-700/30 space-y-3">
        <label className="text-sm font-semibold text-slate-300">
          Notes
        </label>
        
        <button
          type="button"
          className="w-full h-16 rounded-xl 
                     bg-gradient-to-br from-emerald-600/20 to-emerald-500/10
                     border-2 border-emerald-600/30
                     flex items-center justify-center gap-3
                     active:scale-98 transition-all"
        >
          <MicIcon className="w-6 h-6 text-emerald-400" />
          <span className="text-base font-medium text-slate-50">
            Tap to Record Note
          </span>
        </button>
        
        {/* Quick notes */}
        <div className="grid grid-cols-2 gap-2">
          {['All good', 'Queen active', 'Needs attention', 'Building well'].map(note => (
            <button
              key={note}
              type="button"
              onClick={() => setFormData({
                ...formData, 
                notes: [...formData.notes, note]
              })}
              className="h-10 px-3 rounded-lg text-sm
                         bg-slate-800/50 text-slate-300 border border-slate-700/50
                         active:scale-95 transition-all"
            >
              {note}
            </button>
          ))}
        </div>
      </div>
      
      {/* Submit button - fixed at bottom */}
      <div className="fixed lg:relative inset-x-0 bottom-0 lg:bottom-auto
                      p-4 lg:p-0 bg-slate-950/80 lg:bg-transparent 
                      backdrop-blur-xl lg:backdrop-blur-none
                      border-t border-slate-800 lg:border-0
                      safe-area-pb z-30">
        <button
          type="submit"
          className="w-full h-16 rounded-xl
                     bg-gradient-to-r from-emerald-600 to-emerald-500
                     hover:from-emerald-500 hover:to-emerald-400
                     text-white text-lg font-bold
                     shadow-2xl shadow-emerald-900/50
                     active:scale-98 transition-all"
        >
          Save Inspection
        </button>
      </div>
    </form>
  );
}
```

---

## 🎯 Mobile-First Form Design

### Input Fields - Touch Optimized

```jsx
{/* Base input - large enough for touch */}
<div className="relative">
  <input
    type="text"
    id="hive-name"
    className="peer w-full 
               px-4 py-4 lg:py-3
               text-base lg:text-base
               bg-slate-900/40 
               border border-slate-700/50 
               rounded-xl lg:rounded-xl
               text-slate-50
               focus:outline-none 
               focus:border-emerald-500/50 
               focus:ring-2 focus:ring-emerald-500/20
               placeholder-transparent
               transition-all"
    placeholder="Hive name"
  />
  
  {/* Floating label */}
  <label
    htmlFor="hive-name"
    className="absolute left-4 top-2 
               text-xs text-slate-500 
               transition-all duration-200 pointer-events-none
               peer-placeholder-shown:top-4 lg:peer-placeholder-shown:top-3.5
               peer-placeholder-shown:text-base 
               peer-placeholder-shown:text-slate-400
               peer-focus:top-2 
               peer-focus:text-xs 
               peer-focus:text-emerald-500"
  >
    Hive Name
  </label>
</div>

{/* Number input with +/- buttons (mobile-friendly) */}
<div className="flex items-center gap-3">
  <label className="text-sm text-slate-400 min-w-[100px]">
    Honey Supers
  </label>
  
  <div className="flex items-center gap-2">
    {/* Minus button - large touch target */}
    <button
      type="button"
      onClick={() => setValue(Math.max(0, value - 1))}
      className="w-12 h-12 rounded-xl bg-slate-800/50
                 border border-slate-700/50
                 flex items-center justify-center
                 active:scale-95 transition-transform
                 disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={value === 0}
    >
      <MinusIcon className="w-5 h-5 text-slate-300" />
    </button>
    
    {/* Value display */}
    <div className="w-16 h-12 rounded-xl bg-slate-900/40
                    border border-slate-700/50
                    flex items-center justify-center">
      <span className="text-lg font-semibold text-slate-50 tabular-nums">
        {value}
      </span>
    </div>
    
    {/* Plus button */}
    <button
      type="button"
      onClick={() => setValue(value + 1)}
      className="w-12 h-12 rounded-xl bg-slate-800/50
                 border border-slate-700/50
                 flex items-center justify-center
                 active:scale-95 transition-transform"
    >
      <PlusIcon className="w-5 h-5 text-slate-300" />
    </button>
  </div>
</div>
```

### Native Mobile Inputs

Always use appropriate input types for mobile keyboards:

```jsx
{/* ✅ Date - native date picker (best on mobile) */}
<input 
  type="date"
  className="w-full px-4 py-4 rounded-xl 
             bg-slate-900/40 border border-slate-700/50
             text-slate-50 text-base"
/>

{/* ✅ Time - native time picker */}
<input 
  type="time"
  className="w-full px-4 py-4 rounded-xl 
             bg-slate-900/40 border border-slate-700/50
             text-slate-50 text-base"
/>

{/* ✅ Number - numeric keyboard on mobile */}
<input 
  type="number"
  inputMode="decimal"
  pattern="[0-9]*"
  className="w-full px-4 py-4 rounded-xl 
             bg-slate-900/40 border border-slate-700/50
             text-slate-50 text-base"
/>

{/* ✅ Tel - phone keyboard */}
<input 
  type="tel"
  inputMode="tel"
  className="w-full px-4 py-4 rounded-xl 
             bg-slate-900/40 border border-slate-700/50
             text-slate-50 text-base"
/>

{/* ✅ Email - email keyboard with @ */}
<input 
  type="email"
  inputMode="email"
  autoComplete="email"
  className="w-full px-4 py-4 rounded-xl 
             bg-slate-900/40 border border-slate-700/50
             text-slate-50 text-base"
/>
```

### Toggle Switches (Better Than Checkboxes)

```jsx
{/* Mobile-friendly toggle - large touch target */}
<div className="flex items-center justify-between py-3">
  <div>
    <p className="text-base font-medium text-slate-50">Queen Seen</p>
    <p className="text-sm text-slate-500">Mark if queen was spotted</p>
  </div>
  
  <button
    type="button"
    onClick={() => setQueenSeen(!queenSeen)}
    className={`relative w-16 h-9 rounded-full transition-colors
                ${queenSeen ? 'bg-emerald-600' : 'bg-slate-700'}`}
  >
    <span className={`absolute top-1 w-7 h-7 rounded-full bg-white
                      shadow-lg transition-transform
                      ${queenSeen ? 'left-8' : 'left-1'}`} />
  </button>
</div>

{/* List of toggles */}
<div className="space-y-1">
  {['Queen Seen', 'Eggs Present', 'Larvae Present'].map(option => (
    <div key={option} 
         className="flex items-center justify-between 
                    px-4 py-4 rounded-xl
                    bg-slate-900/40 border border-slate-700/30">
      <span className="text-base text-slate-50">{option}</span>
      
      <button
        type="button"
        onClick={() => toggle(option)}
        className={`relative w-14 h-8 rounded-full transition-colors
                    ${isActive(option) ? 'bg-emerald-600' : 'bg-slate-700'}`}
      >
        <span className={`absolute top-1 w-6 h-6 rounded-full bg-white
                          shadow-lg transition-transform
                          ${isActive(option) ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  ))}
</div>
```

### Segmented Control (Mobile-Optimized)

```jsx
{/* Full-width segmented control */}
<div className="inline-flex w-full gap-1 p-1 
                rounded-xl bg-slate-900/40 border border-slate-700/30">
  {['Weak', 'Moderate', 'Strong'].map(strength => (
    <button
      key={strength}
      type="button"
      onClick={() => setStrength(strength)}
      className={`flex-1 px-4 py-3 rounded-lg 
                  text-sm lg:text-base font-medium
                  transition-all
                  ${selected === strength
                    ? 'bg-emerald-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-slate-200 active:scale-95'}`}
    >
      {strength}
    </button>
  ))}
</div>

{/* Icon-based segmented control */}
<div className="inline-flex gap-2 p-2 rounded-xl bg-slate-900/40">
  {[
    { value: 'calm', icon: SmileIcon, label: 'Calm' },
    { value: 'defensive', icon: MehIcon, label: 'Defensive' },
    { value: 'aggressive', icon: FrownIcon, label: 'Aggressive' },
  ].map(option => (
    <button
      key={option.value}
      type="button"
      onClick={() => setTemper(option.value)}
      className={`flex flex-col items-center gap-2 
                  px-6 py-3 rounded-xl
                  transition-all
                  ${selected === option.value
                    ? 'bg-emerald-600 text-white' 
                    : 'text-slate-400 hover:bg-slate-800/50'}`}
    >
      <option.icon className="w-6 h-6" />
      <span className="text-sm font-medium">{option.label}</span>
    </button>
  ))}
</div>
```

### Mobile Action Buttons

```jsx
{/* Primary action - always at bottom on mobile */}
<div className="fixed lg:relative inset-x-0 bottom-0 lg:bottom-auto
                p-4 lg:p-0 bg-slate-950/80 lg:bg-transparent 
                backdrop-blur-xl lg:backdrop-blur-none
                border-t border-slate-800 lg:border-0
                safe-area-pb
                z-30">
  <button
    type="submit"
    className="w-full px-6 py-4 rounded-xl
               bg-gradient-to-r from-emerald-600 to-emerald-500
               hover:from-emerald-500 hover:to-emerald-400
               text-white text-base font-semibold
               shadow-lg active:scale-98 transition-all"
  >
    Save Inspection
  </button>
</div>

{/* Button group - stack on mobile, inline on desktop */}
<div className="flex flex-col lg:flex-row gap-3">
  <button
    type="button"
    className="flex-1 px-6 py-4 lg:py-3 rounded-xl
               bg-transparent border-2 border-slate-600
               hover:border-slate-500 hover:bg-slate-800/50
               text-slate-300 text-base font-semibold
               transition-all"
  >
    Cancel
  </button>
  
  <button
    type="submit"
    className="flex-1 px-6 py-4 lg:py-3 rounded-xl
               bg-gradient-to-r from-emerald-600 to-emerald-500
               hover:from-emerald-500 hover:to-emerald-400
               text-white text-base font-semibold
               shadow-lg active:scale-98 transition-all"
  >
    Save
  </button>
</div>
```

### Textarea with Character Count

```jsx
<div className="relative">
  <textarea
    rows={4}
    maxLength={500}
    className="w-full px-4 py-4 rounded-xl
               bg-slate-900/40 border border-slate-700/50
               text-slate-50 text-base
               focus:outline-none focus:border-emerald-500/50 
               focus:ring-2 focus:ring-emerald-500/20
               resize-none"
    placeholder="Add notes about this inspection..."
  />
  
  {/* Character count */}
  <div className="absolute bottom-3 right-3">
    <span className="text-xs text-slate-500">
      {notes.length}/500
    </span>
  </div>
</div>
```

### Image Upload (Mobile Camera)

```jsx
<div>
  <label className="block text-sm font-medium text-slate-300 mb-3">
    Hive Photos
  </label>
  
  {/* Upload button */}
  <button
    type="button"
    onClick={() => fileInputRef.current?.click()}
    className="w-full px-6 py-8 rounded-xl
               border-2 border-dashed border-slate-600
               hover:border-emerald-500/50 hover:bg-slate-900/20
               flex flex-col items-center gap-3
               transition-all"
  >
    <CameraIcon className="w-10 h-10 text-slate-500" />
    <div className="text-center">
      <p className="text-base font-medium text-slate-300">
        Take Photo
      </p>
      <p className="text-sm text-slate-500 mt-1">
        or choose from library
      </p>
    </div>
  </button>
  
  {/* Hidden file input with camera on mobile */}
  <input
    ref={fileInputRef}
    type="file"
    accept="image/*"
    capture="environment" // Opens camera on mobile
    multiple
    className="hidden"
    onChange={handleFileChange}
  />
  
  {/* Preview uploaded images */}
  {photos.length > 0 && (
    <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
      {photos.map((photo, i) => (
        <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
          <img 
            src={photo.url} 
            alt={`Photo ${i + 1}`}
            className="w-full h-full object-cover"
          />
          
          {/* Remove button */}
          <button
            type="button"
            onClick={() => removePhoto(i)}
            className="absolute top-2 right-2 
                       w-8 h-8 rounded-full bg-red-600
                       flex items-center justify-center
                       shadow-lg"
          >
            <XIcon className="w-5 h-5 text-white" />
          </button>
        </div>
      ))}
    </div>
  )}
</div>
```

---

## 🌊 Loading States

### Skeleton Loaders with Shimmer

```jsx
<div className="space-y-4">
  {[1, 2, 3].map(i => (
    <div key={i} className="relative overflow-hidden 
                            rounded-2xl bg-slate-900/40 p-6">
      {/* Skeleton content */}
      <div className="space-y-3">
        <div className="h-4 bg-slate-800 rounded w-1/4" />
        <div className="h-8 bg-slate-800 rounded w-1/2" />
        <div className="h-3 bg-slate-800 rounded w-3/4" />
      </div>
      
      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full 
                      bg-gradient-to-r from-transparent 
                      via-slate-700/20 to-transparent
                      animate-shimmer" />
    </div>
  ))}
</div>

{/* Add to tailwind.config.ts */}
animation: {
  'shimmer': 'shimmer 2s infinite',
},
keyframes: {
  shimmer: {
    '100%': { transform: 'translateX(100%)' },
  },
}
```

### Progress Indicators

```jsx
{/* Circular progress - non-standard */}
<div className="relative w-32 h-32">
  <svg className="transform -rotate-90 w-32 h-32">
    {/* Background circle */}
    <circle
      cx="64"
      cy="64"
      r="56"
      stroke="currentColor"
      strokeWidth="8"
      fill="none"
      className="text-slate-800"
    />
    {/* Progress circle */}
    <circle
      cx="64"
      cy="64"
      r="56"
      stroke="currentColor"
      strokeWidth="8"
      fill="none"
      strokeDasharray={`${2 * Math.PI * 56}`}
      strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
      className="text-emerald-500 transition-all duration-500"
      strokeLinecap="round"
    />
  </svg>
  
  {/* Centered text */}
  <div className="absolute inset-0 flex items-center justify-center">
    <span className="text-2xl font-bold text-slate-50">{progress}%</span>
  </div>
</div>
```

---

## 🔍 Search & Filters

### Command Palette Style Search

```jsx
{/* Trigger */}
<button 
  onClick={() => setSearchOpen(true)}
  className="flex items-center gap-3 px-4 py-2 
             rounded-xl bg-slate-900/40 border border-slate-700/50
             hover:border-slate-600 transition-colors
             w-full max-w-md">
  <SearchIcon className="w-5 h-5 text-slate-500" />
  <span className="text-sm text-slate-500">Search hives, inspections...</span>
  <kbd className="ml-auto px-2 py-1 text-xs rounded 
                 bg-slate-800 text-slate-400 font-mono">
    ⌘K
  </kbd>
</button>

{/* Modal */}
{searchOpen && (
  <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]
                  bg-black/60 backdrop-blur-sm"
       onClick={() => setSearchOpen(false)}>
    <div className="w-full max-w-2xl mx-4 
                    bg-slate-900/95 backdrop-blur-xl 
                    border border-slate-700/50 
                    rounded-2xl shadow-2xl overflow-hidden"
         onClick={e => e.stopPropagation()}>
      {/* Search input */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700/50">
        <SearchIcon className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Type to search..."
          className="flex-1 bg-transparent border-none outline-none 
                     text-slate-50 placeholder-slate-500"
          autoFocus
        />
      </div>
      
      {/* Results */}
      <div className="max-h-96 overflow-y-auto p-2">
        {results.map(result => (
          <button key={result.id} 
                  className="w-full px-4 py-3 rounded-xl 
                             hover:bg-slate-800/50 text-left 
                             flex items-center gap-4 group">
            <result.icon className="w-5 h-5 text-slate-500 
                                     group-hover:text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-slate-200">
                {result.title}
              </p>
              <p className="text-xs text-slate-500">
                {result.subtitle}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  </div>
)}
```

---

## 📐 Spacing & Layout System

### Custom Spacing Scale

```typescript
// tailwind.config.ts - Non-standard spacing
extend: {
  spacing: {
    '18': '4.5rem',   // 72px
    '22': '5.5rem',   // 88px
    '26': '6.5rem',   // 104px
    '30': '7.5rem',   // 120px
    '34': '8.5rem',   // 136px
  },
}
```

### Container Sizes

```jsx
{/* Avoid max-w-7xl everywhere */}
{/* Use varying container sizes for visual interest */}

{/* Narrow container for reading content */}
<div className="max-w-2xl mx-auto">
  {/* Article/reading content */}
</div>

{/* Medium container for forms */}
<div className="max-w-4xl mx-auto">
  {/* Forms */}
</div>

{/* Wide container for dashboards */}
<div className="max-w-[1600px] mx-auto">
  {/* Dashboard content */}
</div>

{/* Full bleed for certain sections */}
<div className="w-full">
  {/* Charts, tables */}
</div>
```

---

## 🎨 Icon System

### Custom Icon Styling

```jsx
{/* Never use plain icons - always add container treatment */}

{/* Icon with subtle background */}
<div className="w-12 h-12 rounded-xl bg-emerald-500/10 
                flex items-center justify-center
                border border-emerald-500/20">
  <HiveIcon className="w-6 h-6 text-emerald-500" />
</div>

{/* Icon with gradient background */}
<div className="w-14 h-14 rounded-2xl 
                bg-gradient-to-br from-emerald-500/20 to-blue-500/20
                flex items-center justify-center
                backdrop-blur-xl border border-white/10">
  <ChartIcon className="w-7 h-7 text-slate-50" />
</div>

{/* Icon in FAB style */}
<button className="w-16 h-16 rounded-full 
                   bg-gradient-to-br from-emerald-600 to-emerald-500
                   flex items-center justify-center
                   shadow-2xl shadow-emerald-900/50
                   hover:scale-110 transition-transform">
  <PlusIcon className="w-8 h-8 text-white" />
</button>
```

---

## 🎭 Theme Toggle (Dark/Light)

While dark-first is recommended, support light mode with equally sophisticated design:

```typescript
// Light mode color overrides
export const lightTheme = {
  background: '#fafafa',
  surface: '#ffffff',
  text: {
    primary: '#0f172a',    // slate-900
    secondary: '#64748b',  // slate-500
  },
  border: '#e2e8f0',      // slate-200
  accent: '#10b981',       // keep emerald
}

// Implementation
<div className="bg-app-dark dark:bg-app-dark light:bg-app-light
                text-slate-50 dark:text-slate-50 light:text-slate-900">
  {/* Content adapts to theme */}
</div>
```

---

## ✨ Unique Visual Elements

### Organic Shapes as Accents

```jsx
{/* SVG blob backgrounds */}
<div className="relative overflow-hidden">
  <svg className="absolute top-0 right-0 w-1/2 opacity-5 
                  text-emerald-500 -translate-y-1/2 translate-x-1/4"
       viewBox="0 0 200 200">
    <path fill="currentColor" 
          d="M43.3,-75.9C54.8,-67.4,61.9,-52.1,68.5,-37.1C75.1,-22.2,81.3,-7.6,81.9,7.5C82.5,22.6,77.6,38.2,68.6,49.9C59.7,61.6,46.7,69.4,33.1,72.8C19.5,76.2,5.3,75.2,-9.3,72.8C-23.9,70.3,-39,66.4,-51.9,58.1C-64.8,49.8,-75.5,37,-80.2,22.4C-84.9,7.8,-83.6,-8.7,-77.9,-22.7C-72.2,-36.7,-62,-48.2,-49.5,-56.2C-37,-64.2,-22.2,-68.7,-6.8,-74.1C8.6,-79.5,31.8,-84.4,43.3,-75.9Z" 
          transform="translate(100 100)" />
  </svg>
  
  {/* Content */}
</div>
```

### Glassmorphic Dividers

```jsx
{/* Instead of <hr /> or borders */}
<div className="relative h-px my-12">
  <div className="absolute inset-0 bg-gradient-to-r 
                  from-transparent via-slate-700/50 to-transparent" />
  <div className="absolute inset-0 blur-sm bg-gradient-to-r 
                  from-transparent via-emerald-500/20 to-transparent" />
</div>
```

---

## 🎬 Responsive Animation & Interaction

### Touch vs Mouse Interactions

```jsx
{/* Mobile: Active (touch) states */}
<button className="px-6 py-4 rounded-xl bg-emerald-600
                   active:scale-95 active:bg-emerald-700
                   lg:hover:scale-105 lg:hover:bg-emerald-500
                   transition-transform">
  Action
</button>

{/* Hover effects only on desktop */}
<div className="rounded-2xl bg-slate-900/40
                lg:hover:bg-slate-900/60 lg:hover:-translate-y-1
                lg:hover:shadow-2xl
                transition-all duration-300">
  {/* Content */}
</div>

{/* Touch-friendly without hover dependency */}
<button 
  onClick={handleClick}
  className="w-full px-6 py-4 rounded-xl
             bg-slate-800/50 border border-slate-700/50
             active:bg-slate-700/50 active:scale-98
             transition-all"
>
  {/* Never rely on hover for critical information */}
</button>
```

### Performance-Conscious Animations

```jsx
{/* ✅ GOOD - GPU-accelerated properties only */}
<div className="transform transition-transform duration-300
                hover:scale-105
                will-change-transform">
  {/* Uses transform - GPU accelerated */}
</div>

<div className="transition-opacity duration-300
                hover:opacity-80">
  {/* Uses opacity - GPU accelerated */}
</div>

{/* ❌ BAD - Triggers layout reflow */}
<div className="transition-all duration-300
                hover:w-full hover:h-full">
  {/* Width/height changes trigger layout */}
</div>

{/* ❌ BAD - Heavy paint operations */}
<div className="transition-all duration-300
                hover:blur-lg">
  {/* Blur is expensive on mobile */}
</div>
```

### Reduced Motion Support

```jsx
{/* Respect user's motion preferences */}
<div className="transform transition-transform duration-300
                hover:scale-105
                motion-reduce:transition-none
                motion-reduce:hover:scale-100">
  {/* Animation disabled if user prefers reduced motion */}
</div>

{/* Add to tailwind.config.ts */}
// Animations automatically respect prefers-reduced-motion

{/* Custom implementation */}
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

<div className={`
  transition-transform duration-300
  ${!prefersReducedMotion && 'hover:scale-105'}
`}>
  {/* Conditionally apply animations */}
</div>
```

### Mobile Page Transitions

```jsx
{/* Slide transitions for mobile navigation */}
<motion.div
  initial={{ x: '100%' }}
  animate={{ x: 0 }}
  exit={{ x: '-100%' }}
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
  className="fixed inset-0 bg-app-dark z-50 lg:relative lg:z-auto"
>
  {/* Page content */}
</motion.div>

{/* Or with pure CSS */}
<div className="fixed inset-0 bg-app-dark
                animate-slideInRight
                lg:relative lg:animate-none">
  {/* Page content */}
</div>

{/* Add to tailwind.config.ts */}
animation: {
  'slideInRight': 'slideInRight 0.3s ease-out',
  'slideInLeft': 'slideInLeft 0.3s ease-out',
},
keyframes: {
  slideInRight: {
    '0%': { transform: 'translateX(100%)' },
    '100%': { transform: 'translateX(0)' },
  },
  slideInLeft: {
    '0%': { transform: 'translateX(-100%)' },
    '100%': { transform: 'translateX(0)' },
  },
}
```

### Stagger Animations (Mobile-Safe)

```jsx
{/* List items appear with stagger */}
<div className="space-y-3">
  {items.map((item, i) => (
    <div
      key={item.id}
      className="opacity-0 animate-fadeInUp"
      style={{
        animationDelay: `${i * 50}ms`, // Shorter delay on mobile
        animationFillMode: 'forwards',
      }}
    >
      {item.content}
    </div>
  ))}
</div>

{/* Responsive stagger timing */}
<div className="space-y-3">
  {items.map((item, i) => (
    <div
      key={item.id}
      className="opacity-0 animate-fadeInUp"
      style={{
        // Faster on mobile, slower on desktop
        animationDelay: `${i * (window.innerWidth < 768 ? 30 : 100)}ms`,
        animationFillMode: 'forwards',
      }}
    >
      {item.content}
    </div>
  ))}
</div>
```

### Skeleton Loading (Responsive)

```jsx
{/* Skeleton with responsive sizing */}
<div className="space-y-4 p-4 lg:p-8">
  {[1, 2, 3].map(i => (
    <div 
      key={i} 
      className="rounded-2xl lg:rounded-3xl 
                 bg-slate-900/40 p-4 lg:p-6
                 relative overflow-hidden"
    >
      {/* Skeleton content - adapts to screen size */}
      <div className="space-y-3">
        <div className="h-3 lg:h-4 bg-slate-800 rounded w-1/4 
                        animate-pulse" />
        <div className="h-6 lg:h-8 bg-slate-800 rounded w-1/2 
                        animate-pulse" />
        <div className="h-3 bg-slate-800 rounded w-3/4 
                        animate-pulse" />
      </div>
      
      {/* Shimmer effect - only on desktop for performance */}
      <div className="hidden lg:block absolute inset-0 
                      -translate-x-full
                      bg-gradient-to-r from-transparent 
                      via-slate-700/10 to-transparent
                      animate-shimmer" />
    </div>
  ))}
</div>
```

### Pull to Refresh Animation

```jsx
{/* Custom pull-to-refresh with animation */}
<div 
  className="relative overflow-hidden"
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
>
  {/* Refresh indicator */}
  <div 
    className="flex items-center justify-center 
               transition-all duration-200"
    style={{ 
      height: `${Math.max(0, pullDistance)}px`,
      opacity: pullDistance / 100,
    }}
  >
    {isRefreshing ? (
      <div className="w-8 h-8 rounded-full border-4 
                      border-slate-700 border-t-emerald-500
                      animate-spin" />
    ) : (
      <div 
        className="text-slate-400 transition-transform"
        style={{
          transform: `rotate(${Math.min(pullDistance * 2, 180)}deg)`,
        }}
      >
        ↓
      </div>
    )}
  </div>
  
  {/* Content */}
  <div 
    className="transition-transform"
    style={{ 
      transform: `translateY(${pullDistance}px)`,
    }}
  >
    {children}
  </div>
</div>
```

### Bottom Sheet Animation

```jsx
{/* Bottom sheet with spring animation */}
{isOpen && (
  <>
    {/* Backdrop with fade */}
    <div 
      className="fixed inset-0 bg-black/60 z-40
                 animate-fadeIn"
      onClick={onClose}
    />
    
    {/* Sheet with slide up */}
    <div 
      className="fixed inset-x-0 bottom-0 z-50
                 bg-slate-900/95 backdrop-blur-xl
                 rounded-t-3xl
                 animate-slideUp
                 max-h-[90vh] overflow-y-auto
                 safe-area-pb"
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-12 h-1.5 rounded-full bg-slate-600" />
      </div>
      
      {/* Content */}
      <div className="p-6">
        {children}
      </div>
    </div>
  </>
)}

{/* Add animations to tailwind.config.ts */}
animation: {
  'fadeIn': 'fadeIn 0.2s ease-out',
  'slideUp': 'slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
},
keyframes: {
  fadeIn: {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  slideUp: {
    '0%': { transform: 'translateY(100%)' },
    '100%': { transform: 'translateY(0)' },
  },
}
```

### Micro-interactions

```jsx
{/* Button press feedback */}
<button className="relative overflow-hidden
                   active:scale-95 transition-transform">
  <span className="relative z-10">Click me</span>
  
  {/* Ripple effect */}
  <span className="absolute inset-0 bg-white/10
                   scale-0 group-active:scale-100
                   transition-transform duration-700
                   rounded-full origin-center" />
</button>

{/* Toggle with smooth transition */}
<button
  onClick={() => setEnabled(!enabled)}
  className="relative w-14 h-8 rounded-full 
             transition-colors duration-300"
  style={{
    backgroundColor: enabled ? '#10b981' : '#475569',
  }}
>
  <span 
    className="absolute top-1 w-6 h-6 rounded-full bg-white
               shadow-lg transition-all duration-300"
    style={{
      left: enabled ? '28px' : '4px',
    }}
  />
</button>

{/* Success checkmark animation */}
<div className={`w-16 h-16 rounded-full 
                 ${success ? 'bg-emerald-600' : 'bg-slate-700'}
                 flex items-center justify-center
                 transition-colors duration-300`}>
  {success && (
    <svg 
      className="w-10 h-10 text-white animate-checkmark"
      viewBox="0 0 24 24"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
        strokeDasharray="24"
        strokeDashoffset="24"
        style={{
          animation: 'drawCheck 0.5s ease-out forwards',
        }}
      />
    </svg>
  )}
</div>

{/* Add checkmark animation to globals.css */}
@keyframes drawCheck {
  to {
    stroke-dashoffset: 0;
  }
}
```

---

## 🚀 Mobile Performance Optimization

### Critical Performance Rules

1. **Keep bundle size small** - Mobile networks are slower
2. **Lazy load everything non-critical** - Faster initial load
3. **Optimize images aggressively** - Biggest performance win
4. **Minimize JavaScript** - Mobile CPUs are weaker
5. **Use native inputs** - Better UX and performance

### Image Optimization

```jsx
import Image from 'next/image';

{/* Always use next/image for automatic optimization */}
<Image
  src="/hive-photo.jpg"
  alt="Hive inspection"
  width={400}
  height={300}
  className="rounded-2xl"
  loading="lazy"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..." // Low quality placeholder
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>

{/* For user-uploaded images */}
<Image
  src={userPhoto}
  alt="User photo"
  width={800}
  height={600}
  quality={75} // Lower quality for mobile data savings
  priority={false} // Lazy load by default
/>
```

### Code Splitting & Lazy Loading

```jsx
import dynamic from 'next/dynamic';

{/* Lazy load charts - they're heavy */}
const HoneyChart = dynamic(
  () => import('@/components/charts/honey-chart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false, // Don't render on server if not needed
  }
);

{/* Lazy load modals - only when opened */}
const InspectionModal = dynamic(
  () => import('@/components/modals/inspection-modal')
);

{/* Use in component */}
<div>
  <button onClick={() => setModalOpen(true)}>
    Add Inspection
  </button>
  
  {modalOpen && <InspectionModal onClose={() => setModalOpen(false)} />}
</div>
```

### Reduce Motion for Performance

```jsx
{/* Respect user's motion preferences */}
<div className="transform transition-transform duration-300
                motion-reduce:transition-none
                hover:scale-105 motion-reduce:hover:scale-100">
  {/* Content */}
</div>

{/* Add to tailwind.config.ts for custom utilities */}
```

### Optimize Tailwind CSS

```typescript
// tailwind.config.ts
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Purge unused styles
  safelist: [
    // Only safelist truly dynamic classes
    'bg-emerald-500',
    'bg-red-500',
    'bg-amber-500',
  ],
}
```

### Service Worker for Offline Support

```typescript
// app/manifest.ts (for PWA)
import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Beekeeper App',
    short_name: 'Beekeeper',
    description: 'Professional hive management',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0f1a',
    theme_color: '#10b981',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
```

### Mobile Data Fetching Strategy

```typescript
// Fetch less data on mobile
const isMobile = window.innerWidth < 768;

const { data } = await supabase
  .from('inspections')
  .select('*')
  .limit(isMobile ? 10 : 50) // Fewer items on mobile
  .order('inspection_date', { ascending: false });
```

### Touch Feedback Performance

```jsx
{/* Use CSS transforms for better performance */}
<button className="active:scale-95 
                   transform transition-transform duration-100
                   will-change-transform">
  {/* Content */}
</button>

{/* Avoid layout-triggering animations */}
{/* ❌ BAD - triggers layout */}
<div className="hover:w-full transition-all">Content</div>

{/* ✅ GOOD - uses transform */}
<div className="hover:scale-105 transition-transform">Content</div>
```

---

## 🎯 Mobile-Desktop Design Checklist

Before finalizing any component or page, ensure:

### Keyboard-Free Input Requirements (CRITICAL)
- [ ] **No number typing** - all numbers use +/- buttons
- [ ] **Predefined buttons for common values** (1-10, temperature ranges, etc.)
- [ ] **Native pickers** for dates, times (not text input)
- [ ] **Toggle switches** instead of checkboxes
- [ ] **Segmented controls** for multiple choice options
- [ ] **Voice input** available for notes/text
- [ ] **Quick select buttons** for common inputs (Today, Yesterday, etc.)
- [ ] **Multiple increment sizes** (±1, ±5, ±10) for faster input
- [ ] **Visual feedback** on all button presses
- [ ] **Keyboard input** only as last resort (hidden in details/accordion)

### Mobile-Specific Checks
- [ ] All touch targets minimum 48x48px (3rem)
- [ ] One-handed thumb reach for primary actions
- [ ] Bottom navigation for mobile (not top hamburger)
- [ ] Swipe gestures work naturally
- [ ] Forms minimize keyboard usage (keyboard-free preferred)
- [ ] No hover-only interactions (touch has no hover)
- [ ] Safe area insets respected (notches, bottom bars)
- [ ] Loading states appropriate for mobile networks
- [ ] Offline functionality for field work
- [ ] Images optimized for mobile data
- [ ] Text readable without zoom (16px minimum)
- [ ] Adequate spacing between interactive elements
- [ ] Works with gloves (large targets, no precision needed)

### Desktop-Specific Checks
- [ ] Keyboard navigation fully supported (for accessibility)
- [ ] Hover states provide feedback
- [ ] Multiple columns utilize screen space
- [ ] Desktop-specific shortcuts (⌘K, etc.)
- [ ] Mouse interactions feel native
- [ ] Right-click context menus where appropriate
- [ ] Multi-select with Shift/Ctrl+Click
- [ ] Floating navigation doesn't block content

### Cross-Platform Checks
- [ ] Fluid layout transitions at all breakpoints
- [ ] Typography scales appropriately
- [ ] Spacing adjusts for screen size
- [ ] No horizontal scrolling on any device
- [ ] Charts readable on all screen sizes
- [ ] Modals/sheets work on mobile and desktop
- [ ] Loading states consistent across platforms
- [ ] Error messages visible and actionable

### Performance Checks
- [ ] Initial load under 3 seconds on 3G
- [ ] Time to interactive under 5 seconds
- [ ] Images lazy loaded
- [ ] Code split appropriately
- [ ] Animations use transform/opacity only
- [ ] No layout shift on load (CLS < 0.1)
- [ ] PWA installable on mobile
- [ ] Offline functionality works

---

## 📱 Testing Strategy

### Required Device Testing

**Mobile Phones** (Primary):
- iPhone 14/15 (standard size)
- iPhone SE (small screen)
- iPhone 15 Pro Max (large screen)
- Samsung Galaxy S23 (Android)
- Pixel 7 (Android)

**Tablets**:
- iPad Air (portrait and landscape)
- iPad Mini
- Android tablet (10")

**Desktop**:
- 13" laptop (1280px)
- 15" laptop (1920px)
- 27" desktop (2560px)

### Testing Scenarios

1. **Field Work Testing** (Critical):
   - Test outdoors in sunlight
   - Test with dirty/wet hands (large buttons help)
   - Test with gloves (beekeeping reality)
   - Test with poor network connection

2. **One-Handed Use**:
   - All primary actions reachable with thumb
   - No critical buttons in top-left corner
   - Bottom navigation works well

3. **Rotation Testing**:
   - Portrait to landscape transitions
   - Content reflows appropriately
   - No broken layouts

4. **Speed Testing**:
   - Test on slow 3G network
   - Test on device with low battery (slower CPU)
   - Test with many hives/data (performance at scale)

---

## 🎨 Design Checklist

Before finalizing any component or page, ensure:

### Visual Design
- [ ] No pure white (#FFFFFF) or pure black (#000000) used
- [ ] Minimum 3:1 contrast ratio for decorative elements
- [ ] Minimum 4.5:1 contrast ratio for text
- [ ] Border radius consistent (using 0.75rem, 1rem, 1.5rem scale)
- [ ] No standard blue primary colors
- [ ] Generous use of backdrop-blur for depth
- [ ] Shadows have color tint (emerald/slate), not just black
- [ ] Custom focus states (not default browser outlines)

### Layout
- [ ] Not using standard left sidebar navigation
- [ ] Asymmetric grid where appropriate
- [ ] Varied container widths for visual interest
- [ ] Generous spacing (padding/margins in 1.5rem+ scale)
- [ ] Mobile-first responsive breakpoints
- [ ] No hamburger menus (use bottom sheet or command palette)

### Typography
- [ ] No default system fonts
- [ ] Consistent font size scale throughout
- [ ] Line heights appropriate for readability (1.5-1.7 for body)
- [ ] Tabular numbers for data
- [ ] Uppercase labels are tracked out (tracking-wider)

### Interactive Elements
- [ ] Micro-animations on hover/active states
- [ ] Loading states for async operations
- [ ] Disabled states clearly differentiated
- [ ] Touch targets minimum 44x44px on mobile
- [ ] Keyboard navigation fully supported

### Data Visualization
- [ ] Custom chart colors (no defaults)
- [ ] Transparent/glass backgrounds on charts
- [ ] Grid lines subtle and low-contrast
- [ ] Tooltips match app design system
- [ ] Labels readable and well-spaced

---

## 🚀 Performance Considerations

### Optimization Techniques

```typescript
// 1. Use next/image for all images
import Image from 'next/image';

<Image
  src="/hive-photo.jpg"
  alt="Hive"
  width={400}
  height={300}
  className="rounded-2xl"
  priority={false}  // Lazy load by default
/>

// 2. Lazy load charts and heavy components
import dynamic from 'next/dynamic';

const HoneyChart = dynamic(() => import('@/components/charts/honey-chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,  // If chart has client-side dependencies
});

// 3. Optimize Tailwind build
// tailwind.config.ts
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // This ensures unused styles are purged
}

// 4. Use CSS containment for performance
<div className="contain-paint contain-layout">
  {/* Complex nested content */}
</div>
```

---

## 🎨 Final Design Philosophy Summary

**Think like an experience designer, not a developer:**

1. **Question Every Standard Pattern** - Just because it's common doesn't mean it's right for this app
2. **Data is the Design** - Numbers, charts, and insights should be visually stunning
3. **Keyboard-Free First** - Beekeepers wear gloves and work with dirty hands. Every input must work without typing.
4. **Mobile is Primary** - Design for phones first, enhance for desktop
5. **Reduce Cognitive Load** - Beautiful ≠ Cluttered. Use white space aggressively
6. **Motion with Purpose** - Animations should guide attention, not distract
7. **Professional, Not Agricultural** - Respect the craft without patronizing with rustic aesthetics
8. **Touch-Optimized Everything** - 48px minimum targets, one-handed operation, thumb-friendly

**Remember:** This is a tool for skilled professionals working in challenging field conditions. Design it like you would design a pilot's cockpit or surgeon's interface - functional, beautiful, and unique, with **zero reliance on keyboards for data entry**.

### Core Input Principles

**Numbers:** Always use +/- buttons with multiple increment sizes
- Small adjustments: ±0.1, ±1
- Medium adjustments: ±5
- Large adjustments: ±10

**Selection:** Always provide predefined options
- 1-10 scales with visual buttons
- Quick date buttons (Today, Yesterday)
- Temperature presets (15°, 20°, 25°, 30°)
- Common note templates

**Text:** Minimize and offer alternatives
- Voice input first
- Predefined templates second
- Keyboard input last resort (hidden)

**Success Metric:** A beekeeper should be able to complete a full hive inspection while wearing thick beekeeping gloves.

---

## 📚 Inspiration Sources

Look to these categories for design inspiration (NOT beekeeping apps):

- **Aviation/Aerospace UIs** - Precision + elegance
- **Medical/Health Tech** - Data clarity + trust
- **Financial Trading Platforms** - Information density done right
- **Music Production Software** - Dark themes + workflow efficiency
- **3D Modeling Tools** - Professional tools with personality

Avoid looking at:
- Traditional farm management software
- Agriculture mobile apps
- Food production tracking tools

---

## 🛠️ Tools & Resources

### Design Tools
- **Figma** - For prototyping and design system documentation
- **Tailwind Play** - Rapid prototyping of components
- **Radix Colors** - Color scale generator
- **Hero Icons / Lucide** - Icon libraries

### Code Quality
- **ESLint + Prettier** - Code formatting
- **TypeScript strict mode** - Type safety
- **Lighthouse** - Performance auditing

### Testing
- **Accessibility** - Test with screen readers
- **Device Testing** - Real device testing (especially tablets for field use)
- **Sunlight Readability** - Test UI outdoors on mobile devices

---

---

## 📋 Quick Reference: Mobile-First to Desktop

### 🚫 Keyboard-Free Input Patterns (ALL DEVICES)

**Core Principle:** Every form input must work without keyboard. Beekeepers wear gloves.

**Number Inputs:**
```jsx
// ✅ ALWAYS: +/- buttons
<div className="flex gap-2">
  <button onClick={() => setValue(v - 1)}>-</button>
  <span>{value}</span>
  <button onClick={() => setValue(v + 1)}>+</button>
</div>

// ❌ NEVER: Direct number input
<input type="number" /> // NO!
```

**Selection Inputs:**
```jsx
// ✅ ALWAYS: Button grid for 1-10
<div className="grid grid-cols-5 gap-2">
  {[1,2,3,4,5,6,7,8,9,10].map(n => (
    <button onClick={() => select(n)}>{n}</button>
  ))}
</div>

// ❌ NEVER: Dropdown select
<select> // NO! Hard to use with gloves
```

**Date Inputs:**
```jsx
// ✅ BEST: Quick buttons + native picker
<button onClick={() => setDate(today)}>Today</button>
<button onClick={() => setDate(yesterday)}>Yesterday</button>
<input type="date" /> {/* Fallback - native picker OK */}

// ❌ NEVER: Text date input
<input type="text" placeholder="MM/DD/YYYY" /> // NO!
```

**Text Inputs:**
```jsx
// ✅ PREFERRED: Voice + templates
<button onClick={recordVoice}>🎤 Record</button>
{templates.map(t => <button>{t}</button>)}

// ⚠️ LAST RESORT: Keyboard (hidden)
<details>
  <summary>Type instead</summary>
  <input type="text" />
</details>
```

---

### Mobile Design Priorities (320px - 767px)

**Layout:**
- Single column layouts
- Full-width cards with 16px (1rem) margins
- Stack all content vertically
- Use `p-4` for container padding

**Navigation:**
- Bottom sheet navigation (not hamburger)
- Fixed bottom bar with large icons (48x48px minimum)
- FAB in bottom-right for primary action
- Safe area padding for notches

**Typography:**
- Base: 16px (1rem) - never smaller
- Headings: 24px (1.5rem) to 48px (3rem)
- Line height: 1.5-1.6 for readability
- Generous letter spacing on labels

**Touch Targets:**
- Minimum: 48x48px (3rem)
- Optimal: 56x56px (3.5rem)
- Spacing between: 8px minimum

**Forms:**
- Native input types (date, time, number)
- Large toggle switches (not checkboxes)
- Segmented controls for options
- Bottom-fixed submit buttons
- Minimize typing, maximize selection

**Interactions:**
- Active states (not hover)
- Swipe gestures (delete, refresh)
- Pull-to-refresh
- Bottom sheet modals
- Touch feedback (scale-95)

**Performance:**
- Lazy load images
- Show less data (6 items vs 12)
- Simpler charts
- Reduce animations
- Offline support critical

---

### Tablet Design Enhancements (768px - 1023px)

**Layout:**
- 2-column grids where appropriate
- Introduce modest sidebars
- Cards in rows of 2
- Use `p-6` for container padding

**Navigation:**
- Can keep bottom bar OR
- Introduce side navigation
- Larger tap targets still (44x44px)

**Typography:**
- Slightly larger headings
- More content per screen
- Still prioritize readability

**Interactions:**
- Support both touch AND hover
- Introduce keyboard shortcuts
- Desktop-style dropdowns
- Tooltips on hover

---

### Desktop Design Enhancements (1024px+)

**Layout:**
- Asymmetric multi-column grids (12-column)
- Floating navigation islands
- Generous white space
- Use `p-8` or `p-12` for container padding
- Max-width containers (1600px)

**Navigation:**
- Floating bottom center nav OR
- Elegant sidebar
- Command palette (⌘K)
- Right-click context menus

**Typography:**
- Dramatic heading sizes (64px+)
- Comfortable reading widths
- More detailed labels
- Desktop-optimized hierarchy

**Mouse Interactions:**
- Hover states for everything
- Scale-105 on hover
- Tooltips and popovers
- Cursor changes
- Multi-select with Shift/Ctrl

**Data Visualization:**
- Full 12-month charts
- Complex multi-series graphs
- Detailed tooltips
- Interactive legends
- Hover highlights

**Performance:**
- Show more data (20-50 items)
- Richer animations
- More visual effects
- Background videos/gradients OK

---

### Responsive Utilities Cheat Sheet

```jsx
{/* Spacing */}
className="p-4 lg:p-8"              // Padding: mobile 16px, desktop 32px
className="gap-4 lg:gap-6"          // Gap: mobile 16px, desktop 24px
className="space-y-4 lg:space-y-8"  // Stack spacing

{/* Sizing */}
className="w-full lg:w-auto"        // Full width mobile, auto desktop
className="h-64 lg:h-96"            // Height: mobile 256px, desktop 384px
className="text-base lg:text-lg"    // Text: mobile 16px, desktop 18px

{/* Display */}
className="block lg:hidden"         // Show only on mobile
className="hidden lg:block"         // Show only on desktop
className="lg:flex"                 // Flex only on desktop

{/* Grid */}
className="grid-cols-1 lg:grid-cols-3"      // 1 col mobile, 3 desktop
className="col-span-12 lg:col-span-4"       // Full width to 4 cols

{/* Positioning */}
className="fixed lg:relative"       // Fixed mobile, relative desktop
className="inset-x-0 bottom-0 lg:bottom-auto" // Bottom mobile, normal desktop

{/* Effects */}
className="active:scale-95 lg:hover:scale-105" // Touch vs mouse
className="rounded-2xl lg:rounded-3xl"         // Smaller radius mobile
```

---

### Device-Specific Patterns

**iPhone (Small - 375px):**
```jsx
<div className="px-4 py-6">
  <h1 className="text-3xl">Title</h1>
  <div className="grid grid-cols-1 gap-4">
    {/* Single column, compact */}
  </div>
</div>
```

**iPhone (Large - 428px):**
```jsx
<div className="px-4 py-6">
  <h1 className="text-3xl sm:text-4xl">Title</h1>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {/* Can do 2 columns on large phones */}
  </div>
</div>
```

**iPad (768px):**
```jsx
<div className="px-6 py-8">
  <h1 className="text-4xl md:text-5xl">Title</h1>
  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
    {/* 2-3 columns on tablets */}
  </div>
</div>
```

**Desktop (1280px+):**
```jsx
<div className="max-w-[1600px] mx-auto px-8 py-12">
  <h1 className="text-5xl lg:text-6xl">Title</h1>
  <div className="grid grid-cols-12 gap-8">
    {/* Asymmetric 12-column grid */}
    <div className="col-span-8">Main</div>
    <div className="col-span-4">Sidebar</div>
  </div>
</div>
```

---

## 🎯 Final Checklist Summary

**Every Component Must:**
- [ ] Work perfectly on 375px mobile (iPhone SE)
- [ ] Have touch targets ≥48px on mobile
- [ ] Use responsive text sizes (base to lg to xl)
- [ ] Stack on mobile, grid on desktop
- [ ] Have active states (mobile) AND hover (desktop)
- [ ] Load fast on 3G networks
- [ ] Look stunning on 27" desktop
- [ ] Respect user motion preferences
- [ ] Support offline where critical
- [ ] Pass accessibility standards
- [ ] **Be completable with gloves/no keyboard**

**Never:**
- [ ] Require typing numbers
- [ ] Use small text inputs for numbers
- [ ] Assume mouse/hover availability
- [ ] Use small touch targets (<44px)
- [ ] Rely on top navigation on mobile
- [ ] Make horizontal scrolling necessary
- [ ] Use desktop-first breakpoints
- [ ] Ignore safe areas (notches)
- [ ] Forget active/pressed states
- [ ] Use heavy animations on mobile
- [ ] Make keyboard input mandatory

---

### Keyboard-Free Input Code Examples

```jsx
// Number with +/- (minimum 48x48px buttons)
<div className="flex gap-3">
  <button className="w-14 h-14 rounded-xl bg-slate-800/50 active:scale-95">
    <MinusIcon className="w-6 h-6" />
  </button>
  <div className="h-14 flex-1 rounded-xl bg-slate-900/60 flex items-center justify-center">
    <span className="text-2xl font-bold tabular-nums">{value}</span>
  </div>
  <button className="w-14 h-14 rounded-xl bg-slate-800/50 active:scale-95">
    <PlusIcon className="w-6 h-6" />
  </button>
</div>

// Quick value selection (1-10)
<div className="grid grid-cols-5 gap-2">
  {[1,2,3,4,5,6,7,8,9,10].map(n => (
    <button
      key={n}
      onClick={() => setValue(n)}
      className={`h-14 rounded-xl font-bold text-lg active:scale-95
                  ${value === n ? 'bg-emerald-600 text-white' : 'bg-slate-800/50'}`}
    >
      {n}
    </button>
  ))}
</div>

// Toggle (NOT checkbox)
<button
  onClick={() => setEnabled(!enabled)}
  className={`relative w-14 h-8 rounded-full transition-colors
              ${enabled ? 'bg-emerald-600' : 'bg-slate-700'}`}
>
  <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg
                    transition-transform ${enabled ? 'left-7' : 'left-1'}`} />
</button>

// Date quick select
<div className="grid grid-cols-2 gap-2">
  <button 
    onClick={() => setDate(new Date())}
    className={`h-14 rounded-xl font-medium active:scale-95
                ${isToday ? 'bg-emerald-600 text-white' : 'bg-slate-800/50'}`}
  >
    Today
  </button>
  <button 
    onClick={() => setDate(subDays(new Date(), 1))}
    className={`h-14 rounded-xl font-medium active:scale-95
                ${isYesterday ? 'bg-emerald-600 text-white' : 'bg-slate-800/50'}`}
  >
    Yesterday
  </button>
</div>

// Voice input for notes
<button
  onClick={startVoiceRecording}
  className="w-full h-16 rounded-xl bg-gradient-to-br from-emerald-600/20 
             border-2 border-emerald-600/30 flex items-center justify-center gap-3
             active:scale-98"
>
  <MicIcon className={`w-6 h-6 ${recording ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`} />
  <span className="font-medium">{recording ? 'Recording...' : 'Tap to Record Note'}</span>
</button>

// Temperature with presets + fine control
<div className="space-y-2">
  {/* Presets */}
  <div className="grid grid-cols-4 gap-2">
    {[15, 20, 25, 30].map(t => (
      <button key={t} onClick={() => setTemp(t)}
              className={`h-12 rounded-xl ${temp === t ? 'bg-emerald-600' : 'bg-slate-800/50'}`}>
        {t}°
      </button>
    ))}
  </div>
  {/* Fine control */}
  <div className="flex gap-2">
    <button onClick={() => setTemp(temp - 1)} className="flex-1 h-12 rounded-xl bg-slate-800/50">
      -1°
    </button>
    <div className="flex-1 h-12 rounded-xl bg-slate-900/60 flex items-center justify-center">
      <span className="text-xl font-bold">{temp}°C</span>
    </div>
    <button onClick={() => setTemp(temp + 1)} className="flex-1 h-12 rounded-xl bg-slate-800/50">
      +1°
    </button>
  </div>
</div>
```

---

This skill document ensures your beekeeper app is **completely usable with gloves** in field conditions, provides an exceptional experience on mobile phones (primary) while scaling beautifully to desktop displays, all while breaking away from standard design patterns.