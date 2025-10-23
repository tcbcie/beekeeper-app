'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Crown, Egg, Archive, MapPin, ClipboardList, Settings, X, Wrench, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getUserRole, type UserRole } from '@/lib/auth'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<UserRole>('User')

  // Debug logging
  useEffect(() => {
    console.log('MobileDrawer isOpen:', isOpen)
  }, [isOpen])

  useEffect(() => {
    const fetchRole = async () => {
      const role = await getUserRole()
      setUserRole(role)
    }
    fetchRole()
  }, [])

  const baseNavItems = [
    { href: '/dashboard', label: 'Overview', icon: Home },
    { href: '/dashboard/queens', label: 'Queens', icon: Crown },
    { href: '/dashboard/batches', label: 'Rearing Batches', icon: Egg },
    { href: '/dashboard/hives', label: 'Hives', icon: Archive },
    { href: '/dashboard/apiaries', label: 'Apiaries', icon: MapPin },
    { href: '/dashboard/inspections', label: 'Inspections', icon: ClipboardList },
    { href: '/dashboard/tools', label: 'Tools', icon: Wrench },
    { href: '/dashboard/profile', label: 'Profile', icon: User },
  ]

  const adminNavItems = [
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ]

  // Only show Settings menu item for admins
  const navItems = userRole === 'Admin'
    ? [...baseNavItems, ...adminNavItems]
    : baseNavItems

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

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-[60] md:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-[70] transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 touch-manipulation"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-4 px-4 py-4 rounded-lg transition-colors touch-manipulation ${
                      isActive
                        ? 'bg-amber-50 text-amber-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                    }`}
                  >
                    <item.icon size={24} />
                    <span className="text-base">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </nav>
        </div>
      </aside>
    </>
  )
}
