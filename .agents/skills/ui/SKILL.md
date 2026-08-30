# Beekeeper App Design Skill (Light-First Field Edition)

## Philosophy: Breaking Standard Web Application Design

This skill guides the visual and interaction design for a beekeeper application that deliberately breaks away from both typical agricultural software aesthetics AND standard web application patterns. The goal is to create a unique, memorable, and professional interface that respects the craft of beekeeping while embracing modern design innovation.

**CRITICAL DESIGN PRINCIPLE**: This app is optimized for **outdoor field work in bright sunlight**. The default theme is light with high contrast, specifically designed for maximum readability when beekeepers are actively working with hives. Dark mode is available for evening planning and indoor data analysis.

## Technology Stack

- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS 3+ (custom configuration)
- **UI Components**: Custom-built with Radix UI primitives
- **Typography**: Variable fonts (Inter, Geist, or custom)
- **Icons**: Lucide React (custom styled)
- **Theme**: System preference detection with manual override

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
9. **Outdoor readability** - Light theme with high contrast for sunlight conditions

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

2. **Adaptive Theme with Field-First Design**
   - **Light mode (default)**: Optimized for outdoor work in bright sunlight
   - **Dark mode**: For evening planning, indoor reviews, night checks
   - **Auto-switching**: Based on time of day (6am-8pm light / 8pm-6am dark)
   - High contrast in both modes for maximum readability

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

## 🎨 Adaptive Color System

### Dual Theme Philosophy

**Light Mode (Field Work)**: Used during active hive inspections in bright daylight
- Warm, soft backgrounds that reduce glare
- Deep, high-contrast text for outdoor readability
- Strategic use of color for status and actions

**Dark Mode (Planning & Analysis)**: Used for evening reviews and indoor work
- Rich, deep backgrounds that reduce eye strain
- Elegant data visualization
- Sophisticated atmosphere for analytical work

### Color Configuration

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // Primary: Forest Green (natural but sophisticated, NOT honey yellow)
        forest: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        
        // Secondary: Sage (earthy, professional)
        sage: {
          50: '#f6f7f6',
          100: '#e3e7e3',
          200: '#c7cfc7',
          300: '#a4afa4',
          400: '#7d8b7d',
          500: '#5f6f5f',
          600: '#4a584a',
          700: '#3d473d',
          800: '#333b33',
          900: '#2b322b',
        },
        
        // Accent: Deep Amber (warm, visible outdoors)
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        
        // Data Visualization Palette (works in both themes)
        viz: {
          health: '#22c55e',    // Forest green
          warning: '#f59e0b',   // Amber
          alert: '#ef4444',     // Red
          info: '#3b82f6',      // Blue
          neutral: '#6b7280',   // Gray
        },
      },
      
      // Light theme colors (default)
      backgroundColor: {
        'app-light': '#faf8f5',      // Warm cream - reduces glare
        'surface-light': '#ffffff',   // Pure white for cards
        'elevated-light': '#f5f1e8',  // Slightly darker cream
        
        // Dark theme colors (evening/indoor)
        'app-dark': '#0a0f1a',        // Deep blue-black
        'surface-dark': '#111827',     // Slate-900
        'elevated-dark': '#1f2937',    // Slate-800
      },
      
      // Text colors
      textColor: {
        'primary-light': '#1a1a1a',    // Deep charcoal (not pure black)
        'secondary-light': '#4a4a4a',  // Medium gray
        'tertiary-light': '#737373',   // Light gray
        
        'primary-dark': '#f5f5f5',     // Off-white
        'secondary-dark': '#a3a3a3',   // Medium gray
        'tertiary-dark': '#737373',    // Darker gray
      },
      
      // Border colors
      borderColor: {
        'light': '#e5e5e5',    // Subtle gray
        'dark': '#334155',     // Slate-700
      },
    },
  },
}
```

### Theme Implementation

```typescript
// app/providers/theme-provider.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'auto'
type ResolvedTheme = 'light' | 'dark'

