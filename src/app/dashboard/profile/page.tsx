'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId, getUserRole, type UserRole } from '@/lib/auth'
import { User, Mail, Shield, Calendar, Edit2, Save, Download, Users, Plus, X, Trash2, UserPlus, Clock, Send, Phone, MapPin, Share2 } from 'lucide-react'
import SubscriptionStatusCard from '@/components/SubscriptionStatusCard'
import RenewSubscriptionModal from '@/components/RenewSubscriptionModal'
import SubscriptionHistoryTable from '@/components/SubscriptionHistoryTable'

interface UserProfile {
  id: string
  role: 'User' | 'Admin'
  created_at: string
  updated_at: string
  email?: string
  first_name?: string
  last_name?: string
  mobile_number?: string
  user_id?: string
}

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

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [userRole, setUserRole] = useState<UserRole>('User')
  const [createdAt, setCreatedAt] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)

  // Profile editing state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileFormData, setProfileFormData] = useState({
    first_name: '',
    last_name: '',
    mobile_number: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)

  // Data export state
  const [exportingMyData, setExportingMyData] = useState(false)

  // Account deletion state
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

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

  // Subscription state
  const [showRenewSubscriptionModal, setShowRenewSubscriptionModal] = useState(false)
  const [subscriptionRefreshKey, setSubscriptionRefreshKey] = useState(0)

  const fetchUserProfile = useCallback(async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setUserProfile(data as UserProfile)
        setProfileFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          mobile_number: data.mobile_number || '',
        })
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }, [userId])

  const updateUserProfile = async () => {
    if (!userId) return

    setSavingProfile(true)
    try {
      // Update existing profile (profiles are created automatically via trigger on signup)
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profileFormData.first_name || null,
          last_name: profileFormData.last_name || null,
          mobile_number: profileFormData.mobile_number || null,
        })
        .eq('id', userId)

      if (error) {
        console.error('Error updating profile:', error)
        throw error
      }

      alert('Profile updated successfully!')
      setEditingProfile(false)
      fetchUserProfile() // Refresh profile data
    } catch (error) {
      console.error('Error updating profile:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to update profile: ${errorMessage}`)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleCancelProfileEdit = () => {
    setEditingProfile(false)
    // Reset form data to current profile values
    if (userProfile) {
      setProfileFormData({
        first_name: userProfile.first_name || '',
        last_name: userProfile.last_name || '',
        mobile_number: userProfile.mobile_number || '',
      })
    }
  }

  const exportMyDataAsJSON = async () => {
    if (!userId) return

    setExportingMyData(true)
    try {
      // Fetch all user data
      const [
        { data: apiaries },
        { data: hives },
        { data: queens },
        { data: inspections },
        { data: varroaChecks },
        { data: varroaTreatments },
      ] = await Promise.all([
        supabase.from('apiaries').select('*').eq('user_id', userId),
        supabase.from('hives').select('*').eq('user_id', userId),
        supabase.from('queens').select('*').eq('user_id', userId),
        supabase.from('inspections').select('*').eq('user_id', userId),
        supabase.from('varroa_checks').select('*').eq('user_id', userId),
        supabase.from('varroa_treatments').select('*').eq('user_id', userId),
      ])

      const exportData = {
        export_info: {
          exported_at: new Date().toISOString(),
          user_id: userId,
          format: 'JSON',
        },
        apiaries: apiaries || [],
        hives: hives || [],
        queens: queens || [],
        inspections: inspections || [],
        varroa_checks: varroaChecks || [],
        varroa_treatments: varroaTreatments || [],
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5) // Format: 2025-11-03T14-30-45
      a.download = `hivecraic-backup-${timestamp}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      alert('Your data has been exported successfully!')
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('Failed to export data. Check console for details.')
    } finally {
      setExportingMyData(false)
    }
  }

  const exportMyDataAsCSV = async () => {
    if (!userId) return

    setExportingMyData(true)
    try {
      // Fetch all user data
      const [
        { data: apiaries },
        { data: hives },
        { data: queens },
        { data: inspections },
        { data: varroaChecks },
        { data: varroaTreatments },
      ] = await Promise.all([
        supabase.from('apiaries').select('*').eq('user_id', userId),
        supabase.from('hives').select('*').eq('user_id', userId),
        supabase.from('queens').select('*').eq('user_id', userId),
        supabase.from('inspections').select('*').eq('user_id', userId),
        supabase.from('varroa_checks').select('*').eq('user_id', userId),
        supabase.from('varroa_treatments').select('*').eq('user_id', userId),
      ])

      const convertToCSV = (data: Record<string, unknown>[], tableName: string) => {
        if (!data || data.length === 0) return `${tableName}\nNo data\n\n`

        const headers = Object.keys(data[0])
        const rows = data.map(row =>
          headers.map(header => {
            const value = row[header]
            if (value === null || value === undefined) return ''
            if (typeof value === 'string' && value.includes(',')) return `"${value}"`
            return value
          }).join(',')
        )

        return `${tableName}\n${headers.join(',')}\n${rows.join('\n')}\n\n`
      }

      let csvContent = `Beekeeping Data Export\nExported on: ${new Date().toISOString()}\n\n`
      csvContent += convertToCSV(apiaries || [], 'Apiaries')
      csvContent += convertToCSV(hives || [], 'Hives')
      csvContent += convertToCSV(queens || [], 'Queens')
      csvContent += convertToCSV(inspections || [], 'Inspections')
      csvContent += convertToCSV(varroaChecks || [], 'Varroa Checks')
      csvContent += convertToCSV(varroaTreatments || [], 'Varroa Treatments')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5) // Format: 2025-11-03T14-30-45
      a.download = `hivecraic-backup-${timestamp}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      alert('Your data has been exported successfully!')
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('Failed to export data. Check console for details.')
    } finally {
      setExportingMyData(false)
    }
  }

  // Delete account handler
  const handleDeleteAccount = async () => {
    if (!userId) return

    // Verify confirmation text
    if (deleteConfirmText !== 'DELETE') {
      alert('Please type DELETE to confirm account deletion.')
      return
    }

    setDeletingAccount(true)
    try {
      // Call the delete_own_account RPC function
      const { data, error } = await supabase.rpc('delete_own_account')

      if (error) {
        console.error('Error deleting account:', error)
        throw error
      }

      console.log('Account deletion response:', data)

      // Sign out the user
      await supabase.auth.signOut()

      // Show success message
      alert('Your account and all associated data have been permanently deleted.')

      // Redirect to home/login page
      router.push('/')
    } catch (error) {
      console.error('Error deleting account:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to delete account: ${errorMessage}\n\nPlease try again or contact support.`)
    } finally {
      setDeletingAccount(false)
      setShowDeleteAccountModal(false)
      setDeleteConfirmText('')
    }
  }

  // Fetch user's teams (owned and member)
  const fetchTeams = useCallback(async () => {
    if (!userId) return
    setLoadingTeams(true)

    try {
      // Debug: Log the user ID being used
      console.log('Fetching teams for user ID:', userId)

      // Verify auth.uid() matches
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Current auth user:', user?.id)

      // Fetch owned teams
      const { data: owned, error: ownedError } = await supabase
        .from('teams')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })

      console.log('Owned teams query result:', { owned, error: ownedError })
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
      alert(`Failed to load teams: ${errorMessage}\n\nPlease ensure the teams tables have been created in Supabase by running the migration in sql/create_teams_tables.sql`)
    } finally {
      setLoadingTeams(false)
    }
  }, [userId])

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
      alert('Please select an apiary to share.')
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

      alert('Apiary shared with team successfully!')
      setSelectedApiaryId('')
      setShowShareApiaryModal(false)
      fetchTeamApiaries(selectedTeam.id)
    } catch (error) {
      console.error('Error sharing apiary:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to share apiary: ${errorMessage}`)
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

      alert('Apiary removed from team successfully!')
      if (selectedTeam) {
        fetchTeamApiaries(selectedTeam.id)
      }
    } catch (error) {
      console.error('Error unsharing apiary:', error)
      alert('Failed to remove apiary from team.')
    }
  }

  // Create a new team
  const handleCreateTeam = async () => {
    if (!userId || !newTeamName.trim()) {
      alert('Please enter a team name.')
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

      alert(`Team "${newTeamName}" created successfully!`)
      setNewTeamName('')
      setShowCreateTeamModal(false)
      fetchTeams() // Refresh teams list
    } catch (error) {
      console.error('Error creating team:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to create team: ${errorMessage}\n\nThe teams tables may not exist in your Supabase database yet.\n\nPlease run the migration:\n1. Go to Supabase Dashboard > SQL Editor\n2. Open and run: sql/create_teams_tables.sql`)
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
      alert('Please enter an email address.')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail)) {
      alert('Please enter a valid email address.')
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
      alert('Failed to verify team apiaries. Please try again.')
      return
    }

    if (!sharedApiaries || sharedApiaries.length === 0) {
      alert('Before inviting team members, you must share at least one apiary with this team.\n\nTeam members can only access apiaries that are explicitly shared with the team.\n\nGo to the Apiaries page and use the "Share with Team" option to share an apiary first.')
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

      console.log('Looking up user:', inviteEmail, 'Found:', existingUser)

      // Check if already a member
      if (existingUser) {
        const { data: existingMember } = await supabase
          .from('team_members')
          .select('id')
          .eq('team_id', selectedTeam.id)
          .eq('user_id', existingUser.user_id)
          .maybeSingle()

        if (existingMember) {
          alert('This user is already a member of the team.')
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
          alert('An invitation has already been sent to this email.')
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
            alert('Failed to resend invitation. Please try again.')
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

        alert(`${inviteEmail} has been added to the team!`)
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
        console.log('📧 Attempting to send invitation email to:', inviteEmail)

        try {
          const { data: emailData, error: emailError } = await supabase.functions.invoke('send-team-invitation', {
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
            console.error('❌ Failed to send invitation email:', emailError)
            console.error('Error details:', emailError)

            // Check if it's a "function not found" error
            if (emailError.message?.includes('FunctionsRelayError') || emailError.message?.includes('not found')) {
              alert(`✅ Invitation created successfully!\n\n⚠️ Email system not yet configured.\n\nThe invitation is saved and ${inviteEmail} will be automatically added to the team when they sign up.\n\nTo enable email notifications:\n1. Deploy: supabase functions deploy send-team-invitation\n2. Set API key: See TEAM_INVITATION_SETUP.md\n\nFor now, please contact ${inviteEmail} directly to let them know.`)
            } else {
              alert(`✅ Invitation created successfully!\n\n⚠️ Email failed to send (check console for details).\n\nThe invitation is saved and ${inviteEmail} will be automatically added to the team when they sign up.\n\nPlease contact ${inviteEmail} directly to let them know.`)
            }
          } else {
            console.log('✅ Invitation email sent successfully:', emailData)
            alert(`📧 Invitation email sent to ${inviteEmail}!\n\nThey will be automatically added to the team when they sign up with this email address.`)
          }
        } catch (emailException) {
          console.error('❌ Exception sending invitation email:', emailException)
          alert(`✅ Invitation created successfully!\n\n⚠️ Email system not configured yet.\n\nThe invitation is saved and ${inviteEmail} will be automatically added to the team when they sign up.\n\nTo enable email notifications, see: TEAM_INVITATION_SETUP.md\n\nFor now, please contact ${inviteEmail} directly to let them know.`)
        }
      }

      setInviteEmail('')
      setShowInviteMemberModal(false)
      fetchTeamDetails(selectedTeam.id) // Refresh team details
    } catch (error) {
      console.error('Error sending invitation:', error)
      alert('Failed to send invitation. Please try again.')
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

      alert(`Team "${teamName}" deleted successfully.`)
      fetchTeams() // Refresh teams list
    } catch (error) {
      console.error('Error deleting team:', error)
      alert('Failed to delete team. Please try again.')
    }
  }

  // Rename team
  const handleRenameTeam = async () => {
    if (!selectedTeam || !renameTeamName.trim()) {
      alert('Please enter a new team name.')
      return
    }

    if (renameTeamName.trim() === selectedTeam.name) {
      alert('New name is the same as current name.')
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

      alert(`Team renamed to "${renameTeamName.trim()}" successfully!`)
      setShowRenameTeamModal(false)
      setRenameTeamName('')
      setSelectedTeam(null)
      fetchTeams() // Refresh teams list
    } catch (error) {
      console.error('Error renaming team:', error)
      alert('Failed to rename team. Please try again.')
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

      alert(`${memberEmail} removed from team.`)
      if (selectedTeam) {
        fetchTeamDetails(selectedTeam.id) // Refresh team details
      }
      fetchTeams() // Refresh teams list
    } catch (error) {
      console.error('Error removing member:', error)
      alert('Failed to remove member. Please try again.')
    }
  }

  // Leave team (for members)
  const handleLeaveTeam = async (teamId: string, teamName: string) => {
    if (!userId) {
      alert('User not authenticated.')
      return
    }

    if (!confirm(`Are you sure you want to leave the team "${teamName}"?`)) {
      return
    }

    try {
      console.log('🚪 Attempting to leave team:', { teamId, userId })

      const { data, error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .select()

      console.log('🚪 Leave team response:', { data, error })

      if (error) {
        console.error('Leave team error details:', error)
        throw error
      }

      if (!data || data.length === 0) {
        console.warn('No team_member record was deleted')
        alert('You are not a member of this team or membership not found.')
        return
      }

      alert(`You have left the team "${teamName}".`)
      fetchTeams() // Refresh teams list
    } catch (error) {
      console.error('Error leaving team:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to leave team: ${errorMessage}`)
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
      alert(`Invitation to ${email} cancelled.`)
    } catch (error) {
      console.error('Error cancelling invitation:', error)
      alert('Failed to cancel invitation. Please try again.')
      // Refresh to restore correct state if delete failed
      if (selectedTeam) {
        fetchTeamDetails(selectedTeam.id)
      }
    }
  }

  // Handle payment status from URL
  useEffect(() => {
    const payment = searchParams.get('payment')
    if (payment) {
      setPaymentStatus(payment)
      // Clear the payment parameter from URL
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)

      // Show alert based on payment status
      if (payment === 'success') {
        setTimeout(() => {
          alert('✅ Payment successful! Your subscription has been activated.\n\nPlease refresh the page to see your updated subscription status.')
        }, 500)
      } else if (payment === 'cancelled') {
        setTimeout(() => {
          alert('Payment was cancelled. You can try again whenever you\'re ready.')
        }, 500)
      }
    }
  }, [searchParams])

  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)

      // Get user email from Supabase auth
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || 'No email')
        setCreatedAt(user.created_at || '')
      }

      // Get user role
      const role = await getUserRole()
      setUserRole(role)

      setLoading(false)
    }
    initUser()
  }, [router])

  // Fetch user profile when userId is set
  useEffect(() => {
    if (userId) {
      fetchUserProfile()
      fetchTeams()
      fetchUserApiaries()
    }
  }, [userId, fetchUserProfile, fetchTeams, fetchUserApiaries])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <User size={32} className="text-gray-700" />
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
          {!editingProfile && (
            <button
              onClick={() => setEditingProfile(true)}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <Edit2 size={16} />
              Edit Profile
            </button>
          )}
        </div>

        {editingProfile ? (
          /* Edit Mode */
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Update your personal information. All fields are optional.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={profileFormData.first_name}
                  onChange={(e) =>
                    setProfileFormData({ ...profileFormData, first_name: e.target.value })
                  }
                  placeholder="Enter your first name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={profileFormData.last_name}
                  onChange={(e) =>
                    setProfileFormData({ ...profileFormData, last_name: e.target.value })
                  }
                  placeholder="Enter your last name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={profileFormData.mobile_number}
                  onChange={(e) =>
                    setProfileFormData({ ...profileFormData, mobile_number: e.target.value })
                  }
                  placeholder="Enter your mobile number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={updateUserProfile}
                disabled={savingProfile}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
              >
                {savingProfile ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Changes
                  </>
                )}
              </button>
              <button
                onClick={handleCancelProfileEdit}
                disabled={savingProfile}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Display Mode */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <User size={20} className="text-gray-600 mt-1" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-500 mb-1">First Name</div>
                  <div className="text-gray-900">
                    {userProfile?.first_name || <span className="text-gray-400 italic">Not set</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <User size={20} className="text-gray-600 mt-1" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-500 mb-1">Last Name</div>
                  <div className="text-gray-900">
                    {userProfile?.last_name || <span className="text-gray-400 italic">Not set</span>}
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Phone size={20} className="text-gray-600 mt-1" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-500 mb-1">Mobile Number</div>
                  <div className="text-gray-900">
                    {userProfile?.mobile_number || <span className="text-gray-400 italic">Not set</span>}
                  </div>
                </div>
              </div>

              {/* Account Information - Read-only fields in compact layout */}
              <div className="md:col-span-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-blue-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-blue-900">Email</div>
                      <div className="text-sm text-gray-900 truncate">{userEmail}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-blue-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-blue-900">Role</div>
                      <div className="text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          userRole === 'Admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {userRole === 'Admin' && <Shield size={12} className="mr-1" />}
                          {userRole}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <User size={16} className="text-blue-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-blue-900">User ID</div>
                      <div className="text-xs text-gray-900 font-mono truncate">{userId}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-blue-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-blue-900">Created</div>
                      <div className="text-sm text-gray-900">
                        {createdAt ? new Date(createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }) : 'Unknown'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Subscription Management */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Calendar size={28} className="text-amber-600" />
          <h2 className="text-2xl font-semibold text-gray-900">Subscription</h2>
        </div>

        <SubscriptionStatusCard
          key={subscriptionRefreshKey}
          onRenewClick={() => setShowRenewSubscriptionModal(true)}
        />

        <SubscriptionHistoryTable key={subscriptionRefreshKey} />
      </div>

      {/* Team Management */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users size={24} className="text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Team Management</h2>
          </div>
          <button
            onClick={() => setShowCreateTeamModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
          >
            <Plus size={16} />
            Create Team
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-6">
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
                <h3 className="text-lg font-semibold text-gray-900 mb-3">My Teams</h3>
                <div className="space-y-3">
                  {ownedTeams.map((team) => (
                    <div key={team.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-gray-900">{team.name}</h4>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                            Owner
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => {
                              if (expandedTeamId === team.id) {
                                setExpandedTeamId(null)
                              } else {
                                setExpandedTeamId(team.id)
                                setLoadingMembers(true)
                                fetchTeamDetails(team.id).finally(() => setLoadingMembers(false))
                              }
                            }}
                            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1"
                          >
                            <Users size={14} />
                            <span className="hidden sm:inline">{expandedTeamId === team.id ? 'Hide' : 'View'} Members</span>
                            <span className="sm:hidden">Members</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTeam(team)
                              setShowInviteMemberModal(true)
                              fetchTeamDetails(team.id)
                            }}
                            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                          >
                            <UserPlus size={14} />
                            Invite
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTeam(team)
                              setShowShareApiaryModal(true)
                              setSelectedApiaryId('')
                            }}
                            className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1"
                          >
                            <Share2 size={14} />
                            <span className="hidden sm:inline">Share Apiary</span>
                            <span className="sm:hidden">Share</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTeam(team)
                              setRenameTeamName(team.name)
                              setShowRenameTeamModal(true)
                            }}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                          >
                            <Edit2 size={14} />
                            Rename
                          </button>
                          <button
                            onClick={() => handleDeleteTeam(team.id, team.name)}
                            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{team.member_count || 0}</span> member{(team.member_count || 0) !== 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Created {new Date(team.created_at).toLocaleDateString()}
                      </div>

                      {/* Expanded Member List */}
                      {expandedTeamId === team.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h5 className="text-sm font-semibold text-gray-900 mb-3">Team Members</h5>
                          {loadingMembers ? (
                            <div className="flex justify-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                            </div>
                          ) : teamMembers.length > 0 ? (
                            <div className="space-y-2">
                              {teamMembers.map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-3 flex-1">
                                    <User size={16} className="text-gray-400" />
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-gray-900">
                                        {member.first_name && member.last_name
                                          ? `${member.first_name} ${member.last_name}`
                                          : member.user_email}
                                      </div>
                                      {member.first_name && member.last_name && (
                                        <div className="text-xs text-gray-500">{member.user_email}</div>
                                      )}
                                    </div>
                                    <span className={`px-2 py-1 text-xs rounded font-medium capitalize ${
                                      member.role === 'owner'
                                        ? 'bg-blue-100 text-blue-800'
                                        : member.role === 'admin'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {member.role}
                                    </span>
                                  </div>
                                  {member.role !== 'owner' && (
                                    <button
                                      onClick={() => handleRemoveMember(member.id, member.user_email || 'this member')}
                                      className="ml-3 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center gap-1"
                                      title="Remove member"
                                    >
                                      <Trash2 size={12} />
                                      Remove
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-4">No members yet. Invite someone to get started!</p>
                          )}

                          {/* Pending Invitations */}
                          {teamInvitations.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-gray-200">
                              <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
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
                                    <div key={`pending-${invitation.id || index}`} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                                      <div className="flex items-center gap-3 flex-1">
                                        <Mail size={16} className="text-orange-400" />
                                        <div className="flex-1">
                                          <div className="text-sm font-medium text-gray-900">{invitation.email}</div>
                                          <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
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
                                        <span className="px-2 py-1 text-xs rounded font-medium bg-orange-100 text-orange-800">
                                          Pending
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => handleCancelInvitation(invitation.id, invitation.email)}
                                        className="ml-3 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center gap-1"
                                        title="Cancel invitation"
                                      >
                                        <X size={12} />
                                        Cancel
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Accepted Invitations */}
                          {acceptedInvitations.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-gray-200">
                              <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <User size={14} className="text-green-600" />
                                Accepted Invitations
                              </h5>
                              <div className="space-y-2">
                                {acceptedInvitations.map((invitation, index) => {
                                  const acceptedDate = invitation.accepted_at ? new Date(invitation.accepted_at) : null

                                  return (
                                    <div key={`accepted-${invitation.id || index}`} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                      <div className="flex items-center gap-3 flex-1">
                                        <User size={16} className="text-green-600" />
                                        <div className="flex-1">
                                          <div className="text-sm font-medium text-gray-900">{invitation.email}</div>
                                          <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                            <Clock size={12} />
                                            {acceptedDate ? (
                                              <span>Accepted on {acceptedDate.toLocaleDateString()} at {acceptedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            ) : (
                                              <span>Accepted</span>
                                            )}
                                          </div>
                                        </div>
                                        <span className="px-2 py-1 text-xs rounded font-medium bg-green-100 text-green-800">
                                          Accepted
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Declined Invitations */}
                          {declinedInvitations.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-gray-200">
                              <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <X size={14} className="text-red-600" />
                                Declined Invitations
                              </h5>
                              <div className="space-y-2">
                                {declinedInvitations.map((invitation, index) => {
                                  const declinedDate = invitation.declined_at ? new Date(invitation.declined_at) : null

                                  return (
                                    <div key={`declined-${invitation.id || index}`} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                                      <div className="flex items-center gap-3 flex-1">
                                        <X size={16} className="text-red-600" />
                                        <div className="flex-1">
                                          <div className="text-sm font-medium text-gray-900">{invitation.email}</div>
                                          <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                            <Clock size={12} />
                                            {declinedDate ? (
                                              <span>Declined on {declinedDate.toLocaleDateString()} at {declinedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            ) : (
                                              <span>Declined</span>
                                            )}
                                          </div>
                                        </div>
                                        <span className="px-2 py-1 text-xs rounded font-medium bg-red-100 text-red-800">
                                          Declined
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Shared Apiaries */}
                          <div className="mt-6 pt-4 border-t border-gray-200">
                            <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <MapPin size={14} className="text-purple-600" />
                              Shared Apiaries
                            </h5>
                            {teamApiaries.length > 0 ? (
                              <div className="space-y-2">
                                {teamApiaries.map((ta) => (
                                  <div key={ta.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                                    <div className="flex items-center gap-3 flex-1">
                                      <MapPin size={16} className="text-purple-600" />
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-900">
                                          {ta.apiary?.name
                                            ? `${ta.apiary.name} - ${ta.apiary.eircode}`
                                            : (ta.apiary?.eircode || 'Unknown Location')}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          Shared {new Date(ta.added_at).toLocaleDateString()}
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleUnshareApiary(
                                        ta.id,
                                        ta.apiary?.name
                                          ? `${ta.apiary.name} - ${ta.apiary.eircode}`
                                          : (ta.apiary?.eircode || 'this apiary')
                                      )}
                                      className="ml-3 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center gap-1"
                                      title="Remove apiary from team"
                                    >
                                      <X size={12} />
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
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
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Teams I&apos;m In</h3>
                <div className="space-y-3">
                  {memberTeams.map((team) => (
                    <div key={team.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-gray-900">{team.name}</h4>
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded font-medium capitalize">
                            {team.user_role}
                          </span>
                        </div>
                        <button
                          onClick={() => handleLeaveTeam(team.id, team.name)}
                          className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 w-full sm:w-auto"
                        >
                          Leave Team
                        </button>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{team.member_count || 0}</span> member{(team.member_count || 0) !== 1 ? 's' : ''}
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
                <p className="text-gray-600 mb-4">You haven&apos;t created or joined any teams yet.</p>
                <button
                  onClick={() => setShowCreateTeamModal(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Create Your First Team
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Data Export */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">My Data Export</h2>
        <p className="text-sm text-gray-600 mb-4">
          Export all your personal beekeeping data including apiaries, hives, queens, inspections, and varroa management records.
        </p>
        <ul className="text-sm text-gray-600 space-y-1 mb-4">
          <li>• Includes all your personal beekeeping records</li>
          <li>• Choose between JSON or CSV format</li>
          <li>• Use for backup, analysis, or migration purposes</li>
          <li>• Only includes data you own and have created</li>
        </ul>
        <div className="flex gap-3">
          <button
            onClick={exportMyDataAsJSON}
            disabled={exportingMyData}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
          >
            {exportingMyData ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download size={16} />
                Export as JSON
              </>
            )}
          </button>
          <button
            onClick={exportMyDataAsCSV}
            disabled={exportingMyData}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
          >
            {exportingMyData ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download size={16} />
                Export as CSV
              </>
            )}
          </button>
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Create New Team</h3>
              <button
                onClick={() => {
                  setShowCreateTeamModal(false)
                  setNewTeamName('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Give your team a name. You&apos;ll be able to invite members after creating the team.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Team Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g., West County Beekeepers"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxLength={100}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateTeamModal(false)
                  setNewTeamName('')
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={creatingTeam}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTeam}
                disabled={creatingTeam || !newTeamName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creatingTeam ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Creating...
                  </>
                ) : (
                  'Create Team'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteMemberModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Manage Team: {selectedTeam.name}</h3>
              <button
                onClick={() => {
                  setShowInviteMemberModal(false)
                  setSelectedTeam(null)
                  setInviteEmail('')
                  setTeamMembers([])
                  setTeamInvitations([])
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Invite New Member Section */}
            <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <UserPlus size={18} className="text-green-600" />
                Invite New Member
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Enter the email address of the person you&apos;d like to invite. They&apos;ll receive an email with instructions.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <button
                  onClick={handleSendInvite}
                  disabled={sendingInvite || !inviteEmail.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
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
                </button>
              </div>
            </div>

            {/* Current Members */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Current Members ({teamMembers.length})</h4>
              {teamMembers.length > 0 ? (
                <div className="space-y-2">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                          {member.first_name ? member.first_name[0].toUpperCase() : (member.user_email || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {member.first_name && member.last_name
                              ? `${member.first_name} ${member.last_name}`
                              : member.user_email}
                          </div>
                          <div className="text-sm text-gray-600">{member.user_email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-gray-200 text-gray-800 text-xs rounded font-medium capitalize">
                          {member.role}
                        </span>
                        {member.role !== 'owner' && (
                          <button
                            onClick={() => handleRemoveMember(member.id, member.user_email || 'Unknown')}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No members yet.</p>
              )}
            </div>

            {/* Pending Invitations */}
            {teamInvitations.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Pending Invitations ({teamInvitations.length})</h4>
                <div className="space-y-2">
                  {teamInvitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div>
                        <div className="font-medium text-gray-900">{invitation.email}</div>
                        <div className="text-xs text-gray-600">
                          Invited {new Date(invitation.invited_at).toLocaleDateString()}
                          {' • Expires '}{new Date(invitation.expires_at).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelInvitation(invitation.id, invitation.email)}
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowInviteMemberModal(false)
                  setSelectedTeam(null)
                  setInviteEmail('')
                  setTeamMembers([])
                  setTeamInvitations([])
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Apiary Modal */}
      {showShareApiaryModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Share Apiary with {selectedTeam.name}</h3>
              <button
                onClick={() => {
                  setShowShareApiaryModal(false)
                  setSelectedTeam(null)
                  setSelectedApiaryId('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Select an apiary to share with this team. All hives in the apiary will be visible to team members (read-only access).
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Apiary <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedApiaryId}
                onChange={(e) => setSelectedApiaryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">-- Select an apiary --</option>
                {userApiaries.map((apiary) => (
                  <option key={apiary.id} value={apiary.id}>
                    {apiary.name ? `${apiary.name} - ${apiary.eircode}` : apiary.eircode}
                  </option>
                ))}
              </select>
              {userApiaries.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  You don&apos;t have any apiaries yet. Create an apiary first to share it with teams.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowShareApiaryModal(false)
                  setSelectedTeam(null)
                  setSelectedApiaryId('')
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleShareApiary}
                disabled={sharingApiary || !selectedApiaryId}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
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
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Team Modal */}
      {showRenameTeamModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Rename Team</h3>
              <button
                onClick={() => {
                  setShowRenameTeamModal(false)
                  setSelectedTeam(null)
                  setRenameTeamName('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Name: <span className="font-semibold text-gray-900">{selectedTeam.name}</span>
              </label>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Team Name
              </label>
              <input
                type="text"
                value={renameTeamName}
                onChange={(e) => setRenameTeamName(e.target.value)}
                placeholder="Enter new team name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={100}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRenameTeamModal(false)
                  setSelectedTeam(null)
                  setRenameTeamName('')
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameTeam}
                disabled={renamingTeam || !renameTeamName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Additional Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Settings</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Change Password</div>
              <div className="text-sm text-gray-600">Update your account password</div>
            </div>
            <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              Coming Soon
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Email Notifications</div>
              <div className="text-sm text-gray-600">Manage your notification preferences</div>
            </div>
            <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              Coming Soon
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Data Privacy</div>
              <div className="text-sm text-gray-600">View and manage your data</div>
            </div>
            <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              Coming Soon
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-lg shadow p-6 border border-red-200">
        <h2 className="text-xl font-semibold text-red-900 mb-4">Danger Zone</h2>
        <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
          <div>
            <div className="font-medium text-red-900">Delete Account</div>
            <div className="text-sm text-red-700">Permanently delete your account and all data</div>
          </div>
          <button
            onClick={() => setShowDeleteAccountModal(true)}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <Trash2 size={16} />
            Delete Account
          </button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-red-900 flex items-center gap-2">
                <Trash2 size={24} className="text-red-600" />
                Delete Account
              </h3>
              <button
                onClick={() => {
                  setShowDeleteAccountModal(false)
                  setDeleteConfirmText('')
                }}
                disabled={deletingAccount}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-4">
                <p className="text-red-900 font-semibold mb-2">Warning: This action cannot be undone!</p>
                <p className="text-red-800 text-sm">
                  Deleting your account will permanently remove:
                </p>
                <ul className="list-disc list-inside text-red-800 text-sm mt-2 space-y-1">
                  <li>All your apiaries and hives</li>
                  <li>All queens and inspection records</li>
                  <li>All varroa checks and treatments</li>
                  <li>All feeding and harvest records</li>
                  <li>All tasks and events</li>
                  <li>All team memberships and owned teams</li>
                  <li>Your user profile and login credentials</li>
                </ul>
              </div>

              <p className="text-gray-700 text-sm mb-4">
                Before deleting your account, we recommend exporting your data using the &quot;Export as JSON&quot; or &quot;Export as CSV&quot; buttons in the Data Export section above.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Type <span className="font-mono bg-gray-100 px-2 py-1 rounded text-red-600">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE here"
                  disabled={deletingAccount}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteAccountModal(false)
                  setDeleteConfirmText('')
                }}
                disabled={deletingAccount}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirmText !== 'DELETE'}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletingAccount ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Deleting Account...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Permanently Delete Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renew Subscription Modal */}
      <RenewSubscriptionModal
        isOpen={showRenewSubscriptionModal}
        onClose={() => setShowRenewSubscriptionModal(false)}
        onSuccess={() => {
          // Increment the key to force re-render of subscription components
          setSubscriptionRefreshKey(prev => prev + 1)
          setShowRenewSubscriptionModal(false)
        }}
        userId={userId || ''}
      />
    </div>
  )
}
