'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { User, Mail, Edit2, Users, Plus, X, Trash2, UserPlus, Clock, Send, Share2, Crown, HelpCircle } from 'lucide-react'
import { useRearingGroups } from '@/hooks/useRearingGroups'
import type { RearingGroup, RearingGroupMember } from '@/hooks/useRearingGroups'
import RearingGroupReport from '@/components/rearing-groups/RearingGroupReport'
import NIHBSMonthlyReturn from '@/components/rearing-groups/NIHBSMonthlyReturn'
import { useToast } from '@/components/ui/Toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function RearingTeamPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [userProfile, setUserProfile] = useState<{ first_name?: string; last_name?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const toast = useToast()

  // Rearing Groups state from hook
  const {
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
  } = useRearingGroups()

  // Rearing group modal state
  const [showCreateRgModal, setShowCreateRgModal] = useState(false)
  const [showInviteRgModal, setShowInviteRgModal] = useState(false)
  const [showRenameRgModal, setShowRenameRgModal] = useState(false)
  const [selectedRg, setSelectedRg] = useState<RearingGroup | null>(null)
  const [newRgName, setNewRgName] = useState('')
  const [rgInviteEmail, setRgInviteEmail] = useState('')
  const [creatingRg, setCreatingRg] = useState(false)
  const [sendingRgInvite, setSendingRgInvite] = useState(false)
  const [expandedRgId, setExpandedRgId] = useState<string | null>(null)
  const [renameRgName, setRenameRgName] = useState('')
  const [renamingRg, setRenamingRg] = useState(false)
  const [showTransferRgModal, setShowTransferRgModal] = useState(false)
  const [transferRgTargetUserId, setTransferRgTargetUserId] = useState('')
  const [transferringRg, setTransferringRg] = useState(false)

  const [skillLevelInfoTarget, setSkillLevelInfoTarget] = useState<string | null>(null)

  // Init useEffect
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
      }

      // Fetch profile (just first_name, last_name)
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', id)
        .maybeSingle()

      if (profile) {
        setUserProfile(profile)
      }

      fetchRearingGroups(id)
      setLoading(false)
    }
    initUser()
  }, [router, fetchRearingGroups])

  // Handlers - copied exactly from profile page

  const handleCreateRg = async () => {
    if (!userId || !newRgName.trim()) {
      toast.warning('Please enter a group name.')
      return
    }
    setCreatingRg(true)
    try {
      // Create the group
      const { data: newGroup, error } = await supabase
        .from('rearing_groups')
        .insert({ name: newRgName.trim(), owner_id: userId })
        .select()
        .single()

      if (error) throw error

      // Auto-insert owner as member
      const { error: memberError } = await supabase
        .from('rearing_group_members')
        .insert({ group_id: newGroup.id, user_id: userId, role: 'owner' })

      if (memberError) {
        // Rollback: delete the group since owner membership failed
        await supabase.from('rearing_groups').delete().eq('id', newGroup.id)
        throw memberError
      }

      toast.success(`Rearing group "${newRgName}" created successfully!`)
      setNewRgName('')
      setShowCreateRgModal(false)
      fetchRearingGroups(userId)
    } catch (error) {
      console.error('Error creating rearing group:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to create rearing group: ${errorMessage}`)
    } finally {
      setCreatingRg(false)
    }
  }

  const handleDeleteRg = async (groupId: string, groupName: string) => {
    if (!confirm(`Are you sure you want to delete the rearing group "${groupName}"? This action cannot be undone.`)) return
    try {
      const { error } = await supabase.from('rearing_groups').delete().eq('id', groupId)
      if (error) throw error
      toast.success(`Rearing group "${groupName}" deleted successfully.`)
      if (userId) fetchRearingGroups(userId)
    } catch (error) {
      console.error('Error deleting rearing group:', error)
      toast.error('Failed to delete rearing group. Please try again.')
    }
  }

  const handleRenameRg = async () => {
    if (!selectedRg || !renameRgName.trim()) {
      toast.warning('Please enter a new group name.')
      return
    }
    if (renameRgName.trim() === selectedRg.name) {
      toast.warning('New name is the same as current name.')
      return
    }
    setRenamingRg(true)
    try {
      const { error } = await supabase
        .from('rearing_groups')
        .update({ name: renameRgName.trim() })
        .eq('id', selectedRg.id)
        .eq('owner_id', userId)
      if (error) throw error
      toast.success(`Rearing group renamed to "${renameRgName.trim()}" successfully!`)
      setShowRenameRgModal(false)
      setRenameRgName('')
      setSelectedRg(null)
      if (userId) fetchRearingGroups(userId)
    } catch (error) {
      console.error('Error renaming rearing group:', error)
      toast.error('Failed to rename rearing group. Please try again.')
    } finally {
      setRenamingRg(false)
    }
  }

  const handleTransferRgOwnership = async () => {
    if (!selectedRg || !transferRgTargetUserId || !userId) return
    setTransferringRg(true)
    try {
      // Order matters: member role updates FIRST, owner_id LAST
      // RLS checks is_rearing_group_owner() which reads rearing_groups.owner_id
      // If we update owner_id first, subsequent member updates are denied by RLS

      // Step 1: Set new owner's member role to 'owner'
      const { data: d1, error: e1 } = await supabase
        .from('rearing_group_members')
        .update({ role: 'owner' })
        .eq('group_id', selectedRg.id)
        .eq('user_id', transferRgTargetUserId)
        .select()
      if (e1) throw e1
      if (!d1 || d1.length === 0) throw new Error('Failed to update new owner role — member may have been removed.')

      // Step 2: Set old owner's member role to 'member'
      const { data: d2, error: e2 } = await supabase
        .from('rearing_group_members')
        .update({ role: 'member' })
        .eq('group_id', selectedRg.id)
        .eq('user_id', userId)
        .select()
      if (e2) throw e2
      if (!d2 || d2.length === 0) throw new Error('Failed to update old owner role.')

      // Step 3: Transfer group ownership (old owner still has owner_id here)
      const { data: d3, error: e3 } = await supabase
        .from('rearing_groups')
        .update({ owner_id: transferRgTargetUserId })
        .eq('id', selectedRg.id)
        .eq('owner_id', userId)
        .select()
      if (e3) throw e3
      if (!d3 || d3.length === 0) throw new Error('Failed to transfer group ownership.')

      toast.success(`Ownership of "${selectedRg.name}" transferred successfully!`)
      setShowTransferRgModal(false)
      setSelectedRg(null)
      setTransferRgTargetUserId('')
      fetchRearingGroups(userId)
    } catch (error) {
      console.error('Error transferring rearing group ownership:', error)
      const msg = error instanceof Error ? error.message : 'Please try again.'
      toast.error(`Failed to transfer ownership. ${msg}`)
      // Refresh to show current state (partially updated or not)
      if (userId) fetchRearingGroups(userId)
    } finally {
      setTransferringRg(false)
    }
  }

  const handleSendRgInvite = async () => {
    if (!selectedRg || !rgInviteEmail.trim()) {
      toast.warning('Please enter an email address.')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(rgInviteEmail)) {
      toast.warning('Please enter a valid email address.')
      return
    }
    setSendingRgInvite(true)
    try {
      // Check if user already exists
      const { data: lookupResult, error: lookupError } = await supabase
        .rpc('lookup_user_by_email', { search_email: rgInviteEmail.toLowerCase() })
      if (lookupError) console.error('Error looking up user:', lookupError)

      const existingUser = lookupResult && lookupResult.length > 0 ? lookupResult[0] : null

      // Check if already a member
      if (existingUser) {
        const { data: existingMember } = await supabase
          .from('rearing_group_members')
          .select('id')
          .eq('group_id', selectedRg.id)
          .eq('user_id', existingUser.user_id)
          .maybeSingle()
        if (existingMember) {
          toast.warning('This user is already a member of the group.')
          setSendingRgInvite(false)
          return
        }
      }

      // Check if invitation already exists
      const { data: existingInvite } = await supabase
        .from('rearing_group_invitations')
        .select('id, status')
        .eq('group_id', selectedRg.id)
        .eq('email', rgInviteEmail.toLowerCase())
        .in('status', ['pending', 'declined'])
        .maybeSingle()

      if (existingInvite) {
        if (existingInvite.status === 'pending') {
          toast.warning('An invitation has already been sent to this email.')
          setSendingRgInvite(false)
          return
        } else if (existingInvite.status === 'declined') {
          await supabase.from('rearing_group_invitations').delete().eq('id', existingInvite.id)
        }
      }

      if (existingUser) {
        // Auto-accept: add directly
        const { error: memberError } = await supabase
          .from('rearing_group_members')
          .insert({ group_id: selectedRg.id, user_id: existingUser.user_id, role: 'member' })
        if (memberError) throw memberError

        await supabase.from('rearing_group_invitations').insert({
          group_id: selectedRg.id,
          email: rgInviteEmail.toLowerCase(),
          invited_by: userId,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        toast.success(`${rgInviteEmail} has been added to the group!`)
      } else {
        // Create pending invitation and send email
        const { data: newInvite, error: inviteError } = await supabase
          .from('rearing_group_invitations')
          .insert({
            group_id: selectedRg.id,
            email: rgInviteEmail.toLowerCase(),
            invited_by: userId,
            status: 'pending',
          })
          .select()
          .single()
        if (inviteError) throw inviteError

        try {
          const { error: emailError } = await supabase.functions.invoke('send-rearing-group-invitation', {
            body: {
              invitationId: newInvite.id,
              inviteeEmail: rgInviteEmail.toLowerCase(),
              groupName: selectedRg.name,
              inviterName: userProfile?.first_name && userProfile?.last_name
                ? `${userProfile.first_name} ${userProfile.last_name}`
                : undefined,
              inviterEmail: userEmail,
              expiresAt: newInvite.expires_at,
            },
          })
          if (emailError) {
            if (emailError.message?.includes('FunctionsRelayError') || emailError.message?.includes('not found')) {
              toast.info(`Invitation created! Email system not configured yet. ${rgInviteEmail} will be added when they sign up.`)
            } else {
              toast.warning(`Invitation created but email failed to send. Please contact ${rgInviteEmail} directly.`)
            }
          } else {
            toast.success(`Invitation email sent to ${rgInviteEmail}!`)
          }
        } catch (emailException) {
          console.error('Exception sending invitation email:', emailException)
          toast.info(`Invitation created! Email system not configured. Please contact ${rgInviteEmail} directly.`)
        }
      }

      setRgInviteEmail('')
      setShowInviteRgModal(false)
      fetchRearingGroupDetails(selectedRg.id)
    } catch (error) {
      console.error('Error sending rearing group invitation:', error)
      toast.error('Failed to send invitation. Please try again.')
    } finally {
      setSendingRgInvite(false)
    }
  }

  const handleCancelRgInvitation = async (invitationId: string, email: string) => {
    if (!confirm(`Are you sure you want to cancel the invitation to ${email}?`)) return
    try {
      const { error } = await supabase.from('rearing_group_invitations').delete().eq('id', invitationId)
      if (error) throw error
      setRgPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      if (selectedRg) await fetchRearingGroupDetails(selectedRg.id)
      toast.success(`Invitation to ${email} cancelled.`)
    } catch (error) {
      console.error('Error cancelling invitation:', error)
      toast.error('Failed to cancel invitation. Please try again.')
      if (selectedRg) fetchRearingGroupDetails(selectedRg.id)
    }
  }

  const handleRemoveRgMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from the group?`)) return
    try {
      const { error } = await supabase.from('rearing_group_members').delete().eq('id', memberId)
      if (error) throw error
      toast.success(`${memberEmail} removed from group.`)
      if (selectedRg) fetchRearingGroupDetails(selectedRg.id)
      if (userId) fetchRearingGroups(userId)
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error('Failed to remove member. Please try again.')
    }
  }

  const handleUpdateExperienceLevel = async (memberId: string, level: string) => {
    try {
      const { error } = await supabase
        .from('rearing_group_members')
        .update({ experience_level: level || null })
        .eq('id', memberId)
      if (error) throw error
      setRgMembers((prev) =>
        prev.map((m) => m.id === memberId ? { ...m, experience_level: (level || null) as RearingGroupMember['experience_level'] } : m)
      )
    } catch (error) {
      console.error('Error updating experience level:', error)
      toast.error('Failed to update experience level.')
    }
  }

  const handleUpdateOwnExperienceLevel = async (membershipId: string, groupId: string, level: string) => {
    try {
      const { error } = await supabase
        .from('rearing_group_members')
        .update({ experience_level: level || null })
        .eq('id', membershipId)
      if (error) throw error
      setMemberRearingGroups((prev) =>
        prev.map((g) => g.id === groupId ? { ...g, experience_level: (level || null) as RearingGroup['experience_level'] } : g)
      )
    } catch (error) {
      console.error('Error updating experience level:', error)
      toast.error('Failed to update experience level.')
    }
  }

  const handleLeaveRg = async (groupId: string, groupName: string) => {
    if (!userId) return
    if (!confirm(`Are you sure you want to leave the rearing group "${groupName}"?`)) return
    try {
      const { data, error } = await supabase
        .from('rearing_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .select()
      if (error) throw error
      if (!data || data.length === 0) {
        toast.warning('You are not a member of this group or membership not found.')
        return
      }
      toast.success(`You have left the rearing group "${groupName}".`)
      fetchRearingGroups(userId)
    } catch (error) {
      console.error('Error leaving rearing group:', error)
      toast.error('Failed to leave rearing group. Please try again.')
    }
  }

  const renderSkillLevelInfo = (targetId: string) => (
    <div className="relative">
      <button
        onClick={() => setSkillLevelInfoTarget(skillLevelInfoTarget === targetId ? null : targetId)}
        className="text-text-tertiary hover:text-text-secondary"
        title="Skill level guide"
      >
        <HelpCircle size={16} />
      </button>
      {skillLevelInfoTarget === targetId && (
        <div className="absolute left-0 sm:left-0 right-auto top-6 z-50 w-72 max-w-[calc(100vw-2rem)] p-3 bg-surface dark:bg-surface-elevated border border-border rounded-lg shadow-lg text-xs">
          <p className="font-semibold text-foreground mb-2">Experience Level Guide</p>
          <ul className="space-y-1.5 text-text-secondary">
            <li><span className="font-medium text-foreground">Experienced/Advanced</span> — were already using colony selection and queen rearing, for a number of seasons, before joining group</li>
            <li><span className="font-medium text-foreground">Intermediate</span> — had some queen rearing experience prior to joining group</li>
            <li><span className="font-medium text-foreground">Novice</span> — no queen rearing experience prior to joining group</li>
          </ul>
          <button onClick={() => setSkillLevelInfoTarget(null)} className="mt-2 text-amber-600 hover:text-amber-700 font-medium">Close</button>
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Crown size={32} className="text-amber-600" />
        <h1 className="text-3xl font-bold text-foreground">Rearing Team</h1>
      </div>

      {/* Queen Rearing Groups */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Crown size={24} className="text-amber-600" />
            <h2 className="text-xl font-semibold text-foreground">Queen Rearing Groups</h2>
          </div>
          <button
            onClick={() => setShowCreateRgModal(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium"
          >
            <Plus size={16} />
            Create Group
          </button>
        </div>

        <p className="text-sm text-text-tertiary mb-6">
          Create queen rearing groups to generate consolidated monthly reports across members&apos; rearing batches.
        </p>

        {loadingRearingGroups ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-amber-600 border-t-transparent"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Owned Rearing Groups */}
            {ownedRearingGroups.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">My Rearing Groups</h3>
                <div className="space-y-3">
                  {ownedRearingGroups.map((group) => (
                    <div key={group.id} className="border border-border rounded-lg p-4">
                      <div className="flex flex-col gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-foreground">{group.name}</h4>
                          <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xs rounded font-medium">
                            Owner
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => {
                              if (expandedRgId === group.id) {
                                setExpandedRgId(null)
                              } else {
                                setExpandedRgId(group.id)
                                setLoadingRgMembers(true)
                                fetchRearingGroupDetails(group.id).finally(() => setLoadingRgMembers(false))
                              }
                            }}
                            className="px-3 py-1.5 text-sm bg-sage-200 dark:bg-slate-700 text-text-primary rounded hover:bg-sage-300 dark:hover:bg-slate-700 flex items-center gap-1"
                          >
                            <Users size={14} />
                            <span className="hidden sm:inline">{expandedRgId === group.id ? 'Hide' : 'View'} Members</span>
                            <span className="sm:hidden">Members</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRg(group)
                              setShowInviteRgModal(true)
                              fetchRearingGroupDetails(group.id)
                            }}
                            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                          >
                            <UserPlus size={14} />
                            Invite
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRg(group)
                              setRenameRgName(group.name)
                              setShowRenameRgModal(true)
                            }}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                          >
                            <Edit2 size={14} />
                            Rename
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRg(group)
                              setTransferRgTargetUserId('')
                              setShowTransferRgModal(true)
                              fetchRearingGroupDetails(group.id)
                            }}
                            className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 flex items-center gap-1"
                          >
                            <Share2 size={14} />
                            Transfer
                          </button>
                          <button
                            onClick={() => handleDeleteRg(group.id, group.name)}
                            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-text-tertiary">
                        <span className="font-medium">{group.member_count || 0}</span> member{(group.member_count || 0) !== 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-text-tertiary mt-1">
                        Created {new Date(group.created_at).toLocaleDateString()}
                      </div>

                      {/* Expanded Member List */}
                      {expandedRgId === group.id && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="flex items-center gap-2 mb-3">
                            <h5 className="text-sm font-semibold text-foreground">Group Members</h5>
                            {renderSkillLevelInfo(`owner-${group.id}`)}
                          </div>
                          {loadingRgMembers ? (
                            <div className="flex justify-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-2 border-amber-600 border-t-transparent"></div>
                            </div>
                          ) : rgMembers.length > 0 ? (
                            <div className="space-y-2">
                              {rgMembers.map((member) => (
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
                                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200'
                                        : 'bg-surface-elevated dark:bg-surface-elevated text-foreground dark:text-foreground border border-border'
                                    }`}>
                                      {member.role}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 ml-3">
                                    <select
                                      value={member.experience_level || ''}
                                      onChange={(e) => handleUpdateExperienceLevel(member.id, e.target.value)}
                                      className="px-2 py-1 text-xs border border-border rounded bg-surface text-foreground"
                                      title="Experience level"
                                    >
                                      <option value="">Level</option>
                                      <option value="experienced">Experienced</option>
                                      <option value="intermediate">Intermediate</option>
                                      <option value="novice">Novice</option>
                                    </select>
                                    {member.role !== 'owner' && (
                                      <button
                                        onClick={() => handleRemoveRgMember(member.id, member.user_email || 'this member')}
                                        className="px-2 py-1 text-xs bg-red-600 dark:bg-red-900/30 text-white dark:text-red-300 rounded hover:bg-red-700 dark:hover:bg-red-900/50 flex items-center gap-1 border border-red-300 dark:border-red-700"
                                        title="Remove member"
                                      >
                                        <Trash2 size={12} />
                                        Remove
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-text-tertiary text-center py-4">No members yet. Invite someone to get started!</p>
                          )}

                          {/* Pending Invitations */}
                          {rgPendingInvitations.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-border">
                              <h5 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <Send size={14} className="text-orange-600" />
                                Pending Invitations
                              </h5>
                              <div className="space-y-2">
                                {rgPendingInvitations.map((invitation, index) => {
                                  const expiresAt = new Date(invitation.expires_at)
                                  const now = new Date()
                                  const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                                  const isExpiringSoon = daysLeft <= 2
                                  const isExpired = daysLeft < 0

                                  return (
                                    <div key={`rg-pending-${invitation.id || index}`} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
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
                                      <button
                                        onClick={() => handleCancelRgInvitation(invitation.id, invitation.email)}
                                        className="ml-3 px-2 py-1 text-xs bg-red-600 dark:bg-red-900/30 text-white dark:text-red-300 rounded hover:bg-red-700 dark:hover:bg-red-900/50 flex items-center gap-1 border border-red-300 dark:border-red-700"
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
                          {rgAcceptedInvitations.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-border">
                              <h5 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <User size={14} className="text-green-600 dark:text-green-400" />
                                Accepted Invitations
                              </h5>
                              <div className="space-y-2">
                                {rgAcceptedInvitations.map((invitation, index) => {
                                  const acceptedDate = invitation.accepted_at ? new Date(invitation.accepted_at) : null
                                  return (
                                    <div key={`rg-accepted-${invitation.id || index}`} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                                      <div className="flex items-center gap-3 flex-1">
                                        <User size={16} className="text-green-600 dark:text-green-400" />
                                        <div className="flex-1">
                                          <div className="text-sm font-medium text-foreground">{invitation.email}</div>
                                          <div className="text-xs text-text-tertiary flex items-center gap-2 mt-1">
                                            <Clock size={12} />
                                            {acceptedDate ? (
                                              <span>Accepted on {acceptedDate.toLocaleDateString()} at {acceptedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            ) : (
                                              <span>Accepted</span>
                                            )}
                                          </div>
                                        </div>
                                        <span className="px-2 py-1 text-xs rounded font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700">
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
                          {rgDeclinedInvitations.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-border">
                              <h5 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <X size={14} className="text-red-600" />
                                Declined Invitations
                              </h5>
                              <div className="space-y-2">
                                {rgDeclinedInvitations.map((invitation, index) => {
                                  const declinedDate = invitation.declined_at ? new Date(invitation.declined_at) : null
                                  return (
                                    <div key={`rg-declined-${invitation.id || index}`} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                                      <div className="flex items-center gap-3 flex-1">
                                        <X size={16} className="text-red-600" />
                                        <div className="flex-1">
                                          <div className="text-sm font-medium text-foreground">{invitation.email}</div>
                                          <div className="text-xs text-text-tertiary flex items-center gap-2 mt-1">
                                            <Clock size={12} />
                                            {declinedDate ? (
                                              <span>Declined on {declinedDate.toLocaleDateString()} at {declinedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            ) : (
                                              <span>Declined</span>
                                            )}
                                          </div>
                                        </div>
                                        <span className="px-2 py-1 text-xs rounded font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700">
                                          Declined
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Member Rearing Groups */}
            {memberRearingGroups.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Groups I&apos;m In</h3>
                <div className="space-y-3">
                  {memberRearingGroups.map((group) => (
                    <div key={group.id} className="border border-border rounded-lg p-4">
                      <div className="flex flex-col gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-foreground">{group.name}</h4>
                          <span className="px-2 py-1 bg-sage-100 dark:bg-slate-800 text-text-primary text-xs rounded font-medium capitalize">
                            {group.user_role}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleLeaveRg(group.id, group.name)}
                            className="px-3 py-1.5 text-sm bg-sage-200 dark:bg-slate-700 text-text-primary border border-border rounded hover:bg-sage-300 dark:hover:bg-slate-600"
                          >
                            Leave Group
                          </button>
                        </div>
                        {group.membership_id && (() => {
                          const membershipId = group.membership_id
                          return (
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-text-secondary">My Experience Level:</label>
                              <select
                                value={group.experience_level || ''}
                                onChange={(e) => handleUpdateOwnExperienceLevel(membershipId, group.id, e.target.value)}
                                className="px-2 py-1 text-sm border border-border rounded bg-surface text-foreground"
                              >
                                <option value="">Select level</option>
                                <option value="experienced">Experienced</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="novice">Novice</option>
                              </select>
                              {renderSkillLevelInfo(`member-${group.id}`)}
                            </div>
                          )
                        })()}
                      </div>
                      <div className="text-sm text-text-tertiary">
                        <span className="font-medium">{group.member_count || 0}</span> member{(group.member_count || 0) !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {ownedRearingGroups.length === 0 && memberRearingGroups.length === 0 && (
              <div className="text-center py-12 bg-surface dark:bg-surface-elevated rounded-lg border border-border">
                <Crown size={48} className="mx-auto text-text-tertiary mb-3" />
                <p className="text-text-tertiary mb-4">You haven&apos;t created or joined any rearing groups yet.</p>
                <button
                  onClick={() => setShowCreateRgModal(true)}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
                >
                  Create Your First Rearing Group
                </button>
              </div>
            )}

            {/* Monthly Report (only for group owners) */}
            {ownedRearingGroups.length > 0 && (
              <RearingGroupReport ownedGroups={ownedRearingGroups} />
            )}

            {/* NIHBS Monthly Returns (only for group owners) */}
            {ownedRearingGroups.length > 0 && userId && (
              <NIHBSMonthlyReturn ownedGroups={ownedRearingGroups} userId={userId} />
            )}
          </div>
        )}
      </div>

      {/* Create Rearing Group Modal */}
      {showCreateRgModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface dark:bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-foreground">Create New Rearing Group</h3>
              <button onClick={() => { setShowCreateRgModal(false); setNewRgName('') }} className="text-text-tertiary hover:text-text-secondary">
                <X size={24} />
              </button>
            </div>
            <p className="text-sm text-text-tertiary mb-4">
              Give your rearing group a name. You&apos;ll be able to invite members after creating the group.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Group Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newRgName}
                onChange={(e) => setNewRgName(e.target.value)}
                placeholder="e.g., Cork Queen Rearers"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-forest-500 dark:focus:ring-emerald-500 focus:border-blue-500"
                maxLength={100}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowCreateRgModal(false); setNewRgName('') }}
                className="px-4 py-2 text-text-secondary border border-border rounded-lg hover:bg-sage-50 dark:bg-surface dark:bg-surface-elevated/50"
                disabled={creatingRg}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRg}
                disabled={creatingRg || !newRgName.trim()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-sage-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creatingRg ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Creating...
                  </>
                ) : (
                  'Create Group'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Rearing Group Member Modal */}
      {showInviteRgModal && selectedRg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface dark:bg-surface rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-foreground">Manage Group: {selectedRg.name}</h3>
              <button
                onClick={() => { setShowInviteRgModal(false); setSelectedRg(null); setRgInviteEmail('') }}
                className="text-text-tertiary hover:text-text-secondary"
              >
                <X size={24} />
              </button>
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
                  value={rgInviteEmail}
                  onChange={(e) => setRgInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="flex-1 px-3 py-2 bg-surface dark:bg-surface-elevated text-foreground border border-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <button
                  onClick={handleSendRgInvite}
                  disabled={sendingRgInvite || !rgInviteEmail.trim()}
                  className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:bg-surface-elevated dark:disabled:bg-surface-elevated disabled:text-text-tertiary disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {sendingRgInvite ? (
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
              <h4 className="font-semibold text-foreground mb-3">Current Members ({rgMembers.length})</h4>
              {rgMembers.length > 0 ? (
                <div className="space-y-2">
                  {rgMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-surface dark:bg-surface-elevated rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-600 text-white rounded-full flex items-center justify-center font-semibold">
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
                          <button
                            onClick={() => handleRemoveRgMember(member.id, member.user_email || 'Unknown')}
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
                <p className="text-sm text-text-tertiary italic">No members yet.</p>
              )}
            </div>

            {/* Pending Invitations */}
            {rgPendingInvitations.length > 0 && (
              <div>
                <h4 className="font-semibold text-foreground mb-3">Pending Invitations ({rgPendingInvitations.length})</h4>
                <div className="space-y-2">
                  {rgPendingInvitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div>
                        <div className="font-medium text-foreground">{invitation.email}</div>
                        <div className="text-xs text-text-tertiary">
                          Invited {new Date(invitation.invited_at).toLocaleDateString()}
                          {' \u2022 Expires '}{new Date(invitation.expires_at).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelRgInvitation(invitation.id, invitation.email)}
                        className="px-3 py-1 text-sm bg-sage-200 dark:bg-slate-700 text-text-primary border border-border rounded hover:bg-sage-300 dark:hover:bg-slate-600"
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
                onClick={() => { setShowInviteRgModal(false); setSelectedRg(null); setRgInviteEmail('') }}
                className="px-6 py-2.5 bg-surface-elevated dark:bg-surface-elevated text-foreground border border-border rounded-lg hover:bg-surface dark:hover:bg-surface font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Rearing Group Modal */}
      {showRenameRgModal && selectedRg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface dark:bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-foreground">Rename Rearing Group</h3>
              <button onClick={() => { setShowRenameRgModal(false); setSelectedRg(null); setRenameRgName('') }} className="text-text-tertiary hover:text-text-secondary">
                <X size={24} />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Current Name: <span className="font-semibold text-foreground">{selectedRg.name}</span>
              </label>
              <label className="block text-sm font-medium text-text-secondary mb-2">New Group Name</label>
              <input
                type="text"
                value={renameRgName}
                onChange={(e) => setRenameRgName(e.target.value)}
                placeholder="Enter new group name"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 dark:focus:ring-emerald-500"
                maxLength={100}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowRenameRgModal(false); setSelectedRg(null); setRenameRgName('') }}
                className="flex-1 px-4 py-2 bg-sage-200 dark:bg-slate-700 text-text-primary rounded-lg hover:bg-sage-300 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameRg}
                disabled={renamingRg || !renameRgName.trim()}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-sage-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {renamingRg ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Renaming...
                  </>
                ) : (
                  <>
                    <Edit2 size={16} />
                    Rename Group
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Rearing Group Ownership Modal */}
      {showTransferRgModal && selectedRg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface dark:bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-foreground">Transfer Ownership</h3>
              <button onClick={() => { setShowTransferRgModal(false); setSelectedRg(null); setTransferRgTargetUserId('') }} className="text-text-tertiary hover:text-text-secondary">
                <X size={24} />
              </button>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              Transfer ownership of <span className="font-semibold text-foreground">{selectedRg.name}</span> to another member. You will become a regular member.
            </p>
            {loadingRgMembers ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-amber-600 border-t-transparent"></div>
              </div>
            ) : rgMembers.filter(m => m.role !== 'owner').length === 0 ? (
              <p className="text-sm text-text-tertiary text-center py-4">No other members to transfer to. Invite members first.</p>
            ) : (
              <>
                <label className="block text-sm font-medium text-text-secondary mb-2">New Owner</label>
                <select
                  value={transferRgTargetUserId}
                  onChange={(e) => setTransferRgTargetUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 dark:focus:ring-emerald-500 bg-surface dark:bg-surface-elevated text-foreground mb-4"
                >
                  <option value="">Select a member...</option>
                  {rgMembers.filter(m => m.role !== 'owner').map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.first_name && member.last_name
                        ? `${member.first_name} ${member.last_name} (${member.user_email})`
                        : member.user_email}
                    </option>
                  ))}
                </select>
              </>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowTransferRgModal(false); setSelectedRg(null); setTransferRgTargetUserId('') }}
                className="flex-1 px-4 py-2 bg-sage-200 dark:bg-slate-700 text-text-primary rounded-lg hover:bg-sage-300 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferRgOwnership}
                disabled={transferringRg || !transferRgTargetUserId}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-sage-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {transferringRg ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Transferring...
                  </>
                ) : (
                  <>
                    <Share2 size={16} />
                    Transfer Ownership
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
