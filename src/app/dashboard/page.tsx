'use client'
import { useEffect, useState } from 'react'
import { getCurrentUserId, getUserRole, type UserRole } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import StatCard from '@/components/ui/StatCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import UpcomingEvents from '@/components/UpcomingEvents'
import { Shield, Users, Crown, UserCheck, Search, Syringe, Bug, Wheat, Droplet, MessageCircle, Clock, CheckCircle, Reply } from 'lucide-react'
import { useDashboardStats, useTeams, useTicketStatus } from '@/hooks'
import type { RecentActivityRecord } from '@/types/dashboard'

export default function DashboardPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<UserRole>('User')
  const [showMySharedDetails, setShowMySharedDetails] = useState(false)
  const router = useRouter()

  // Custom hooks
  const { stats, recentActivity, loading, error: dashboardError, fetchDashboardData } = useDashboardStats()
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

  // Separate effect for team data that depends on userId being set
  useEffect(() => {
    if (userId) {
      fetchTeams(userId)
      fetchTeamStats(userId)
    }
  }, [userId, fetchTeams, fetchTeamStats])

  if (loading) return <LoadingSpinner text="Loading dashboard..." />

  // Check if user is a team member
  const isTeamMember = ownedTeams.length > 0 || memberTeams.length > 0

  const statCards = [
    { label: 'My Apiaries', value: stats.apiaries, icon: '📍', color: 'bg-green-50 dark:bg-green-900/30 text-gray-900 dark:text-green-300', href: '/dashboard/apiaries' },
    { label: 'My Hives', value: stats.hives, icon: '🐝', color: 'bg-amber-50 dark:bg-amber-900/30 text-gray-900 dark:text-amber-300', href: '/dashboard/hives' },
    { label: 'My Inspections (7d)', value: stats.recentInspections, icon: '📋', color: 'bg-indigo-50 dark:bg-indigo-900/30 text-gray-900 dark:text-indigo-300', href: '/dashboard/records' },
  ]

  const hasMySharedData = mySharedStats.hives > 0 || mySharedStats.queens > 0 || mySharedStats.inspections > 0
  const hasSharedWithMeData = sharedWithMeStats.hives > 0 || sharedWithMeStats.queens > 0 || sharedWithMeStats.inspections > 0

  const mySharedCards = hasMySharedData ? [
    { label: 'Queens I Shared', value: mySharedStats.queens, icon: '👑', color: 'bg-purple-100 text-gray-900 border-2 border-purple-300' },
    { label: 'Active Queens Shared', value: mySharedStats.activeQueens, icon: '✨', color: 'bg-green-100 text-gray-900 border-2 border-green-300' },
    { label: 'Hives I Shared', value: mySharedStats.hives, icon: '🐝', color: 'bg-amber-100 text-gray-900 border-2 border-amber-300' },
    { label: 'My Shared Inspections (7d)', value: mySharedStats.inspections, icon: '📋', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-gray-900 dark:text-indigo-300 border-2 border-indigo-300 dark:border-indigo-700' },
  ] : []

  const sharedWithMeCards = hasSharedWithMeData ? [
    { label: 'Queens Shared with Me', value: sharedWithMeStats.queens, icon: '👑', color: 'bg-purple-50 text-gray-900 border-2 border-purple-200' },
    { label: 'Active Queens Available', value: sharedWithMeStats.activeQueens, icon: '✨', color: 'bg-green-50 text-gray-900 border-2 border-green-200' },
    { label: 'Hives Shared with Me', value: sharedWithMeStats.hives, icon: '🐝', color: 'bg-amber-50 text-gray-900 border-2 border-amber-200' },
    { label: 'Team Inspections (7d)', value: sharedWithMeStats.inspections, icon: '📋', color: 'bg-indigo-50 dark:bg-indigo-900/30 text-gray-900 dark:text-indigo-300 border-2 border-indigo-200 dark:border-indigo-800' },
  ] : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
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
              <a href="/dashboard/about?section=support" className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-300 text-sm font-medium rounded-full border border-blue-300 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
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
              </a>
            )}
          </div>
        </div>
      </div>

      {/* My Statistics Cards */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">My Beekeeping</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((card) => (
            <StatCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={card.icon}
              color={card.color}
              href={card.href}
            />
          ))}
        </div>
      </div>

      {/* Team Statistics Cards - Shared by Me */}
      {isTeamMember && hasMySharedData && (
        <div className="bg-surface dark:bg-surface rounded-xl shadow-lg p-4 border border-blue-600 dark:border-blue-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Users size={18} className="text-blue-600 dark:text-blue-400" />
              Shared by Me
            </h2>
            <button
              onClick={() => {
                if (!showMySharedDetails && userId) {
                  fetchMySharedTeamMembers(userId)
                }
                setShowMySharedDetails(!showMySharedDetails)
              }}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-medium min-h-[36px]"
            >
              {showMySharedDetails ? 'Hide' : 'Show'} Details
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {mySharedCards.map((card) => (
              <div key={card.label} className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-lg">{card.icon}</span>
                  <span className="text-xs text-text-tertiary">{card.label}</span>
                </div>
                <span className="text-2xl font-bold text-foreground">{card.value}</span>
              </div>
            ))}
          </div>

          {/* Team Members Detail View */}
          {showMySharedDetails && (
            <div className="mt-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Team Members with Access</h3>
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
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">
                          {member.teams?.name || 'Unknown'}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          member.role === 'owner' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' : 'bg-sage-100 dark:bg-slate-700 text-text-primary'
                        }`}>
                          {member.role}
                        </span>
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

      {/* Team Statistics Cards - Shared with Me */}
      {isTeamMember && hasSharedWithMeData && (
        <div className="bg-surface dark:bg-surface rounded-lg shadow p-4 border-2 border-green-600 dark:border-green-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Users size={18} className="text-green-600 dark:text-green-400" />
              Shared with Me
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sharedWithMeCards.map((card) => (
              <div key={card.label} className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-lg">{card.icon}</span>
                  <span className="text-xs text-text-tertiary">{card.label}</span>
                </div>
                <span className="text-2xl font-bold text-foreground">{card.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {userId && <UpcomingEvents userId={userId} />}

      {/* Recent Activity */}
      <RecentActivitySection
        recentActivity={recentActivity}
        dashboardError={dashboardError}
        onRetry={() => userId && fetchDashboardData(userId)}
      />

      {/* Teams Section */}
      {(loadingTeams || ownedTeams.length > 0 || memberTeams.length > 0) && (
        <TeamsSection
          ownedTeams={ownedTeams}
          memberTeams={memberTeams}
          loadingTeams={loadingTeams}
          isTeamMember={isTeamMember}
          hasMySharedData={hasMySharedData}
          hasSharedWithMeData={hasSharedWithMeData}
        />
      )}

      {/* Application Version */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">HiveCraic</h3>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-surface-elevated dark:bg-surface-elevated rounded-full shadow-sm border border-border">
                <span className="font-medium text-text-secondary">Version:</span>
                <span className="font-bold text-indigo-700 dark:text-indigo-300">v1.5.19</span>
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-surface-elevated dark:bg-surface-elevated rounded-full shadow-sm border border-border">
                <span className="font-medium text-text-secondary">Last Updated:</span>
                <span className="font-semibold text-blue-700 dark:text-blue-400">February 9, 2026</span>
              </span>
            </div>
          </div>
          <a
            href="/dashboard/about?section=changes"
            className="px-4 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 border border-blue-300 dark:border-blue-700 font-medium transition-colors"
          >
            View Changes
          </a>
        </div>
      </div>
    </div>
  )
}

// Sub-components for better organization

interface RecentActivitySectionProps {
  recentActivity: RecentActivityRecord[]
  dashboardError: string | null
  onRetry: () => void
}

function RecentActivitySection({ recentActivity, dashboardError, onRetry }: RecentActivitySectionProps) {
  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
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
                <span className={`px-2 py-1 text-xs rounded ${
                  record.queen_seen
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                }`}>
                  {record.queen_seen ? 'Queen Seen' : 'No Queen'}
                </span>
              )
              break
            case 'varroa_treatment':
              icon = <Syringe size={18} className="text-red-600 dark:text-red-400" />
              label = `Varroa Treatment - ${record.hives?.hive_number || 'Unknown Hive'}`
              badge = (
                <span className="px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                  {record.treatment_type}
                </span>
              )
              break
            case 'varroa_check':
              icon = <Bug size={18} className="text-orange-600 dark:text-orange-400" />
              label = `Varroa Check - ${record.hives?.hive_number || 'Unknown Hive'}`
              badge = record.infestation_rate !== null ? (
                <span className="px-2 py-1 text-xs rounded bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">
                  {record.infestation_rate}% infestation
                </span>
              ) : null
              break
            case 'feeding':
              icon = <Wheat size={18} className="text-amber-600 dark:text-amber-400" />
              label = `Feeding - ${record.hives?.hive_number || 'Unknown Hive'}`
              badge = (
                <span className="px-2 py-1 text-xs rounded bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                  {record.feed_type}
                </span>
              )
              break
            case 'harvest':
              icon = <Droplet size={18} className="text-yellow-600 dark:text-yellow-400" />
              label = `Harvest - ${record.hives?.hive_number || 'Unknown Hive'}`
              badge = record.honey_weight !== null ? (
                <span className="px-2 py-1 text-xs rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                  {record.honey_weight} kg
                </span>
              ) : null
              break
          }

          return (
            <div key={record.id} className="flex items-center justify-between p-3 bg-surface dark:bg-surface-elevated rounded border border-border">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {icon}
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground block truncate">{label}</span>
                  <span className="text-sm text-text-secondary">
                    {new Date(record.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {badge && <div className="ml-2 flex-shrink-0">{badge}</div>}
            </div>
          )
        })}
        {recentActivity.length === 0 && !dashboardError && (
          <p className="text-text-secondary text-center py-4">No recent activity</p>
        )}
        {dashboardError && (
          <div className="text-center py-4">
            <p className="text-red-600 dark:text-red-400 mb-2">{dashboardError}</p>
            <button onClick={onRetry} className="text-sm text-forest-600 dark:text-forest-400 hover:underline">
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
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
    <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={24} className="text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-foreground">My Teams</h2>
        </div>
        <a
          href="/dashboard/profile#teams"
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-medium"
        >
          Manage Teams
        </a>
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
                      <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs rounded font-medium">
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
                      <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded font-medium capitalize">
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