const ThemeContext = createContext<{
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}>({
  theme: 'auto',
  resolvedTheme: 'light',
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('auto')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light')

  useEffect(() => {
    // Load saved preference
    const saved = localStorage.getItem('theme') as Theme | null
    if (saved) setTheme(saved)

    // Auto-switch based on time (6am-8pm = light)
    const autoSwitch = () => {
      if (theme === 'auto') {
        const hour = new Date().getHours()
        setResolvedTheme(hour >= 6 && hour < 20 ? 'light' : 'dark')
      } else {
        setResolvedTheme(theme)
      }
    }

    autoSwitch()
    const interval = setInterval(autoSwitch, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [theme])

  useEffect(() => {
    // Apply theme to document
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(resolvedTheme)
  }, [resolvedTheme])

  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme: updateTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
```

### Color Usage Rules

**Light Mode (Field Work - Default):**
- **Background**: `#faf8f5` (warm cream) reduces harsh white glare
- **Surfaces**: `#ffffff` for elevated cards
- **Text**: `#1a1a1a` (deep charcoal) for primary, `#4a4a4a` for secondary
- **Borders**: `#e5e5e5` (subtle gray)
- **Accents**: Forest green for positive actions, amber for highlights
- **Shadows**: Subtle, warm-toned shadows

**Dark Mode (Planning & Analysis):**
- **Background**: `#0a0f1a` (custom deep blue-black)
- **Surfaces**: `#111827` (slate-900) for elevated content
- **Text**: `#f5f5f5` for primary, `#a3a3a3` for secondary
- **Borders**: `#334155` (slate-700)
- **Accents**: Same forest green and amber work beautifully
- **Shadows**: Deeper, more dramatic shadows

**NEVER:**
- Use yellow/gold as primary or background colors (honey cliché)
- Use pure white (#ffffff) as main background (too harsh outdoors)
- Use pure black (#000000) text (reduces readability)
- Use low-contrast color combinations

---

## 📐 Layout Patterns: Fluid Mobile-to-Desktop

### Adaptive Component Example

```jsx
// components/inspection-card.tsx
export function InspectionCard({ inspection }) {
  return (
    <div className="rounded-3xl 
                    bg-surface-light dark:bg-surface-dark
                    border border-light dark:border-dark
                    shadow-lg dark:shadow-2xl
                    p-6 lg:p-8
                    transition-colors duration-200">
      
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold 
                       text-primary-light dark:text-primary-dark">
          Hive {inspection.hiveNumber}
        </h3>
        
        <div className={`px-4 py-2 rounded-full text-sm font-medium
                        ${inspection.health === 'good' 
                          ? 'bg-forest-100 dark:bg-forest-900 text-forest-700 dark:text-forest-300'
                          : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'}`}>
          {inspection.health}
        </div>
      </div>
      
      <p className="text-secondary-light dark:text-secondary-dark">
        {inspection.notes}
      </p>
    </div>
  )
}
```

### 1. Adaptive Asymmetric Dashboard

The dashboard transforms fluidly across devices and themes:

**Mobile (< 768px)**: Single column, stacked cards
```jsx
<div className="flex flex-col gap-4 p-4">
  {/* All cards stack vertically on mobile */}
  <div className="rounded-3xl 
                  bg-surface-light dark:bg-surface-dark
                  border border-light dark:border-dark
                  p-6">
    {/* Hero card - full width mobile */}
  </div>
  
  <div className="rounded-3xl 
                  bg-surface-light dark:bg-surface-dark
                  border border-light dark:border-dark
                  p-6">
    {/* Small widget - full width mobile */}
  </div>
</div>
```

**Desktop (≥ 1024px)**: Asymmetric grid
```jsx
<div className="grid grid-cols-12 gap-6 p-8 auto-rows-min
                bg-app-light dark:bg-app-dark
                transition-colors duration-200">
  {/* Hero card spans 8 columns, 2 rows on desktop */}
  <div className="col-span-12 lg:col-span-8 lg:row-span-2 
                  rounded-3xl 
                  bg-surface-light dark:bg-surface-dark
                  border border-light dark:border-dark
                  p-8">
    {/* Primary content */}
  </div>
  
  {/* Small widget - full width on mobile, 4 cols on desktop */}
  <div className="col-span-12 lg:col-span-4 
                  rounded-3xl 
                  bg-surface-light dark:bg-surface-dark
                  border border-light dark:border-dark
                  p-6">
    {/* Secondary content */}
  </div>
</div>
```

### 2. Theme-Adaptive Navigation

**Mobile**: Bottom Sheet Navigation
```jsx
<div className="lg:hidden fixed inset-x-0 bottom-0 z-50 safe-area-pb">
  {/* Handle for pulling up */}
  <div className="flex justify-center py-2 
                  bg-white/90 dark:bg-slate-900/90 
                  backdrop-blur-xl
                  border-t border-light dark:border-dark">
    <div className="w-12 h-1.5 rounded-full 
                    bg-sage-300 dark:bg-slate-600" />
  </div>
  
  {/* Navigation items - large touch targets */}
  <nav className="bg-white/95 dark:bg-slate-900/95 
                  backdrop-blur-xl 
                  border-t border-light dark:border-dark
                  px-4 pb-4 pt-2 
                  grid grid-cols-4 gap-2">
    {navItems.map(item => (
      <button 
        key={item.id} 
        className="flex flex-col items-center gap-2 py-3 px-2
                   rounded-xl
                   active:scale-95 active:bg-sage-100 dark:active:bg-slate-800
                   transition-all">
        {/* Icon container - 48x48px minimum */}
        <div className="w-12 h-12 flex items-center justify-center">
          <item.icon className="w-6 h-6 
                                text-forest-600 dark:text-forest-400" />
        </div>
        <span className="text-xs font-medium 
                         text-primary-light dark:text-primary-dark">
          {item.label}
        </span>
      </button>
    ))}
  </nav>
</div>
```

**Desktop**: Floating Navigation
```jsx
<nav className="hidden lg:flex 
                fixed bottom-8 left-1/2 -translate-x-1/2 z-50
                gap-2 px-4 py-3 
                rounded-full
                bg-white/90 dark:bg-slate-900/90
                backdrop-blur-xl
                border border-light dark:border-dark
                shadow-2xl">
  {navItems.map(item => (
    <button
      key={item.id}
      className="px-6 py-3 rounded-full
                 hover:bg-sage-100 dark:hover:bg-slate-800
                 hover:scale-105
                 transition-all
                 flex items-center gap-2">
      <item.icon className="w-5 h-5 
                            text-forest-600 dark:text-forest-400" />
      <span className="font-medium
                       text-primary-light dark:text-primary-dark">
        {item.label}
      </span>
    </button>
  ))}
</nav>
```

---

## 🎯 Field-Optimized Component Patterns

### Theme Switcher Component

```jsx
// components/theme-switcher.tsx
'use client'

import { SunIcon, MoonIcon, ClockIcon } from 'lucide-react'
import { useTheme } from '@/app/providers/theme-provider'

export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  
  const options = [
    { value: 'light', icon: SunIcon, label: 'Light (Field)' },
    { value: 'dark', icon: MoonIcon, label: 'Dark (Evening)' },
    { value: 'auto', icon: ClockIcon, label: 'Auto' },
  ]
  
  return (
    <div className="flex gap-2 p-1 rounded-2xl
                    bg-sage-100 dark:bg-slate-800
                    border border-light dark:border-dark">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value as Theme)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl
                     transition-all
                     ${theme === value 
                       ? 'bg-white dark:bg-slate-700 shadow-md' 
                       : 'hover:bg-sage-200 dark:hover:bg-slate-700'}`}
        >
          <Icon className={`w-5 h-5 ${
            theme === value 
              ? 'text-forest-600 dark:text-forest-400' 
              : 'text-sage-500 dark:text-slate-400'
          }`} />
          <span className={`text-sm font-medium ${
            theme === value
              ? 'text-primary-light dark:text-primary-dark'
              : 'text-secondary-light dark:text-secondary-dark'
          }`}>
            {label}
          </span>
        </button>
      ))}
    </div>
  )
}
```

### High-Contrast Status Indicators

```jsx
// Field-optimized status badges (visible in sunlight)
export function StatusBadge({ status }: { status: 'healthy' | 'warning' | 'alert' }) {
  const styles = {
    healthy: 'bg-forest-100 dark:bg-forest-900 text-forest-800 dark:text-forest-200 border-forest-300 dark:border-forest-700',
    warning: 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700',
    alert: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700',
  }
  
  return (
    <div className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${styles[status]}`}>
      {status.toUpperCase()}
    </div>
  )
}
```

### Adaptive Data Visualization

```jsx
// Chart colors that work in both light and dark
export const chartTheme = {
  light: {
    background: '#ffffff',
    grid: '#e5e5e5',
    text: '#1a1a1a',
    primary: '#16a34a',   // Forest-600
    secondary: '#f59e0b', // Amber-500
  },
  dark: {
    background: '#111827',
    grid: '#334155',
    text: '#f5f5f5',
    primary: '#4ade80',   // Forest-400
    secondary: '#fbbf24', // Amber-400
  }
}

// Usage in chart component
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    <CartesianGrid 
      strokeDasharray="3 3" 
      stroke={resolvedTheme === 'light' ? chartTheme.light.grid : chartTheme.dark.grid} 
    />
    <XAxis 
      stroke={resolvedTheme === 'light' ? chartTheme.light.text : chartTheme.dark.text}
    />
    <Line 
      type="monotone" 
      dataKey="population" 
      stroke={resolvedTheme === 'light' ? chartTheme.light.primary : chartTheme.dark.primary}
      strokeWidth={3}
    />
  </LineChart>
</ResponsiveContainer>
```

---

## 🔢 Keyboard-Free Input Components (Theme-Adaptive)

All input components work perfectly in both themes with proper contrast:

### Number Input with +/- Buttons

```jsx
export function NumberInput({ value, onChange, label, min = 0, max = 100 }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium 
                        text-secondary-light dark:text-secondary-dark">
        {label}
      </label>
      
      <div className="flex gap-3">
        {/* Minus button */}
        <button 
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-14 h-14 rounded-xl 
                     bg-sage-100 dark:bg-slate-800
                     border-2 border-sage-300 dark:border-slate-600
                     disabled:opacity-30
                     active:scale-95
                     transition-all
                     flex items-center justify-center">
          <MinusIcon className="w-6 h-6 
                                text-forest-700 dark:text-forest-300" />
        </button>
        
        {/* Display */}
        <div className="h-14 flex-1 rounded-xl 
                       bg-white dark:bg-slate-900
                       border-2 border-sage-200 dark:border-slate-700
                       flex items-center justify-center">
          <span className="text-3xl font-bold tabular-nums
                          text-primary-light dark:text-primary-dark">
            {value}
          </span>
        </div>
        
        {/* Plus button */}
        <button 
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-14 h-14 rounded-xl 
                     bg-sage-100 dark:bg-slate-800
                     border-2 border-sage-300 dark:border-slate-600
                     disabled:opacity-30
                     active:scale-95
                     transition-all
                     flex items-center justify-center">
          <PlusIcon className="w-6 h-6 
                              text-forest-700 dark:text-forest-300" />
        </button>
      </div>
      
      {/* Quick increment buttons */}
      <div className="grid grid-cols-4 gap-2">
        {[-10, -5, +5, +10].map(increment => (
          <button
            key={increment}
            onClick={() => {
              const newValue = value + increment
              if (newValue >= min && newValue <= max) {
                onChange(newValue)
              }
            }}
            className="h-10 rounded-lg text-sm font-medium
                       bg-sage-50 dark:bg-slate-800/50
                       border border-sage-200 dark:border-slate-700
                       text-secondary-light dark:text-secondary-dark
                       active:scale-95
                       transition-all">
            {increment > 0 ? '+' : ''}{increment}
          </button>
        ))}
      </div>
    </div>
  )
}
```

### Quick Value Selection Grid

```jsx
// Predefined frame counts (1-10)
export function FrameCountSelector({ value, onChange }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium 
                        text-secondary-light dark:text-secondary-dark">
        Number of Frames
      </label>
      
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`h-14 rounded-xl font-bold text-lg
                       border-2
                       active:scale-95
                       transition-all
                       ${value === n 
                         ? 'bg-forest-600 dark:bg-forest-500 text-white border-forest-600 dark:border-forest-500 shadow-lg' 
                         : 'bg-white dark:bg-slate-800 text-primary-light dark:text-primary-dark border-sage-200 dark:border-slate-700'}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
```

### Weather Condition Selector

```jsx
// Large touch-friendly weather selection
export function WeatherSelector({ value, onChange }) {
  const conditions = [
    { id: 'sunny', icon: SunIcon, label: 'Sunny' },
    { id: 'cloudy', icon: CloudIcon, label: 'Cloudy' },
    { id: 'rainy', icon: CloudRainIcon, label: 'Rainy' },
    { id: 'windy', icon: WindIcon, label: 'Windy' },
  ]
  
  return (
    <div className="grid grid-cols-2 gap-3">
      {conditions.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`h-24 rounded-2xl
                     border-2
                     flex flex-col items-center justify-center gap-2
                     active:scale-95
                     transition-all
                     ${value === id
                       ? 'bg-forest-100 dark:bg-forest-900 border-forest-500 dark:border-forest-400'
                       : 'bg-white dark:bg-slate-800 border-sage-200 dark:border-slate-700'}`}
        >
          <Icon className={`w-8 h-8 ${
            value === id
              ? 'text-forest-700 dark:text-forest-300'
              : 'text-sage-500 dark:text-slate-400'
          }`} />
          <span className={`text-sm font-medium ${
            value === id
              ? 'text-forest-900 dark:text-forest-100'
              : 'text-secondary-light dark:text-secondary-dark'
          }`}>
            {label}
          </span>
        </button>
      ))}
    </div>
  )
}
```

### Voice Input for Field Notes

```jsx
export function VoiceNoteInput({ onRecordingComplete }) {
  const [recording, setRecording] = useState(false)
  
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium 
                        text-secondary-light dark:text-secondary-dark">
        Field Notes
      </label>
      
      <button
        onClick={() => {
          if (recording) {
            // Stop recording
            stopRecording()
            setRecording(false)
          } else {
            // Start recording
            startRecording()
            setRecording(true)
          }
        }}
        className={`w-full h-20 rounded-2xl
                   border-2
                   flex items-center justify-center gap-3
                   active:scale-98
                   transition-all
                   ${recording
                     ? 'bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-500'
                     : 'bg-gradient-to-br from-forest-50 to-sage-50 dark:from-forest-900/20 dark:to-slate-800 border-forest-400 dark:border-forest-600'}`}
      >
        <MicIcon className={`w-7 h-7 ${
          recording 
            ? 'text-red-600 dark:text-red-400 animate-pulse' 
            : 'text-forest-600 dark:text-forest-400'
        }`} />
        <span className={`text-lg font-medium ${
          recording
            ? 'text-red-700 dark:text-red-300'
            : 'text-forest-700 dark:text-forest-300'
        }`}>
          {recording ? 'Recording... Tap to Stop' : 'Tap to Record Note'}
        </span>
      </button>
      
      {/* Helpful hint */}
      <p className="text-xs text-center 
                    text-tertiary-light dark:text-tertiary-dark">
        No typing needed - just speak naturally about the hive condition
      </p>
    </div>
  )
}
```

### Temperature with Presets

```jsx
export function TemperatureInput({ value, onChange }) {
  const presets = [15, 20, 25, 30]
  
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium 
                        text-secondary-light dark:text-secondary-dark">
        Temperature (°C)
      </label>
      
      {/* Quick presets */}
      <div className="grid grid-cols-4 gap-2">
        {presets.map(temp => (
          <button 
            key={temp} 
            onClick={() => onChange(temp)}
            className={`h-12 rounded-xl font-medium
                       border-2
                       active:scale-95
                       transition-all
                       ${value === temp
                         ? 'bg-forest-600 dark:bg-forest-500 text-white border-forest-600 dark:border-forest-500'
                         : 'bg-white dark:bg-slate-800 text-primary-light dark:text-primary-dark border-sage-200 dark:border-slate-700'}`}
          >
            {temp}°
          </button>
        ))}
      </div>
      
      {/* Fine control */}
      <div className="flex gap-2">
        <button 
          onClick={() => onChange(value - 1)} 
          className="flex-1 h-12 rounded-xl font-medium
                     bg-sage-100 dark:bg-slate-800
                     border-2 border-sage-300 dark:border-slate-600
                     text-primary-light dark:text-primary-dark
                     active:scale-95
                     transition-all">
          -1°
        </button>
        <div className="flex-1 h-12 rounded-xl 
                       bg-white dark:bg-slate-900
                       border-2 border-sage-200 dark:border-slate-700
                       flex items-center justify-center">
          <span className="text-2xl font-bold tabular-nums
                          text-primary-light dark:text-primary-dark">
            {value}°C
          </span>
        </div>
        <button 
          onClick={() => onChange(value + 1)} 
          className="flex-1 h-12 rounded-xl font-medium
                     bg-sage-100 dark:bg-slate-800
                     border-2 border-sage-300 dark:border-slate-600
                     text-primary-light dark:text-primary-dark
                     active:scale-95
                     transition-all">
          +1°
        </button>
      </div>
    </div>
  )
}
```

### Toggle Switch (Not Checkbox)

```jsx
export function Toggle({ enabled, onChange, label }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className="flex items-center justify-between w-full p-4 rounded-xl
                 bg-white dark:bg-slate-800
                 border-2 border-sage-200 dark:border-slate-700
                 active:scale-98
                 transition-all">
      <span className="font-medium 
                       text-primary-light dark:text-primary-dark">
        {label}
      </span>
      
      <div className={`relative w-16 h-9 rounded-full transition-colors
                      ${enabled 
                        ? 'bg-forest-600 dark:bg-forest-500' 
                        : 'bg-sage-300 dark:bg-slate-600'}`}>
        <span className={`absolute top-1 w-7 h-7 rounded-full bg-white
                         shadow-lg transition-transform
                         ${enabled ? 'left-8' : 'left-1'}`} />
      </div>
    </button>
  )
}
```

### Date Quick Select

```jsx
export function DateSelector({ value, onChange }) {
  const isToday = isSameDay(value, new Date())
  const isYesterday = isSameDay(value, subDays(new Date(), 1))
  
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium 
                        text-secondary-light dark:text-secondary-dark">
        Inspection Date
      </label>
      
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => onChange(new Date())}
          className={`h-16 rounded-xl font-medium
                     border-2
                     active:scale-95
                     transition-all
                     ${isToday
                       ? 'bg-forest-600 dark:bg-forest-500 text-white border-forest-600 dark:border-forest-500'
                       : 'bg-white dark:bg-slate-800 text-primary-light dark:text-primary-dark border-sage-200 dark:border-slate-700'}`}
        >
          Today
        </button>
        
        <button 
          onClick={() => onChange(subDays(new Date(), 1))}
          className={`h-16 rounded-xl font-medium
                     border-2
                     active:scale-95
                     transition-all
                     ${isYesterday
                       ? 'bg-forest-600 dark:bg-forest-500 text-white border-forest-600 dark:border-forest-500'
                       : 'bg-white dark:bg-slate-800 text-primary-light dark:text-primary-dark border-sage-200 dark:border-slate-700'}`}
        >
          Yesterday
        </button>
      </div>
      
      {/* Calendar picker for other dates */}
      <button
        onClick={() => {/* Open calendar modal */}}
        className="w-full h-12 rounded-xl
                   bg-sage-50 dark:bg-slate-800/50
                   border border-sage-200 dark:border-slate-700
                   text-sm font-medium
                   text-secondary-light dark:text-secondary-dark
                   active:scale-98
                   transition-all
                   flex items-center justify-center gap-2">
        <CalendarIcon className="w-5 h-5" />
        Choose Different Date
      </button>
    </div>
  )
}
```

---

## 📱 Mobile Responsiveness Guidelines

### Touch Target Sizes

```jsx
// ALWAYS use these minimum sizes on mobile
const TOUCH_TARGETS = {
  minimum: 'h-12 w-12',      // 48x48px - absolute minimum
  comfortable: 'h-14 w-14',  // 56x56px - preferred
  large: 'h-16 w-16',        // 64x64px - primary actions
}

// Example
<button className="h-14 w-14 lg:h-12 lg:w-12"> 
  {/* Larger on mobile, can be smaller on desktop */}
</button>
```

### Spacing Scale

```jsx
// Mobile-first spacing
className="p-4 lg:p-8"              // Padding: 16px → 32px
className="gap-3 lg:gap-6"          // Gap: 12px → 24px
className="space-y-4 lg:space-y-8"  // Stack: 16px → 32px
className="mb-6 lg:mb-12"           // Margin: 24px → 48px
```

### Typography Scale

```jsx
// Responsive text sizes
<h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl">
  {/* 30px → 36px → 48px → 60px */}
</h1>

<p className="text-base lg:text-lg">
  {/* 16px → 18px */}
</p>

<span className="text-sm lg:text-base">
  {/* 14px → 16px */}
</span>
```

### Safe Areas (Notches & Home Indicators)

```jsx
// Always account for phone notches and home indicators
<div className="pb-safe">  {/* Bottom safe area */}
  <nav className="pb-4">   {/* Additional padding */}
    {/* Bottom navigation */}
  </nav>
</div>

// Add to tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      spacing: {
        'safe': 'env(safe-area-inset-bottom)',
      },
    },
  },
}
```

---

## 🎨 Advanced Theme Patterns

### Gradient Backgrounds (Theme-Aware)

```jsx
// Subtle gradients that work in both themes
<div className="bg-gradient-to-br 
                from-sage-50 to-forest-50 
                dark:from-slate-900 dark:to-slate-800
                min-h-screen">
  {/* App content */}
</div>

// Accent gradients for hero sections
<div className="bg-gradient-to-r 
                from-forest-100 via-sage-100 to-forest-100
                dark:from-forest-900/30 dark:via-slate-900 dark:to-forest-900/30
                p-8 rounded-3xl">
  {/* Featured content */}
</div>
```

### Glassmorphism Effects

```jsx
// Works beautifully in both themes
<div className="bg-white/80 dark:bg-slate-900/80
                backdrop-blur-xl
                border border-sage-200/50 dark:border-slate-700/50
                rounded-2xl p-6
                shadow-xl dark:shadow-2xl">
  {/* Frosted glass effect */}
</div>
```

### Shadow System

```jsx
// Light theme: soft, natural shadows
// Dark theme: deeper, more dramatic
<div className="shadow-lg 
                dark:shadow-2xl 
                dark:shadow-slate-950/50">
  {/* Adaptive shadows */}
</div>

// Custom shadow configuration
// tailwind.config.ts
boxShadow: {
  'light-soft': '0 4px 20px rgba(0, 0, 0, 0.08)',
  'light-hard': '0 8px 30px rgba(0, 0, 0, 0.12)',
  'dark-soft': '0 4px 20px rgba(0, 0, 0, 0.5)',
  'dark-hard': '0 8px 30px rgba(0, 0, 0, 0.7)',
}
```

### Hover & Active States

```jsx
// Desktop: hover effects
// Mobile: active (pressed) effects
<button className="bg-white dark:bg-slate-800
                   lg:hover:bg-sage-50 lg:dark:hover:bg-slate-700
                   active:bg-sage-100 active:dark:bg-slate-700
                   active:scale-95
                   lg:hover:scale-105
                   transition-all">
  Adaptive Button
</button>
```

---

## 📊 Data Visualization (Theme-Adaptive)

### Chart Configuration

```typescript
// components/charts/chart-config.ts
import { useTheme } from '@/app/providers/theme-provider'

export function useChartTheme() {
  const { resolvedTheme } = useTheme()
  
  return {
    background: resolvedTheme === 'light' ? '#ffffff' : '#111827',
    grid: resolvedTheme === 'light' ? '#e5e5e5' : '#334155',
    text: resolvedTheme === 'light' ? '#1a1a1a' : '#f5f5f5',
    
    colors: {
      primary: resolvedTheme === 'light' ? '#16a34a' : '#4ade80',
      secondary: resolvedTheme === 'light' ? '#f59e0b' : '#fbbf24',
      tertiary: resolvedTheme === 'light' ? '#3b82f6' : '#60a5fa',
      
      health: resolvedTheme === 'light' ? '#22c55e' : '#4ade80',
      warning: resolvedTheme === 'light' ? '#f59e0b' : '#fbbf24',
      alert: resolvedTheme === 'light' ? '#ef4444' : '#f87171',
    }
  }
}
```

### Population Chart Example

```jsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useChartTheme } from './chart-config'

export function PopulationChart({ data }) {
  const theme = useChartTheme()
  
  return (
    <div className="rounded-3xl 
                    bg-surface-light dark:bg-surface-dark
                    border border-light dark:border-dark
                    p-6">
      <h3 className="text-xl font-bold mb-6
                     text-primary-light dark:text-primary-dark">
        Hive Population Trend
      </h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={theme.grid} 
            opacity={0.3}
          />
          <XAxis 
            dataKey="month"
            stroke={theme.text}
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke={theme.text}
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: theme.background,
              border: `1px solid ${theme.grid}`,
              borderRadius: '12px',
              color: theme.text,
            }}
          />
          <Line 
            type="monotone" 
            dataKey="population" 
            stroke={theme.colors.primary}
            strokeWidth={3}
            dot={{ fill: theme.colors.primary, r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

---

## 🎯 Complete Inspection Form Example

Here's a full inspection form demonstrating all principles:

```jsx
'use client'

import { useState } from 'use'
import { useTheme } from '@/app/providers/theme-provider'

export function InspectionForm() {
  const { resolvedTheme } = useTheme()
  const [formData, setFormData] = useState({
    hiveId: null,
    date: new Date(),
    weather: 'sunny',
    temperature: 22,
    frameCount: 8,
    queenSeen: false,
    broodFrames: 5,
    honeyFrames: 3,
    health: 'healthy',
    notes: '',
  })
  
  return (
    <div className="min-h-screen 
                    bg-app-light dark:bg-app-dark
                    transition-colors duration-200
                    p-4 pb-24">  {/* Extra bottom padding for nav */}
      
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-6">
        <h1 className="text-4xl font-bold mb-2
                       text-primary-light dark:text-primary-dark">
          Hive Inspection
        </h1>
        <p className="text-secondary-light dark:text-secondary-dark">
          Complete inspection without removing gloves
        </p>
      </div>
      
      {/* Form - All keyboard-free inputs */}
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Hive Selection */}
        <div className="rounded-3xl 
                        bg-surface-light dark:bg-surface-dark
                        border border-light dark:border-dark
                        p-6">
          <label className="text-sm font-medium mb-3 block
                            text-secondary-light dark:text-secondary-dark">
            Select Hive
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(hiveNum => (
              <button
                key={hiveNum}
                onClick={() => setFormData(prev => ({ ...prev, hiveId: hiveNum }))}
                className={`h-16 rounded-xl font-bold text-xl
                           border-2
                           active:scale-95
                           transition-all
                           ${formData.hiveId === hiveNum
                             ? 'bg-forest-600 dark:bg-forest-500 text-white border-forest-600 dark:border-forest-500'
                             : 'bg-white dark:bg-slate-800 text-primary-light dark:text-primary-dark border-sage-200 dark:border-slate-700'}`}
              >
                {hiveNum}
              </button>
            ))}
          </div>
        </div>
        
        {/* Date */}
        <div className="rounded-3xl 
                        bg-surface-light dark:bg-surface-dark
                        border border-light dark:border-dark
                        p-6">
          <DateSelector 
            value={formData.date}
            onChange={date => setFormData(prev => ({ ...prev, date }))}
          />
        </div>
        
        {/* Weather */}
        <div className="rounded-3xl 
                        bg-surface-light dark:bg-surface-dark
                        border border-light dark:border-dark
                        p-6">
          <label className="text-sm font-medium mb-3 block
                            text-secondary-light dark:text-secondary-dark">
            Weather Conditions
          </label>
          <WeatherSelector
            value={formData.weather}
            onChange={weather => setFormData(prev => ({ ...prev, weather }))}
          />
        </div>
        
        {/* Temperature */}
        <div className="rounded-3xl 
                        bg-surface-light dark:bg-surface-dark
                        border border-light dark:border-dark
                        p-6">
          <TemperatureInput
            value={formData.temperature}
            onChange={temp => setFormData(prev => ({ ...prev, temperature: temp }))}
          />
        </div>
        
        {/* Frame Counts */}
        <div className="rounded-3xl 
                        bg-surface-light dark:bg-surface-dark
                        border border-light dark:border-dark
                        p-6 space-y-6">
          
          <FrameCountSelector
            label="Total Frames"
            value={formData.frameCount}
            onChange={count => setFormData(prev => ({ ...prev, frameCount: count }))}
          />
          
          <NumberInput
            label="Brood Frames"
            value={formData.broodFrames}
            onChange={count => setFormData(prev => ({ ...prev, broodFrames: count }))}
            max={formData.frameCount}
          />
          
          <NumberInput
            label="Honey Frames"
            value={formData.honeyFrames}
            onChange={count => setFormData(prev => ({ ...prev, honeyFrames: count }))}
            max={formData.frameCount}
          />
        </div>
        
        {/* Queen Seen Toggle */}
        <div className="rounded-3xl 
                        bg-surface-light dark:bg-surface-dark
                        border border-light dark:border-dark
                        p-6">
          <Toggle
            label="Queen Seen"
            enabled={formData.queenSeen}
            onChange={seen => setFormData(prev => ({ ...prev, queenSeen: seen }))}
          />
        </div>
        
        {/* Hive Health */}
        <div className="rounded-3xl 
                        bg-surface-light dark:bg-surface-dark
                        border border-light dark:border-dark
                        p-6">
          <label className="text-sm font-medium mb-3 block
                            text-secondary-light dark:text-secondary-dark">
            Overall Hive Health
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'healthy', label: 'Healthy', color: 'forest' },
              { value: 'fair', label: 'Fair', color: 'amber' },
              { value: 'poor', label: 'Needs Attention', color: 'red' },
            ].map(({ value, label, color }) => (
              <button
                key={value}
                onClick={() => setFormData(prev => ({ ...prev, health: value }))}
                className={`h-20 rounded-2xl font-medium
                           border-2
                           active:scale-95
                           transition-all
                           ${formData.health === value
                             ? color === 'forest' 
                               ? 'bg-forest-600 dark:bg-forest-500 text-white border-forest-600 dark:border-forest-500'
                               : color === 'amber'
                               ? 'bg-amber-600 dark:bg-amber-500 text-white border-amber-600 dark:border-amber-500'
                               : 'bg-red-600 dark:bg-red-500 text-white border-red-600 dark:border-red-500'
                             : 'bg-white dark:bg-slate-800 text-primary-light dark:text-primary-dark border-sage-200 dark:border-slate-700'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Voice Notes */}
        <div className="rounded-3xl 
                        bg-surface-light dark:bg-surface-dark
                        border border-light dark:border-dark
                        p-6">
          <VoiceNoteInput
            onRecordingComplete={transcript => 
              setFormData(prev => ({ ...prev, notes: transcript }))
            }
          />
        </div>
        
        {/* Submit Button */}
        <button
          onClick={() => {/* Save inspection */}}
          className="w-full h-16 rounded-2xl
                     bg-forest-600 dark:bg-forest-500
                     text-white font-bold text-lg
                     shadow-lg
                     active:scale-98
                     transition-all">
          Save Inspection
        </button>
      </div>
    </div>
  )
}
```

---

## 🎯 Final Checklist Summary

**Every Component Must:**
- [ ] Work perfectly in bright sunlight (light mode tested outdoors)
- [ ] Work beautifully in evening/indoor conditions (dark mode tested)
- [ ] Support automatic theme switching based on time of day
- [ ] Have proper contrast ratios in both themes (WCAG AA minimum)
- [ ] Work on 375px mobile (iPhone SE)
- [ ] Have touch targets ≥48px on mobile
- [ ] Use responsive text sizes (base to lg to xl)
- [ ] Stack on mobile, grid on desktop
- [ ] Have active states (mobile) AND hover (desktop)
- [ ] Load fast on 3G networks
- [ ] Look stunning on 27" desktop
- [ ] Be completable with gloves/no keyboard
- [ ] Have theme-appropriate colors and shadows
- [ ] Support system dark mode preference

**Never:**
- [ ] Use pure black backgrounds (use #0a0f1a)
- [ ] Use pure white backgrounds on light theme (use #faf8f5)
- [ ] Forget to add dark: variants to colors
- [ ] Use low contrast in either theme
- [ ] Require typing numbers
- [ ] Use small text inputs for numbers
- [ ] Assume mouse/hover availability
- [ ] Use small touch targets (<44px)
- [ ] Rely on top navigation on mobile
- [ ] Make horizontal scrolling necessary
- [ ] Use honey yellows as primary colors
- [ ] Ignore theme transitions

---

## 💡 Quick Reference: Theme Classes

```jsx
// Background
bg-app-light dark:bg-app-dark                    // Main app background
bg-surface-light dark:bg-surface-dark            // Card surfaces
bg-white dark:bg-slate-800                       // Input backgrounds

// Text
text-primary-light dark:text-primary-dark        // Headings, primary text
text-secondary-light dark:text-secondary-dark    // Body text, labels
text-tertiary-light dark:text-tertiary-dark      // Hints, disabled

// Borders
border-light dark:border-dark                     // Standard borders
border-sage-200 dark:border-slate-700            // Input borders

// Accents
bg-forest-600 dark:bg-forest-500                 // Primary actions
bg-amber-600 dark:bg-amber-500                   // Secondary actions
text-forest-700 dark:text-forest-300             // Accent text

// Effects
shadow-lg dark:shadow-2xl                        // Elevation
backdrop-blur-xl                                 // Glassmorphism
```

---

This updated skill ensures HiveCraic is **perfectly optimized for field work in bright sunlight** (light mode) while providing a **sophisticated evening/indoor experience** (dark mode), all while maintaining the unique, innovative design patterns that break away from conventional beekeeping app aesthetics.