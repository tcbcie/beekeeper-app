'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Archive, ClipboardList, Calendar, Wrench, Menu } from 'lucide-react'

interface BottomNavBarProps {
  onMoreClick: () => void
}

const navItems = [
  { href: '/dashboard/hives', label: 'Hives', icon: Archive },
  { href: '/dashboard/records', label: 'Records', icon: ClipboardList },
  { href: '/dashboard/tasks', label: 'Tasks', icon: Calendar },
  { href: '/dashboard/tools', label: 'Tools', icon: Wrench },
]

export default function BottomNavBar({ onMoreClick }: BottomNavBarProps) {
  const pathname = usePathname()

  return (
    <nav aria-label="Quick navigation" className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white/95 dark:bg-surface/95 backdrop-blur-lg border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around">
        {navItems.map(item => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-1 min-h-[48px] min-w-[48px] flex-1 transition-colors ${
                isActive
                  ? 'text-forest-600 dark:text-forest-400'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              <item.icon size={22} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          )
        })}
        <button
          onClick={onMoreClick}
          aria-label="Open menu"
          aria-haspopup="true"
          className="flex flex-col items-center justify-center gap-1 py-2 px-1 min-h-[48px] min-w-[48px] flex-1 text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <Menu size={22} />
          <span className="text-[10px] font-medium leading-none">More</span>
        </button>
      </div>
    </nav>
  )
}
