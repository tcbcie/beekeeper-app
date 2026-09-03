'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getUserRole, type UserRole } from '@/lib/auth'
import { useDialogA11y } from '@/hooks/useDialogA11y'
import { useVerticalSwipe } from '@/hooks/useVerticalSwipe'
import { useCrmEnabled } from '@/hooks/useCrmEnabled'
import { useLogbookEnabled } from '@/hooks/useLogbookEnabled'
import IconButton from '@/components/ui/IconButton'
import {
  getTopItems,
  getGroupedItems,
  getAfterGroupItems,
  getBottomItems,
  filterByFeatures,
  adminNavItems,
} from '@/lib/navigation'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname()
  const { crmEnabled } = useCrmEnabled()
  const { logbookEnabled } = useLogbookEnabled()
  const features = { crm: crmEnabled, logbook: logbookEnabled }
  const [userRole, setUserRole] = useState<UserRole>('User')
  const drawerRef = useRef<HTMLElement | null>(null)

  useDialogA11y({ isOpen, onClose, containerRef: drawerRef })

  // Swiping down closes it. The handlers sit on the grabber and title row only,
  // never on the list below, so the gesture has nothing to compete with: the
  // header does not scroll, and a drag there can never be an attempt to reach
  // the sixteenth destination. Reading a scroll offset to decide which the user
  // meant would be guesswork that this does not need.
  //
  // The close button inside this region is unaffected, because a tap does not
  // travel far enough to register and nothing here calls preventDefault.
  const swipeHandlers = useVerticalSwipe({ onSwipeDown: onClose })

  useEffect(() => {
    const fetchRole = async () => {
      const role = await getUserRole()
      setUserRole(role)
    }
    fetchRole()
  }, [])

  const topItems = getTopItems()
  const groupedItems = getGroupedItems()
  const afterGroupItems = getAfterGroupItems()
  const bottomItems = getBottomItems()

  // Close drawer when route changes (only if drawer is open)
  useEffect(() => {
    if (isOpen) {
      onClose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const isActiveHref = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  const linkClasses = (href: string) => {
    const isActive = isActiveHref(href)
    return `flex items-center gap-4 px-4 py-4 rounded-lg transition-all duration-200 touch-manipulation min-h-[48px] ${
      isActive
        ? 'bg-forest-600 text-white font-medium border-l-2 border-forest-400'
        : 'text-text-secondary hover:bg-surface-elevated active:bg-surface-elevated hover:text-foreground'
    }`
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] md:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* The menu, presented as a bottom sheet.
          `inert` while closed is what keeps the navigation links out of the
          tab order and the accessibility tree. The panel stays mounted and is
          only translated off-screen, so without it every link below remains
          focusable and announceable while the menu looks shut.

          It rises from the bottom because that is where the control that opens
          it lives. As a left drawer it put its first destination at the top of
          the screen, diagonally opposite the thumb that had just tapped More -
          and at w-72 on a 360px phone it already covered 80% of the width, so
          a full-width sheet costs no more room and lands under the thumb.

          It stops above the bottom bar, using the same --bottom-nav-inset the
          seven other floating surfaces use, so the bar stays visible and the
          user keeps their sense of place. The closed transform has to clear
          that inset as well as the sheet's own height, or the sheet would sit
          over the bar instead of below the fold. */}
      <aside
        ref={drawerRef}
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-drawer-title"
        inert={!isOpen}
        tabIndex={-1}
        className={`fixed left-0 right-0 bottom-[var(--bottom-nav-inset)] z-[70] flex max-h-[75vh] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-surface/95 backdrop-blur-xl transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen
            ? 'translate-y-0'
            : 'translate-y-[calc(100%_+_var(--bottom-nav-inset)_+_1rem)]'
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Grabber.
              Decorative on purpose. The X beside the title is the accessible
              close control, and exposing a second one would announce two ways
              to do one thing - the same reasoning that downgraded the hive
              overflow menu from a role it did not honour.

              It is the shortest band that still reads as a handle, because the
              sheet already spends a header row on the title and close button.
              The swipe-to-close surface is this band together with that row,
              which clears the 48px floor; this band alone would not. */}
          <div {...swipeHandlers}>
            <div aria-hidden="true" className="flex justify-center pt-3 pb-1">
              {/* text-tertiary, not the border colour: this has to read as a handle
                  to an audience with reduced eyesight, and the divider tone is
                  chosen to recede. It matches the inactive bottom-bar icons. */}
              <span className="h-1 w-10 rounded-full bg-text-tertiary" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 id="mobile-drawer-title" className="text-lg font-semibold text-foreground">Menu</h2>
              <IconButton
                onClick={onClose}
                className="touch-manipulation min-h-[48px] min-w-[48px] flex items-center justify-center"
                aria-label="Close menu"
              >
                <X size={24} />
              </IconButton>
            </div>
          </div>

          {/* Navigation */}
          <nav aria-label="Main navigation" className="min-h-0 flex-1 overflow-y-auto p-4">
            {/* Top items (Overview) */}
            <div className="space-y-2">
              {topItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActiveHref(item.href) ? 'page' : undefined}
                  className={linkClasses(item.href)}
                >
                  <item.icon size={24} />
                  <span className="text-base">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Grouped items */}
            {groupedItems.map(({ group, items: allItems }) => {
              const items = filterByFeatures(allItems, features)
              if (items.length === 0) return null
              return (
                <div key={group.id} className="mt-4">
                  <p className="px-4 py-1 text-sm font-semibold uppercase tracking-wider text-text-tertiary">
                    {group.label}
                  </p>
                  <div className="space-y-2 mt-1">
                    {items.map(item => (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={isActiveHref(item.href) ? 'page' : undefined}
                        className={linkClasses(item.href)}
                      >
                        <item.icon size={24} />
                        <span className="text-base">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* After-group items (Tools) */}
            <div className="space-y-2 mt-4">
              {afterGroupItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActiveHref(item.href) ? 'page' : undefined}
                  className={linkClasses(item.href)}
                >
                  <item.icon size={24} />
                  <span className="text-base">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-border my-4" />

            {/* Bottom items (Profile, About) */}
            <div className="space-y-2">
              {bottomItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActiveHref(item.href) ? 'page' : undefined}
                  className={linkClasses(item.href)}
                >
                  <item.icon size={24} />
                  <span className="text-base">{item.label}</span>
                </Link>
              ))}

              {/* Admin */}
              {userRole === 'Admin' && adminNavItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActiveHref(item.href) ? 'page' : undefined}
                  className={linkClasses(item.href)}
                >
                  <item.icon size={24} />
                  <span className="text-base">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </aside>
    </>
  )
}
