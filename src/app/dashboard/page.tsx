'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId, getUserRole, type UserRole } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import StatCard from '@/components/ui/StatCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import UpcomingEvents from '@/components/UpcomingEvents'
import { Shield, Users, Crown, UserCheck, Search, Syringe, Bug, Wheat, Droplet } from 'lucide-react'

interface Inspection {
  id: string
  inspection_date: string
  queen_seen: boolean
  hives?: {
    hive_number: string
  }
}

interface VarroaTreatment {
  id: string
  hive_id: string
  treatment_date: string
  treatment_type: string
  hives?: {
    hive_number: string
  }
}

interface VarroaCheck {
  id: string
  hive_id: string
  check_date: string
  method: string
  infestation_rate: number | null
  hives?: {
    hive_number: string
  }
}

interface Feeding {
  id: string
  hive_id: string
  feed_date: string
  feed_type: string
  quantity: number | null
  hives?: {
    hive_number: string
  }
}

interface Harvest {
  id: string
  hive_id: string
  harvest_date: string
  honey_weight: number | null
  frames_harvested: number | null
  hives?: {
    hive_number: string
  }
}

// Unified record type for displaying all records together
type RecentActivityRecord =
  | (Inspection & { record_type: 'inspection', date: string })
  | (VarroaTreatment & { record_type: 'varroa_treatment', date: string })
  | (VarroaCheck & { record_type: 'varroa_check', date: string })
  | (Feeding & { record_type: 'feeding', date: string })
  | (Harvest & { record_type: 'harvest', date: string })

interface Team {
  id: string
  name: string
  owner_id: string
  created_at: string
  member_count?: number
  user_role?: string
}

interface TeamMember {
  user_id: string
  team_id: string
  role: string
  teams?: {
    name: string
  }
  profiles?: {
    full_name: string
    email: string
  }
}

