import {
  Home, Crown, Egg, Archive, MapPin, ClipboardList, Settings,
  Wrench, User, Info, Calendar, Users, FlaskConical, FileText,
  BookOpen,
  type LucideIcon,
} from 'lucide-react'

export type NavGroupId = 'manage' | 'activity' | 'insights'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  group?: NavGroupId
  pinToBottom?: boolean
  afterGroups?: boolean
}

export interface NavGroup {
  id: NavGroupId
  label: string
}

export const navGroups: NavGroup[] = [
  { id: 'manage', label: 'Manage' },
  { id: 'activity', label: 'Activity' },
  { id: 'insights', label: 'Insights' },
]

export const baseNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: Home },
  { href: '/dashboard/apiaries', label: 'Apiaries', icon: MapPin, group: 'manage' },
  { href: '/dashboard/hives', label: 'Hives', icon: Archive, group: 'manage' },
  { href: '/dashboard/queens', label: 'Queens', icon: Crown, group: 'manage' },
  { href: '/dashboard/batches', label: 'Queen Rearing', icon: Egg, group: 'manage' },
  { href: '/dashboard/records', label: 'Records', icon: ClipboardList, group: 'activity' },
  { href: '/dashboard/tasks', label: 'Tasks & Events', icon: Calendar, group: 'activity' },
  { href: '/dashboard/logbook', label: 'Logbook', icon: BookOpen, group: 'activity' },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText, group: 'insights' },
  { href: '/dashboard/research', label: 'Research', icon: FlaskConical, group: 'insights' },
  { href: '/dashboard/community-map', label: 'Community Map', icon: Users, group: 'insights' },
  { href: '/dashboard/tools', label: 'Tools', icon: Wrench, afterGroups: true },
  { href: '/dashboard/profile', label: 'Profile', icon: User, pinToBottom: true },
  { href: '/dashboard/about', label: 'About', icon: Info, pinToBottom: true },
]

export const adminNavItems: NavItem[] = [
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

/** Items with no group and not pinned to bottom (e.g. Overview) */
export function getTopItems(): NavItem[] {
  return baseNavItems.filter(item => !item.group && !item.pinToBottom && !item.afterGroups)
}

/** Ungrouped items that render after all groups (e.g. Tools) */
export function getAfterGroupItems(): NavItem[] {
  return baseNavItems.filter(item => item.afterGroups)
}

/** Items grouped by NavGroupId, in group order */
export function getGroupedItems(): { group: NavGroup; items: NavItem[] }[] {
  return navGroups.map(group => ({
    group,
    items: baseNavItems.filter(item => item.group === group.id),
  }))
}

/** Items pinned to the bottom (Profile, About) */
export function getBottomItems(): NavItem[] {
  return baseNavItems.filter(item => item.pinToBottom)
}
