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
  theme: 'light',
  resolvedTheme: 'light', // Default to light (field work)
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light')
  const [mounted, setMounted] = useState(false)

  // Auto-switch based on time: 6am-8pm = light (field work), 8pm-6am = dark (evening planning)
  const getAutoTheme = (): ResolvedTheme => {
    const hour = new Date().getHours()
    return (hour >= 6 && hour < 20) ? 'light' : 'dark'
  }

  // Load saved preference and determine resolved theme
  useEffect(() => {
    setMounted(true)

    // Load saved preference from localStorage
    const saved = localStorage.getItem('theme') as Theme | null
    if (saved && ['light', 'dark', 'auto'].includes(saved)) {
      setTheme(saved)
    }

    // Determine initial resolved theme
    const resolveInitialTheme = () => {
      if (saved === 'light' || saved === 'dark') {
        return saved
      }
      // Auto mode or first time user
      return getAutoTheme()
    }

    setResolvedTheme(resolveInitialTheme())
  }, [])

  // Update resolved theme when theme changes or time changes
  useEffect(() => {
    const updateResolvedTheme = () => {
      if (theme === 'auto') {
        setResolvedTheme(getAutoTheme())
      } else {
        setResolvedTheme(theme)
      }
    }

    updateResolvedTheme()

    // Check every minute if in auto mode to catch 6am and 8pm transitions
    if (theme === 'auto') {
      const interval = setInterval(updateResolvedTheme, 60000) // Check every minute
      return () => clearInterval(interval)
    }
  }, [theme])

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)
  }, [resolvedTheme, mounted])

  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  // Prevent flash of wrong theme on SSR
  if (!mounted) {
    return <>{children}</>
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
