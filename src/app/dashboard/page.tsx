'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId, getUserRole, type UserRole } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import StatCard from '@/components/ui/StatCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import UpcomingEvents from '@/components/UpcomingEvents'
import { Shield, Users, Crown, UserCheck } from 'lucide-react'

interface Inspection {
  id: string
  inspection_date: string
  queen_seen: boolean
  hives?: {
    hive_number: string
  }
}

interface Team {
  id: string
  name: string
  owner_id: string
  created_at: string
  member_count?: number
  user_role?: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    queens: 0,
    activeQueens: 0,
    hives: 0,
    activeBatches: 0,
    recentInspections: 0,
  })
  const [teamStats, setTeamStats] = useState({
    teamQueens: 0,
    teamActiveQueens: 0,
    teamHives: 0,
    teamInspections: 0,
  })
  const [mySharedStats, setMySharedStats] = useState({
    queens: 0,
    activeQueens: 0,
    hives: 0,
    inspections: 0,
  })
  const [sharedWithMeStats, setSharedWithMeStats] = useState({
    queens: 0,
    activeQueens: 0,
    hives: 0,
    inspections: 0,
  })
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    totalHives: 0,
    totalApiaries: 0,
  })
  const [ticketStats, setTicketStats] = useState({
    openTickets: 0,
    inProgressTickets: 0,
    totalTickets: 0,
  })
  const [recentActivity, setRecentActivity] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<UserRole>('User')
  const [ownedTeams, setOwnedTeams] = useState<Team[]>([])
  const [memberTeams, setMemberTeams] = useState<Team[]>([])
  const [loadingTeams, setLoadingTeams] = useState(false)
  const router = useRouter()

  const fetchDashboardData = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    try {
      // Fetch all stats in parallel
      const [queensRes, activeQueensRes, hivesRes, batchesRes, inspectionsRes] = await Promise.all([
        supabase.from('queens').select('id', { count: 'exact', head: true }).eq('user_id', currentUserId),
        supabase.from('queens').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('user_id', currentUserId),
        supabase.from('hives').select('id', { count: 'exact', head: true }).eq('user_id', currentUserId),
        supabase.from('rearing_batches').select('id', { count: 'exact', head: true }).in('status', ['grafted', 'emerged']).eq('user_id', currentUserId),
        supabase.from('inspections').select('id', { count: 'exact', head: true }).gte('inspection_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]).eq('user_id', currentUserId),
      ])

      setStats({
        queens: queensRes.count || 0,
        activeQueens: activeQueensRes.count || 0,
        hives: hivesRes.count || 0,
        activeBatches: batchesRes.count || 0,
        recentInspections: inspectionsRes.count || 0,
      })

      // Fetch recent activity
      const { data: inspections } = await supabase
        .from('inspections')
        .select('*, hives(hive_number)')
        .eq('user_id', currentUserId)
        .order('inspection_date', { ascending: false })
        .limit(5)

      setRecentActivity((inspections as Inspection[]) || [])

      // Fetch user statistics (admin only)
      const role = await getUserRole()
      if (role === 'Admin') {
        // Get total users from user_profiles
        const { count: totalUsers } = await supabase
          .from('user_profiles')
          .select('id', { count: 'exact', head: true })

        // Get total hives across all users
        const { count: totalHives } = await supabase
          .from('hives')
          .select('id', { count: 'exact', head: true })

        // Get total apiaries across all users
        const { count: totalApiaries } = await supabase
          .from('apiaries')
          .select('id', { count: 'exact', head: true })

        // Consider users "online" if they've been active in the last 15 minutes
        // We'll check for recent activity in inspections, or any table with updated_at
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()

        // Get distinct user IDs who have activity in the last 15 minutes
        const { data: recentActivityUsers } = await supabase
          .from('inspections')
          .select('user_id')
          .gte('created_at', fifteenMinutesAgo)

        // Count unique users
        const uniqueUserIds = new Set(recentActivityUsers?.map(r => r.user_id) || [])

        setUserStats({
          totalUsers: totalUsers || 0,
          onlineUsers: uniqueUserIds.size,
          totalHives: totalHives || 0,
          totalApiaries: totalApiaries || 0,
        })

        // Fetch support ticket stats
        const { count: openTickets } = await supabase
          .from('support_tickets')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'open')

        const { count: inProgressTickets } = await supabase
          .from('support_tickets')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'in_progress')

        const { count: totalTickets } = await supabase
          .from('support_tickets')
          .select('id', { count: 'exact', head: true })

        setTicketStats({
          openTickets: openTickets || 0,
          inProgressTickets: inProgressTickets || 0,
          totalTickets: totalTickets || 0,
        })
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Fetch teams (owned and member)
  const fetchTeams = useCallback(async () => {
    if (!userId) return
    setLoadingTeams(true)

    try {
      // Fetch owned teams
      const { data: owned, error: ownedError } = await supabase
        .from('teams')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })
        .limit(3) // Show top 3 owned teams

      if (ownedError) throw ownedError

      // Get member count for each owned team
      const ownedWithCounts = await Promise.all((owned || []).map(async (team) => {
        const { count } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id)
        return { ...team, member_count: count || 0, user_role: 'owner' }
      }))

      setOwnedTeams(ownedWithCounts)

      // Fetch teams where user is a member (not owner)
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('team_id, role, teams(*)')
        .eq('user_id', userId)
        .neq('role', 'owner')
        .limit(3) // Show top 3 member teams

      if (memberError) throw memberError

      // Get member count for each team
      const memberWithCounts = await Promise.all((memberData || []).map(async (membership) => {
        const team = (membership as unknown as { teams: Team }).teams
        const { count } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id)
        return { ...team, member_count: count || 0, user_role: membership.role }
      }))

      setMemberTeams(memberWithCounts)
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      setLoadingTeams(false)
    }
  }, [userId])

  // Fetch team statistics
  const fetchTeamStats = useCallback(async () => {
    if (!userId) return

    try {
      // Get all team IDs where user is a member (including owned teams)
      const { data: teamMemberships, error: membershipError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)

      if (membershipError) throw membershipError

      const teamIds = (teamMemberships || []).map(m => m.team_id)
      console.log('🔍 Team IDs for user:', teamIds)

      if (teamIds.length === 0) {
        console.log('❌ User is not a member of any teams')
        setTeamStats({
          teamQueens: 0,
          teamActiveQueens: 0,
          teamHives: 0,
          teamInspections: 0,
        })
        return
      }

      // Get shared apiaries for these teams
      const { data: teamApiaries, error: apiaryError } = await supabase
        .from('team_apiaries')
        .select('apiary_id')
        .in('team_id', teamIds)

      if (apiaryError) throw apiaryError

      const apiaryIds = (teamApiaries || []).map(ta => ta.apiary_id)
      console.log('🏠 Shared apiary IDs:', apiaryIds)

      if (apiaryIds.length === 0) {
        console.log('⚠️ No shared apiaries found for teams. Teams need to share apiaries first!')
        setTeamStats({
          teamQueens: 0,
          teamActiveQueens: 0,
          teamHives: 0,
          teamInspections: 0,
        })
        return
      }

      // Fetch ALL hives from shared apiaries (including user's own hives in shared apiaries)
      const { data: teamHives, error: hivesError } = await supabase
        .from('hives')
        .select('id, queen_id, user_id')
        .in('apiary_id', apiaryIds)

      if (hivesError) throw hivesError

      // Separate hives by ownership
      const myHives = (teamHives || []).filter(h => h.user_id === userId)
      const othersHives = (teamHives || []).filter(h => h.user_id !== userId)

      const teamHiveIds = (teamHives || []).map(h => h.id)
      const myHiveIds = myHives.map(h => h.id)
      const othersHiveIds = othersHives.map(h => h.id)
      const myQueenIds = myHives.map(h => h.queen_id).filter(q => q !== null)
      const othersQueenIds = othersHives.map(h => h.queen_id).filter(q => q !== null)
      const teamQueenIds = (teamHives || []).map(h => h.queen_id).filter(q => q !== null)

      console.log('🐝 My shared hives:', myHiveIds.length, 'Others hives:', othersHiveIds.length)

      // Count MY shared queens
      let myQueensCount = 0
      let myActiveQueensCount = 0
      if (myQueenIds.length > 0) {
        const { count: queensCount } = await supabase
          .from('queens')
          .select('id', { count: 'exact', head: true })
          .in('id', myQueenIds)
        const { count: activeQueensCount } = await supabase
          .from('queens')
          .select('id', { count: 'exact', head: true })
          .in('id', myQueenIds)
          .eq('status', 'active')
        myQueensCount = queensCount || 0
        myActiveQueensCount = activeQueensCount || 0
      }

      // Count OTHERS' shared queens
      let othersQueensCount = 0
      let othersActiveQueensCount = 0
      if (othersQueenIds.length > 0) {
        const { count: queensCount } = await supabase
          .from('queens')
          .select('id', { count: 'exact', head: true })
          .in('id', othersQueenIds)
        const { count: activeQueensCount } = await supabase
          .from('queens')
          .select('id', { count: 'exact', head: true })
          .in('id', othersQueenIds)
          .eq('status', 'active')
        othersQueensCount = queensCount || 0
        othersActiveQueensCount = activeQueensCount || 0
      }

      // Count total team queens
      let teamQueensCount = 0
      let teamActiveQueensCount = 0
      if (teamQueenIds.length > 0) {
        const { count: queensCount } = await supabase
          .from('queens')
          .select('id', { count: 'exact', head: true })
          .in('id', teamQueenIds)
        const { count: activeQueensCount } = await supabase
          .from('queens')
          .select('id', { count: 'exact', head: true })
          .in('id', teamQueenIds)
          .eq('status', 'active')
        teamQueensCount = queensCount || 0
        teamActiveQueensCount = activeQueensCount || 0
      }

      // Count MY inspections (last 7 days)
      let myInspectionsCount = 0
      if (myHiveIds.length > 0) {
        const { count: inspectionsCount } = await supabase
          .from('inspections')
          .select('id', { count: 'exact', head: true })
          .in('hive_id', myHiveIds)
          .gte('inspection_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        myInspectionsCount = inspectionsCount || 0
      }

      // Count OTHERS' inspections (last 7 days)
      let othersInspectionsCount = 0
      if (othersHiveIds.length > 0) {
        const { count: inspectionsCount } = await supabase
          .from('inspections')
          .select('id', { count: 'exact', head: true })
          .in('hive_id', othersHiveIds)
          .gte('inspection_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        othersInspectionsCount = inspectionsCount || 0
      }

      // Count team inspections (last 7 days)
      let teamInspectionsCount = 0
      if (teamHiveIds.length > 0) {
        const { count: inspectionsCount } = await supabase
          .from('inspections')
          .select('id', { count: 'exact', head: true })
          .in('hive_id', teamHiveIds)
          .gte('inspection_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        teamInspectionsCount = inspectionsCount || 0
      }

      const finalStats = {
        teamQueens: teamQueensCount,
        teamActiveQueens: teamActiveQueensCount,
        teamHives: teamHiveIds.length,
        teamInspections: teamInspectionsCount,
      }
      console.log('✅ Final team stats:', finalStats)
      setTeamStats(finalStats)

      const myShared = {
        queens: myQueensCount,
        activeQueens: myActiveQueensCount,
        hives: myHiveIds.length,
        inspections: myInspectionsCount,
      }
      console.log('👤 My shared stats:', myShared)
      setMySharedStats(myShared)

      const sharedWithMe = {
        queens: othersQueensCount,
        activeQueens: othersActiveQueensCount,
        hives: othersHiveIds.length,
        inspections: othersInspectionsCount,
      }
      console.log('👥 Shared with me stats:', sharedWithMe)
      setSharedWithMeStats(sharedWithMe)
    } catch (error) {
      console.error('❌ Error fetching team stats:', error)
    }
  }, [userId])

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

      fetchDashboardData(id)
      fetchTeams()
      fetchTeamStats()
    }
    initUser()
  }, [router, fetchDashboardData, fetchTeams, fetchTeamStats])

  if (loading) return <LoadingSpinner text="Loading dashboard..." />

  // Check if user has any team data or is a team member
  const hasTeamData = teamStats.teamHives > 0 || teamStats.teamQueens > 0 || teamStats.teamInspections > 0
  const isTeamMember = (ownedTeams.length > 0 || memberTeams.length > 0)

  const statCards = [
    { label: 'My Queens', value: stats.queens, icon: '👑', color: 'bg-purple-50 text-purple-700' },
    { label: 'My Active Queens', value: stats.activeQueens, icon: '✨', color: 'bg-green-50 text-green-700' },
    { label: 'My Hives', value: stats.hives, icon: '🐝', color: 'bg-amber-50 text-amber-700' },
    { label: 'Active Queen Rearing Batches', value: stats.activeBatches, icon: '🥚', color: 'bg-blue-50 text-blue-700' },
    { label: 'My Inspections (7d)', value: stats.recentInspections, icon: '📋', color: 'bg-indigo-50 text-indigo-700' },
  ]

  const hasMySharedData = mySharedStats.hives > 0 || mySharedStats.queens > 0 || mySharedStats.inspections > 0
  const hasSharedWithMeData = sharedWithMeStats.hives > 0 || sharedWithMeStats.queens > 0 || sharedWithMeStats.inspections > 0

  const mySharedCards = hasMySharedData ? [
    { label: 'Queens I Shared', value: mySharedStats.queens, icon: '👑', color: 'bg-purple-100 text-purple-800 border-2 border-purple-300' },
    { label: 'Active Queens Shared', value: mySharedStats.activeQueens, icon: '✨', color: 'bg-green-100 text-green-800 border-2 border-green-300' },
    { label: 'Hives I Shared', value: mySharedStats.hives, icon: '🐝', color: 'bg-amber-100 text-amber-800 border-2 border-amber-300' },
    { label: 'My Shared Inspections (7d)', value: mySharedStats.inspections, icon: '📋', color: 'bg-indigo-100 text-indigo-800 border-2 border-indigo-300' },
  ] : []

  const sharedWithMeCards = hasSharedWithMeData ? [
    { label: 'Queens Shared with Me', value: sharedWithMeStats.queens, icon: '👑', color: 'bg-purple-50 text-purple-700 border-2 border-purple-200' },
    { label: 'Active Queens Available', value: sharedWithMeStats.activeQueens, icon: '✨', color: 'bg-green-50 text-green-700 border-2 border-green-200' },
    { label: 'Hives Shared with Me', value: sharedWithMeStats.hives, icon: '🐝', color: 'bg-amber-50 text-amber-700 border-2 border-amber-200' },
    { label: 'Team Inspections (7d)', value: sharedWithMeStats.inspections, icon: '📋', color: 'bg-indigo-50 text-indigo-700 border-2 border-indigo-200' },
  ] : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
            {userRole === 'Admin' && (
              <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full flex items-center gap-1">
                <Shield size={14} />
                Admin
              </span>
            )}
          </div>
          {userRole === 'Admin' && userStats.totalUsers > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <strong className="text-green-700">{userStats.onlineUsers}</strong> of <strong>{userStats.totalUsers}</strong> users online
              </span>
              <span className="hidden sm:inline text-gray-400">•</span>
              <span className="inline-flex items-center gap-1">
                🐝 <strong className="text-amber-700">{userStats.totalHives}</strong> hives managed
              </span>
              <span className="hidden sm:inline text-gray-400">•</span>
              <span className="inline-flex items-center gap-1">
                📍 <strong className="text-blue-700">{userStats.totalApiaries}</strong> apiaries
              </span>
              {ticketStats.totalTickets > 0 && (
                <>
                  <span className="hidden sm:inline text-gray-400">•</span>
                  <span className="inline-flex items-center gap-1">
                    🎫 <strong className={ticketStats.openTickets > 0 ? "text-red-700" : "text-blue-700"}>{ticketStats.openTickets}</strong> open tickets
                    {ticketStats.inProgressTickets > 0 && (
                      <span className="text-gray-600">
                        (<strong className="text-yellow-700">{ticketStats.inProgressTickets}</strong> in progress)
                      </span>
                    )}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => {
            fetchDashboardData()
            fetchTeamStats()
          }}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>

      {/* My Statistics Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">My Beekeeping</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((card) => (
            <StatCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={card.icon}
              color={card.color}
            />
          ))}
        </div>
      </div>

      {/* Team Statistics Cards - Shared by Me */}
      {isTeamMember && hasMySharedData && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users size={20} className="text-blue-600" />
            Shared by Me
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mySharedCards.map((card) => (
              <StatCard
                key={card.label}
                label={card.label}
                value={card.value}
                icon={card.icon}
                color={card.color}
              />
            ))}
          </div>
        </div>
      )}

      {/* Team Statistics Cards - Shared with Me */}
      {isTeamMember && hasSharedWithMeData && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users size={20} className="text-green-600" />
            Shared with Me
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {sharedWithMeCards.map((card) => (
              <StatCard
                key={card.label}
                label={card.label}
                value={card.value}
                icon={card.icon}
                color={card.color}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Shared Data Message */}
      {isTeamMember && !hasMySharedData && !hasSharedWithMeData && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
          <Users size={48} className="mx-auto text-blue-400 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Shared Apiaries Yet</h3>
          <p className="text-sm text-gray-600 mb-4">
            You&apos;re part of a team, but no apiaries have been shared yet. Team owners need to share apiaries for team data to appear here.
          </p>
          <p className="text-xs text-gray-500">
            Check the browser console for debugging info (F12)
          </p>
        </div>
      )}

      {/* Upcoming Events - Queen Rearing Calendar */}
      {userId && <UpcomingEvents userId={userId} />}

      {/* Teams Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={24} className="text-blue-600" />
            <h2 className="text-xl font-semibold">My Teams</h2>
          </div>
          <a
            href="/dashboard/profile#teams"
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
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
                <div className="flex items-center gap-2 mb-3">
                  <Crown size={18} className="text-amber-600" />
                  <h3 className="font-semibold text-gray-900">Teams I Own</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ownedTeams.map((team) => (
                    <div key={team.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{team.name}</h4>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded font-medium">
                          Owner
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <Users size={14} className="inline mr-1" />
                        {team.member_count || 0} member{(team.member_count || 0) !== 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Created {new Date(team.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Member Teams */}
            {memberTeams.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck size={18} className="text-green-600" />
                  <h3 className="font-semibold text-gray-900">Teams I&apos;m In</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {memberTeams.map((team) => (
                    <div key={team.id} className="border border-gray-200 rounded-lg p-4 hover:border-green-300 hover:shadow-md transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{team.name}</h4>
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded font-medium capitalize">
                          {team.user_role}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <Users size={14} className="inline mr-1" />
                        {team.member_count || 0} member{(team.member_count || 0) !== 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Joined {new Date(team.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {ownedTeams.length === 0 && memberTeams.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Users size={48} className="mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 mb-2">You haven&apos;t created or joined any teams yet.</p>
                <p className="text-sm text-gray-500 mb-4">Create a team to collaborate with other beekeepers!</p>
                <a
                  href="/dashboard/profile#teams"
                  className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Get Started
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {recentActivity.map((inspection) => (
            <div key={inspection.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <span className="font-medium">
                  Inspection of {inspection.hives?.hive_number || 'Unknown Hive'}
                </span>
                <span className="text-sm text-gray-500 ml-2">{inspection.inspection_date}</span>
              </div>
              <span
                className={`px-2 py-1 text-xs rounded ${
                  inspection.queen_seen
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {inspection.queen_seen ? 'Queen Seen' : 'No Queen'}
              </span>
            </div>
          ))}
          {recentActivity.length === 0 && (
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          )}
        </div>
      </div>

      {/* Data Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-3">Queen Status Distribution</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active</span>
              <span className="font-medium text-green-600">{stats.activeQueens}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Inactive</span>
              <span className="font-medium text-gray-600">{stats.queens - stats.activeQueens}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-3">System Health</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-600">Database Connected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-600">All Systems Operational</span>
            </div>
          </div>
        </div>
      </div>

      {/* Application Version */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow p-6 border border-blue-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Hive Craic</h3>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full shadow-sm">
                <span className="font-medium text-gray-600">Version:</span>
                <span className="font-bold text-indigo-700">v1.0.7</span>
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full shadow-sm">
                <span className="font-medium text-gray-600">Last Updated:</span>
                <span className="font-semibold text-blue-700">October 30, 2025</span>
              </span>
            </div>
          </div>
          <a
            href="/dashboard/about?section=changes"
            className="px-4 py-2 text-sm bg-white text-blue-600 rounded-lg hover:bg-blue-50 border border-blue-200 font-medium transition-colors"
          >
            View Changes
          </a>
        </div>
      </div>
    </div>
  )
}