'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { User, Mail, Edit2, Users, Plus, X, Trash2, UserPlus, Clock, Send, MapPin, Share2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import AlertPanel from '@/components/ui/AlertPanel'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'

interface Team {
  id: string
  name: string
  owner_id: string
  created_at: string
  updated_at: string
  member_count?: number
  user_role?: string
}

interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  user_email?: string
  first_name?: string
  last_name?: string
}

interface TeamInvitation {
  id: string
  team_id: string
  email: string
  invited_by: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  invited_at: string
  expires_at: string
  accepted_at?: string
  declined_at?: string
}

interface Apiary {
  id: string
  name?: string
  eircode: string
  user_id: string
  created_at: string
}

interface TeamApiary {
  id: string
  team_id: string
  apiary_id: string
  added_at: string
  added_by: string
  apiary?: Apiary
}

export default function ApiaryTeamPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [userProfile, setUserProfile] = useState<{ first_name?: string; last_name?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const toast = useToast()

  // Teams state
  const [ownedTeams, setOwnedTeams] = useState<Team[]>([])
  const [memberTeams, setMemberTeams] = useState<Team[]>([])
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false)
  const [showInviteMemberModal, setShowInviteMemberModal] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [newTeamName, setNewTeamName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [sendingInvite, setSendingInvite] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [teamInvitations, setTeamInvitations] = useState<TeamInvitation[]>([])
  const [acceptedInvitations, setAcceptedInvitations] = useState<TeamInvitation[]>([])
  const [declinedInvitations, setDeclinedInvitations] = useState<TeamInvitation[]>([])
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)
  const [loadingMembers, setLoadingMembers] = useState(false)

  // Apiary sharing state
  const [userApiaries, setUserApiaries] = useState<Apiary[]>([])
  const [teamApiaries, setTeamApiaries] = useState<TeamApiary[]>([])
  const [showShareApiaryModal, setShowShareApiaryModal] = useState(false)
  const [selectedApiaryId, setSelectedApiaryId] = useState<string>('')
  const [sharingApiary, setSharingApiary] = useState(false)

  // Rename team state
  const [showRenameTeamModal, setShowRenameTeamModal] = useState(false)
  const [renameTeamName, setRenameTeamName] = useState('')
  const [renamingTeam, setRenamingTeam] = useState(false)

  // Fetch teams
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
      // More detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to load teams: ${errorMessage}. Please ensure the teams tables have been created in Supabase.`)
    } finally {
      setLoadingTeams(false)
    }
  }, [userId, toast])

  // Fetch user's apiaries
  const fetchUserApiaries = useCallback(async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('apiaries')
        .select('*')
        .eq('user_id', userId)
        .order('eircode')

      if (error) throw error
      setUserApiaries(data || [])
    } catch (error) {
      console.error('Error fetching apiaries:', error)
    }
  }, [userId])

  // Fetch shared apiaries for a team
  const fetchTeamApiaries = useCallback(async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_apiaries')
        .select('*, apiaries(*)')
        .eq('team_id', teamId)
        .order('added_at', { ascending: false })

      if (error) throw error

      // Transform the data to match our interface
      const transformed = (data || []).map(ta => ({
        ...ta,
        apiary: (ta as { apiaries: Apiary }).apiaries
      }))

      setTeamApiaries(transformed)
    } catch (error) {
      console.error('Error fetching team apiaries:', error)
    }
  }, [])

  // Share an apiary with a team
  const handleShareApiary = async () => {
    if (!userId || !selectedTeam || !selectedApiaryId) {
      toast.warning('Please select an apiary to share.')
      return
    }

    setSharingApiary(true)
    try {
      const { error } = await supabase
        .from('team_apiaries')
        .insert({
          team_id: selectedTeam.id,
          apiary_id: selectedApiaryId,
          added_by: userId,
        })

      if (error) throw error

      toast.success('Apiary shared with team successfully!')
      setSelectedApiaryId('')
      setShowShareApiaryModal(false)
      fetchTeamApiaries(selectedTeam.id)
    } catch (error) {
      console.error('Error sharing apiary:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to share apiary: ${errorMessage}`)
    } finally {
      setSharingApiary(false)
    }
  }

  // Unshare an apiary from a team
  const handleUnshareApiary = async (teamApiaryId: string, apiaryEircode: string) => {
    if (!confirm(`Remove apiary ${apiaryEircode} from this team?`)) return

    try {
      const { error } = await supabase
        .from('team_apiaries')
        .delete()
        .eq('id', teamApiaryId)

      if (error) throw error

      toast.success('Apiary removed from team successfully!')
      if (selectedTeam) {
        fetchTeamApiaries(selectedTeam.id)
      }
    } catch (error) {
      console.error('Error unsharing apiary:', error)
      toast.error('Failed to remove apiary from team.')
    }
  }

  // Create a new team
  const handleCreateTeam = async () => {
    if (!userId || !newTeamName.trim()) {
      toast.warning('Please enter a team name.')
      return
    }

    setCreatingTeam(true)
    try {
      const { error } = await supabase
        .from('teams')
        .insert({
          name: newTeamName.trim(),
          owner_id: userId,
        })
        .select()
        .single()

      if (error) throw error

      toast.success(`Team "${newTeamName}" created successfully!`)
      setNewTeamName('')
      setShowCreateTeamModal(false)
      fetchTeams() // Refresh teams list
    } catch (error) {
      console.error('Error creating team:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to create team: ${errorMessage}. The teams tables may not exist in Supabase yet.`)
    } finally {
      setCreatingTeam(false)
    }
  }

  // Fetch team members and invitations
  const fetchTeamDetails = useCallback(async (teamId: string) => {
    try {
      // Fetch team members (without user_profiles join since no FK exists)
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .order('joined_at', { ascending: false })

      if (membersError) throw membersError

      // Manually fetch user details for each member
      const membersWithDetails = await Promise.all(
        (members || []).map(async (member) => {
          // Get user profile by id
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', member.user_id)
            .maybeSingle()

          // Get email from auth.users via RPC function
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

      setTeamMembers(membersWithDetails as TeamMember[])

      // Fetch pending invitations
      const { data: invitations, error: invitationsError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('team_id', teamId)
        .eq('status', 'pending')
        .order('invited_at', { ascending: false })

      if (invitationsError) throw invitationsError

      setTeamInvitations(invitations || [])

      // Fetch accepted invitations
      const { data: acceptedInvites, error: acceptedError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('team_id', teamId)
        .eq('status', 'accepted')
        .order('accepted_at', { ascending: false })

      if (!acceptedError) {
        setAcceptedInvitations(acceptedInvites || [])
      }

      // Fetch declined invitations
      const { data: declinedInvites, error: declinedError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('team_id', teamId)
        .eq('status', 'declined')
        .order('declined_at', { ascending: false })

      if (!declinedError) {
        setDeclinedInvitations(declinedInvites || [])
      }

      // Fetch shared apiaries for this team
      await fetchTeamApiaries(teamId)
    } catch (error) {
      console.error('Error fetching team details:', error)
    }
  }, [fetchTeamApiaries])

  // Send invitation to join team
  const handleSendInvite = async () => {
    if (!selectedTeam || !inviteEmail.trim()) {
      toast.warning('Please enter an email address.')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail)) {
      toast.warning('Please enter a valid email address.')
      return
    }

    // Check if at least one apiary is explicitly shared with this specific team
    // This ensures the team has apiaries in scope before inviting members
    const { data: sharedApiaries, error: sharedError } = await supabase
      .from('team_apiaries')
      .select('id, apiary_id, apiaries(eircode)')
      .eq('team_id', selectedTeam.id)

    if (sharedError) {
      console.error('Error checking shared apiaries:', sharedError)
      toast.error('Failed to verify team apiaries. Please try again.')
      return
    }

    if (!sharedApiaries || sharedApiaries.length === 0) {
      toast.warning('Before inviting team members, you must share at least one apiary with this team.')
      return
    }

    setSendingInvite(true)
    try {
      // Check if user already exists using RPC function
      // This function queries auth.users which is not directly accessible from client
      const { data: lookupResult, error: lookupError } = await supabase
        .rpc('lookup_user_by_email', { search_email: inviteEmail.toLowerCase() })

      if (lookupError) {
        console.error('Error looking up user:', lookupError)
      }

      const existingUser = lookupResult && lookupResult.length > 0 ? lookupResult[0] : null

      // Check if already a member
      if (existingUser) {
        const { data: existingMember } = await supabase
          .from('team_members')
          .select('id')
          .eq('team_id', selectedTeam.id)
          .eq('user_id', existingUser.user_id)
          .maybeSingle()

        if (existingMember) {
          toast.warning('This user is already a member of the team.')
          setSendingInvite(false)
          return
        }
      }

      // Check if invitation already exists (pending or declined)
      const { data: existingInvite } = await supabase
        .from('team_invitations')
        .select('id, status')
        .eq('team_id', selectedTeam.id)
        .eq('email', inviteEmail.toLowerCase())
        .in('status', ['pending', 'declined'])
        .maybeSingle()

      if (existingInvite) {
        if (existingInvite.status === 'pending') {
          toast.warning('An invitation has already been sent to this email.')
          setSendingInvite(false)
          return
        } else if (existingInvite.status === 'declined') {
          // Delete the old declined invitation so we can send a new one
          const { error: deleteError } = await supabase
            .from('team_invitations')
            .delete()
            .eq('id', existingInvite.id)

          if (deleteError) {
            console.error('Error deleting declined invitation:', deleteError)
            toast.error('Failed to resend invitation. Please try again.')
            setSendingInvite(false)
            return
          }
          // Continue to send new invitation below
        }
      }

      // If user exists, auto-accept and add to team_members
      if (existingUser) {
        // Add user to team_members directly
        const { error: memberError } = await supabase
          .from('team_members')
          .insert({
            team_id: selectedTeam.id,
            user_id: existingUser.user_id,
            role: 'member',
          })

        if (memberError) throw memberError

        // Create invitation record as 'accepted' for audit trail
        await supabase
          .from('team_invitations')
          .insert({
            team_id: selectedTeam.id,
            email: inviteEmail.toLowerCase(),
            invited_by: userId,
            status: 'accepted',
            accepted_at: new Date().toISOString(),
          })

        toast.success(`${inviteEmail} has been added to the team!`)
      } else {
        // User doesn't exist yet - create pending invitation
        const { data: newInvite, error: inviteError } = await supabase
          .from('team_invitations')
          .insert({
            team_id: selectedTeam.id,
            email: inviteEmail.toLowerCase(),
            invited_by: userId,
            status: 'pending',
          })
          .select()
          .single()

        if (inviteError) throw inviteError

        // Send invitation email via Edge Function
        try {
          const { error: emailError } = await supabase.functions.invoke('send-team-invitation', {
            body: {
              invitationId: newInvite.id,
              inviteeEmail: inviteEmail.toLowerCase(),
              teamName: selectedTeam.name,
              inviterName: userProfile?.first_name && userProfile?.last_name
                ? `${userProfile.first_name} ${userProfile.last_name}`
                : undefined,
              inviterEmail: userEmail,
              expiresAt: newInvite.expires_at,
            },
          })

          if (emailError) {
            console.error('Failed to send invitation email:', emailError)
            console.error('Error details:', emailError)

            // Check if it's a "function not found" error
            if (emailError.message?.includes('FunctionsRelayError') || emailError.message?.includes('not found')) {
              toast.info(`Invitation created! Email system not configured yet. ${inviteEmail} will be added when they sign up.`)
            } else {
              toast.warning(`Invitation created but email failed to send. Please contact ${inviteEmail} directly.`)
            }
          } else {
            toast.success(`Invitation email sent to ${inviteEmail}!`)
          }
        } catch (emailException) {
          console.error('Exception sending invitation email:', emailException)
          toast.info(`Invitation created! Email system not configured. Please contact ${inviteEmail} directly.`)
        }
      }

      setInviteEmail('')
      setShowInviteMemberModal(false)
      fetchTeamDetails(selectedTeam.id) // Refresh team details
    } catch (error) {
      console.error('Error sending invitation:', error)
      toast.error('Failed to send invitation. Please try again.')
    } finally {
      setSendingInvite(false)
    }
  }

  // Delete team
  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete the team "${teamName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)

      if (error) throw error

      toast.success(`Team "${teamName}" deleted successfully.`)
      fetchTeams() // Refresh teams list
    } catch (error) {
      console.error('Error deleting team:', error)
      toast.error('Failed to delete team. Please try again.')
    }
  }

  // Rename team
  const handleRenameTeam = async () => {
    if (!selectedTeam || !renameTeamName.trim()) {
      toast.warning('Please enter a new team name.')
      return
    }

    if (renameTeamName.trim() === selectedTeam.name) {
      toast.warning('New name is the same as current name.')
      return
    }

    setRenamingTeam(true)
    try {
      const { error } = await supabase
        .from('teams')
        .update({ name: renameTeamName.trim() })
        .eq('id', selectedTeam.id)
        .eq('owner_id', userId) // Ensure only owner can rename

      if (error) throw error

      toast.success(`Team renamed to "${renameTeamName.trim()}" successfully!`)
      setShowRenameTeamModal(false)
      setRenameTeamName('')
      setSelectedTeam(null)
      fetchTeams() // Refresh teams list
    } catch (error) {
      console.error('Error renaming team:', error)
      toast.error('Failed to rename team. Please try again.')
    } finally {
      setRenamingTeam(false)
    }
  }

  // Remove team member
  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from the team?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      toast.success(`${memberEmail} removed from team.`)
      if (selectedTeam) {
        fetchTeamDetails(selectedTeam.id) // Refresh team details
      }
      fetchTeams() // Refresh teams list
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error('Failed to remove member. Please try again.')
    }
  }

  // Leave team (for members)
  const handleLeaveTeam = async (teamId: string, teamName: string) => {
    if (!userId) {
      toast.error('User not authenticated.')
      return
    }

    if (!confirm(`Are you sure you want to leave the team "${teamName}"?`)) {
      return
    }

    try {
      const { data, error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .select()

      if (error) {
        console.error('Leave team error details:', error)
        throw error
      }

      if (!data || data.length === 0) {
        console.warn('No team_member record was deleted')
        toast.warning('You are not a member of this team or membership not found.')
        return
      }

      toast.success(`You have left the team "${teamName}".`)
      fetchTeams() // Refresh teams list
    } catch (error) {
      console.error('Error leaving team:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to leave team: ${errorMessage}`)
    }
  }

  // Cancel invitation
  const handleCancelInvitation = async (invitationId: string, email: string) => {
    if (!confirm(`Are you sure you want to cancel the invitation to ${email}?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId)

      if (error) throw error

      // Immediately update local state to remove the invitation (optimistic update)
      setTeamInvitations(prev => prev.filter(inv => inv.id !== invitationId))

      // Also refresh team details to ensure consistency
      if (selectedTeam) {
        await fetchTeamDetails(selectedTeam.id)
      }

      // Show success message AFTER refresh completes
      toast.success(`Invitation to ${email} cancelled.`)
    } catch (error) {
      console.error('Error cancelling invitation:', error)
      toast.error('Failed to cancel invitation. Please try again.')
      // Refresh to restore correct state if delete failed
      if (selectedTeam) {
        fetchTeamDetails(selectedTeam.id)
      }
    }
  }

  // Init useEffect
  useEffect(() => {
    const init = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)

      // Fetch user email
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
      }

      // Fetch profile (first_name, last_name only)
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', id)
        .maybeSingle()

      if (profile) {
        setUserProfile(profile)
      }

      setLoading(false)
    }

    init()
  }, [router])

  // Fetch teams and apiaries when userId is set
  useEffect(() => {
    if (userId) {
      fetchTeams()
      fetchUserApiaries()
    }
  }, [userId, fetchTeams, fetchUserApiaries])

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-2">
        <Users size={28} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-foreground">Apiary Team</h1>
      </div>

      {/* Team Management */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users size={24} className="text-blue-600" />
            <h2 className="text-xl font-semibold text-foreground">Team Management</h2>
          </div>
          <Button
            onClick={() => setShowCreateTeamModal(true)}
            tone="success"
          >
            <Plus size={16} />
            Create Team
          </Button>
        </div>

        <p className="text-sm text-text-tertiary mb-6">
          Create teams to collaborate with other beekeepers. Share apiaries and manage hives together.
        </p>

        {loadingTeams ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Owned Teams */}
            {ownedTeams.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">My Teams</h3>
                <div className="space-y-3">
                  {ownedTeams.map((team) => (
                    <div key={team.id} className="border border-border rounded-lg p-4">
                      <div className="flex flex-col gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-foreground">{team.name}</h4>
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 text-xs rounded font-medium">
                            Owner
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            onClick={() => {
                              if (expandedTeamId === team.id) {
                                setExpandedTeamId(null)
                              } else {
                                setExpandedTeamId(team.id)
                                setLoadingMembers(true)
                                fetchTeamDetails(team.id).finally(() => setLoadingMembers(false))
                              }
                            }}
                            tone="neutral"
                            size="xs"
                          >
                            <Users size={14} />
                            <span className="hidden sm:inline">{expandedTeamId === team.id ? 'Hide' : 'View'} Members</span>
                            <span className="sm:hidden">Members</span>
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedTeam(team)
                              setShowInviteMemberModal(true)
                              fetchTeamDetails(team.id)
                            }}
                            tone="success"
                            size="xs"
                          >
                            <UserPlus size={14} />
                            Invite
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedTeam(team)
                              setShowShareApiaryModal(true)
                              setSelectedApiaryId('')
                            }}
                            tone="purple"
                            size="xs"
                          >
                            <Share2 size={14} />
                            <span className="hidden sm:inline">Share Apiary</span>
                            <span className="sm:hidden">Share</span>
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedTeam(team)
                              setRenameTeamName(team.name)
                              setShowRenameTeamModal(true)
                            }}
                            tone="blue"
                            size="xs"
                          >
                            <Edit2 size={14} />
                            Rename
                          </Button>
                          <Button
                            onClick={() => handleDeleteTeam(team.id, team.name)}
                            tone="danger"
                            size="xs"
                          >
                            <Trash2 size={14} />
                            Delete
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-text-tertiary">
                        <span className="font-medium">{team.member_count || 0}</span> member{(team.member_count || 0) !== 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-text-tertiary mt-1">
                        Created {new Date(team.created_at).toLocaleDateString()}
                      </div>

                      {/* Expanded Member List */}
                      {expandedTeamId === team.id && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <h5 className="text-sm font-semibold text-foreground mb-3">Team Members</h5>
                          {loadingMembers ? (
                            <div className="flex justify-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                            </div>
                          ) : teamMembers.length > 0 ? (
                            <div className="space-y-2">
                              {teamMembers.map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-3 bg-surface dark:bg-surface-elevated rounded-lg border border-border">
                                  <div className="flex items-center gap-3 flex-1">
                                    <User size={16} className="text-text-tertiary" />
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-foreground">
                                        {member.first_name && member.last_name
                                          ? `${member.first_name} ${member.last_name}`
                                          : member.user_email}
                                      </div>
                                      {member.first_name && member.last_name && (
                                        <div className="text-xs text-text-tertiary">{member.user_email}</div>
                                      )}
                                    </div>
                                    <span className={`px-2 py-1 text-xs rounded font-medium capitalize ${
                                      member.role === 'owner'
                                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200'
                                        : member.role === 'admin'
                                        ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200'
                                        : 'bg-surface-elevated dark:bg-surface-elevated text-foreground dark:text-foreground border border-border'
                                    }`}>
                                      {member.role}
                                    </span>
                                  </div>
                                  {member.role !== 'owner' && (
                                    <Button
                                      onClick={() => handleRemoveMember(member.id, member.user_email || 'this member')}
                                      tone="danger"
                                      size="xs"
                                      className="ml-3"
                                      title="Remove member"
                                    >
                                      <Trash2 size={12} />
                                      Remove
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-text-tertiary text-center py-4">No members yet. Invite someone to get started!</p>
                          )}

                          {/* Pending Invitations */}
                          {teamInvitations.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-border">
                              <h5 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <Send size={14} className="text-orange-600" />
                                Pending Invitations
                              </h5>
                              <div className="space-y-2">
                                {teamInvitations.map((invitation, index) => {
                                  const expiresAt = new Date(invitation.expires_at)
                                  const now = new Date()
                                  const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                                  const isExpiringSoon = daysLeft <= 2
                                  const isExpired = daysLeft < 0

                                  return (
                                    <div key={`pending-${invitation.id || index}`} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                      <div className="flex items-center gap-3 flex-1">
                                        <Mail size={16} className="text-orange-400" />
                                        <div className="flex-1">
                                          <div className="text-sm font-medium text-foreground">{invitation.email}</div>
                                          <div className="text-xs text-text-tertiary flex items-center gap-2 mt-1">
                                            <Clock size={12} />
                                            {isExpired ? (
                                              <span className="text-red-600 font-medium">Expired</span>
                                            ) : isExpiringSoon ? (
                                              <span className="text-orange-600 font-medium">Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>
                                            ) : (
                                              <span>Expires in {daysLeft} days</span>
                                            )}
                                          </div>
                                        </div>
                                        <span className="px-2 py-1 text-xs rounded font-medium bg-orange-100 text-orange-900">
                                          Pending
                                        </span>
                                      </div>
                                      <Button
                                        onClick={() => handleCancelInvitation(invitation.id, invitation.email)}
                                        tone="danger"
                                        size="xs"
                                        className="ml-3"
                                        title="Cancel invitation"
                                      >
                                        <X size={12} />
                                        Cancel
                                      </Button>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Accepted Invitations */}
                          {acceptedInvitations.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-border">
                              <h5 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <User size={14} className="text-green-600 dark:text-green-400" />
                                Accepted Invitations
                              </h5>
                              <div className="space-y-2">
                                {acceptedInvitations.map((invitation, index) => {
                                  const acceptedDate = invitation.accepted_at ? new Date(invitation.accepted_at) : null

                                  return (
                                    <AlertPanel
                                      key={`accepted-${invitation.id || index}`}
                                      tone="success"
                                      icon={<User size={16} className="text-green-600 dark:text-green-400" />}
                                      title={invitation.email}
                                      titleClassName="text-foreground"
                                      bodyClassName="text-xs text-text-tertiary"
                                      endSlot={<Badge tone="green">Accepted</Badge>}
                                      endSlotClassName="self-center"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Clock size={12} />
                                        {acceptedDate ? (
                                          <span>Accepted on {acceptedDate.toLocaleDateString()} at {acceptedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        ) : (
                                          <span>Accepted</span>
                                        )}
                                      </div>
                                    </AlertPanel>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Declined Invitations */}
                          {declinedInvitations.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-border">
                              <h5 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <X size={14} className="text-red-600" />
                                Declined Invitations
                              </h5>
                              <div className="space-y-2">
                                {declinedInvitations.map((invitation, index) => {
                                  const declinedDate = invitation.declined_at ? new Date(invitation.declined_at) : null

                                  return (
                                    <AlertPanel
                                      key={`declined-${invitation.id || index}`}
                                      tone="error"
                                      icon={<X size={16} className="text-red-600 dark:text-red-400" />}
                                      title={invitation.email}
                                      titleClassName="text-foreground"
                                      bodyClassName="text-xs text-text-tertiary"
                                      endSlot={<Badge tone="red">Declined</Badge>}
                                      endSlotClassName="self-center"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Clock size={12} />
                                        {declinedDate ? (
                                          <span>Declined on {declinedDate.toLocaleDateString()} at {declinedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        ) : (
                                          <span>Declined</span>
                                        )}
                                      </div>
                                    </AlertPanel>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Shared Apiaries */}
                          <div className="mt-6 pt-4 border-t border-border">
                            <h5 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                              <MapPin size={14} className="text-purple-600 dark:text-purple-400" />
                              Shared Apiaries
                            </h5>
                            {teamApiaries.length > 0 ? (
                              <div className="space-y-2">
                                {teamApiaries.map((ta) => (
                                  <div key={ta.id} className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                    <div className="flex items-center gap-3 flex-1">
                                      <MapPin size={16} className="text-purple-600 dark:text-purple-400" />
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-foreground">
                                          {ta.apiary?.name
                                            ? `${ta.apiary.name} - ${ta.apiary.eircode}`
                                            : (ta.apiary?.eircode || 'Unknown Location')}
                                        </div>
                                        <div className="text-xs text-text-tertiary mt-1">
                                          Shared {new Date(ta.added_at).toLocaleDateString()}
                                        </div>
                                      </div>
                                    </div>
                                    <Button
                                      onClick={() => handleUnshareApiary(
                                        ta.id,
                                        ta.apiary?.name
                                          ? `${ta.apiary.name} - ${ta.apiary.eircode}`
                                          : (ta.apiary?.eircode || 'this apiary')
                                      )}
                                      tone="danger"
                                      size="xs"
                                      className="ml-3"
                                      title="Remove apiary from team"
                                    >
                                      <X size={12} />
                                      Remove
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-text-tertiary text-center py-4 bg-surface dark:bg-surface-elevated rounded-lg border border-border">
                                No apiaries shared yet. Click &quot;Share Apiary&quot; to share an apiary with this team.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Member Teams */}
            {memberTeams.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Teams I&apos;m In</h3>
                <div className="space-y-3">
                  {memberTeams.map((team) => (
                    <div key={team.id} className="border border-border rounded-lg p-4">
                      <div className="flex flex-col gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-foreground">{team.name}</h4>
                          <span className="px-2 py-1 bg-surface-secondary text-text-primary text-xs rounded font-medium capitalize">
                            {team.user_role}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            onClick={() => {
                              if (expandedTeamId === team.id) {
                                setExpandedTeamId(null)
                              } else {
                                setExpandedTeamId(team.id)
                                setLoadingMembers(true)
                                fetchTeamDetails(team.id).finally(() => setLoadingMembers(false))
                              }
                            }}
                            tone="neutral"
                            size="xs"
                          >
                            <Users size={14} />
                            <span className="hidden sm:inline">{expandedTeamId === team.id ? 'Hide' : 'View'} Members</span>
                            <span className="sm:hidden">Members</span>
                          </Button>
                          <Button
                            onClick={() => handleLeaveTeam(team.id, team.name)}
                            tone="neutral"
                            size="xs"
                          >
                            Leave Team
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-text-tertiary">
                        <span className="font-medium">{team.member_count || 0}</span> member{(team.member_count || 0) !== 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-text-tertiary mt-1">
                        Joined {new Date(team.created_at).toLocaleDateString()}
                      </div>

                      {/* Expanded Member List */}
                      {expandedTeamId === team.id && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <h5 className="text-sm font-semibold text-foreground mb-3">Team Members</h5>
                          {loadingMembers ? (
                            <div className="flex justify-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                            </div>
                          ) : teamMembers.length > 0 ? (
                            <div className="space-y-2">
                              {teamMembers.map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-3 bg-surface dark:bg-surface-elevated rounded-lg border border-border">
                                  <div className="flex items-center gap-3 flex-1">
                                    <User size={16} className="text-text-tertiary" />
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-foreground">
                                        {member.first_name && member.last_name
                                          ? `${member.first_name} ${member.last_name}`
                                          : member.user_email}
                                      </div>
                                      {member.first_name && member.last_name && (
                                        <div className="text-xs text-text-tertiary">{member.user_email}</div>
                                      )}
                                    </div>
                                    <span className={`px-2 py-1 text-xs rounded font-medium capitalize ${
                                      member.role === 'owner'
                                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200'
                                        : member.role === 'admin'
                                        ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200'
                                        : 'bg-surface-elevated dark:bg-surface-elevated text-foreground dark:text-foreground border border-border'
                                    }`}>
                                      {member.role}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-text-tertiary text-center py-4">No members found.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {ownedTeams.length === 0 && memberTeams.length === 0 && (
              <div className="text-center py-12 bg-surface dark:bg-surface-elevated rounded-lg border border-border">
                <Users size={48} className="mx-auto text-text-tertiary mb-3" />
                <p className="text-text-tertiary mb-4">You haven&apos;t created or joined any teams yet.</p>
                <Button
                  onClick={() => setShowCreateTeamModal(true)}
                  tone="success"
                >
                  Create Your First Team
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface dark:bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-foreground">Create New Team</h3>
              <IconButton
                onClick={() => {
                  setShowCreateTeamModal(false)
                  setNewTeamName('')
                }}
                size="sm"
                className="text-text-tertiary hover:text-text-secondary"
              >
                <X size={24} />
              </IconButton>
            </div>
            <p className="text-sm text-text-tertiary mb-4">
              Give your team a name. You&apos;ll be able to invite members after creating the team.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Team Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g., West County Beekeepers"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-forest-500 dark:focus:ring-emerald-500 focus:border-blue-500"
                maxLength={100}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => {
                  setShowCreateTeamModal(false)
                  setNewTeamName('')
                }}
                tone="neutral"
                disabled={creatingTeam}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTeam}
                disabled={creatingTeam || !newTeamName.trim()}
                tone="success"
                className="disabled:cursor-not-allowed"
              >
                {creatingTeam ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Creating...
                  </>
                ) : (
                  'Create Team'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteMemberModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface dark:bg-surface rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-foreground">Manage Team: {selectedTeam.name}</h3>
              <IconButton
                onClick={() => {
                  setShowInviteMemberModal(false)
                  setSelectedTeam(null)
                  setInviteEmail('')
                  setTeamMembers([])
                  setTeamInvitations([])
                }}
                size="sm"
                className="text-text-tertiary hover:text-text-secondary"
              >
                <X size={24} />
              </IconButton>
            </div>

            {/* Invite New Member Section */}
            <div className="mb-6 p-4 bg-surface-elevated dark:bg-surface-elevated rounded-lg border border-border">
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <UserPlus size={18} className="text-green-600 dark:text-green-400" />
                Invite New Member
              </h4>
              <p className="text-sm text-text-tertiary mb-3">
                Enter the email address of the person you&apos;d like to invite. They&apos;ll receive an email with instructions.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="flex-1 px-3 py-2 bg-surface dark:bg-surface-elevated text-foreground border border-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <Button
                  onClick={handleSendInvite}
                  disabled={sendingInvite || !inviteEmail.trim()}
                  tone="success"
                  className="disabled:cursor-not-allowed"
                >
                  {sendingInvite ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      Invite
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Current Members */}
            <div className="mb-6">
              <h4 className="font-semibold text-foreground mb-3">Current Members ({teamMembers.length})</h4>
              {teamMembers.length > 0 ? (
                <div className="space-y-2">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-surface dark:bg-surface-elevated rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                          {member.first_name ? member.first_name[0].toUpperCase() : (member.user_email || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            {member.first_name && member.last_name
                              ? `${member.first_name} ${member.last_name}`
                              : member.user_email}
                          </div>
                          <div className="text-sm text-text-tertiary">{member.user_email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-surface-elevated dark:bg-surface-elevated text-foreground dark:text-foreground text-xs rounded font-medium capitalize border border-border">
                          {member.role}
                        </span>
                        {member.role !== 'owner' && (
                          <Button
                            onClick={() => handleRemoveMember(member.id, member.user_email || 'Unknown')}
                            tone="danger"
                            size="xs"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-tertiary italic">No members yet.</p>
              )}
            </div>

            {/* Pending Invitations */}
            {teamInvitations.length > 0 && (
              <div>
                <h4 className="font-semibold text-foreground mb-3">Pending Invitations ({teamInvitations.length})</h4>
                <div className="space-y-2">
                  {teamInvitations.map((invitation) => (
                    <AlertPanel
                      key={invitation.id}
                      tone="warning"
                      icon={<Clock size={16} className="text-amber-600 dark:text-amber-300" />}
                      title={invitation.email}
                      titleClassName="text-foreground"
                      bodyClassName="text-xs text-text-tertiary"
                      endSlot={
                        <Button
                          onClick={() => handleCancelInvitation(invitation.id, invitation.email)}
                          tone="neutral"
                          size="xs"
                        >
                          Cancel
                        </Button>
                      }
                      endSlotClassName="self-center"
                    >
                      <p>
                        Invited {new Date(invitation.invited_at).toLocaleDateString()}
                        {' \u2022 Expires '}{new Date(invitation.expires_at).toLocaleDateString()}
                      </p>
                    </AlertPanel>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => {
                  setShowInviteMemberModal(false)
                  setSelectedTeam(null)
                  setInviteEmail('')
                  setTeamMembers([])
                  setTeamInvitations([])
                }}
                tone="neutral"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Share Apiary Modal */}
      {showShareApiaryModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface dark:bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-foreground">Share Apiary with {selectedTeam.name}</h3>
              <IconButton
                onClick={() => {
                  setShowShareApiaryModal(false)
                  setSelectedTeam(null)
                  setSelectedApiaryId('')
                }}
                size="sm"
                className="text-text-tertiary hover:text-text-secondary"
              >
                <X size={24} />
              </IconButton>
            </div>

            <p className="text-sm text-text-tertiary mb-4">
              Select an apiary to share with this team. All hives in the apiary will be visible to team members (read-only access).
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Select Apiary <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedApiaryId}
                onChange={(e) => setSelectedApiaryId(e.target.value)}
                className="w-full px-3 py-2 bg-surface dark:bg-surface-elevated text-foreground border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="" className="bg-surface dark:bg-surface-elevated text-foreground">-- Select an apiary --</option>
                {userApiaries.map((apiary) => (
                  <option key={apiary.id} value={apiary.id} className="bg-surface dark:bg-surface-elevated text-foreground">
                    {apiary.name ? `${apiary.name} - ${apiary.eircode}` : apiary.eircode}
                  </option>
                ))}
              </select>
              {userApiaries.length === 0 && (
                <p className="text-sm text-text-tertiary mt-2">
                  You don&apos;t have any apiaries yet. Create an apiary first to share it with teams.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button
                onClick={() => {
                  setShowShareApiaryModal(false)
                  setSelectedTeam(null)
                  setSelectedApiaryId('')
                }}
                tone="neutral"
              >
                Cancel
              </Button>
              <Button
                onClick={handleShareApiary}
                disabled={sharingApiary || !selectedApiaryId}
                tone="purple"
                className="disabled:cursor-not-allowed"
              >
                {sharingApiary ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Sharing...
                  </>
                ) : (
                  <>
                    <Share2 size={16} />
                    Share Apiary
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Team Modal */}
      {showRenameTeamModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface dark:bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-foreground">Rename Team</h3>
              <IconButton
                onClick={() => {
                  setShowRenameTeamModal(false)
                  setSelectedTeam(null)
                  setRenameTeamName('')
                }}
                size="sm"
                className="text-text-tertiary hover:text-text-secondary"
              >
                <X size={24} />
              </IconButton>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Current Name: <span className="font-semibold text-foreground">{selectedTeam.name}</span>
              </label>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                New Team Name
              </label>
              <input
                type="text"
                value={renameTeamName}
                onChange={(e) => setRenameTeamName(e.target.value)}
                placeholder="Enter new team name"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 dark:focus:ring-emerald-500"
                maxLength={100}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowRenameTeamModal(false)
                  setSelectedTeam(null)
                  setRenameTeamName('')
                }}
                tone="neutral"
                fullWidth
              >
                Cancel
              </Button>
              <Button
                onClick={handleRenameTeam}
                disabled={renamingTeam || !renameTeamName.trim()}
                tone="success"
                fullWidth
                className="disabled:cursor-not-allowed"
              >
                {renamingTeam ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Renaming...
                  </>
                ) : (
                  <>
                    <Edit2 size={16} />
                    Rename Team
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
