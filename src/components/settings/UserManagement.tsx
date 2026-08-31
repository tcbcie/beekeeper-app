'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { useToast } from '@/components/ui/Toast'
import { setImpersonationData } from '@/components/ImpersonationBanner'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ModalShell from '@/components/ui/ModalShell'
import FormActionRow from '@/components/ui/FormActionRow'
import FieldLabel from '@/components/ui/FieldLabel'
import SelectField from '@/components/ui/SelectField'
import TextInput from '@/components/ui/TextInput'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import Surface from '@/components/ui/Surface'
import TextLink from '@/components/ui/TextLink'
import NavTabButton from '@/components/ui/NavTabButton'
import { Trash2, Shield, Users, Search, ChevronDown, ChevronLeft, ChevronRight, Building2, Hexagon, MapPin, UserPlus, Loader2 } from 'lucide-react'

interface UserProfile {
  id: string
  role: 'User' | 'Power User' | 'Admin'
  created_at: string
  updated_at: string
  email?: string
  first_name?: string
  last_name?: string
  mobile_number?: string
  is_active?: boolean
  registration_code?: string
  code_description?: string
  subscription_type?: string
  subscription_expires_at?: string | null
  subscription_status?: 'active' | 'expiring_soon' | 'expiring_very_soon' | 'expired' | 'no_subscription'
  days_remaining?: number
  deleted_at?: string | null
  latest_transaction_id?: string | null
  apiaries_count?: number
  hives_count?: number
  last_sign_in_at?: string | null
}

interface SubscriptionHistoryRecord {
  id: string
  user_id: string
  user_email?: string
  code?: string | null
  code_id?: string | null
  activated_at: string
  expires_at: string
  subscription_type: string
  price_paid: number
  payment_method: string
  stripe_payment_intent_id?: string | null
}

interface UserApiary {
  id: string
  name: string
  city: string | null
  hives_count?: number
}

interface TransferUserOption {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
}

interface ReactivationRequest {
  id: string
  user_id: string
  original_email: string
  requested_at: string
  status: 'pending' | 'approved' | 'rejected'
  processed_at: string | null
  processed_by: string | null
  admin_notes: string | null
}

