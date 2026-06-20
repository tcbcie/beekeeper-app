'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { getUserRole, type UserRole } from '@/lib/auth'
import { useCrmEnabled } from '@/hooks/useCrmEnabled'
import { useLogbookEnabled } from '@/hooks/useLogbookEnabled'
import VersionDisplay from './VersionDisplay'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import {
  getTopItems,
  getGroupedItems,
  getAfterGroupItems,
  getBottomItems,
  filterByFeatures,
  navGroups,
  adminNavItems,
  type NavGroupId,
} from '@/lib/navigation'

const VALID_GROUP_IDS: ReadonlySet<string> = new Set(navGroups.map(g => g.id))

function safeGetItem(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

function safeSetItem(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* storage unavailable or quota exceeded */ }
}

export default function Sidebar() {
  const pathname = usePathname()
  const { crmEnabled } = useCrmEnabled()
  const { logbookEnabled } = useLogbookEnabled()
  const features = { crm: crmEnabled, logbook: logbookEnabled }
  const [userRole, setUserRole] = useState<UserRole>('User')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<NavGroupId[]>([])

  useEffect(() => {
    const saved = safeGetItem('sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(saved === 'true')
    }
    const savedGroups = safeGetItem('sidebar-collapsed-groups')
    if (savedGroups) {
      try {
        const parsed: unknown = JSON.parse(savedGroups)
        if (Array.isArray(parsed)) {
          const validated = parsed.filter(
            (v): v is NavGroupId => typeof v === 'string' && VALID_GROUP_IDS.has(v)
          )
          setCollapsedGroups(validated)
        }
      } catch { /* ignore invalid JSON */ }
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const role = await getUserRole()
        if (!cancelled) setUserRole(role)
      } catch { /* keep default 'User' on failure */ }
    })()
    return () => { cancelled = true }
  }, [])

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev
      safeSetItem('sidebar-collapsed', String(next))
      return next
    })
  }

  const toggleGroup = (groupId: NavGroupId) => {
    setCollapsedGroups(prev => {
      const next = prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
      safeSetItem('sidebar-collapsed-groups', JSON.stringify(next))
      return next
    })
  }

  const topItems = getTopItems()
  const groupedItems = getGroupedItems()
  const afterGroupItems = getAfterGroupItems()
  const bottomItems = getBottomItems()

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  const linkClasses = (href: string) => {
    return `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      isActive(href)
        ? 'bg-forest-600 text-white font-medium border-l-2 border-forest-400'
        : 'text-text-secondary hover:bg-surface-elevated hover:text-foreground'
    } ${isCollapsed ? 'justify-center px-2' : ''}`
  }

  return (
    <aside className={`hidden md:block sticky top-20 self-start field-journal-panel p-4 h-fit max-h-[calc(100vh-6rem)] overflow-y-auto transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Collapse Toggle */}
      <IconButton
        onClick={toggleCollapsed}
        className="mb-2 w-full"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </IconButton>

      <nav className="space-y-1">
        {/* Top items (Overview) */}
        {topItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={linkClasses(item.href)}
            title={isCollapsed ? item.label : undefined}
            aria-current={isActive(item.href) ? 'page' : undefined}
          >
            <item.icon size={20} className="shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
          </Link>
        ))}

        {/* Grouped items */}
        {!isCollapsed ? (
          groupedItems.map(({ group, items: allItems }) => {
            const items = filterByFeatures(allItems, features)
            if (items.length === 0) return null
            const isGroupCollapsed = collapsedGroups.includes(group.id)
            const groupRegionId = `nav-group-${group.id}`
            return (
              <div key={group.id} className="pt-2">
                <Button
                  onClick={() => toggleGroup(group.id)}
                  tone="neutral"
                  size="xs"
                  className="w-full justify-between px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary hover:text-text-secondary"
                  aria-expanded={!isGroupCollapsed}
                  aria-controls={groupRegionId}
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${isGroupCollapsed ? '-rotate-90' : ''}`}
                  />
                </Button>
                {!isGroupCollapsed && (
                  <div id={groupRegionId} className="space-y-1 mt-1">
                    {items.map(item => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={linkClasses(item.href)}
                        aria-current={isActive(item.href) ? 'page' : undefined}
                      >
                        <item.icon size={20} className="shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        ) : (
          /* Icon-only mode: flat list without group headers */
          groupedItems.flatMap(({ items }) =>
            filterByFeatures(items, features).map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={linkClasses(item.href)}
                title={item.label}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                <item.icon size={20} className="shrink-0" />
              </Link>
            ))
          )
        )}

        {/* After-group items (Tools) */}
        {afterGroupItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={linkClasses(item.href)}
            title={isCollapsed ? item.label : undefined}
            aria-current={isActive(item.href) ? 'page' : undefined}
          >
            <item.icon size={20} className="shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
          </Link>
        ))}

        {/* Divider */}
        <div className="border-t border-border my-2" />

        {/* Bottom items (Profile, About) */}
        {bottomItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={linkClasses(item.href)}
            title={isCollapsed ? item.label : undefined}
            aria-current={isActive(item.href) ? 'page' : undefined}
          >
            <item.icon size={20} className="shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
          </Link>
        ))}

        {/* Admin */}
        {userRole === 'Admin' && adminNavItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={linkClasses(item.href)}
            title={isCollapsed ? item.label : undefined}
            aria-current={isActive(item.href) ? 'page' : undefined}
          >
            <item.icon size={20} className="shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {!isCollapsed && (
        <div className="mt-4 pt-4 border-t border-border flex justify-center">
          <VersionDisplay />
        </div>
      )}
    </aside>
  )
}
