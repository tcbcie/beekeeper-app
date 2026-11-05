'use client'

import { Sun, Moon, Smartphone, Clock } from 'lucide-react'
import { useTheme, type Theme } from '@/app/providers/theme-provider'
import { RadioChoiceGroup, RadioChoiceOption } from '@/components/ui/RadioChoiceGroup'

// Each choice says what it does. 'auto' is the clock schedule, kept for anyone who chose it
// (owner decision D1, 05/11/2026); 'system' follows the device and is the default.
const OPTIONS: { value: Theme; icon: typeof Sun; title: string; description: string }[] = [
  { value: 'light', icon: Sun, title: 'Light', description: 'Easiest to read outdoors' },
  { value: 'dark', icon: Moon, title: 'Dark', description: 'For evenings and low light' },
  { value: 'system', icon: Smartphone, title: 'Use device setting', description: 'Follows your phone or computer' },
  { value: 'auto', icon: Clock, title: 'Light by day', description: 'Light 6am to 8pm, dark after' },
]

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <fieldset>
      <legend className="sr-only">Appearance</legend>
      <RadioChoiceGroup className="sm:grid-cols-2">
        {OPTIONS.map(({ value, icon: Icon, title, description }) => (
          <RadioChoiceOption
            key={value}
            name="appearance"
            value={value}
            checked={theme === value}
            onChange={() => setTheme(value)}
            title={title}
            description={description}
            tone="green"
            icon={<Icon className="h-5 w-5 text-text-secondary" aria-hidden="true" />}
            className="min-h-[48px]"
          />
        ))}
      </RadioChoiceGroup>
    </fieldset>
  )
}
