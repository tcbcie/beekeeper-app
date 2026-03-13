'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { baseNavItems } from '@/lib/navigation'
import Button from '@/components/ui/Button'

interface BottomNavBarProps {
  onMoreClick: () => void
}

// Show only primary items flagged for bottom nav (glove-friendly: max 4–5)
const navItems = baseNavItems.filter(item => item.bottomNav)

export default function BottomNavBar({ onMoreClick }: BottomNavBarProps) {
  const pathname = usePathname()

  return (
    <nav aria-label="Quick navigation" className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-surface/95 backdrop-blur-lg border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch">
        {navItems.map(item => {
          const isActive = item.href === '/dashboard'
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-[48px] transition-colors touch-manipulation ${
                isActive
                  ? 'text-forest-600 dark:text-forest-400'
                  : 'text-text-tertiary hover:text-foreground'
              }`}
            >
              <item.icon size={22} />
              <span className="text-[11px] font-medium leading-none whitespace-nowrap">{item.label}</span>
            </Link>
          )
        })}

        {/* Pinned More button */}
        <Button
          onClick={onMoreClick}
          tone="neutral"
          size="xs"
          aria-label="Open menu"
          aria-haspopup="true"
          className="flex flex-1 min-h-[48px] flex-col items-center justify-center gap-1 border-l border-border bg-transparent py-2 text-text-tertiary hover:text-foreground touch-manipulation"
        >
          <Menu size={22} />
          <span className="text-[11px] font-medium leading-none">More</span>
        </Button>
      </div>
    </nav>
  )
}
