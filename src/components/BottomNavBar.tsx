'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { baseNavItems, filterByFeatures } from '@/lib/navigation'
import { useCrmEnabled } from '@/hooks/useCrmEnabled'
import { useLogbookEnabled } from '@/hooks/useLogbookEnabled'
import Button from '@/components/ui/Button'

interface BottomNavBarProps {
  onMoreClick: () => void
  /** Whether the drawer that More controls is currently open. */
  isMoreOpen?: boolean
}

const bottomNavItems = baseNavItems.filter(item => item.bottomNav)

/**
 * Every destination and the More button is an equal share of the viewport, so
 * the row always fits. The previous fixed 76px per item needed 456px for five
 * destinations plus More, which pushed one destination off a 390px screen
 * behind a hidden scrollbar.
 *
 * The sizing has to be intrinsic rather than breakpoint-driven: this project
 * has no breakpoint below 640px and no container queries, so 320px and 430px
 * would otherwise receive identical layout.
 */
const slotClasses =
  'flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-center transition-colors touch-manipulation'

/**
 * `min-w-0` on the slot and `truncate` here are the guarantee that the row can
 * never exceed the viewport. Flex items default to `min-width: auto`, so
 * without it a label wider than its share would refuse to shrink and push the
 * row into horizontal overflow - the very fault this change removes.
 *
 * Measured against the app's font stack, every label fits its 56px budget at
 * 320px, so truncation should never be reached; it exists so that a font
 * substitution degrades to a clipped word rather than a scrolling navigation.
 */
const labelClasses = 'w-full truncate text-sm font-medium leading-tight'

export default function BottomNavBar({ onMoreClick, isMoreOpen = false }: BottomNavBarProps) {
  const pathname = usePathname()
  const { crmEnabled } = useCrmEnabled()
  const { logbookEnabled } = useLogbookEnabled()

  // Matches Sidebar and MobileDrawer. No bottom-bar destination is gated today,
  // so this changes nothing now; it stops a gated item added later from
  // rendering here regardless of its flag. The fluid row absorbs a smaller set.
  const navItems = filterByFeatures(bottomNavItems, { crm: crmEnabled, logbook: logbookEnabled })

  const isActiveHref = (href: string) =>
    href === '/dashboard'
      ? pathname === href
      : pathname === href || pathname.startsWith(href + '/')

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
    >
      <div className="flex items-stretch">
        {navItems.map(item => {
          const isActive = isActiveHref(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`${slotClasses} ${
                isActive
                  ? 'text-forest-600 dark:text-forest-400'
                  : 'text-text-tertiary hover:text-foreground'
              }`}
            >
              <item.icon size={22} />
              <span className={labelClasses}>{item.shortLabel ?? item.label}</span>
            </Link>
          )
        })}

        <Button
          onClick={onMoreClick}
          tone="neutral"
          size="xs"
          aria-label={isMoreOpen ? 'Close menu' : 'Open menu'}
          aria-haspopup="dialog"
          aria-expanded={isMoreOpen}
          aria-controls="mobile-drawer"
          className={`${slotClasses} border-l border-border bg-transparent text-text-tertiary hover:text-foreground`}
        >
          <Menu size={22} />
          <span className={labelClasses}>More</span>
        </Button>
      </div>
    </nav>
  )
}