// Format relative time for "last active" display
function formatLastActive(dateString: string | null | undefined): string {
  if (!dateString) return 'Never'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

const USERS_PER_PAGE = 15

/**
 * Admin User Management: user list with filters/pagination, role and expiry
 * changes, account enable/disable, soft/hard delete and restore,
 * reactivation requests, impersonation, and apiary ownership transfer.
 * Extracted verbatim from src/app/dashboard/settings/page.tsx (Phase 6.6
 * decomposition). Renders only inside the admin-gated Users section.
 */
export default function UserManagement() {
  const router = useRouter()
  const toast = useToast()
  // Signed-in admin id: used by the self-guards (cannot change own role,
  // disable or delete your own account).
  const [userId, setUserId] = useState<string | null>(null)
  useEffect(() => {
    getCurrentUserId().then(setUserId)
  }, [])

  // User Management state
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [deletedUsers, setDeletedUsers] = useState<UserProfile[]>([])
  const [showDeletedUsers, setShowDeletedUsers] = useState(false)
  const [showReactivationRequests, setShowReactivationRequests] = useState(false)
  const [reactivationRequests, setReactivationRequests] = useState<ReactivationRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [reactivationRequestsFetched, setReactivationRequestsFetched] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<'all' | 'User' | 'Power User' | 'Admin'>('all')
  const [accountStatusFilter, setAccountStatusFilter] = useState<'all' | 'active' | 'disabled'>('all')
  const [subscriptionFilter, setSubscriptionFilter] = useState<'all' | 'active' | 'expiring' | 'expired' | 'none'>('all')
  const [lastActiveSort, setLastActiveSort] = useState<'default' | 'recent_first' | 'oldest_first' | 'never_first'>('default')
  const [currentUsersPage, setCurrentUsersPage] = useState(1)
  const [restoringUserId, setRestoringUserId] = useState<string | null>(null)
  const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(null)
  const [showSubscriptionHistory, setShowSubscriptionHistory] = useState(false)
  const [subscriptionHistory, setSubscriptionHistory] = useState<SubscriptionHistoryRecord[]>([])
  const [, setLoadingHistory] = useState(false)
  const [subscriptionHistoryFetched, setSubscriptionHistoryFetched] = useState(false)

  // Admin Apiary Transfer state
  const [showApiaryTransferModal, setShowApiaryTransferModal] = useState(false)
  const [selectedUserForTransfer, setSelectedUserForTransfer] = useState<UserProfile | null>(null)
  const [userApiaries, setUserApiaries] = useState<UserApiary[]>([])
  const [loadingApiaries, setLoadingApiaries] = useState(false)
  const [transferTargetUsers, setTransferTargetUsers] = useState<TransferUserOption[]>([])
  const [selectedApiaryId, setSelectedApiaryId] = useState<string>('')
  const [selectedNewOwnerId, setSelectedNewOwnerId] = useState<string>('')
  const [transferring, setTransferring] = useState(false)

  // Reset pagination and collapse the expanded row whenever a filter changes.
  useEffect(() => {
    setCurrentUsersPage(1)
    setExpandedUserId(null)
  }, [userSearch, roleFilter, accountStatusFilter, subscriptionFilter, lastActiveSort, showDeletedUsers])

  // The section opens expanded when the Users tab mounts this component.
  useEffect(() => {
    setShowUserManagement(true)
  }, [])

  // User Management Functions
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      // Call the function that joins user_profiles with auth.users to get emails
      // Uses RPC (Remote Procedure Call) to execute the database function
      const { data, error } = await supabase
        .rpc('get_users_with_email')

      if (error) throw error

      if (data) {
        setUsers(data as UserProfile[])
      }
    } catch (error) {
      console.error('❌ Error fetching users:', error)
      toast.error('Failed to fetch users. Make sure you have admin permissions.')
    } finally {
      setLoadingUsers(false)
    }
  }, [toast])

  const fetchDeletedUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const { data, error } = await supabase
        .from('deleted_profiles')
        .select('*')
        .order('deleted_at', { ascending: false })

      if (error) throw error

      if (data) {
        setDeletedUsers(data as UserProfile[])
      }
    } catch (error) {
      console.error('❌ Error fetching deleted users:', error)
      toast.error('Failed to fetch deleted users. Make sure you have admin permissions.')
    } finally {
      setLoadingUsers(false)
    }
  }, [toast])

  const fetchReactivationRequests = async () => {
    setLoadingRequests(true)
    try {
      const { data, error } = await supabase
        .from('reactivation_requests')
        .select('*')
        .order('requested_at', { ascending: false })

      if (error) throw error

      if (data) {
        setReactivationRequests(data as ReactivationRequest[])
        setReactivationRequestsFetched(true)
      }
    } catch (error) {
      console.error('❌ Error fetching reactivation requests:', error)
      toast.error('Failed to fetch reactivation requests. Make sure you have admin permissions.')
    } finally {
      setLoadingRequests(false)
    }
  }

  const fetchSubscriptionHistory = async () => {
    setLoadingHistory(true)
    try {
      // Fetch subscription history
      const { data: historyData, error: historyError } = await supabase
        .from('subscription_history')
        .select('*')
        .order('activated_at', { ascending: false })

      if (historyError) throw historyError

      if (historyData) {
        // Create a map of user_id to email from existing users data
        const emailMap = new Map(users.map(u => [u.id, u.email]))

        const formattedData = historyData.map((record) => ({
          id: record.id,
          user_id: record.user_id,
          code: record.code,
          code_id: record.code_id,
          activated_at: record.activated_at,
          expires_at: record.expires_at,
          subscription_type: record.subscription_type,
          price_paid: record.price_paid,
          payment_method: record.payment_method,
          stripe_payment_intent_id: record.stripe_payment_intent_id,
          user_email: emailMap.get(record.user_id) || 'Unknown'
        }))

        setSubscriptionHistory(formattedData as SubscriptionHistoryRecord[])
        setSubscriptionHistoryFetched(true)
      }
    } catch (error) {
      console.error('❌ Error fetching subscription history:', error)
      toast.error('Failed to fetch subscription history. Make sure you have admin permissions.')
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleApproveReactivation = async (requestId: string, email: string) => {
    if (!confirm(`✅ Approve reactivation request for ${email}?\n\nThis will restore their account and allow them to log in.`)) return

    const notes = prompt('Optional admin notes (e.g., "Verified via email"):')

    try {
      const { data, error } = await supabase.rpc('reactivate_user_account', {
        p_request_id: requestId,
        p_admin_notes: notes || null
      })

      if (error) {
        console.error('❌ Error approving reactivation:', error)
        let errorMessage = 'Failed to approve reactivation request.'

        // Handle specific error codes
        if (error.code === '23505' || (error.message && error.message.includes('unique'))) {
          errorMessage = `Email conflict: The email ${email} may already be in use by another account.`
        } else if (error.message) {
          errorMessage = error.message
        }

        toast.error(errorMessage)
        return
      }

      if (data && typeof data === 'object' && 'success' in data) {
        if (data.success) {
          toast.success(`Account reactivated successfully for ${email}!`)
          fetchReactivationRequests() // Refresh requests list
          fetchUsers() // Refresh active users list
        } else {
          // Function returned success: false with a message
          toast.error(`Failed to reactivate: ${data.message || 'Unknown error'}`)
        }
      } else {
        toast.error('Unexpected response from server. Please try again.')
      }
    } catch (error) {
      console.error('❌ Exception approving reactivation:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to approve reactivation request: ${errorMessage}`)
    }
  }

  const handleRejectReactivation = async (requestId: string, email: string) => {
    const notes = prompt(`❌ Reject reactivation request for ${email}?\n\nPlease provide a reason (required):`)

    if (!notes || notes.trim() === '') {
      toast.warning('Rejection reason is required')
      return
    }

    try {
      const { data, error } = await supabase.rpc('reject_reactivation_request', {
        p_request_id: requestId,
        p_admin_notes: notes
      })

      if (error) throw error

      if (data && typeof data === 'object' && 'success' in data) {
        if (data.success) {
          toast.success(`Reactivation request rejected for ${email}`)
          fetchReactivationRequests() // Refresh list
        } else {
          toast.error(`Failed to reject: ${data.message}`)
        }
      }
    } catch (error) {
      console.error('❌ Error rejecting reactivation:', error)
      toast.error('Failed to reject reactivation request. Please try again.')
    }
  }

  const handleRestoreUser = async (targetUserId: string, userEmail: string) => {
    const newEmail = prompt(`Restore user account?\n\nCurrent email: ${userEmail}\n\nEnter a NEW email address for this user:`)

    if (!newEmail) {
      return // User cancelled
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      toast.warning('Invalid email format. Please enter a valid email address.')
      return
    }

    setRestoringUserId(targetUserId)

    try {
      const { data, error } = await supabase
        .rpc('restore_deleted_user', {
          p_user_id: targetUserId,
          p_new_email: newEmail
        })

      if (error) throw error

      if (data && !data.success) {
        toast.error(`Failed to restore user: ${data.message}`)
        return
      }

      toast.success('User account restored successfully!')
      // Refresh both lists
      fetchDeletedUsers()
      fetchUsers()
    } catch (error) {
      console.error('Error restoring user:', error)
      toast.error('Failed to restore user account.')
    } finally {
      setRestoringUserId(null)
    }
  }

  const handleImpersonateUser = async (targetUserId: string, targetUserEmail: string) => {
    if (!userId || targetUserId === userId) {
      toast.warning('You cannot impersonate yourself.')
      return
    }

    if (!confirm(`Are you sure you want to impersonate ${targetUserEmail}?\n\nYou will be logged in as this user.`)) {
      return
    }

    setImpersonatingUserId(targetUserId)

    try {
      // Get current session to store for restoration
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token || !session?.refresh_token) {
        toast.error('Session not found. Please log in again.')
        return
      }

      // Call impersonation API
      const response = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ targetUserId })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to impersonate user')
      }

      // Store original session before switching
      setImpersonationData({
        originalSession: {
          access_token: session.access_token,
          refresh_token: session.refresh_token
        },
        targetUserEmail: result.email,
        targetDisplayName: result.displayName,
        startedAt: new Date().toISOString()
      })

      // Sign in as target user using the token hash
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: result.tokenHash,
        type: 'magiclink'
      })

      if (verifyError) {
        throw verifyError
      }

      toast.success(`Now impersonating ${result.displayName}`)
      // Use full page reload so the ImpersonationBanner re-reads from localStorage
      window.location.href = '/dashboard'

    } catch (error) {
      console.error('Error impersonating user:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to impersonate user')
    } finally {
      setImpersonatingUserId(null)
    }
  }

  // Open apiary transfer modal for a user
  const openApiaryTransferModal = async (user: UserProfile) => {
    setSelectedUserForTransfer(user)
    setShowApiaryTransferModal(true)
    setSelectedApiaryId('')
    setSelectedNewOwnerId('')
    setLoadingApiaries(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      // Fetch user's apiaries via admin endpoint (bypasses RLS)
      const apiariesResponse = await fetch(`/api/admin/user-apiaries?userId=${user.id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })

      if (!apiariesResponse.ok) {
        throw new Error('Failed to fetch apiaries')
      }

      const apiariesData = await apiariesResponse.json()
      setUserApiaries(apiariesData.apiaries || [])

      // Fetch available users for transfer
      const response = await fetch('/api/users/list', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (response.ok) {
        const data = await response.json()
        // Filter out the current user we're transferring FROM
        setTransferTargetUsers(data.users.filter((u: TransferUserOption) => u.id !== user.id))
      }
    } catch (error) {
      console.error('Error loading apiaries:', error)
      toast.error('Failed to load apiaries')
    } finally {
      setLoadingApiaries(false)
    }
  }

  // Handle admin apiary transfer
  const handleAdminTransferApiary = async () => {
    if (!selectedApiaryId || !selectedNewOwnerId || !selectedUserForTransfer) return

    const apiary = userApiaries.find(a => a.id === selectedApiaryId)
    const newOwner = transferTargetUsers.find(u => u.id === selectedNewOwnerId)
    const newOwnerName = newOwner?.first_name && newOwner?.last_name
      ? `${newOwner.first_name} ${newOwner.last_name}`
      : newOwner?.email || 'the selected user'

    if (!confirm(`Transfer "${apiary?.name}" to ${newOwnerName}?`)) return

    setTransferring(true)
    try {
      const { error } = await supabase.rpc('transfer_apiary_ownership', {
        p_apiary_id: selectedApiaryId,
        p_new_owner_id: selectedNewOwnerId
      })

      if (error) throw error

      toast.success(`Apiary transferred to ${newOwnerName}`)

      // Remove transferred apiary from list
      setUserApiaries(prev => prev.filter(a => a.id !== selectedApiaryId))
      setSelectedApiaryId('')
      setSelectedNewOwnerId('')

      // Refresh user list to update counts
      fetchUsers()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transfer failed'
      toast.error(errorMessage)
    } finally {
      setTransferring(false)
    }
  }

  const handleRoleChange = async (targetUserId: string, newRole: 'User' | 'Power User' | 'Admin') => {
    if (!userId || targetUserId === userId) {
      toast.warning('You cannot change your own role.')
      return
    }

    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return
    }

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        toast.error('You must be logged in to perform this action.')
        return
      }

      // Call the API route with service role access
      const response = await fetch('/api/admin/update-user-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          targetUserId,
          newRole
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update role')
      }

      toast.success(`User role updated to ${newRole} successfully!`)
      fetchUsers() // Refresh the list
    } catch (error) {
      console.error('❌ Error updating user role:', error)
      toast.error(`Failed to update user role: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleExpiryDateChange = async (targetUserId: string, newExpiryDate: string) => {
    if (!newExpiryDate) {
      toast.warning('Please enter a valid date.')
      return
    }

    try {
      // Convert to ISO string for database
      const expiryTimestamp = new Date(newExpiryDate).toISOString()

      const { error } = await supabase
        .from('profiles')
        .update({ subscription_expires_at: expiryTimestamp })
        .eq('id', targetUserId)

      if (error) throw error

      toast.success('Subscription expiry date updated successfully!')
      fetchUsers() // Refresh the list
    } catch (error) {
      console.error('Error updating subscription expiry date:', error)
      toast.error('Failed to update subscription expiry date.')
    }
  }

  const handleDeleteUser = async (targetUserId: string, userEmail: string) => {
    if (!userId || targetUserId === userId) {
      toast.warning('You cannot delete your own account.')
      return
    }

    if (!confirm(`⚠️ WARNING: Are you sure you want to delete the user "${userEmail}"?\n\n✅ SOFT DELETE - Preserves all data:\n- User will be marked as deleted\n- Account will be disabled (cannot login)\n- All subscription history PRESERVED\n- All beekeeping data PRESERVED\n- Account can be restored later\n\nThis is a SAFE deletion that preserves payment history.`)) {
      return
    }

    try {
      // Call soft_delete_user function
      const { data, error } = await supabase
        .rpc('soft_delete_user', {
          p_user_id: targetUserId
        })

      if (error) throw error

      if (data && !data.success) {
        toast.error(`Failed to delete user: ${data.message}`)
        return
      }

      toast.success(`User "${userEmail}" has been soft deleted successfully!`)

      // Refresh both user lists
      fetchUsers()
      fetchDeletedUsers()
    } catch (error) {
      console.error('❌ Error deleting user:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to delete user: ${errorMessage}`)
    }
  }

  const handleHardDeleteUser = async (targetUserId: string, userEmail: string) => {
    if (!userId || targetUserId === userId) {
      toast.warning('You cannot delete your own account.')
      return
    }

    // First confirmation
    if (!confirm(`🚨 PERMANENT DELETION WARNING 🚨\n\nYou are about to PERMANENTLY DELETE user "${userEmail}".\n\n❌ HARD DELETE - Destroys ALL data:\n• User profile and account\n• All apiaries, hives, queens\n• All inspections and records\n• All varroa checks/treatments\n• All feedings and harvests\n• All teams owned\n• All team memberships\n• ALL subscription history\n• ALL payment records\n\n⚠️ THIS CANNOT BE UNDONE!\n⚠️ THIS IS PERMANENT!\n⚠️ ALL DATA WILL BE LOST FOREVER!\n\nAre you ABSOLUTELY SURE?`)) {
      return
    }

    // Second confirmation to prevent accidents
    if (!confirm(`⛔ FINAL WARNING ⛔\n\nThis is your last chance to cancel.\n\nDeleting "${userEmail}" will:\n• Remove ALL their data from the database\n• Delete their authentication account\n• Cannot be recovered or restored\n• Violates no regulatory retention requirements\n\nOnly proceed if:\n✓ This is a GDPR/data deletion request\n✓ This is a confirmed spam/test account\n✓ You have written authorization\n\nType YES in the next prompt to confirm permanent deletion.`)) {
      return
    }

    // Final typed confirmation
    const confirmation = prompt(`Type "DELETE ${userEmail}" exactly to confirm permanent deletion:`)
    if (confirmation !== `DELETE ${userEmail}`) {
      toast.warning('Deletion cancelled - confirmation text did not match.')
      return
    }

    try {
      // Call hard_delete_user function
      const { data, error } = await supabase
        .rpc('hard_delete_user', {
          p_user_id: targetUserId
        })

      if (error) throw error

      if (data && !data.success) {
        toast.error(`Failed to hard delete user: ${data.message}`)
        return
      }

      // Show what was deleted
      toast.success(`User "${userEmail}" has been PERMANENTLY DELETED!`)

      // Refresh both user lists
      fetchUsers()
      fetchDeletedUsers()
    } catch (error) {
      console.error('❌ Error hard deleting user:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to hard delete user: ${errorMessage}`)
    }
  }

  // Fetch users when user management section is opened
  useEffect(() => {
    if (showUserManagement) {
      if (users.length === 0) {
        fetchUsers()
      }
      if (deletedUsers.length === 0) {
        fetchDeletedUsers()
      }
    }
  }, [showUserManagement, users.length, deletedUsers.length, fetchUsers, fetchDeletedUsers])


  // User Account Toggle Function
  const handleToggleUserAccount = async (targetUserId: string, currentStatus: boolean, userEmail: string) => {
    if (!userId || targetUserId === userId) {
      toast.warning('You cannot disable your own account.')
      return
    }

    const action = currentStatus ? 'disable' : 'enable'
    const newStatus = !currentStatus

    if (!confirm(`Are you sure you want to ${action} the account for "${userEmail}"?`)) {
      return
    }

    try {
      const { data, error } = await supabase
        .rpc('toggle_user_account', {
          target_user_id: targetUserId,
          enable_account: newStatus
        })

      if (error) throw error

      toast.success(data.message || `Account ${action}d successfully!`)

      await fetchUsers()
    } catch (error) {
      console.error('❌ Error toggling user account:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to ${action} account: ${errorMessage}`)
    }
  }

  return (
    <>
      <Card padding="none">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Surface tone="purple" padded="sm" elevated={false} className="rounded-lg">
                <Users size={24} className="text-purple-600" />
              </Surface>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">User Management</h2>
                  <Badge tone="purple" className="inline-flex items-center gap-1">
                    <Shield size={12} />
                    Admin Only
                  </Badge>
                </div>
                <p className="text-sm text-text-tertiary">Manage user accounts and roles</p>
              </div>
            </div>
          </div>
        </div>

        {showUserManagement && (
          <div className="px-6 pb-6 border-t border-border pt-6">
            {/* Legend and Role Descriptions */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {/* Role Descriptions */}
              <Surface padded="sm" elevated={false} className="bg-surface-elevated dark:bg-surface">
                <p className="font-semibold text-foreground mb-2">Role Descriptions</p>
                <ul className="space-y-1 text-text-secondary">
                  <li className="flex items-start gap-2">
                    <Badge tone="neutral" className="mt-0.5">User</Badge>
                    <span>Standard access to their own beekeeping data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge tone="blue" className="mt-0.5">Power</Badge>
                    <span>Enhanced access with additional features and data management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge tone="purple" className="mt-0.5 inline-flex items-center gap-0.5">
                      <Shield size={10} />Admin
                    </Badge>
                    <span>Full access including user management and settings</span>
                  </li>
                </ul>
              </Surface>

              {/* Status Legend */}
              <Surface padded="sm" elevated={false} className="bg-surface-elevated dark:bg-surface">
                <p className="font-semibold text-foreground mb-2">Status Symbols</p>
                <div className="space-y-2 text-text-secondary">
                  <div>
                    <p className="font-medium text-sm text-text-tertiary mb-1">Account Status:</p>
                    <div className="flex items-center gap-3 ml-2">
                      <span className="flex items-center gap-1">
                        <Badge tone="green">●</Badge>
                        Active
                      </span>
                      <span className="flex items-center gap-1">
                        <Badge tone="red">○</Badge>
                        Disabled
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-sm text-text-tertiary mb-1">Subscription Status:</p>
                    <div className="grid grid-cols-2 gap-1 ml-2 text-xs">
                      <span className="flex items-center gap-1">
                        <Badge tone="green">✓</Badge>
                        Active
                      </span>
                      <span className="flex items-center gap-1">
                        <Badge tone="amber">7d</Badge>
                        Expiring soon
                      </span>
                      <span className="flex items-center gap-1">
                        <Badge tone="amber">3d!</Badge>
                        Expiring very soon
                      </span>
                      <span className="flex items-center gap-1">
                        <Badge tone="red">✗</Badge>
                        Expired
                      </span>
                      <span className="flex items-center gap-1">
                        <Badge tone="neutral">−</Badge>
                        No subscription
                      </span>
                    </div>
                  </div>
                </div>
              </Surface>
            </div>

            <p className="text-sm text-text-tertiary mb-4">
              View and manage all user accounts. Change user roles between User, Power User, and Admin.
            </p>

            {/* Tabs for Active/Deleted Users/Reactivation Requests/Subscription History */}
            <div className="mb-4 flex gap-2 border-b border-border">
              <NavTabButton
                onClick={() => {
                  setShowDeletedUsers(false)
                  setShowReactivationRequests(false)
                  setShowSubscriptionHistory(false)
                  fetchUsers()
                }}
                tone="purple"
                active={!showDeletedUsers && !showReactivationRequests && !showSubscriptionHistory}
              >
                Active Users ({users.length})
              </NavTabButton>
              <NavTabButton
                onClick={() => {
                  setShowDeletedUsers(true)
                  setShowReactivationRequests(false)
                  setShowSubscriptionHistory(false)
                  fetchDeletedUsers()
                }}
                tone="purple"
                active={showDeletedUsers && !showReactivationRequests && !showSubscriptionHistory}
              >
                Deleted Users ({deletedUsers.length})
              </NavTabButton>
              <NavTabButton
                onClick={() => {
                  setShowDeletedUsers(false)
                  setShowReactivationRequests(true)
                  setShowSubscriptionHistory(false)
                  fetchReactivationRequests()
                }}
                tone="purple"
                active={showReactivationRequests && !showSubscriptionHistory}
              >
                Reactivation Requests{reactivationRequestsFetched ? ` (${reactivationRequests.filter(r => r.status === 'pending').length})` : ''}
              </NavTabButton>
              <NavTabButton
                onClick={async () => {
                  if (!subscriptionHistoryFetched) {
                    await fetchSubscriptionHistory()
                  }
                  router.push('/dashboard/settings/subscription-history')
                }}
                tone="purple"
              >
                Subscription History{subscriptionHistoryFetched ? ` (${subscriptionHistory.length})` : ''}
              </NavTabButton>
            </div>

            {/* Search and Filters - Only show for Active/Deleted Users tabs */}
            {!showReactivationRequests && !showSubscriptionHistory && (
            <>
            <div className="mb-4 space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" size={17} />
                <TextInput
                  type="text"
                  placeholder="Search users by email or ID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  tone="purple"
                  className="!pl-11 pr-4"
                />
              </div>

              {/* Filter Row */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Role Filter */}
                <SelectField
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as 'all' | 'User' | 'Power User' | 'Admin')}
                  tone="purple"
                  className="fj-control-inline text-sm"
                >
                  <option value="all">All Roles</option>
                  <option value="User">Users</option>
                  <option value="Power User">Power Users</option>
                  <option value="Admin">Admins</option>
                </SelectField>

                {/* Account Status Filter */}
                <SelectField
                  value={accountStatusFilter}
                  onChange={(e) => setAccountStatusFilter(e.target.value as 'all' | 'active' | 'disabled')}
                  tone="purple"
                  className="fj-control-inline text-sm"
                >
                  <option value="all">All Accounts</option>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </SelectField>

                {/* Subscription Filter */}
                <SelectField
                  value={subscriptionFilter}
                  onChange={(e) => setSubscriptionFilter(e.target.value as 'all' | 'active' | 'expiring' | 'expired' | 'none')}
                  tone="purple"
                  className="fj-control-inline text-sm"
                >
                  <option value="all">All Subscriptions</option>
                  <option value="active">Active</option>
                  <option value="expiring">Expiring Soon</option>
                  <option value="expired">Expired</option>
                  <option value="none">No Subscription</option>
                </SelectField>

                {/* Last Active Sort */}
                <SelectField
                  value={lastActiveSort}
                  onChange={(e) => setLastActiveSort(e.target.value as 'default' | 'recent_first' | 'oldest_first' | 'never_first')}
                  tone="purple"
                  className="fj-control-inline text-sm"
                  aria-label="Sort by last activity"
                >
                  <option value="default">Sort: Default</option>
                  <option value="recent_first">Last active: newest first</option>
                  <option value="oldest_first">Last active: oldest first</option>
                  <option value="never_first">Never active first</option>
                </SelectField>

                {/* Refresh Button */}
                <Button
                  onClick={() => showDeletedUsers ? fetchDeletedUsers() : fetchUsers()}
                  disabled={loadingUsers}
                  tone="neutral"
                  className="ml-auto disabled:opacity-50"
                >
                  {loadingUsers ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
            </div>

            {/* Users List - Compact Single Line Layout */}
            {loadingUsers ? (
              <div className="text-center py-8">
                <LoadingSpinner text={showDeletedUsers ? "Loading deleted users..." : "Loading users..."} />
              </div>
            ) : (!showDeletedUsers && users.length === 0) ? (
              <div className="text-center py-8 text-text-tertiary">
                No users found. Click &quot;Refresh&quot; to load.
              </div>
            ) : (showDeletedUsers && deletedUsers.length === 0) ? (
              <div className="text-center py-8 text-text-tertiary">
                No deleted users found.
              </div>
            ) : (() => {
              // Apply all filters to the appropriate user list
              const sourceUsers = showDeletedUsers ? deletedUsers : users
              const filteredUsersUnsorted = sourceUsers
                .filter(user => {
                  // Search filter
                  if (userSearch) {
                    const searchLower = userSearch.toLowerCase()
                    const matchesSearch =
                      user.email?.toLowerCase().includes(searchLower) ||
                      user.id.toLowerCase().includes(searchLower)
                    if (!matchesSearch) return false
                  }

                  // Role filter (only for active users)
                  if (!showDeletedUsers && roleFilter !== 'all' && user.role !== roleFilter) {
                    return false
                  }

                  // Account status filter (only for active users)
                  if (!showDeletedUsers && accountStatusFilter !== 'all') {
                    const isActive = user.is_active !== false
                    if (accountStatusFilter === 'active' && !isActive) return false
                    if (accountStatusFilter === 'disabled' && isActive) return false
                  }

                  // Subscription filter (only for active users)
                  if (!showDeletedUsers && subscriptionFilter !== 'all') {
                    const subStatus = user.subscription_status
                    if (subscriptionFilter === 'active' && subStatus !== 'active') return false
                    if (subscriptionFilter === 'expiring' &&
                        subStatus !== 'expiring_soon' &&
                        subStatus !== 'expiring_very_soon') return false
                    if (subscriptionFilter === 'expired' && subStatus !== 'expired') return false
                    if (subscriptionFilter === 'none' && subStatus !== 'no_subscription') return false
                  }

                  return true
                })
              const filteredUsers = lastActiveSort === 'default'
                ? filteredUsersUnsorted
                : [...filteredUsersUnsorted].sort((a, b) => {
                    const aTime = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : null
                    const bTime = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : null
                    if (lastActiveSort === 'never_first') {
                      if (aTime === null && bTime === null) return 0
                      if (aTime === null) return -1
                      if (bTime === null) return 1
                      return bTime - aTime
                    }
                    if (lastActiveSort === 'recent_first') {
                      if (aTime === null && bTime === null) return 0
                      if (aTime === null) return 1
                      if (bTime === null) return -1
                      return bTime - aTime
                    }
                    // oldest_first
                    if (aTime === null && bTime === null) return 0
                    if (aTime === null) return 1
                    if (bTime === null) return -1
                    return aTime - bTime
                  })
              const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE))
              const safeCurrentUsersPage = Math.min(currentUsersPage, totalPages)

              return (
                <>
                  {/* Results Count */}
                  <div className="mb-3 text-sm text-text-tertiary">
                    {filteredUsers.length > 0 ? (
                      <>
                        Showing {Math.min((safeCurrentUsersPage - 1) * USERS_PER_PAGE + 1, filteredUsers.length)}-{Math.min(safeCurrentUsersPage * USERS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} {showDeletedUsers ? 'deleted ' : ''}users
                      </>
                    ) : (
                      <>
                        Showing 0 of {sourceUsers.length} {showDeletedUsers ? 'deleted ' : ''}users
                      </>
                    )}
                    {filteredUsers.length !== sourceUsers.length && (
                      <> (filtered from {sourceUsers.length})</>
                    )}
                  </div>

                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-text-tertiary">
                      No users match your current search and filters.
                    </div>
                  ) : (
                  <>
                  <div className="space-y-2">
                    {filteredUsers
                      .slice((safeCurrentUsersPage - 1) * USERS_PER_PAGE, safeCurrentUsersPage * USERS_PER_PAGE)
                      .map((user) => {
                      const isExpanded = expandedUserId === user.id

                      return (
                      <Card key={user.id} padding="none" className="hover:border-border transition-all">
                        {/* Compact Single Line */}
                        <div className="px-3 py-2">
                          <div className="flex items-center gap-4 flex-wrap">
                            {/* Expand Button */}
                            <IconButton
                              onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                              size="sm"
                              className="flex-shrink-0 text-text-tertiary hover:text-text-tertiary hover:bg-surface-elevated dark:hover:bg-surface-elevated"
                              title={isExpanded ? 'Hide details' : 'Show details'}
                            >
                              <ChevronDown
                                size={16}
                                className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </IconButton>

                            {/* Email and Stats */}
                            <div className="min-w-0 flex items-center gap-2 flex-1 max-w-md">
                              <span className="text-sm font-medium text-foreground truncate">{user.email || 'No email'}</span>
                              {user.id === userId && (
                                <Badge tone="blue" className="flex-shrink-0">
                                  You
                                </Badge>
                              )}
                              {/* Apiary & Hive Counts */}
                              <div className="flex items-center gap-2 text-xs text-text-tertiary flex-shrink-0">
                                <span title="Apiaries" className="flex items-center gap-0.5">
                                  <Building2 size={12} />
                                  {user.apiaries_count ?? 0}
                                </span>
                                <span title="Hives" className="flex items-center gap-0.5">
                                  <Hexagon size={12} />
                                  {user.hives_count ?? 0}
                                </span>
                              </div>
                            </div>

                            {/* Status Badges */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {/* Role Badge */}
                              <Badge
                                tone={user.role === 'Admin' ? 'purple' : user.role === 'Power User' ? 'blue' : 'neutral'}
                                className="inline-flex items-center gap-1"
                              >
                                {user.role === 'Admin' && <Shield size={10} />}
                                {user.role === 'Power User' ? 'Power' : user.role}
                              </Badge>

                              {/* Account Status */}
                              <Badge tone={user.is_active !== false ? 'green' : 'red'}>
                                {user.is_active !== false ? '●' : '○'}
                              </Badge>

                              {/* Subscription Status */}
                              {user.subscription_status && (
                                <Badge tone={
                                  user.subscription_status === 'active'
                                    ? 'green'
                                    : user.subscription_status === 'expired'
                                    ? 'red'
                                    : user.subscription_status === 'expiring_soon' || user.subscription_status === 'expiring_very_soon'
                                    ? 'amber'
                                    : 'neutral'
                                }>
                                  {user.subscription_status === 'active' ? '✓' :
                                   user.subscription_status === 'expiring_soon' ? `${user.days_remaining}d` :
                                   user.subscription_status === 'expiring_very_soon' ? `${user.days_remaining}d!` :
                                   user.subscription_status === 'expired' ? '✗' : '−'}
                                </Badge>
                              )}

                              {/* Last Active */}
                              <span
                                className="text-xs text-text-tertiary min-w-[50px] text-right"
                                title={user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never signed in'}
                              >
                                {formatLastActive(user.last_sign_in_at)}
                              </span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {user.id === userId ? (
                                <span className="text-text-tertiary text-xs italic px-2">Your account</span>
                              ) : (
                                <>
                                  {/* Role Selector */}
                                  <SelectField
                                    value={user.role}
                                    onChange={(e) => handleRoleChange(user.id, e.target.value as 'User' | 'Power User' | 'Admin')}
                                    tone="purple"
                                    className="fj-control-inline px-2 py-0.5 rounded text-xs"
                                  >
                                    <option value="User">User</option>
                                    <option value="Power User">Power User</option>
                                    <option value="Admin">Admin</option>
                                  </SelectField>

                                  {/* Impersonate Button - Only for non-Admin users */}
                                  {user.role !== 'Admin' && !showDeletedUsers && (
                                    <Button
                                      onClick={() => handleImpersonateUser(user.id, user.email || 'Unknown')}
                                      disabled={impersonatingUserId === user.id}
                                      tone="purple"
                                      size="xs"
                                      className="disabled:opacity-50"
                                      title="Impersonate this user"
                                    >
                                      {impersonatingUserId === user.id ? '...' : 'Imp'}
                                    </Button>
                                  )}

                                  {showDeletedUsers ? (
                                    <>
                                      {/* Restore Button for Deleted Users */}
                                      <Button
                                        onClick={() => handleRestoreUser(user.id, user.email || 'Unknown')}
                                        disabled={restoringUserId === user.id}
                                        tone="success"
                                        size="xs"
                                        className="disabled:opacity-50"
                                        title="Restore user account"
                                      >
                                        {restoringUserId === user.id ? 'Restoring...' : 'Restore'}
                                      </Button>

                                      {/* Hard Delete Button for Deleted Users */}
                                      <IconButton
                                        onClick={() => handleHardDeleteUser(user.id, user.email || 'Unknown')}
                                        tone="danger"
                                        size="xs"
                                        title="Permanently Delete (CANNOT BE UNDONE)"
                                      >
                                        <Trash2 size={12} className="text-red-500" />
                                      </IconButton>
                                    </>
                                  ) : (
                                    <>
                                      {/* Enable/Disable Button */}
                                      <Button
                                        onClick={() => handleToggleUserAccount(user.id, user.is_active !== false, user.email || 'Unknown')}
                                        tone={user.is_active !== false ? 'amber' : 'success'}
                                        size="xs"
                                        title={user.is_active !== false ? 'Disable' : 'Enable'}
                                      >
                                        {user.is_active !== false ? 'Off' : 'On'}
                                      </Button>

                                      {/* Soft Delete Button */}
                                      <Button
                                        onClick={() => handleDeleteUser(user.id, user.email || 'Unknown')}
                                        tone="danger"
                                        size="xs"
                                        title="Soft Delete (Recoverable)"
                                      >
                                        <Trash2 size={12} />
                                      </Button>

                                      {/* Hard Delete Button */}
                                      <IconButton
                                        onClick={() => handleHardDeleteUser(user.id, user.email || 'Unknown')}
                                        tone="danger"
                                        size="xs"
                                        title="Hard Delete (PERMANENT)"
                                      >
                                        <Trash2 size={12} className="text-red-500" />
                                      </IconButton>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              {/* User ID */}
                              <div>
                                <span className="text-text-tertiary block mb-1">User ID</span>
                                <p className="font-mono text-text-secondary truncate" title={user.id}>
                                  {user.id.substring(0, 12)}...
                                </p>
                              </div>

                              {/* Joined Date */}
                              <div>
                                <span className="text-text-tertiary block mb-1">Joined</span>
                                <p className="text-foreground">
                                  {new Date(user.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>

                              {/* Subscription Code */}
                              <div>
                                <span className="text-text-tertiary block mb-1">Sub Code</span>
                                {user.registration_code ? (
                                  <div>
                                    <p className="font-mono font-semibold text-indigo-600">{user.registration_code}</p>
                                    {user.code_description && (
                                      <p className="text-text-tertiary italic truncate" title={user.code_description}>
                                        {user.code_description}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-text-tertiary italic">None</p>
                                )}
                              </div>

                              {/* Transaction ID (for credit card payments) */}
                              {user.subscription_type === 'credit_card' && (
                                <div>
                                  <span className="text-text-tertiary block mb-1">Transaction ID</span>
                                  {user.latest_transaction_id ? (
                                    <div>
                                      <p className="font-mono text-sm text-blue-600 break-all" title={user.latest_transaction_id}>
                                        {user.latest_transaction_id}
                                      </p>
                                      <TextLink
                                        href={`https://dashboard.stripe.com/payments/${user.latest_transaction_id}`}
                                        external
                                        tone="info"
                                        className="text-xs mt-1 inline-block"
                                      >
                                        View in Stripe →
                                      </TextLink>
                                    </div>
                                  ) : (
                                    <p className="text-text-tertiary italic text-sm">No transaction</p>
                                  )}
                                </div>
                              )}

                              {/* Subscription Expires */}
                              <div>
                                <span className="text-text-tertiary block mb-1">Expires</span>
                                <div className="flex flex-col gap-1">
                                  <TextInput
                                    type="date"
                                    value={user.subscription_expires_at ? new Date(user.subscription_expires_at).toISOString().split('T')[0] : ''}
                                    onChange={(e) => handleExpiryDateChange(user.id, e.target.value)}
                                    tone="purple"
                                    className="fj-control-inline px-2 py-1 rounded text-xs"
                                  />
                                  {user.days_remaining !== undefined && user.subscription_expires_at && (
                                    <p className={`text-xs font-medium ${
                                      user.days_remaining > 30
                                        ? 'text-green-600'
                                        : user.days_remaining > 7
                                        ? 'text-yellow-600'
                                        : user.days_remaining >= 0
                                        ? 'text-orange-600'
                                        : 'text-red-600'
                                    }`}>
                                      {user.days_remaining >= 0
                                        ? `${user.days_remaining}d left`
                                        : `${Math.abs(user.days_remaining)}d overdue`}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Apiaries Count */}
                              <div>
                                <span className="text-text-tertiary block mb-1">Apiaries</span>
                                <div className="flex items-center gap-2">
                                  <p className="text-foreground font-semibold text-lg">
                                    {user.apiaries_count !== undefined ? user.apiaries_count : '−'}
                                  </p>
                                  {user.apiaries_count !== undefined && user.apiaries_count > 0 && (
                                    <Button
                                      onClick={() => openApiaryTransferModal(user)}
                                      tone="purple"
                                      size="xs"
                                      className="gap-1"
                                    >
                                      <MapPin size={10} />
                                      Manage
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Hives Count */}
                              <div>
                                <span className="text-text-tertiary block mb-1">Hives</span>
                                <p className="text-foreground font-semibold text-lg">
                                  {user.hives_count !== undefined ? user.hives_count : '−'}
                                </p>
                              </div>

                              {/* Last Login */}
                              <div>
                                <span className="text-text-tertiary block mb-1">Last Login</span>
                                {user.last_sign_in_at ? (
                                  <div>
                                    <p className="text-foreground">
                                      {new Date(user.last_sign_in_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                    </p>
                                    <p className="text-sm text-text-tertiary">
                                      {new Date(user.last_sign_in_at).toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-text-tertiary italic">Never</p>
                                )}
                              </div>

                              {/* Deleted At (only show for deleted users) */}
                              {showDeletedUsers && user.deleted_at && (
                                <div className="col-span-2">
                                  <span className="text-text-tertiary block mb-1">Deleted On</span>
                                  <div className="flex items-center gap-2">
                                    <p className="text-red-600 font-medium">
                                      {new Date(user.deleted_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                    <span className="text-xs text-text-tertiary">
                                      ({Math.floor((Date.now() - new Date(user.deleted_at).getTime()) / (1000 * 60 * 60 * 24))} days ago)
                                    </span>
                                  </div>
                                  <p className="text-sm text-green-600 mt-1">
                                    ✓ All subscription history and data preserved
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                  </div>
                  {totalPages > 1 && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-text-tertiary">
                        Page {safeCurrentUsersPage} of {totalPages}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setCurrentUsersPage(page => Math.max(1, Math.min(page, totalPages) - 1))}
                          disabled={safeCurrentUsersPage === 1}
                          tone="neutral"
                          size="xs"
                          className="gap-1 disabled:opacity-50"
                        >
                          <ChevronLeft size={12} />
                          Previous
                        </Button>
                        <Button
                          onClick={() => setCurrentUsersPage(page => Math.min(totalPages, Math.min(page, totalPages) + 1))}
                          disabled={safeCurrentUsersPage >= totalPages}
                          tone="neutral"
                          size="xs"
                          className="gap-1 disabled:opacity-50"
                        >
                          Next
                          <ChevronRight size={12} />
                        </Button>
                      </div>
                    </div>
                  )}
                  </>
                  )}
                </>
              )
            })()}
            </>
            )}

            {/* Reactivation Requests Display */}
            {showReactivationRequests && (
              <div className="space-y-4 mt-4">
                {loadingRequests ? (
                  <div className="text-center py-8">
                    <LoadingSpinner text="Loading reactivation requests..." />
                  </div>
                ) : reactivationRequests.length === 0 ? (
                  <div className="text-center py-8 text-text-tertiary">
                    <p className="mb-2">No reactivation requests found.</p>
                    <p className="text-sm">Deleted users can request reactivation at /reactivate</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Filter tabs for pending/approved/rejected */}
                    <div className="flex gap-2 text-sm">
                      <Button
                        onClick={() => {/* Could add status filtering here */}}
                        tone="neutral"
                        size="xs"
                      >
                        All ({reactivationRequests.length})
                      </Button>
                      <Button
                        onClick={() => {/* Could add status filtering here */}}
                        tone="amber"
                        size="xs"
                      >
                        Pending ({reactivationRequests.filter(r => r.status === 'pending').length})
                      </Button>
                      <Button
                        onClick={() => {/* Could add status filtering here */}}
                        tone="success"
                        size="xs"
                      >
                        Approved ({reactivationRequests.filter(r => r.status === 'approved').length})
                      </Button>
                      <Button
                        onClick={() => {/* Could add status filtering here */}}
                        tone="danger"
                        size="xs"
                      >
                        Rejected ({reactivationRequests.filter(r => r.status === 'rejected').length})
                      </Button>
                    </div>

                    {/* Requests list */}
                    {reactivationRequests.map((request) => (
                      <div
                        key={request.id}
                        className={`bg-surface dark:bg-surface border-2 rounded-lg p-4 ${
                          request.status === 'pending' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20' :
                          request.status === 'approved' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20' :
                          'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-foreground text-lg">{request.original_email}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                                request.status === 'pending' ? 'bg-yellow-200 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200' :
                                request.status === 'approved' ? 'bg-green-200 text-green-900 dark:bg-green-900/40 dark:text-green-200' :
                                'bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-200'
                              }`}>
                                {request.status}
                              </span>
                            </div>
                            <div className="text-sm text-text-secondary space-y-1">
                              <p>
                                <span className="font-medium">Requested:</span>{' '}
                                {new Date(request.requested_at).toLocaleString('en-US', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short'
                                })}
                              </p>
                              {request.processed_at && (
                                <p>
                                  <span className="font-medium">Processed:</span>{' '}
                                  {new Date(request.processed_at).toLocaleString('en-US', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short'
                                  })}
                                </p>
                              )}
                              {request.admin_notes && (
                                <p className="mt-2 p-2 bg-surface dark:bg-surface rounded border border-border">
                                  <span className="font-medium">Admin Notes:</span> {request.admin_notes}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action buttons for pending requests */}
                          {request.status === 'pending' && (
                            <div className="flex gap-2 flex-shrink-0">
                              <Button
                                onClick={() => handleApproveReactivation(request.id, request.original_email)}
                                tone="success"
                                size="sm"
                                className="rounded-md"
                                title="Approve and restore account"
                              >
                                ✓ Approve
                              </Button>
                              <Button
                                onClick={() => handleRejectReactivation(request.id, request.original_email)}
                                tone="danger"
                                size="sm"
                                className="rounded-md"
                                title="Reject request"
                              >
                                ✗ Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
      {/* Admin Apiary Transfer Modal */}
      {showApiaryTransferModal && selectedUserForTransfer && (
        <ModalShell
          title={`Manage Apiaries - ${selectedUserForTransfer.first_name} ${selectedUserForTransfer.last_name}`}
          titleClassName="text-xl"
          maxWidthClassName="max-w-lg"
          onClose={() => {
            setShowApiaryTransferModal(false)
            setSelectedUserForTransfer(null)
          }}
          bodyClassName="p-6"
        >
          <p className="text-sm text-text-secondary mb-4">
            Transfer apiaries owned by this user to another user.
          </p>

          {loadingApiaries ? (
            <div className="flex items-center gap-2 text-text-tertiary py-4">
              <Loader2 size={16} className="animate-spin" />
              Loading apiaries...
            </div>
          ) : userApiaries.length === 0 ? (
            <p className="text-text-tertiary py-4">This user has no apiaries.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <FieldLabel className="mb-2">Select Apiary to Transfer</FieldLabel>
                <SelectField
                  value={selectedApiaryId}
                  onChange={(e) => setSelectedApiaryId(e.target.value)}
                >
                  <option value="">Select an apiary...</option>
                  {userApiaries.map((apiary) => (
                    <option key={apiary.id} value={apiary.id}>
                      {apiary.name} {apiary.city ? `(${apiary.city})` : ''} - {apiary.hives_count || 0} hives
                    </option>
                  ))}
                </SelectField>
              </div>

              <div>
                <FieldLabel className="mb-2">Transfer To</FieldLabel>
                <SelectField
                  value={selectedNewOwnerId}
                  onChange={(e) => setSelectedNewOwnerId(e.target.value)}
                  disabled={!selectedApiaryId}
                >
                  <option value="">Select new owner...</option>
                  {transferTargetUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name} (${user.email})`
                        : user.email}
                    </option>
                  ))}
                </SelectField>
              </div>

              <FormActionRow className="justify-end pt-4">
                <Button
                  onClick={() => {
                    setShowApiaryTransferModal(false)
                    setSelectedUserForTransfer(null)
                  }}
                  tone="neutral"
                >
                  Close
                </Button>
                <Button
                  onClick={handleAdminTransferApiary}
                  disabled={!selectedApiaryId || !selectedNewOwnerId || transferring}
                  tone="blue"
                  className="disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {transferring ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Transferring...
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      Transfer
                    </>
                  )}
                </Button>
              </FormActionRow>
            </div>
          )}
        </ModalShell>
      )}
    </>
  )
}
