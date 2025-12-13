import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Team, TeamMember, TeamStats, TeamApiaryWithOwner } from '@/types/dashboard'

interface UseTeamsReturn {
  ownedTeams: Team[]
  memberTeams: Team[]
  mySharedStats: TeamStats
  sharedWithMeStats: TeamStats
  mySharedTeamMembers: TeamMember[]
  loadingTeams: boolean
  loadingTeamMembers: boolean
  fetchTeams: (userId: string) => Promise<void>
  fetchTeamStats: (userId: string) => Promise<void>
  fetchMySharedTeamMembers: (userId: string) => Promise<void>
}

export function useTeams(): UseTeamsReturn {
  const [ownedTeams, setOwnedTeams] = useState<Team[]>([])
  const [memberTeams, setMemberTeams] = useState<Team[]>([])
  const [mySharedStats, setMySharedStats] = useState<TeamStats>({
    queens: 0,
    activeQueens: 0,
    hives: 0,
    inspections: 0,
  })
  const [sharedWithMeStats, setSharedWithMeStats] = useState<TeamStats>({
    queens: 0,
    activeQueens: 0,
    hives: 0,
    inspections: 0,
  })
  const [mySharedTeamMembers, setMySharedTeamMembers] = useState<TeamMember[]>([])
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false)

  const fetchTeams = useCallback(async (userId: string) => {
    if (!userId) return
    setLoadingTeams(true)

    try {
      // Fetch owned teams
      const { data: owned, error: ownedError } = await supabase
        .from('teams')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })
        .limit(3)

      if (ownedError) throw ownedError

      const ownedTeamIds = (owned || []).map((t) => t.id)

      // Fetch teams where user is a member (not owner)
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('team_id, role, teams(*)')
        .eq('user_id', userId)
        .neq('role', 'owner')
        .limit(3)

      if (memberError) throw memberError

      const memberTeamsData = (memberData || []).map((membership) => {
        return (membership as unknown as { teams: Team; role: string }).teams
      })
      const memberTeamIds = memberTeamsData.map((t) => t.id)

      // Batch query for member counts
      const allTeamIds = [...ownedTeamIds, ...memberTeamIds]
      const { data: memberCounts } = await supabase
        .from('team_members')
        .select('team_id')
        .in('team_id', allTeamIds)

      // Count members per team
      const memberCountMap = new Map<string, number>()
      memberCounts?.forEach((member) => {
        memberCountMap.set(member.team_id, (memberCountMap.get(member.team_id) || 0) + 1)
      })

      // Add counts to owned teams
      const ownedWithCounts = (owned || []).map((team) => ({
        ...team,
        member_count: memberCountMap.get(team.id) || 0,
        user_role: 'owner',
      }))

      setOwnedTeams(ownedWithCounts)

      // Add counts to member teams
      const memberWithCounts = (memberData || []).map((membership) => {
        const team = (membership as unknown as { teams: Team }).teams
        return {
          ...team,
          member_count: memberCountMap.get(team.id) || 0,
          user_role: membership.role,
        }
      })

      setMemberTeams(memberWithCounts)
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      setLoadingTeams(false)
    }
  }, [])

  const fetchTeamStats = useCallback(async (userId: string) => {
    if (!userId) return

    try {
      // Get all team IDs where user is a member (including owned teams)
      const { data: teamMemberships, error: membershipError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)

      if (membershipError) throw membershipError

      const teamIds = (teamMemberships || []).map((m) => m.team_id)

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

      const apiaryIds = (teamApiaries || []).map((ta) => ta.apiary_id)

      if (apiaryIds.length === 0) {
        setMySharedStats({ queens: 0, activeQueens: 0, hives: 0, inspections: 0 })
        setSharedWithMeStats({ queens: 0, activeQueens: 0, hives: 0, inspections: 0 })
        return
      }

      // Separate apiaries by ownership
      const typedTeamApiaries = teamApiaries as TeamApiaryWithOwner[]
      const myApiaryIds = (typedTeamApiaries || [])
        .filter((ta) => {
          if (!ta.apiaries) return false
          const apiaryUserId = Array.isArray(ta.apiaries) ? ta.apiaries[0]?.user_id : ta.apiaries.user_id
          return apiaryUserId === userId
        })
        .map((ta) => ta.apiary_id)
      const othersApiaryIds = (typedTeamApiaries || [])
        .filter((ta) => {
          if (!ta.apiaries) return false
          const apiaryUserId = Array.isArray(ta.apiaries) ? ta.apiaries[0]?.user_id : ta.apiaries.user_id
          return apiaryUserId !== userId
        })
        .map((ta) => ta.apiary_id)

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

      // Process hives
      const myHives = mySharedHives || []
      const othersHives = sharedWithMeHives || []

      const myHiveIds = myHives.map((h) => h.id)
      const othersHiveIds = othersHives.map((h) => h.id)
      const myQueenIds = myHives.map((h) => h.queen_id).filter((q) => q !== null)
      const othersQueenIds = othersHives.map((h) => h.queen_id).filter((q) => q !== null)

      // Parallelize all count queries
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const [
        myQueensResult,
        myActiveQueensResult,
        othersQueensResult,
        othersActiveQueensResult,
        myInspectionsResult,
        othersInspectionsResult,
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
          ? supabase
              .from('inspections')
              .select('id', { count: 'exact', head: true })
              .in('hive_id', myHiveIds)
              .gte('inspection_date', sevenDaysAgo)
          : Promise.resolve({ count: 0 }),
        othersHiveIds.length > 0
          ? supabase
              .from('inspections')
              .select('id', { count: 'exact', head: true })
              .in('hive_id', othersHiveIds)
              .gte('inspection_date', sevenDaysAgo)
          : Promise.resolve({ count: 0 }),
      ])

      setMySharedStats({
        queens: myQueensResult.count || 0,
        activeQueens: myActiveQueensResult.count || 0,
        hives: myHiveIds.length,
        inspections: myInspectionsResult.count || 0,
      })

      setSharedWithMeStats({
        queens: othersQueensResult.count || 0,
        activeQueens: othersActiveQueensResult.count || 0,
        hives: othersHiveIds.length,
        inspections: othersInspectionsResult.count || 0,
      })
    } catch (error) {
      console.error('Error fetching team stats:', error)
    }
  }, [])

  const fetchMySharedTeamMembers = useCallback(async (userId: string) => {
    if (!userId) return
    setLoadingTeamMembers(true)

    try {
      // Get apiaries owned by the current user
      const { data: myApiaries, error: apiariesError } = await supabase
        .from('apiaries')
        .select('id, name')
        .eq('user_id', userId)

      if (apiariesError) throw apiariesError

      const myApiaryIds = (myApiaries || []).map((a) => a.id)

      if (myApiaryIds.length === 0) {
        setMySharedTeamMembers([])
        setLoadingTeamMembers(false)
        return
      }

      // Get teams that these apiaries are shared with
      const { data: teamApiaries, error: teamApiariesError } = await supabase
        .from('team_apiaries')
        .select('team_id, teams(name)')
        .in('apiary_id', myApiaryIds)

      if (teamApiariesError) throw teamApiariesError

      const teamIds = [...new Set((teamApiaries || []).map((ta) => ta.team_id))]

      if (teamIds.length === 0) {
        setMySharedTeamMembers([])
        setLoadingTeamMembers(false)
        return
      }

      // Get team members for these teams
      const { data: teamMembers, error: membersError } = await supabase
        .from('team_members')
        .select('user_id, team_id, role, teams(name)')
        .in('team_id', teamIds)

      if (membersError) throw membersError

      if (!teamMembers || teamMembers.length === 0) {
        setMySharedTeamMembers([])
        setLoadingTeamMembers(false)
        return
      }

      // Get unique user IDs
      const userIds = [...new Set(teamMembers.map((m) => m.user_id))]

      // Fetch profiles separately
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)

      if (profilesError) throw profilesError

      // Create a map of user_id to profile
      const profilesMap = new Map(
        (profilesData || []).map((p) => [p.id, { full_name: p.full_name, email: p.email }])
      )

      // Transform the data
      const transformedMembers: TeamMember[] = teamMembers.map((member) => ({
        user_id: member.user_id,
        team_id: member.team_id,
        role: member.role,
        teams: Array.isArray(member.teams) ? member.teams[0] : member.teams,
        profiles: profilesMap.get(member.user_id) || { full_name: null, email: 'Unknown' },
      }))

      setMySharedTeamMembers(transformedMembers)
    } catch (error) {
      console.error('Error fetching team members:', error)
    } finally {
      setLoadingTeamMembers(false)
    }
  }, [])

  return {
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
  }
}