interface TeamApiaryWithOwner {
  apiary_id: string
  apiaries: {
    user_id: string
  } | {
    user_id: string
  }[] | null
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    apiaries: 0,
    hives: 0,
    recentInspections: 0,
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
  const [recentActivity, setRecentActivity] = useState<RecentActivityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<UserRole>('User')
  const [ownedTeams, setOwnedTeams] = useState<Team[]>([])
  const [memberTeams, setMemberTeams] = useState<Team[]>([])
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [showMySharedDetails, setShowMySharedDetails] = useState(false)
  const [mySharedTeamMembers, setMySharedTeamMembers] = useState<TeamMember[]>([])
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false)
  const router = useRouter()

  const fetchDashboardData = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    try {
      // Fetch all stats in parallel
      const [apiariesRes, hivesRes, inspectionsRes] = await Promise.all([
        supabase.from('apiaries').select('id', { count: 'exact', head: true }).eq('user_id', currentUserId),
        supabase.from('hives').select('id', { count: 'exact', head: true }).eq('user_id', currentUserId),
        supabase.from('inspections').select('id', { count: 'exact', head: true }).gte('inspection_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]).eq('user_id', currentUserId),
      ])

      setStats({
        apiaries: apiariesRes.count || 0,
        hives: hivesRes.count || 0,
        recentInspections: inspectionsRes.count || 0,
      })

      // Fetch recent activity from all record types
      const [activityInspections, activityTreatments, activityChecks, activityFeedings, activityHarvests] = await Promise.all([
        supabase
          .from('inspections')
          .select('*, hives(hive_number)')
          .eq('user_id', currentUserId)
          .order('inspection_date', { ascending: false })
          .limit(10),
        supabase
          .from('varroa_treatments')
          .select('*, hives(hive_number)')
          .eq('user_id', currentUserId)
          .order('treatment_date', { ascending: false })
          .limit(10),
        supabase
          .from('varroa_checks')
          .select('*, hives(hive_number)')
          .eq('user_id', currentUserId)
          .order('check_date', { ascending: false })
          .limit(10),
        supabase
          .from('feedings')
          .select('*, hives(hive_number)')
          .eq('user_id', currentUserId)
          .order('feed_date', { ascending: false })
          .limit(10),
        supabase
          .from('harvests')
          .select('*, hives(hive_number)')
          .eq('user_id', currentUserId)
          .order('harvest_date', { ascending: false })
          .limit(10)
      ])

      // Merge all records with their types
      const merged: RecentActivityRecord[] = [
        ...((activityInspections.data as Inspection[]) || []).map(i => ({
          ...i,
          record_type: 'inspection' as const,
          date: i.inspection_date
        })),
        ...((activityTreatments.data as VarroaTreatment[]) || []).map(vt => ({
          ...vt,
          record_type: 'varroa_treatment' as const,
          date: vt.treatment_date
        })),
        ...((activityChecks.data as VarroaCheck[]) || []).map(vc => ({
          ...vc,
          record_type: 'varroa_check' as const,
          date: vc.check_date
        })),
        ...((activityFeedings.data as Feeding[]) || []).map(f => ({
          ...f,
          record_type: 'feeding' as const,
          date: f.feed_date
        })),
        ...((activityHarvests.data as Harvest[]) || []).map(h => ({
          ...h,
          record_type: 'harvest' as const,
          date: h.harvest_date
        }))
      ]

      // Sort by date descending (most recent first)
      merged.sort((a, b) => {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        if (isNaN(dateA) && isNaN(dateB)) return 0
        if (isNaN(dateA)) return 1
        if (isNaN(dateB)) return -1
        return dateB - dateA
      })

      // Take only the 5 most recent records
      setRecentActivity(merged.slice(0, 5))

      // Fetch user statistics (admin only)
      const role = await getUserRole()
      if (role === 'Admin') {
        // Get total users from profiles
        const { count: totalUsers } = await supabase
          .from('profiles')
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

      const ownedTeamIds = (owned || []).map(t => t.id)

      // Fetch teams where user is a member (not owner)
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('team_id, role, teams(*)')
        .eq('user_id', userId)
        .neq('role', 'owner')
        .limit(3) // Show top 3 member teams

      if (memberError) throw memberError

      const memberTeamsData = (memberData || []).map(membership => {
        return (membership as unknown as { teams: Team; role: string }).teams
      })
      const memberTeamIds = memberTeamsData.map(t => t.id)

      // Batch query for member counts - get all at once
      const allTeamIds = [...ownedTeamIds, ...memberTeamIds]
      const { data: memberCounts } = await supabase
        .from('team_members')
        .select('team_id')
        .in('team_id', allTeamIds)

      // Count members per team
      const memberCountMap = new Map<string, number>()
      memberCounts?.forEach(member => {
        memberCountMap.set(member.team_id, (memberCountMap.get(member.team_id) || 0) + 1)
      })

      // Add counts to owned teams
      const ownedWithCounts = (owned || []).map(team => ({
        ...team,
        member_count: memberCountMap.get(team.id) || 0,
        user_role: 'owner'
      }))

      setOwnedTeams(ownedWithCounts)

      // Add counts to member teams
      const memberWithCounts = (memberData || []).map(membership => {
        const team = (membership as unknown as { teams: Team }).teams
        return {
          ...team,
          member_count: memberCountMap.get(team.id) || 0,
          user_role: membership.role
        }
      })

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

      if (teamIds.length === 0) {
        setMySharedStats({ queens: 0, activeQueens: 0, hives: 0, inspections: 0 })
        setSharedWithMeStats({ queens: 0, activeQueens: 0, hives: 0, inspections: 0 })
        return
      }

      // Get shared apiaries for these teams with ownership info
      const { data: teamApiaries, error: apiaryError } = await supabase
        .from('team_apiaries')
        .select('apiary_id, apiaries(user_id)')
        .in('team_id', teamIds)

      if (apiaryError) throw apiaryError

      const apiaryIds = (teamApiaries || []).map(ta => ta.apiary_id)

      if (apiaryIds.length === 0) {
        setMySharedStats({ queens: 0, activeQueens: 0, hives: 0, inspections: 0 })
        setSharedWithMeStats({ queens: 0, activeQueens: 0, hives: 0, inspections: 0 })
        return
      }

      // Separate apiaries by ownership
      // Note: Supabase may return apiaries as object or array depending on relationship
      const typedTeamApiaries = teamApiaries as TeamApiaryWithOwner[]
      const myApiaryIds = (typedTeamApiaries || [])
        .filter(ta => {
          if (!ta.apiaries) return false
          // Handle both single object and array responses
          const apiaryUserId = Array.isArray(ta.apiaries)
            ? ta.apiaries[0]?.user_id
            : ta.apiaries.user_id
          return apiaryUserId === userId
        })
        .map(ta => ta.apiary_id)
      const othersApiaryIds = (typedTeamApiaries || [])
        .filter(ta => {
          if (!ta.apiaries) return false
          // Handle both single object and array responses
          const apiaryUserId = Array.isArray(ta.apiaries)
            ? ta.apiaries[0]?.user_id
            : ta.apiaries.user_id
          return apiaryUserId !== userId
        })
        .map(ta => ta.apiary_id)

      // Fetch hives from MY shared apiaries
      const { data: mySharedHives, error: myHivesError } = await supabase
        .from('hives')
        .select('id, queen_id, user_id, apiary_id')
        .in('apiary_id', myApiaryIds)

      if (myHivesError) throw myHivesError

      // Fetch hives from apiaries shared WITH ME
      const { data: sharedWithMeHives, error: othersHivesError } = await supabase
        .from('hives')
        .select('id, queen_id, user_id, apiary_id')
        .in('apiary_id', othersApiaryIds)

      if (othersHivesError) throw othersHivesError

      // Process MY shared hives (all hives in apiaries I own and shared)
      const myHives = mySharedHives || []
      const othersHives = sharedWithMeHives || []

      const myHiveIds = myHives.map(h => h.id)
      const othersHiveIds = othersHives.map(h => h.id)
      const myQueenIds = myHives.map(h => h.queen_id).filter(q => q !== null)
      const othersQueenIds = othersHives.map(h => h.queen_id).filter(q => q !== null)

      // Parallelize all count queries
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const [
        myQueensResult,
        myActiveQueensResult,
        othersQueensResult,
        othersActiveQueensResult,
        myInspectionsResult,
        othersInspectionsResult
      ] = await Promise.all([
        myQueenIds.length > 0
          ? supabase.from('queens').select('id', { count: 'exact', head: true }).in('id', myQueenIds)
          : Promise.resolve({ count: 0 }),
        myQueenIds.length > 0
          ? supabase.from('queens').select('id', { count: 'exact', head: true }).in('id', myQueenIds).eq('status', 'active')
          : Promise.resolve({ count: 0 }),
        othersQueenIds.length > 0
          ? supabase.from('queens').select('id', { count: 'exact', head: true }).in('id', othersQueenIds)
          : Promise.resolve({ count: 0 }),
        othersQueenIds.length > 0
          ? supabase.from('queens').select('id', { count: 'exact', head: true }).in('id', othersQueenIds).eq('status', 'active')
          : Promise.resolve({ count: 0 }),
        myHiveIds.length > 0
          ? supabase.from('inspections').select('id', { count: 'exact', head: true }).in('hive_id', myHiveIds).gte('inspection_date', sevenDaysAgo)
          : Promise.resolve({ count: 0 }),
        othersHiveIds.length > 0
          ? supabase.from('inspections').select('id', { count: 'exact', head: true }).in('hive_id', othersHiveIds).gte('inspection_date', sevenDaysAgo)
          : Promise.resolve({ count: 0 })
      ])

      const myQueensCount = myQueensResult.count || 0
      const myActiveQueensCount = myActiveQueensResult.count || 0
      const othersQueensCount = othersQueensResult.count || 0
      const othersActiveQueensCount = othersActiveQueensResult.count || 0
      const myInspectionsCount = myInspectionsResult.count || 0
      const othersInspectionsCount = othersInspectionsResult.count || 0

      const myShared = {
        queens: myQueensCount,
        activeQueens: myActiveQueensCount,
        hives: myHiveIds.length,
        inspections: myInspectionsCount,
      }
      setMySharedStats(myShared)

      const sharedWithMe = {
        queens: othersQueensCount,
        activeQueens: othersActiveQueensCount,
        hives: othersHiveIds.length,
        inspections: othersInspectionsCount,
      }
      setSharedWithMeStats(sharedWithMe)
    } catch (error) {
      console.error('Error fetching team stats:', error)
    }
  }, [userId])

  // Fetch team members who have access to my shared apiaries
  const fetchMySharedTeamMembers = useCallback(async () => {
    if (!userId) return
    setLoadingTeamMembers(true)

    try {
      // Get apiaries owned by the current user
      const { data: myApiaries, error: apiariesError } = await supabase
        .from('apiaries')
        .select('id, name')
        .eq('user_id', userId)

      console.log('📍 My apiaries:', myApiaries)
      if (apiariesError) throw apiariesError

      const myApiaryIds = (myApiaries || []).map(a => a.id)

      if (myApiaryIds.length === 0) {
        console.log('⚠️ No apiaries found for user')
        setMySharedTeamMembers([])
        setLoadingTeamMembers(false)
        return
      }

      // Get teams that these apiaries are shared with
      const { data: teamApiaries, error: teamApiariesError } = await supabase
        .from('team_apiaries')
        .select('team_id, teams(name)')
        .in('apiary_id', myApiaryIds)

      console.log('🔗 Team apiaries:', teamApiaries)
      if (teamApiariesError) throw teamApiariesError

      const teamIds = [...new Set((teamApiaries || []).map(ta => ta.team_id))]
      console.log('👥 Team IDs:', teamIds)

      if (teamIds.length === 0) {
        console.log('⚠️ No teams sharing these apiaries')
        setMySharedTeamMembers([])
        setLoadingTeamMembers(false)
        return
      }

      // Get team members for these teams (without profiles join)
      const { data: teamMembers, error: membersError } = await supabase
        .from('team_members')
        .select('user_id, team_id, role, teams(name)')
        .in('team_id', teamIds)

      console.log('👤 Team members raw:', teamMembers)
      if (membersError) throw membersError

      if (!teamMembers || teamMembers.length === 0) {
        setMySharedTeamMembers([])
        setLoadingTeamMembers(false)
        return
      }

      // Get unique user IDs
      const userIds = [...new Set(teamMembers.map(m => m.user_id))]
      console.log('👥 User IDs to fetch:', userIds)

      // Fetch profiles separately
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)

      console.log('👤 Profiles data:', profilesData)
      if (profilesError) throw profilesError

      // Create a map of user_id to profile
      const profilesMap = new Map(
        (profilesData || []).map(p => [p.id, { full_name: p.full_name, email: p.email }])
      )

      // Transform the data to match our interface
      const transformedMembers: TeamMember[] = teamMembers.map((member) => ({
        user_id: member.user_id,
        team_id: member.team_id,
        role: member.role,
        teams: Array.isArray(member.teams) ? member.teams[0] : member.teams,
        profiles: profilesMap.get(member.user_id) || { full_name: null, email: 'Unknown' },
      }))

      setMySharedTeamMembers(transformedMembers)
    } catch (error) {
      console.error('❌ Error fetching team members:', error)
    } finally {
      setLoadingTeamMembers(false)
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

      // Call fetch functions directly with the ID
      fetchDashboardData(id)
    }
    initUser()
  }, [router, fetchDashboardData])

  // Separate effect for team data that depends on userId being set
  useEffect(() => {
    if (userId) {
      fetchTeams()
      fetchTeamStats()
    }
  }, [userId, fetchTeams, fetchTeamStats])

  if (loading) return <LoadingSpinner text="Loading dashboard..." />

  // Check if user is a team member
  const isTeamMember = (ownedTeams.length > 0 || memberTeams.length > 0)

  const statCards = [
    { label: 'My Apiaries', value: stats.apiaries, icon: '📍', color: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300', href: '/dashboard/apiaries' },
    { label: 'My Hives', value: stats.hives, icon: '🐝', color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', href: '/dashboard/hives' },
    { label: 'My Inspections (7d)', value: stats.recentInspections, icon: '📋', color: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300', href: '/dashboard/records' },
  ]

  const hasMySharedData = mySharedStats.hives > 0 || mySharedStats.queens > 0 || mySharedStats.inspections > 0
  const hasSharedWithMeData = sharedWithMeStats.hives > 0 || sharedWithMeStats.queens > 0 || sharedWithMeStats.inspections > 0

  const mySharedCards = hasMySharedData ? [
    { label: 'Queens I Shared', value: mySharedStats.queens, icon: '👑', color: 'bg-purple-100 text-purple-800 border-2 border-purple-300' },
    { label: 'Active Queens Shared', value: mySharedStats.activeQueens, icon: '✨', color: 'bg-green-100 text-green-800 border-2 border-green-300' },
    { label: 'Hives I Shared', value: mySharedStats.hives, icon: '🐝', color: 'bg-amber-100 text-amber-800 border-2 border-amber-300' },
    { label: 'My Shared Inspections (7d)', value: mySharedStats.inspections, icon: '📋', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border-2 border-indigo-300 dark:border-indigo-700' },
  ] : []

  const sharedWithMeCards = hasSharedWithMeData ? [
    { label: 'Queens Shared with Me', value: sharedWithMeStats.queens, icon: '👑', color: 'bg-purple-50 text-purple-700 border-2 border-purple-200' },
    { label: 'Active Queens Available', value: sharedWithMeStats.activeQueens, icon: '✨', color: 'bg-green-50 text-green-700 border-2 border-green-200' },
    { label: 'Hives Shared with Me', value: sharedWithMeStats.hives, icon: '🐝', color: 'bg-amber-50 text-amber-700 border-2 border-amber-200' },
    { label: 'Team Inspections (7d)', value: sharedWithMeStats.inspections, icon: '📋', color: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-200 dark:border-indigo-800' },
  ] : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
            {userRole === 'Admin' && (
              <span className="px-3 py-1 bg-purple-900/50 dark:bg-purple-900/30 text-purple-300 dark:text-purple-200 text-sm font-medium rounded-full flex items-center gap-1 border border-purple-700 dark:border-purple-600">
                <Shield size={14} />
                Admin
              </span>
            )}
          </div>
          {userRole === 'Admin' && userStats.totalUsers > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-text-secondary">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-forest-600 dark:bg-forest-400 rounded-full animate-pulse"></span>
                <strong className="text-forest-600 dark:text-forest-400">{userStats.onlineUsers}</strong> of <strong className="text-text-primary">{userStats.totalUsers}</strong> users online
              </span>
              <span className="hidden sm:inline text-text-tertiary">•</span>
              <span className="inline-flex items-center gap-1">
                🐝 <strong className="text-orange-400">{userStats.totalHives}</strong> hives managed
              </span>
              <span className="hidden sm:inline text-text-tertiary">•</span>
              <span className="inline-flex items-center gap-1">
                📍 <strong className="text-blue-400">{userStats.totalApiaries}</strong> apiaries
              </span>
              {ticketStats.totalTickets > 0 && (
                <>
                  <span className="hidden sm:inline text-text-tertiary">•</span>
                  <span className="inline-flex items-center gap-1">
                    🎫 <strong className={ticketStats.openTickets > 0 ? "text-red-400" : "text-blue-400"}>{ticketStats.openTickets}</strong> open tickets
                    {ticketStats.inProgressTickets > 0 && (
                      <span className="text-text-tertiary">
                        (<strong className="text-yellow-400">{ticketStats.inProgressTickets}</strong> in progress)
                      </span>
                    )}
                  </span>
                </>
              )}
            </div>
          )}
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

      {/* Team Statistics Cards - Shared by Me - Compact Version */}
      {isTeamMember && hasMySharedData && (
        <div className="bg-surface dark:bg-surface rounded-xl shadow-lg p-4 border border-blue-600 dark:border-blue-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Users size={18} className="text-blue-600 dark:text-blue-400" />
              Shared by Me
            </h2>
            <button
              onClick={() => {
                if (!showMySharedDetails) {
                  fetchMySharedTeamMembers()
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

          {/* Team Members Detail View - Compact */}
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

      {/* Team Statistics Cards - Shared with Me - Compact Version */}
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

      {/* Upcoming Events - Queen Rearing Calendar */}
      {userId && <UpcomingEvents userId={userId} />}

      {/* Recent Activity */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
        <h2 className="text-xl font-semibold text-foreground mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {recentActivity.map((record) => {
            // Determine icon and label based on record type
            let icon: React.ReactNode
            let label: string
            let badge: React.ReactNode = null

            switch (record.record_type) {
              case 'inspection':
                icon = <Search size={18} className="text-blue-600 dark:text-blue-400" />
                label = `Inspection of ${record.hives?.hive_number || 'Unknown Hive'}`
                badge = (
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      record.queen_seen
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                    }`}
                  >
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
                    <span className="font-medium text-foreground block truncate">
                      {label}
                    </span>
                    <span className="text-sm text-text-secondary">
                      {new Date(record.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {badge && <div className="ml-2 flex-shrink-0">{badge}</div>}
              </div>
            )
          })}
          {recentActivity.length === 0 && (
            <p className="text-text-secondary text-center py-4">No recent activity</p>
          )}
        </div>
      </div>

      {/* Teams Section - Only show if user has teams */}
      {(loadingTeams || ownedTeams.length > 0 || memberTeams.length > 0) && (
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
            {/* Owned Teams - Compact List */}
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

            {/* Member Teams - Compact List */}
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
      )}


      {/* Application Version */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">HiveCraic</h3>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-surface-elevated dark:bg-surface-elevated rounded-full shadow-sm border border-border">
                <span className="font-medium text-text-secondary">Version:</span>
                <span className="font-bold text-indigo-700 dark:text-indigo-300">v1.4.4</span>
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-surface-elevated dark:bg-surface-elevated rounded-full shadow-sm border border-border">
                <span className="font-medium text-text-secondary">Last Updated:</span>
                <span className="font-semibold text-blue-700 dark:text-blue-400">December 1, 2025</span>
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