'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Crown, Egg, Archive, MapPin, ClipboardList } from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: Home },
    { href: '/dashboard/queens', label: 'Queens', icon: Crown },
    { href: '/dashboard/batches', label: 'Rearing Batches', icon: Egg },
    { href: '/dashboard/hives', label: 'Hives', icon: Archive },
    { href: '/dashboard/apiaries', label: 'Apiaries', icon: MapPin },
    { href: '/dashboard/inspections', label: 'Inspections', icon: ClipboardList },
  ]

  return (
    <aside className="w-64 bg-white rounded-lg shadow p-4 h-fit">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-amber-50 text-amber-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}