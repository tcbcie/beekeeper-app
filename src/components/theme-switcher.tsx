'use client'

import { Sun, Moon, Clock } from 'lucide-react'
import { useTheme } from '@/app/providers/theme-provider'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  const options = [
    { value: 'light' as const, icon: Sun, label: 'Light', subtitle: 'Field' },
    { value: 'dark' as const, icon: Moon, label: 'Dark', subtitle: 'Evening' },
    { value: 'auto' as const, icon: Clock, label: 'Auto', subtitle: '6am-8pm' },
  ]

  return (
    <div className="flex gap-2 p-1 rounded-2xl bg-sage-100 dark:bg-slate-800 border border-border">
      {options.map(({ value, icon: Icon, label, subtitle }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all touch-manipulation ${
            theme === value
              ? 'bg-white dark:bg-slate-700 shadow-md'
              : 'hover:bg-sage-200 dark:hover:bg-slate-700/50 active:bg-sage-200 dark:active:bg-slate-700'
          }`}
        >
          <Icon
            className={`w-5 h-5 ${
              theme === value
                ? 'text-forest-600 dark:text-forest-400'
                : 'text-sage-500 dark:text-slate-400'
            }`}
          />
          <div className="flex flex-col items-start">
            <span
              className={`text-sm font-medium ${
                theme === value
                  ? 'text-text-primary'
                  : 'text-text-secondary'
              }`}
            >
              {label}
            </span>
            <span
              className={`text-xs ${
                theme === value
                  ? 'text-text-secondary'
                  : 'text-text-tertiary'
              }`}
            >
              {subtitle}
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}
