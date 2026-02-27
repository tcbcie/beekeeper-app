'use client'
import { usePathname } from 'next/navigation'
import { useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { baseNavItems } from '@/lib/navigation'
import Button from '@/components/ui/Button'

interface BottomNavBarProps {
  onMoreClick: () => void
}

// Show all items except bottom-pinned ones (Profile, About)
const scrollableItems = baseNavItems.filter(item => !item.pinToBottom)

export default function BottomNavBar({ onMoreClick }: BottomNavBarProps) {
  const pathname = usePathname()
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLAnchorElement>(null)

  // Auto-scroll active item into view on route change
  const scrollToActive = useCallback(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    scrollToActive()
  }, [pathname, scrollToActive])

  return (
    <nav aria-label="Quick navigation" className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-surface/95 backdrop-blur-lg border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch">
        {/* Scrollable nav items with fade edges */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto scrollbar-hide scroll-fade"
        >
          <div className="flex items-stretch">
            {scrollableItems.map(item => {
              const isActive = item.href === '/dashboard'
                ? pathname === item.href
                : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  ref={isActive ? activeRef : undefined}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1 py-2 px-3 min-h-[48px] min-w-[60px] shrink-0 transition-colors touch-manipulation ${
                    isActive
                      ? 'text-forest-600 dark:text-forest-400'
                      : 'text-text-tertiary hover:text-foreground'
                  }`}
                >
                  <item.icon size={22} />
                  <span className="text-[10px] font-medium leading-none whitespace-nowrap">{item.label}</span>
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
          aria-label="Open menu"
          aria-haspopup="true"
          className="flex min-h-[48px] min-w-[48px] shrink-0 flex-col items-center justify-center gap-1 border-l border-border bg-transparent px-3 py-2 text-text-tertiary hover:text-foreground touch-manipulation"
        >
          <Menu size={22} />
          <span className="text-[10px] font-medium leading-none">More</span>
        </Button>
      </div>
    </nav>
  )
}
