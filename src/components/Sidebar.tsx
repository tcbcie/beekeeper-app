'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Home, Crown, Egg, Archive, MapPin, ClipboardList, Settings, Wrench, User, Info, Calendar, Users } from 'lucide-react'
import { getUserRole, type UserRole } from '@/lib/auth'
import VersionDisplay from './VersionDisplay'

export default function Sidebar() {
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
    { href: '/dashboard/queens', label: 'Queens', icon: Crown },
    { href: '/dashboard/batches', label: 'Queen Rearing', icon: Egg },
    { href: '/dashboard/hives', label: 'Hives', icon: Archive },
    { href: '/dashboard/apiaries', label: 'Apiaries', icon: MapPin },
    { href: '/dashboard/community-map', label: 'Community Map', icon: Users },
    { href: '/dashboard/records', label: 'Records', icon: ClipboardList },
    { href: '/dashboard/tasks', label: 'Tasks & Events', icon: Calendar },
    { href: '/dashboard/tools', label: 'Tools', icon: Wrench },
    { href: '/dashboard/profile', label: 'Profile', icon: User },
    { href: '/dashboard/about', label: 'About', icon: Info },
  ]

  const adminNavItems = [
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ]

  // Only show Settings menu item for admins
  const navItems = userRole === 'Admin'
    ? [...baseNavItems, ...adminNavItems]
    : baseNavItems

  return (
    <aside className="hidden md:block w-64 bg-surface dark:bg-surface rounded-xl shadow-lg p-4 h-fit border border-border">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-emerald-600 text-white font-medium border-l-2 border-emerald-400'
                  : 'text-text-secondary hover:bg-sage-100 dark:hover:bg-slate-800 hover:text-foreground'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="mt-4 pt-4 border-t border-border flex justify-center">
        <VersionDisplay />
      </div>
    </aside>
  )
}