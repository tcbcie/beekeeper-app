'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

// 'system' follows the device's own light or dark setting; 'auto' is the clock schedule, shown as
// "Light by day". A saved 'auto' is kept as it is, never moved to 'system' (WP10, 05/11/2026).
export type Theme = 'light' | 'dark' | 'system' | 'auto'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

/** For anyone who never chose: follow the device (owner decision D2, 05/11/2026) */
const DEFAULT_THEME: Theme = 'system'
const DEVICE_DARK_QUERY = '(prefers-color-scheme: dark)'

const ThemeContext = createContext<ThemeContextType>({
  theme: DEFAULT_THEME,
  resolvedTheme: 'light',
  setTheme: () => {},
})

const THEME_STORAGE_KEY = 'theme'
const LIGHT_THEME_COLOUR = '#faf8f5'
const DARK_THEME_COLOUR = '#0a0f1a'

const isTheme = (value: string | null): value is Theme => {
  return value === 'light' || value === 'dark' || value === 'system' || value === 'auto'
}

// Auto-switch based on time: 6am-8pm = light (field work), 8pm-6am = dark (evening planning)
const getAutoTheme = (): ResolvedTheme => {
  const hour = new Date().getHours()
  return hour >= 6 && hour < 20 ? 'light' : 'dark'
}

const getDeviceTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia(DEVICE_DARK_QUERY).matches ? 'dark' : 'light'
}

const resolveTheme = (value: Theme): ResolvedTheme => {
  if (value === 'auto') return getAutoTheme()
  if (value === 'system') return getDeviceTheme()
  return value
}

const readStoredTheme = (): Theme => {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME
  }

  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(saved) ? saved : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

const applyDocumentTheme = (theme: ResolvedTheme) => {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
  root.style.colorScheme = theme

  // Every tag: the page has one per device setting (light and dark), and the browser bar uses the
  // one matching the device, so updating only the first left it wrong on a dark phone (V21)
  const themeColour = theme === 'dark' ? DARK_THEME_COLOUR : LIGHT_THEME_COLOUR
  const metas = document.querySelectorAll('meta[name="theme-color"]')
  if (metas.length === 0) {
    const meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    meta.setAttribute('content', themeColour)
    document.head.appendChild(meta)
  }
  metas.forEach(meta => meta.setAttribute('content', themeColour))
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme())
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(readStoredTheme()))

  // Update resolved theme when the choice, the time or the device setting changes
  useEffect(() => {
    const updateResolvedTheme = () => {
      setResolvedTheme(resolveTheme(theme))
    }

    updateResolvedTheme()

    // Check every minute if in auto mode to catch 6am and 8pm transitions
    if (theme === 'auto') {
      const interval = window.setInterval(updateResolvedTheme, 60000)
      return () => clearInterval(interval)
    }

    // Only the device-setting choice follows the device; Light, Dark and the schedule ignore it
    if (theme === 'system' && typeof window.matchMedia === 'function') {
      const query = window.matchMedia(DEVICE_DARK_QUERY)
      // Safari before 14 (older iPads) has only the deprecated addListener; without this fallback
      // the effect would throw and take the whole app down
      if (typeof query.addEventListener === 'function') {
        query.addEventListener('change', updateResolvedTheme)
        return () => query.removeEventListener('change', updateResolvedTheme)
      }
      query.addListener(updateResolvedTheme)
      return () => query.removeListener(updateResolvedTheme)
    }
  }, [theme])

  // Apply theme to document
  useEffect(() => {
    applyDocumentTheme(resolvedTheme)
  }, [resolvedTheme])

  // Sync theme across tabs/windows.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return
      if (!isTheme(event.newValue)) return
      setTheme(event.newValue)
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    } catch {
      // Ignore storage write errors and keep the in-memory selection.
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme: updateTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
