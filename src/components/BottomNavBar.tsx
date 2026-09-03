'use client'
import { useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronUp } from 'lucide-react'
import { baseNavItems, filterByFeatures } from '@/lib/navigation'
import { useCrmEnabled } from '@/hooks/useCrmEnabled'
import { useVerticalSwipe } from '@/hooks/useVerticalSwipe'
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

  // Swiping up on the bar opens the menu, as a shortcut beside the More button
  // rather than instead of it - the test this programme set when it kept
  // double-click on the image viewer and removed every affordance that was
  // gesture-only. The gesture starts on the bar and never on the screen edge
  // below it, which iOS's home indicator and Android's gesture navigation both
  // claim; a swipe beginning there is intercepted before it reaches us.
  //
  // A false positive is cheap here: it opens the same sheet a tap would have,
  // and Escape, the backdrop and More itself all close it again.
  const swipedAt = useRef(0)
  const swipeHandlers = useVerticalSwipe({
    onSwipeUp: () => {
      if (isMoreOpen) return
      swipedAt.current = Date.now()
      onMoreClick()
    },
  })

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
      {...swipeHandlers}
      // Insurance, not the mechanism. Browsers withhold the synthetic click
      // once a touch has travelled past their slop threshold, and 45px is far
      // beyond it - but a swipe that began on a destination and still produced
      // a click would open the menu and navigate at once, and the sheet's own
      // route-change effect would then shut what had just opened. The window is
      // tied to an actual detected swipe and expires on its own, so no ordinary
      // tap can be caught by it.
      onClickCapture={event => {
        if (Date.now() - swipedAt.current > 400) return
        swipedAt.current = 0
        event.preventDefault()
        event.stopPropagation()
      }}
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
          {/* A chevron rather than a hamburger, because the menu now rises
              from this slot: the icon states the direction of the interaction
              and doubles as the "there is more here" cue. It rotates to point
              down while open, so the same control reads as the way back. The
              label stays "More", so the slot is never an icon alone, and the
              accessible name already switches between Open and Close. */}
          <ChevronUp
            size={22}
            className={`transition-transform duration-300 ${isMoreOpen ? 'rotate-180' : ''}`}
          />
          <span className={labelClasses}>More</span>
        </Button>
      </div>
    </nav>
  )
}
