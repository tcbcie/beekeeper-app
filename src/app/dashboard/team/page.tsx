'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, Mail, Crown, UserCheck, Plus, X, Trash2 } from 'lucide-react'

interface Team {
  id: string
  name: string
  owner_id: string
}

interface TeamMember {
  id: string
  user_id: string
  team_id: string
  role: 'owner' | 'member'
  joined_at: string
  profiles: {
    email: string
    full_name: string | null
  }
}

interface TeamWithMembers extends Team {
  members: TeamMember[]
}

interface SharedApiary {
  id: string
  apiary_id: string
  apiaries: {
    name: string
  }
}

export default function TeamPage() {
  const [userId, setUserId] = useState<string>('')
  const [teams, setTeams] = useState<TeamWithMembers[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  // Get user ID
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    getUser()
  }, [])

  // Fetch teams and members
  const fetchTeams = useCallback(async () => {
    if (!userId) return

    try {
      // Fetch teams where user is a member
      const { data: teamMemberships, error: membershipError } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', userId)

      if (membershipError) throw membershipError

      if (!teamMemberships || teamMemberships.length === 0) {
        setTeams([])
        setLoading(false)
        return
      }

      const teamIds = teamMemberships.map(tm => tm.team_id)

      // Fetch team details
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, owner_id')
        .in('id', teamIds)

      if (teamsError) throw teamsError

      // Fetch all members for these teams
      const { data: allMembers, error: membersError } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          team_id,
          role,
          joined_at,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .in('team_id', teamIds)

      if (membersError) throw membersError

      // Combine teams with their members
      const teamsWithMembers: TeamWithMembers[] = (teamsData || []).map(team => ({
        ...team,
        members: (allMembers || [])
          .filter(m => m.team_id === team.id)
          .map(m => ({
            ...m,
            profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
          }))
      }))

      setTeams(teamsWithMembers)
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (userId) {
      fetchTeams()
    }
  }, [userId, fetchTeams])

  // Handle invite
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || !selectedTeamId) return

    setInviting(true)

    try {
      const { error } = await supabase
        .from('team_invitations')
        .insert({
          team_id: selectedTeamId,
          email: inviteEmail.toLowerCase().trim(),
          invited_by: userId
        })

      if (error) {
        if (error.code === '23505') {
          alert('An invitation has already been sent to this email address for this team.')
        } else {
          throw error
        }
      } else {
        alert('Invitation sent successfully!')
        setInviteEmail('')
        setShowInviteForm(false)
      }
    } catch (error) {
      console.error('Error sending invitation:', error)
      alert('Failed to send invitation. Please try again.')
    } finally {
      setInviting(false)
    }
  }

  // Handle remove member
  const handleRemoveMember = async (teamId: string, memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the team?`)) return

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      alert('Member removed successfully')
      await fetchTeams()
    } catch (error) {
      console.error('Error removing member:', error)
      alert('Failed to remove member. Please try again.')
    }
  }

  const isTeamOwner = (team: TeamWithMembers) => team.owner_id === userId

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <h1 className="text-responsive-3xl font-bold text-gray-900 mb-6">Team Members 👥</h1>
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (teams.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <h1 className="text-responsive-3xl font-bold text-gray-900 mb-6">Team Members 👥</h1>
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">You are not part of any team yet</p>
          <p className="text-sm text-gray-500">Team owners can invite you to join their teams</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-responsive-3xl font-bold text-gray-900">Team Members 👥</h1>
      </div>

      {/* Teams */}
      <div className="space-y-6">
        {teams.map(team => (
          <div key={team.id} className="bg-white rounded-lg shadow overflow-hidden">
            {/* Team Header */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{team.name}</h2>
                <p className="text-purple-100 text-sm">
                  {team.members.length} {team.members.length === 1 ? 'member' : 'members'}
                </p>
              </div>
              {isTeamOwner(team) && (
                <button
                  onClick={() => {
                    setSelectedTeamId(team.id)
                    setShowInviteForm(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">Invite Member</span>
                  <span className="sm:hidden">Invite</span>
                </button>
              )}
            </div>

            {/* Members List */}
            <div className="divide-y divide-gray-200">
              {team.members.map(member => (
                <div key={member.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {member.role === 'owner' ? (
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                          <Crown size={20} className="text-amber-600" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <UserCheck size={20} className="text-blue-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">
                          {member.profiles?.full_name || 'Unknown User'}
                        </p>
                        {member.role === 'owner' && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                            Owner
                          </span>
                        )}
                        {member.user_id === userId && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Mail size={14} />
                        <span className="truncate">{member.profiles?.email}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Joined {new Date(member.joined_at).toLocaleDateString('en-IE')}
                      </p>
                    </div>
                  </div>

                  {/* Remove button (only for owner, and can't remove themselves) */}
                  {isTeamOwner(team) && member.user_id !== userId && (
                    <button
                      onClick={() => handleRemoveMember(
                        team.id,
                        member.id,
                        member.profiles?.full_name || member.profiles?.email || 'this member'
                      )}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Remove member"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Invite Form Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Invite Team Member</h2>
              <button
                onClick={() => {
                  setShowInviteForm(false)
                  setInviteEmail('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="member@example.com"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  An invitation link will be sent to this email address
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteForm(false)
                    setInviteEmail('')
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
