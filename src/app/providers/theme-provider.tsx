'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'auto'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'auto',
  resolvedTheme: 'light',
  setTheme: () => {},
})

const THEME_STORAGE_KEY = 'theme'
const LIGHT_THEME_COLOUR = '#faf8f5'
const DARK_THEME_COLOUR = '#0a0f1a'

const isTheme = (value: string | null): value is Theme => {
  return value === 'light' || value === 'dark' || value === 'auto'
}

// Auto-switch based on time: 6am-8pm = light (field work), 8pm-6am = dark (evening planning)
const getAutoTheme = (): ResolvedTheme => {
  const hour = new Date().getHours()
  return hour >= 6 && hour < 20 ? 'light' : 'dark'
}

const resolveTheme = (value: Theme): ResolvedTheme => {
  return value === 'auto' ? getAutoTheme() : value
}

const readStoredTheme = (): Theme => {
  if (typeof window === 'undefined') {
    return 'auto'
  }

  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(saved) ? saved : 'auto'
  } catch {
    return 'auto'
  }
}

const applyDocumentTheme = (theme: ResolvedTheme) => {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
  root.style.colorScheme = theme

  const themeColour = theme === 'dark' ? DARK_THEME_COLOUR : LIGHT_THEME_COLOUR
  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', themeColour)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme())
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(readStoredTheme()))

  // Update resolved theme when theme changes or time changes
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
