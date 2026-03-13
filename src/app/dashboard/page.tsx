'use client'
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { getCurrentUserId, getUserRole, type UserRole } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import AppIcon from '@/components/icons/AppIcon'
import AlertPanel from '@/components/ui/AlertPanel'
import { Skeleton, SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton'
import Panel from '@/components/ui/Panel'
import Button from '@/components/ui/Button'
import UpcomingEvents from '@/components/UpcomingEvents'
import Link from 'next/link'
import { Shield, Users, Crown, UserCheck, Search, Syringe, Bug, Wheat, Droplet, MessageCircle, Clock, CheckCircle, Reply, AlertTriangle, ClipboardList, Plus, Egg, ListChecks, GripVertical } from 'lucide-react'
import { useDashboardStats, useTeams, useTicketStatus } from '@/hooks'
import { useGeolocation, haversineKm } from '@/hooks/useGeolocation'
import { useRearingGroups } from '@/hooks/useRearingGroups'
import type { RecentActivityRecord } from '@/types/dashboard'
import ApiaryWeatherRow from '@/components/dashboard/ApiaryWeatherRow'
import { formatLocalDate } from '@/lib/date-utils'
import { dashboardCardIcons, iconography } from '@/lib/iconography'

function getRecentActivityTypeParam(recordType: RecentActivityRecord['record_type']): string {
  switch (recordType) {
    case 'varroa_check':
      return 'varroa-check'
    case 'varroa_treatment':
      return 'varroa-treatment'
    default:
      return recordType
  }
}

function buildRecentActivityHref(record: RecentActivityRecord): string {
  const params = new URLSearchParams({
    type: getRecentActivityTypeParam(record.record_type),
    record: record.id,
  })

  if (record.hive_id) {
    params.set('hive', record.hive_id)
  }

  return `/dashboard/records?${params.toString()}`
}

function formatRecentActivityDate(dateString: string): string {
  if (dateString.includes('T')) {
    return new Date(dateString).toLocaleDateString('en-IE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return formatLocalDate(dateString)
}

const VALID_DROP_ACTIONS = ['inspection', 'feeding', 'varroa_check', 'varroa_treatment', 'harvest']

export default function DashboardPage() {
 const [userId, setUserId] = useState<string | null>(null)
 const [userRole, setUserRole] = useState<UserRole>('User')
 const [showMySharedDetails, setShowMySharedDetails] = useState(false)
 const [showTeamsSection, setShowTeamsSection] = useState(false)
 const router = useRouter()

 // Custom hooks
 const { stats, apiaries, alerts, recentActivity, loading, error: dashboardError, recentActivityError, fetchDashboardData } = useDashboardStats()
 const {
 ownedTeams,
 memberTeams,
 mySharedStats,
 sharedWithMeStats,
 mySharedTeamMembers,
 loadingTeams,
 loadingTeamMembers,
 fetchTeams,
 fetchTeamStats,
 fetchMySharedTeamMembers,
 } = useTeams()
 const { openTicketsCount, userTicketStatus, fetchOpenTicketsCount, fetchUserTicketStatus } = useTicketStatus()
 const { ownedRearingGroups, memberRearingGroups, loadingRearingGroups, fetchRearingGroups } = useRearingGroups()
 const devicePosition = useGeolocation()

 // Touch drag-and-drop for mobile (HTML5 DnD doesn't work on touch)
 const touchDragRef = useRef<{
   type: string
   ghost: HTMLElement
   lastTarget: Element | null
 } | null>(null)

 const handleTouchStart = useCallback((e: React.TouchEvent, dragType: string, label: string) => {
   e.preventDefault()
   const touch = e.touches[0]
   const ghost = document.createElement('div')
   ghost.textContent = label
   ghost.style.cssText = `
     position:fixed;z-index:9999;pointer-events:none;
     padding:6px 14px;border-radius:8px;font-size:14px;font-weight:600;
     background:#f59e0b;color:#fff;box-shadow:0 4px 12px rgba(0,0,0,0.25);
     transform:translate(-50%,-50%);white-space:nowrap;
   `
   ghost.style.left = `${touch.clientX}px`
   ghost.style.top = `${touch.clientY}px`
   document.body.appendChild(ghost)
   touchDragRef.current = { type: dragType, ghost, lastTarget: null }
 }, [])

 const handleTouchMove = useCallback((e: React.TouchEvent) => {
   if (!touchDragRef.current) return
   e.preventDefault()
   const touch = e.touches[0]
   const { ghost, lastTarget } = touchDragRef.current
   ghost.style.left = `${touch.clientX}px`
   ghost.style.top = `${touch.clientY}px`

   // Find apiary card under finger
   ghost.style.display = 'none'
   const el = document.elementFromPoint(touch.clientX, touch.clientY)
   ghost.style.display = ''
   const card = el?.closest('[data-apiary-id]') ?? null

   if (card !== lastTarget) {
     if (lastTarget) (lastTarget as HTMLElement).dataset.dragover = ''
     if (card) (card as HTMLElement).dataset.dragover = 'true'
     touchDragRef.current.lastTarget = card
   }
 }, [])

 const cleanupTouchDrag = useCallback((navigate: boolean) => {
   if (!touchDragRef.current) return
   const { type, ghost, lastTarget } = touchDragRef.current
   ghost.remove()
   if (lastTarget) {
     (lastTarget as HTMLElement).dataset.dragover = ''
     if (navigate && VALID_DROP_ACTIONS.includes(type)) {
       const apiaryId = (lastTarget as HTMLElement).dataset.apiaryId
       if (apiaryId) {
         router.push(`/dashboard/records?create=${type}&apiary=${apiaryId}`)
       }
     }
   }
   touchDragRef.current = null
 }, [router])

 const handleTouchEnd = useCallback(() => { cleanupTouchDrag(true) }, [cleanupTouchDrag])
 const handleTouchCancel = useCallback(() => { cleanupTouchDrag(false) }, [cleanupTouchDrag])

 // Safety net: remove ghost if component unmounts mid-drag
 useEffect(() => {
   return () => { cleanupTouchDrag(false) }
 }, [cleanupTouchDrag])

 useEffect(() => {
 const initUser = async () => {
 const id = await getCurrentUserId()
 if (!id) {
 router.push('/login')
 return
 }
 setUserId(id)

 // Fetch user role
 const role = await getUserRole()
 setUserRole(role)

 // Fetch open tickets count if admin
 if (role === 'Admin') {
 fetchOpenTicketsCount()
 }

 // Fetch user's own ticket status (for non-admins)
 fetchUserTicketStatus(id)

 // Fetch dashboard data
 fetchDashboardData(id)
 }
 initUser()
 }, [router, fetchDashboardData, fetchOpenTicketsCount, fetchUserTicketStatus])

 // Separate effect for team/group data that depends on userId being set
 useEffect(() => {
 if (userId) {
 fetchTeams(userId)
 fetchTeamStats(userId)
 fetchRearingGroups(userId)
 }
 }, [userId, fetchTeams, fetchTeamStats, fetchRearingGroups])

 // Memoised computed values (must be above early return to satisfy rules-of-hooks)
 // Sort apiaries nearest-first when GPS is available
 const sortedApiaries = useMemo(() => {
  if (!devicePosition || apiaries.length === 0) return apiaries
  // Pre-compute distances once (O(n)), then sort by lookup
  const withDistance = apiaries.map(apiary => ({
   apiary,
   dist: apiary.latitude != null && apiary.longitude != null
    ? haversineKm(devicePosition.latitude, devicePosition.longitude, apiary.latitude, apiary.longitude)
    : Infinity,
  }))
  withDistance.sort((a, b) => a.dist - b.dist)
  return withDistance.map(entry => entry.apiary)
 }, [apiaries, devicePosition])

 const isTeamMember = useMemo(() => ownedTeams.length > 0 || memberTeams.length > 0, [ownedTeams, memberTeams])
 const isRearingGroupMember = useMemo(() => ownedRearingGroups.length > 0 || memberRearingGroups.length > 0, [ownedRearingGroups, memberRearingGroups])

 const statCards = useMemo(() => [
 { label: 'My Apiaries', value: stats.apiaries, icon: dashboardCardIcons.apiaries, color: 'bg-green-50 dark:bg-green-900/30 text-foreground dark:text-green-300', href: '/dashboard/apiaries' },
 { label: 'My Hives', value: stats.hives, icon: dashboardCardIcons.hives, color: 'bg-amber-50 dark:bg-amber-900/30 text-foreground dark:text-amber-300', href: '/dashboard/hives' },
 { label: 'Inspections (7d)', value: stats.recentInspections, icon: dashboardCardIcons.inspections, color: 'bg-indigo-50 dark:bg-indigo-900/30 text-foreground dark:text-indigo-300', href: '/dashboard/records' },
 { label: 'Active Queens', value: stats.queens, icon: dashboardCardIcons.queens, color: 'bg-purple-50 dark:bg-purple-900/30 text-foreground dark:text-purple-300', href: '/dashboard/queens' },
 { label: 'Active Tasks', value: stats.activeTasks, icon: dashboardCardIcons.tasks, color: 'bg-teal-50 dark:bg-teal-900/30 text-foreground dark:text-teal-300', href: '/dashboard/tasks' },
 ], [stats])

 const hasMySharedData = useMemo(() => mySharedStats.hives > 0 || mySharedStats.queens > 0 || mySharedStats.inspections > 0, [mySharedStats])
 const hasSharedWithMeData = useMemo(() => sharedWithMeStats.hives > 0 || sharedWithMeStats.queens > 0 || sharedWithMeStats.inspections > 0, [sharedWithMeStats])

 const mySharedCards = useMemo(() => hasMySharedData ? [
 { label: 'Queens I Shared', value: mySharedStats.queens, icon: iconography.queen, color: 'bg-purple-100 dark:bg-purple-900/30 text-foreground dark:text-purple-300 border-2 border-purple-300 dark:border-purple-700' },
 { label: 'Active Queens Shared', value: mySharedStats.activeQueens, icon: iconography.highlight, color: 'bg-green-100 dark:bg-green-900/30 text-foreground dark:text-green-300 border-2 border-green-300 dark:border-green-700' },
 { label: 'Hives I Shared', value: mySharedStats.hives, icon: iconography.hive, color: 'bg-amber-100 dark:bg-amber-900/30 text-foreground dark:text-amber-300 border-2 border-amber-300 dark:border-amber-700' },
 { label: 'My Shared Inspections (7d)', value: mySharedStats.inspections, icon: iconography.inspection, color: 'bg-indigo-100 dark:bg-indigo-900/30 text-foreground dark:text-indigo-300 border-2 border-indigo-300 dark:border-indigo-700' },
 ] : [], [hasMySharedData, mySharedStats])

 const sharedWithMeCards = useMemo(() => hasSharedWithMeData ? [
 { label: 'Queens Shared with Me', value: sharedWithMeStats.queens, icon: iconography.queen, color: 'bg-purple-50 dark:bg-purple-900/20 text-foreground dark:text-purple-300 border-2 border-purple-200 dark:border-purple-800' },
 { label: 'Active Queens Available', value: sharedWithMeStats.activeQueens, icon: iconography.highlight, color: 'bg-green-50 dark:bg-green-900/20 text-foreground dark:text-green-300 border-2 border-green-200 dark:border-green-800' },
 { label: 'Hives Shared with Me', value: sharedWithMeStats.hives, icon: iconography.hive, color: 'bg-amber-50 dark:bg-amber-900/20 text-foreground dark:text-amber-300 border-2 border-amber-200 dark:border-amber-800' },
 { label: 'Team Inspections (7d)', value: sharedWithMeStats.inspections, icon: iconography.inspection, color: 'bg-indigo-50 dark:bg-indigo-900/30 text-foreground dark:text-indigo-300 border-2 border-indigo-200 dark:border-indigo-800' },
 ] : [], [hasSharedWithMeData, sharedWithMeStats])

 if (loading) return (
 <div className="space-y-6">
 {/* Header */}
 <div className="h-9 w-56 bg-surface-secondary rounded animate-shimmer" />
 {/* Quick actions placeholder */}
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-4 border border-border">
 <div className="flex flex-wrap gap-2">
 {Array.from({ length: 6 }).map((_, i) => (
 <Skeleton key={i} className="h-8 w-28" />
 ))}
 </div>
 </div>
 {/* Apiary cards placeholder */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <SkeletonCard className="h-48" />
 <SkeletonCard className="h-48" />
 </div>
 {/* Stats strip placeholder */}
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-4 border border-border">
 <Skeleton className="h-8 w-full" />
 </div>
 {/* Recent activity placeholder */}
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border space-y-3">
 <SkeletonRow />
 <SkeletonRow />
 <SkeletonRow />
 </div>
 </div>
 )

 return (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <div className="flex flex-col gap-2">
 <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">Dashboard</p>
 <div className="flex items-center gap-3 flex-wrap">
 <h1 className="font-serif text-3xl sm:text-4xl leading-tight text-foreground">Dashboard Overview</h1>
 {userRole === 'Admin' && (
 <div className="flex items-center gap-2">
 <span className="px-3 py-1 bg-purple-900/50 dark:bg-purple-900/30 text-purple-300 dark:text-purple-200 text-sm font-medium rounded-full flex items-center gap-1 border border-purple-700 dark:border-purple-600">
 <Shield size={14} />
 Admin
 </span>
 {openTicketsCount > 0 && (
 <span className="px-2 py-1 bg-red-500 dark:bg-red-600 text-white text-xs font-bold rounded-full flex items-center gap-1 min-w-[24px] justify-center">
 {openTicketsCount}
 </span>
 )}
 </div>
 )}
 {/* User ticket status indicator */}
 {userRole !== 'Admin' && userTicketStatus && (
 <Link href="/dashboard/about?section=support" className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-300 text-sm font-medium rounded-full border border-blue-300 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
 <MessageCircle size={14} />
 <span>Tickets:</span>
 {userTicketStatus.has_response > 0 && (
 <span className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-500 text-white text-xs font-bold rounded-full animate-pulse" title={`${userTicketStatus.has_response} ticket(s) have a new response - click to view`}>
 {userTicketStatus.has_response}
 <Reply size={10} />
 </span>
 )}
 {userTicketStatus.open > 0 && (
 <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full" title={`${userTicketStatus.open} open ticket(s) - awaiting response`}>
 {userTicketStatus.open}
 <Clock size={10} />
 </span>
 )}
 {userTicketStatus.in_progress > 0 && (
 <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full" title={`${userTicketStatus.in_progress} ticket(s) being addressed`}>
 {userTicketStatus.in_progress}
 <span className="animate-pulse">●</span>
 </span>
 )}
 {userTicketStatus.resolved > 0 && (
 <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full" title={`${userTicketStatus.resolved} ticket(s) resolved - review & close`}>
 {userTicketStatus.resolved}
 <CheckCircle size={10} />
 </span>
 )}
 </Link>
 )}
 </div>
</div>
</div>

{dashboardError && (
 <AlertPanel
  tone="error"
  icon={<AlertTriangle size={18} />}
  title="Some dashboard sections could not be loaded"
  endSlot={(
   <Button type="button" tone="neutral" size="xs" onClick={() => userId && fetchDashboardData(userId)}>
    Retry
   </Button>
  )}
  endSlotClassName="self-center"
 >
  <p className="text-sm">{dashboardError}</p>
 </AlertPanel>
)}

{/* Attention Needed Alerts */}
{(alerts.overdueInspections > 0 || alerts.oldQueens > 0 || alerts.highVarroa > 0 || alerts.todayTasks > 0) && (
 <div className="fj-panel-amber p-4">
 <div className="flex items-center gap-2 mb-3">
 <AlertTriangle size={18} className="fj-text-warning" />
 <h2 className="text-sm font-semibold fj-text-warning">Attention Needed</h2>
 </div>
 <div className="flex flex-wrap gap-3">
 {alerts.overdueInspections > 0 && (
 <Link href="/dashboard/hives" className="fj-chip fj-chip-xs fj-chip-amber font-semibold">
 <ClipboardList size={12} />
 {alerts.overdueInspections} hive{alerts.overdueInspections !== 1 ? 's' : ''} overdue inspection (14+ days)
 </Link>
 )}
 {alerts.oldQueens > 0 && (
 <Link href="/dashboard/queens" className="fj-chip fj-chip-xs fj-chip-amber font-semibold">
 <Crown size={12} />
 {alerts.oldQueens} queen{alerts.oldQueens !== 1 ? 's' : ''} over 2 years old
 </Link>
 )}
 {alerts.highVarroa > 0 && (
 <Link href="/dashboard/records?type=varroa_check" className="fj-chip fj-chip-xs fj-chip-amber font-semibold">
 <Bug size={12} />
 {alerts.highVarroa} high varroa check{alerts.highVarroa !== 1 ? 's' : ''} (&gt;3%)
 </Link>
 )}
 {alerts.todayTasks > 0 && (
 <Link href="/dashboard/tasks" className="fj-chip fj-chip-xs fj-chip-amber font-semibold">
 <ListChecks size={12} />
 {alerts.todayTasks} task{alerts.todayTasks !== 1 ? 's' : ''} due today
 </Link>
 )}
 </div>
 </div>
 )}

 {/* Quick Actions (above the fold for field use) — draggable items can be dropped onto apiary cards */}
 <Panel padding="sm">
 <div className="flex flex-wrap gap-2">
 {([
 { label: 'New Inspection', href: '/dashboard/records?create=inspection', icon: <Search size={14} />, dragType: 'inspection' },
 { label: 'Log Feeding', href: '/dashboard/records?create=feeding', icon: <Wheat size={14} /> },
 { label: 'Varroa Check', href: '/dashboard/records?create=varroa_check', icon: <Bug size={14} /> },
 { label: 'Add Treatment', href: '/dashboard/records?create=varroa_treatment', icon: <Syringe size={14} /> },
 { label: 'Log Harvest', href: '/dashboard/records?create=harvest', icon: <Droplet size={14} /> },
 { label: 'New Task', href: '/dashboard/tasks?create=true', icon: <Plus size={14} /> },
 ] as { label: string; href: string; icon: React.ReactNode; dragType?: string }[]).map((action) => (
 <Link
 key={action.label}
 href={action.href}
 draggable={!!action.dragType}
 onDragStart={(e) => {
   if (action.dragType) {
     e.dataTransfer.setData('application/x-action', action.dragType)
     e.dataTransfer.effectAllowed = 'link'
     e.currentTarget.style.opacity = '0.5'
   }
 }}
 onDragEnd={(e) => { e.currentTarget.style.opacity = '' }}
 onTouchStart={action.dragType ? (e) => handleTouchStart(e, action.dragType!, action.label) : undefined}
 onTouchMove={action.dragType ? handleTouchMove : undefined}
 onTouchEnd={action.dragType ? handleTouchEnd : undefined}
 onTouchCancel={action.dragType ? handleTouchCancel : undefined}
 className={`fj-chip fj-chip-sm fj-chip-neutral ${action.dragType ? 'cursor-grab active:cursor-grabbing select-none' : ''}`}
 >
 {action.dragType && <GripVertical size={12} className="text-text-tertiary -ml-0.5" />}
 {action.icon}
 {action.label}
 </Link>
 ))}
 </div>
 </Panel>

 {/* Apiary Weather (sorted nearest-first when GPS available) */}
 {sortedApiaries.length > 0 && (
  <div>
   <h2 className="text-lg font-semibold text-foreground mb-3">My Apiaries</h2>
   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {sortedApiaries.map((apiary) => (
     <ApiaryWeatherRow key={apiary.id} apiary={apiary} />
    ))}
   </div>
  </div>
 )}

 {/* Stats Strip */}
 <Panel padding="sm">
 <div className="flex flex-wrap items-center gap-1">
 {statCards.map((card) => (
 <Link key={card.label} href={card.href!} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface-secondary dark:hover:bg-surface-elevated transition-colors whitespace-nowrap">
 <AppIcon icon={card.icon} size="sm" className="text-text-secondary" />
 <span className="text-sm text-text-secondary">{card.label}:</span>
 <span className="text-base font-bold text-foreground">{card.value}</span>
 </Link>
 ))}
 </div>
 </Panel>

 {/* Upcoming Events */}
 {userId && <UpcomingEvents userId={userId} />}

 {/* Recent Activity */}
<RecentActivitySection
 recentActivity={recentActivity}
 recentActivityError={recentActivityError}
 onRetry={() => userId && fetchDashboardData(userId)}
/>

 {/* Teams & Collaboration (collapsed accordion) */}
{(isTeamMember || isRearingGroupMember || loadingTeams || loadingRearingGroups) && (
 <Panel>
 <button
 type="button"
 onClick={() => setShowTeamsSection(!showTeamsSection)}
 className="w-full flex items-center justify-between"
 aria-expanded={showTeamsSection}
 aria-controls="dashboard-teams-collaboration-panel"
 >
 <div className="flex items-center gap-2">
 <Users size={20} className="text-blue-600 dark:text-blue-400" />
 <h2 className="text-lg font-semibold text-foreground">Teams &amp; Collaboration</h2>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-sm text-text-secondary">
 {(loadingTeams || loadingRearingGroups) ? 'Loading\u2026' : (
 <>
 {ownedTeams.length + memberTeams.length > 0 && `${ownedTeams.length + memberTeams.length} team${ownedTeams.length + memberTeams.length !== 1 ? 's' : ''}`}
 {ownedTeams.length + memberTeams.length > 0 && (ownedRearingGroups.length + memberRearingGroups.length) > 0 && ', '}
 {(ownedRearingGroups.length + memberRearingGroups.length) > 0 && `${ownedRearingGroups.length + memberRearingGroups.length} rearing group${ownedRearingGroups.length + memberRearingGroups.length !== 1 ? 's' : ''}`}
 </>
 )}
 </span>
 <span className={`text-text-tertiary transition-transform ${showTeamsSection ? 'rotate-180' : ''}`}>&#9660;</span>
 </div>
 </button>

 {showTeamsSection && (
 <div id="dashboard-teams-collaboration-panel" className="mt-4 space-y-6">
 {/* Shared by Me */}
 {hasMySharedData && (
  <div className="border border-blue-600 dark:border-blue-800 rounded-lg p-4">
 <div className="flex items-center justify-between mb-3">
 <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
 <Users size={16} className="text-blue-600 dark:text-blue-400" />
 Shared by Me
 </h3>
 <Button
 onClick={() => {
  if (!showMySharedDetails && userId) {
   fetchMySharedTeamMembers(userId)
  }
  setShowMySharedDetails(!showMySharedDetails)
 }}
 type="button"
 tone="blue"
 size="sm"
 aria-expanded={showMySharedDetails}
 aria-controls="dashboard-shared-team-members"
 >
 {showMySharedDetails ? 'Hide' : 'Show'} Details
 </Button>
</div>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {mySharedCards.map((card) => (
 <div key={card.label} className="flex flex-col">
 <div className="flex items-center gap-1.5 mb-1">
 <AppIcon icon={card.icon} size="sm" className="text-text-secondary" />
 <span className="text-xs text-text-tertiary">{card.label}</span>
 </div>
 <span className="text-xl font-bold text-foreground">{card.value}</span>
 </div>
 ))}
 </div>
 {showMySharedDetails && (
 <div id="dashboard-shared-team-members" className="mt-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
 <h4 className="text-sm font-semibold text-foreground mb-3">Team Members with Access</h4>
 {loadingTeamMembers ? (
 <div className="flex justify-center py-4">
 <div className="animate-spin rounded-full h-6 w-6 border-4 border-blue-600 border-t-transparent"></div>
 </div>
 ) : mySharedTeamMembers.length > 0 ? (
 <div className="space-y-2">
 {mySharedTeamMembers.map((member) => (
 <div key={`${member.team_id}-${member.user_id}`} className="bg-surface dark:bg-surface-elevated border border-blue-200 dark:border-blue-800 rounded-lg p-2.5 flex items-center justify-between">
 <div className="flex-1 min-w-0">
 <h4 className="font-medium text-foreground text-sm truncate">
 {member.profiles?.full_name || 'Unknown User'}
 </h4>
 <p className="text-xs text-text-secondary truncate">{member.profiles?.email}</p>
 </div>
 <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
 <span className="fj-badge fj-badge-blue">{member.teams?.name || 'Unknown'}</span>
 <span className={`fj-badge ${member.role === 'owner' ? 'fj-badge-amber' : 'fj-badge-neutral'}`}>{member.role}</span>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-text-secondary text-center py-4 text-sm">No team members found</p>
 )}
 </div>
 )}
 </div>
 )}

 {/* Shared with Me */}
 {hasSharedWithMeData && (
 <div className="border border-green-600 dark:border-green-700 rounded-lg p-4">
 <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
 <Users size={16} className="text-green-600 dark:text-green-400" />
 Shared with Me
 </h3>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {sharedWithMeCards.map((card) => (
 <div key={card.label} className="flex flex-col">
 <div className="flex items-center gap-1.5 mb-1">
 <AppIcon icon={card.icon} size="sm" className="text-text-secondary" />
 <span className="text-xs text-text-tertiary">{card.label}</span>
 </div>
 <span className="text-xl font-bold text-foreground">{card.value}</span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* My Teams */}
 {(isTeamMember || loadingTeams) && (
 <TeamsSection
 ownedTeams={ownedTeams}
 memberTeams={memberTeams}
 loadingTeams={loadingTeams}
 isTeamMember={isTeamMember}
 hasMySharedData={hasMySharedData}
 hasSharedWithMeData={hasSharedWithMeData}
 />
 )}

 {/* Rearing Groups */}
 {isRearingGroupMember && (
 <RearingGroupsSection
 ownedRearingGroups={ownedRearingGroups}
 memberRearingGroups={memberRearingGroups}
 loadingRearingGroups={loadingRearingGroups}
 />
 )}
 </div>
 )}
 </Panel>
 )}

 {/* Application Version */}
 <p className="text-xs text-text-tertiary text-center py-2">
 HiveCraic v1.6.5 &middot; March 9, 2026 &middot; <Link href="/dashboard/about?section=changes" className="text-forest-600 dark:text-forest-400 hover:underline">View Changes</Link>
 </p>
 </div>
 )
}

// Sub-components for better organization

interface RecentActivitySectionProps {
 recentActivity: RecentActivityRecord[]
 recentActivityError: string | null
 onRetry: () => void
}

function RecentActivitySection({ recentActivity, recentActivityError, onRetry }: RecentActivitySectionProps) {
 return (
 <Panel>
 <h2 className="text-xl font-semibold text-foreground mb-4">Recent Activity</h2>
 <div className="space-y-3">
 {recentActivity.map((record) => {
 let icon: React.ReactNode
 let label: string
 let badge: React.ReactNode = null

 switch (record.record_type) {
 case 'inspection':
 icon = <Search size={18} className="text-blue-600 dark:text-blue-400" />
 label = `Inspection of ${record.hives?.hive_number || 'Unknown Hive'}`
 badge = (
 <span className={`px-2 py-1 text-xs font-semibold rounded ${
 record.queen_seen
 ? 'bg-green-200 dark:bg-green-900/40 text-green-900 dark:text-green-200'
 : 'bg-yellow-200 dark:bg-yellow-900/40 text-yellow-900 dark:text-yellow-200'
 }`}>
 {record.queen_seen ? 'Queen Seen' : 'No Queen'}
 </span>
 )
 break
 case 'varroa_treatment':
 icon = <Syringe size={18} className="text-red-600 dark:text-red-400" />
 label = `Varroa Treatment - ${record.hives?.hive_number || 'Unknown Hive'}`
 badge = (
 <span className="px-2 py-1 text-xs font-semibold rounded bg-red-200 dark:bg-red-900/40 text-red-900 dark:text-red-200">
 {record.treatment_type}
 </span>
 )
 break
 case 'varroa_check':
 icon = <Bug size={18} className="text-orange-600 dark:text-orange-400" />
 label = `Varroa Check - ${record.hives?.hive_number || 'Unknown Hive'}`
 badge = record.infestation_rate !== null ? (
 <span className="px-2 py-1 text-xs font-semibold rounded bg-orange-200 dark:bg-orange-900/40 text-orange-900 dark:text-orange-200">
 {record.infestation_rate}% infestation
 </span>
 ) : null
 break
 case 'feeding':
 icon = <Wheat size={18} className="text-amber-600 dark:text-amber-400" />
 label = `Feeding - ${record.hives?.hive_number || 'Unknown Hive'}`
 badge = (
 <span className="px-2 py-1 text-xs font-semibold rounded bg-amber-200 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200">
 {record.feed_type}
 </span>
 )
 break
 case 'harvest':
 icon = <Droplet size={18} className="text-yellow-600 dark:text-yellow-400" />
 label = `Harvest - ${record.hives?.hive_number || 'Unknown Hive'}`
 badge = record.honey_weight !== null ? (
 <span className="px-2 py-1 text-xs font-semibold rounded bg-yellow-200 dark:bg-yellow-900/40 text-yellow-900 dark:text-yellow-200">
 {record.honey_weight} kg
 </span>
 ) : null
 break
 }
      const recordHref = buildRecentActivityHref(record)
      const apiaryName = record.hives?.apiaries?.name

      return (
 <Link key={record.id} href={recordHref} className="flex items-center justify-between p-3 bg-surface dark:bg-surface-elevated rounded border border-border hover:border-forest-500 dark:hover:border-forest-400 transition-colors">
  <div className="flex items-center gap-2 flex-1 min-w-0">
  {icon}
  <div className="flex-1 min-w-0">
  <span className="font-medium text-foreground block truncate">{label}</span>
  <span className="text-sm font-medium text-text-secondary">
 {formatRecentActivityDate(record.date)}
 {apiaryName && <span className="text-text-secondary"> &middot; {apiaryName}</span>}
 </span>
 </div>
 </div>
 {badge && <div className="ml-2 flex-shrink-0">{badge}</div>}
 </Link>
      )
     })}
 {recentActivity.length === 0 && !recentActivityError && (
 <p className="text-text-secondary text-center py-4">No recent activity</p>
 )}
 {recentActivity.length > 0 && (
 <Link href="/dashboard/records" className="block text-center text-sm text-forest-600 dark:text-forest-400 hover:underline pt-2">
  View All Records
 </Link>
 )}
 {recentActivityError && (
 <div className="text-center py-4">
 <p className="text-red-600 dark:text-red-400 mb-2">{recentActivityError}</p>
 <Button type="button" onClick={onRetry} tone="neutral" size="xs">
  Try again
 </Button>
 </div>
 )}
 </div>
 </Panel>
 )
}

interface TeamsSectionProps {
 ownedTeams: { id: string; name: string; member_count?: number; user_role?: string }[]
 memberTeams: { id: string; name: string; member_count?: number; user_role?: string }[]
 loadingTeams: boolean
 isTeamMember: boolean
 hasMySharedData: boolean
 hasSharedWithMeData: boolean
}

function TeamsSection({ ownedTeams, memberTeams, loadingTeams, isTeamMember, hasMySharedData, hasSharedWithMeData }: TeamsSectionProps) {
 return (
 <div>
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <Users size={24} className="text-blue-600 dark:text-blue-400" />
 <h2 className="text-xl font-semibold text-foreground">My Teams</h2>
 </div>
 <Link
 href="/dashboard/apiary-team"
 className="fj-btn fj-btn-blue text-sm"
 >
 Manage Teams (Memberships)
 </Link>
 </div>

 {loadingTeams ? (
 <div className="flex justify-center py-8">
 <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
 </div>
 ) : (
 <div className="space-y-4">
 {/* Owned Teams */}
 {ownedTeams.length > 0 && (
 <div>
 <div className="flex items-center gap-2 mb-2">
 <Crown size={16} className="text-amber-600 dark:text-amber-400" />
 <h3 className="font-semibold text-foreground text-sm">Teams I Own ({ownedTeams.length})</h3>
 </div>
 <div className="space-y-2">
 {ownedTeams.map((team) => (
 <div key={team.id} className="flex items-center justify-between border border-border rounded-lg p-2.5 hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all">
 <div className="flex items-center gap-2">
 <h4 className="font-medium text-foreground text-sm">{team.name}</h4>
 <span className="fj-badge fj-badge-amber">
 Owner
 </span>
 </div>
 <div className="flex items-center gap-3 text-xs text-text-secondary">
 <span className="flex items-center gap-1">
 <Users size={12} />
 {team.member_count || 0}
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Member Teams */}
 {memberTeams.length > 0 && (
 <div>
 <div className="flex items-center gap-2 mb-2">
 <UserCheck size={16} className="text-green-600 dark:text-green-400" />
 <h3 className="font-semibold text-foreground text-sm">Teams I&apos;m In ({memberTeams.length})</h3>
 </div>
 <div className="space-y-2">
 {memberTeams.map((team) => (
 <div key={team.id} className="flex items-center justify-between border border-border rounded-lg p-2.5 hover:border-green-300 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all">
 <div className="flex items-center gap-2">
 <h4 className="font-medium text-foreground text-sm">{team.name}</h4>
 <span className="fj-badge fj-badge-green capitalize">
 {team.user_role}
 </span>
 </div>
 <div className="flex items-center gap-3 text-xs text-text-secondary">
 <span className="flex items-center gap-1">
 <Users size={12} />
 {team.member_count || 0}
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* No Shared Data Message */}
 {isTeamMember && !hasMySharedData && !hasSharedWithMeData && (
 <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center mt-4">
 <Users size={48} className="mx-auto text-blue-400 mb-3" />
 <h3 className="text-lg font-semibold text-foreground mb-2">No Shared Apiaries Yet</h3>
 <p className="text-sm text-text-secondary">
 You&apos;re part of a team, but no apiaries have been shared yet. Team owners need to share apiaries for team data to appear here.
 </p>
 </div>
 )}
 </div>
 )}
 </div>
 )
}

interface RearingGroupsSectionProps {
 ownedRearingGroups: { id: string; name: string; member_count?: number; user_role?: string }[]
 memberRearingGroups: { id: string; name: string; member_count?: number; user_role?: string }[]
 loadingRearingGroups: boolean
}

function RearingGroupsSection({ ownedRearingGroups, memberRearingGroups, loadingRearingGroups }: RearingGroupsSectionProps) {
 return (
 <div>
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <Egg size={24} className="text-amber-600 dark:text-amber-400" />
 <h2 className="text-xl font-semibold text-foreground">My Rearing Groups</h2>
 </div>
 <Link
 href="/dashboard/rearing-team"
 className="fj-btn fj-btn-amber text-sm"
 >
 Manage Groups (Memberships)
 </Link>
 </div>

 {loadingRearingGroups ? (
 <div className="flex justify-center py-8">
 <div className="animate-spin rounded-full h-8 w-8 border-4 border-amber-600 border-t-transparent"></div>
 </div>
 ) : (
 <div className="space-y-4">
 {/* Owned Groups */}
 {ownedRearingGroups.length > 0 && (
 <div>
 <div className="flex items-center gap-2 mb-2">
 <Crown size={16} className="text-amber-600 dark:text-amber-400" />
 <h3 className="font-semibold text-foreground text-sm">Groups I Own ({ownedRearingGroups.length})</h3>
 </div>
 <div className="space-y-2">
 {ownedRearingGroups.map((group) => (
 <div key={group.id} className="flex items-center justify-between border border-border rounded-lg p-2.5 hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all">
 <div className="flex items-center gap-2">
 <h4 className="font-medium text-foreground text-sm">{group.name}</h4>
 <span className="fj-badge fj-badge-amber">
 Owner
 </span>
 </div>
 <div className="flex items-center gap-3 text-xs text-text-secondary">
 <span className="flex items-center gap-1">
 <Users size={12} />
 {group.member_count || 0}
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Member Groups */}
 {memberRearingGroups.length > 0 && (
 <div>
 <div className="flex items-center gap-2 mb-2">
 <UserCheck size={16} className="text-green-600 dark:text-green-400" />
 <h3 className="font-semibold text-foreground text-sm">Groups I&apos;m In ({memberRearingGroups.length})</h3>
 </div>
 <div className="space-y-2">
 {memberRearingGroups.map((group) => (
 <div key={group.id} className="flex items-center justify-between border border-border rounded-lg p-2.5 hover:border-green-300 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all">
 <div className="flex items-center gap-2">
 <h4 className="font-medium text-foreground text-sm">{group.name}</h4>
 <span className="fj-badge fj-badge-green">
 Member
 </span>
 </div>
 <div className="flex items-center gap-3 text-xs text-text-secondary">
 <span className="flex items-center gap-1">
 <Users size={12} />
 {group.member_count || 0}
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 )
}
