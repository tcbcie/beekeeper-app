'use client'

import { Sun, Moon, Clock } from 'lucide-react'
import { useTheme } from '@/app/providers/theme-provider'
import Button from '@/components/ui/Button'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  const options = [
    { value: 'light' as const, icon: Sun, label: 'Light', subtitle: 'Field' },
    { value: 'dark' as const, icon: Moon, label: 'Dark', subtitle: 'Evening' },
    { value: 'auto' as const, icon: Clock, label: 'Auto', subtitle: '6am-8pm' },
  ]

  return (
    <div className="flex gap-2 p-1 rounded-2xl bg-surface dark:bg-surface-elevated border border-border">
      {options.map(({ value, icon: Icon, label, subtitle }) => (
        <Button
          key={value}
          onClick={() => setTheme(value)}
          tone="neutral"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl touch-manipulation ${
              theme === value
              ? 'bg-surface-elevated dark:bg-surface-elevated shadow-md border border-border'
              : 'hover:bg-surface-elevated dark:hover:bg-surface-elevated active:bg-surface-elevated dark:active:bg-surface-elevated'
          }`}
        >
          <Icon
            className={`w-5 h-5 ${
              theme === value
                ? 'text-forest-600 dark:text-forest-400'
                : 'text-text-tertiary dark:text-text-tertiary'
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
        </Button>
      ))}
    </div>
  )
}
