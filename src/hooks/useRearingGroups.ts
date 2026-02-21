import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface RearingGroup {
  id: string
  name: string
  owner_id: string
  created_at: string
  updated_at: string
  member_count?: number
  user_role?: string
  membership_id?: string
  experience_level?: 'experienced' | 'intermediate' | 'novice' | null
}

export interface RearingGroupMember {
  id: string
  group_id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
  user_email?: string
  first_name?: string
  last_name?: string
  experience_level?: 'experienced' | 'intermediate' | 'novice' | null
}

export interface RearingGroupInvitation {
  id: string
  group_id: string
  email: string
  invited_by: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  invited_at: string
  expires_at: string
  accepted_at?: string
  declined_at?: string
}

export function useRearingGroups() {
  const [ownedRearingGroups, setOwnedRearingGroups] = useState<RearingGroup[]>([])
  const [memberRearingGroups, setMemberRearingGroups] = useState<RearingGroup[]>([])
  const [loadingRearingGroups, setLoadingRearingGroups] = useState(false)
  const [rgMembers, setRgMembers] = useState<RearingGroupMember[]>([])
  const [rgPendingInvitations, setRgPendingInvitations] = useState<RearingGroupInvitation[]>([])
  const [rgAcceptedInvitations, setRgAcceptedInvitations] = useState<RearingGroupInvitation[]>([])
  const [rgDeclinedInvitations, setRgDeclinedInvitations] = useState<RearingGroupInvitation[]>([])
  const [loadingRgMembers, setLoadingRgMembers] = useState(false)

  const fetchRearingGroups = useCallback(async (userId: string) => {
    if (!userId) return
    setLoadingRearingGroups(true)

    try {
      // Fetch owned groups
      const { data: owned, error: ownedError } = await supabase
        .from('rearing_groups')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })

      if (ownedError) throw ownedError

      const ownedGroupIds = (owned || []).map((g) => g.id)

      // Fetch groups where user is a member (not owner)
      const { data: memberData, error: memberError } = await supabase
        .from('rearing_group_members')
        .select('id, group_id, role, experience_level, rearing_groups(*)')
        .eq('user_id', userId)

      if (memberError) throw memberError

      // Filter to groups the user doesn't own, keeping membership info
      interface MemberRow { id: string; group_id: string; role: string; experience_level: string | null; rearing_groups: RearingGroup }
      const rows = (memberData || []) as unknown as MemberRow[]

      const memberGroupsRaw = rows.filter((m) => m.rearing_groups && m.rearing_groups.owner_id !== userId)
      const memberGroupsData = memberGroupsRaw.map((m) => m.rearing_groups)
      const membershipMap = new Map(memberGroupsRaw.map((m) => [
        m.rearing_groups.id,
        { membership_id: m.id, experience_level: m.experience_level as RearingGroup['experience_level'] }
      ]))

      const memberGroupIds = memberGroupsData.map((g) => g.id)

      // Batch query for member counts
      const allGroupIds = [...ownedGroupIds, ...memberGroupIds]
      const memberCountMap = new Map<string, number>()

      if (allGroupIds.length > 0) {
        const { data: memberCounts } = await supabase
          .from('rearing_group_members')
          .select('group_id')
          .in('group_id', allGroupIds)

        memberCounts?.forEach((m) => {
          memberCountMap.set(m.group_id, (memberCountMap.get(m.group_id) || 0) + 1)
        })
      }

      setOwnedRearingGroups((owned || []).map((group) => ({
        ...group,
        member_count: memberCountMap.get(group.id) || 0,
        user_role: 'owner',
      })))

      setMemberRearingGroups(memberGroupsData.map((group) => ({
        ...group,
        member_count: memberCountMap.get(group.id) || 0,
        user_role: 'member',
        membership_id: membershipMap.get(group.id)?.membership_id,
        experience_level: membershipMap.get(group.id)?.experience_level,
      })))
    } catch (error) {
      console.error('Error fetching rearing groups:', error)
    } finally {
      setLoadingRearingGroups(false)
    }
  }, [])

  const fetchRearingGroupDetails = useCallback(async (groupId: string) => {
    try {
      // Fetch members
      const { data: members, error: membersError } = await supabase
        .from('rearing_group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: false })

      if (membersError) throw membersError

      // Manually fetch user details for each member
      const membersWithDetails = await Promise.all(
        (members || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', member.user_id)
            .maybeSingle()

          const { data: userEmail } = await supabase
            .rpc('get_user_email', { search_user_id: member.user_id })

          return {
            ...member,
            user_email: userEmail || 'Unknown',
            first_name: profile?.first_name,
            last_name: profile?.last_name,
          }
        })
      )

      setRgMembers(membersWithDetails as RearingGroupMember[])

      // Fetch pending invitations
      const { data: pending, error: pendingError } = await supabase
        .from('rearing_group_invitations')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('invited_at', { ascending: false })

      if (!pendingError) setRgPendingInvitations(pending || [])

      // Fetch accepted invitations
      const { data: accepted, error: acceptedError } = await supabase
        .from('rearing_group_invitations')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'accepted')
        .order('accepted_at', { ascending: false })

      if (!acceptedError) setRgAcceptedInvitations(accepted || [])

      // Fetch declined invitations
      const { data: declined, error: declinedError } = await supabase
        .from('rearing_group_invitations')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'declined')
        .order('declined_at', { ascending: false })

      if (!declinedError) setRgDeclinedInvitations(declined || [])
    } catch (error) {
      console.error('Error fetching rearing group details:', error)
    }
  }, [])

  return {
    ownedRearingGroups,
    memberRearingGroups,
    setMemberRearingGroups,
    loadingRearingGroups,
    rgMembers,
    setRgMembers,
    rgPendingInvitations,
    rgAcceptedInvitations,
    rgDeclinedInvitations,
    loadingRgMembers,
    setLoadingRgMembers,
    setRgPendingInvitations,
    fetchRearingGroups,
    fetchRearingGroupDetails,
  }
}
