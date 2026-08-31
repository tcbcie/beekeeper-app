'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { baseNavItems } from '@/lib/navigation'
import Button from '@/components/ui/Button'

interface BottomNavBarProps {
  onMoreClick: () => void
  /** Whether the drawer that More controls is currently open. */
  isMoreOpen?: boolean
}

// Show primary items flagged for bottom nav in a horizontally scrollable row.
const navItems = baseNavItems.filter(item => item.bottomNav)

export default function BottomNavBar({ onMoreClick, isMoreOpen = false }: BottomNavBarProps) {
  const pathname = usePathname()

  return (
    <nav aria-label="Quick navigation" className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden">
      <div className="flex items-stretch">
        <div className="flex-1 overflow-x-auto scrollbar-hide">
          <div className="flex min-w-max items-stretch">
            {navItems.map(item => {
              const isActive = item.href === '/dashboard'
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex min-h-[48px] min-w-[76px] shrink-0 flex-col items-center justify-center gap-1 px-2 py-2 text-center transition-colors touch-manipulation ${
                    isActive
                      ? 'text-forest-600 dark:text-forest-400'
                      : 'text-text-tertiary hover:text-foreground'
                  }`}
                >
                  <item.icon size={22} />
                  <span className="whitespace-nowrap text-[11px] font-medium leading-none">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Pinned More button */}
        <Button
          onClick={onMoreClick}
          tone="neutral"
          size="xs"
          aria-label={isMoreOpen ? 'Close menu' : 'Open menu'}
          aria-haspopup="dialog"
          aria-expanded={isMoreOpen}
          aria-controls="mobile-drawer"
          className="flex min-h-[48px] min-w-[76px] shrink-0 flex-col items-center justify-center gap-1 border-l border-border bg-transparent px-2 py-2 text-text-tertiary hover:text-foreground touch-manipulation"
        >
          <Menu size={22} />
          <span className="text-[11px] font-medium leading-none">More</span>
        </Button>
      </div>
    </nav>
  )
}
