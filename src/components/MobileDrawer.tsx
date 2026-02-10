'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Crown, Egg, Archive, MapPin, ClipboardList, Settings, X, Wrench, User, Info, Calendar, Users, FlaskConical, FileText, QrCode } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getUserRole, type UserRole } from '@/lib/auth'

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

  const baseNavItems = [
    { href: '/dashboard', label: 'Overview', icon: Home },
    { href: '/dashboard/hives', label: 'Hives', icon: Archive },
    { href: '/dashboard/apiaries', label: 'Apiaries', icon: MapPin },
    { href: '/dashboard/records', label: 'Records', icon: ClipboardList },
    { href: '/dashboard/tasks', label: 'Tasks & Events', icon: Calendar },
    { href: '/dashboard/community-map', label: 'Community Map', icon: Users },
    { href: '/dashboard/queens', label: 'Queens', icon: Crown },
    { href: '/dashboard/batches', label: 'Queen Rearing', icon: Egg },
    { href: '/dashboard/tools', label: 'Tools', icon: Wrench },
    { href: '/dashboard/qr-tags', label: 'QR Tags', icon: QrCode },
    { href: '/dashboard/reports', label: 'Reports', icon: FileText },
    { href: '/dashboard/research', label: 'Research', icon: FlaskConical },
    { href: '/dashboard/profile', label: 'Profile', icon: User },
    { href: '/dashboard/about', label: 'About', icon: Info },
  ]

  const adminNavItems = [
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ]

  // Build nav items based on role
  const navItems = [
    ...baseNavItems,
    ...(userRole === 'Admin' ? adminNavItems : [])
  ]

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
        className={`fixed top-0 left-0 h-full w-72 bg-surface dark:bg-surface shadow-xl z-[70] transform transition-transform duration-300 ease-in-out md:hidden border-r border-border ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-sage-100 dark:hover:bg-slate-800 text-text-secondary hover:text-foreground touch-manipulation min-h-[48px] min-w-[48px] flex items-center justify-center"
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
                    className={`flex items-center gap-4 px-4 py-4 rounded-lg transition-all duration-200 touch-manipulation min-h-[48px] ${
                      isActive
                        ? 'bg-emerald-600 text-white font-medium border-l-2 border-emerald-400'
                        : 'text-text-secondary hover:bg-sage-100 dark:hover:bg-slate-800 active:bg-sage-200 dark:active:bg-slate-700 hover:text-foreground'
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
