'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getUserRole, type UserRole } from '@/lib/auth'
import {
  getTopItems,
  getGroupedItems,
  getAfterGroupItems,
  getBottomItems,
  adminNavItems,
} from '@/lib/navigation'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<UserRole>('User')

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

  const linkClasses = (href: string) => {
    const isActive = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
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

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 z-[70] h-full w-72 border-r border-border bg-surface/95 backdrop-blur-xl transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Menu</h2>
            <button
              onClick={onClose}
              className="fj-icon-btn p-2 touch-manipulation min-h-[48px] min-w-[48px] flex items-center justify-center"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            {/* Top items (Overview) */}
            <div className="space-y-2">
              {topItems.map(item => (
                <Link key={item.href} href={item.href} className={linkClasses(item.href)}>
                  <item.icon size={24} />
                  <span className="text-base">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Grouped items */}
            {groupedItems.map(({ group, items }) => (
              <div key={group.id} className="mt-4">
                <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  {group.label}
                </p>
                <div className="space-y-2 mt-1">
                  {items.map(item => (
                    <Link key={item.href} href={item.href} className={linkClasses(item.href)}>
                      <item.icon size={24} />
                      <span className="text-base">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {/* After-group items (Tools) */}
            <div className="space-y-2 mt-4">
              {afterGroupItems.map(item => (
                <Link key={item.href} href={item.href} className={linkClasses(item.href)}>
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
                <Link key={item.href} href={item.href} className={linkClasses(item.href)}>
                  <item.icon size={24} />
                  <span className="text-base">{item.label}</span>
                </Link>
              ))}

              {/* Admin */}
              {userRole === 'Admin' && adminNavItems.map(item => (
                <Link key={item.href} href={item.href} className={linkClasses(item.href)}>
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
