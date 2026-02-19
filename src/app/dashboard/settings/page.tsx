'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId, isAdmin, isPowerUserOrAdmin, hasActiveSubscription } from '@/lib/auth'
import { Trash2, X, Shield, Users, Search, User, MessageCircle, Bug, List, ChevronDown, Building2, Hexagon, BookOpen, BookText, Ruler, Lightbulb, Newspaper, MapPin, UserPlus, Loader2 } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import KnowledgeBaseManager from '@/components/admin/KnowledgeBaseManager'
import ConservationAreaManager from '@/components/admin/ConservationAreaManager'
import NewsArticlesManager from '@/components/admin/NewsArticlesManager'
import ToolSuggestionsManager from '@/components/admin/ToolSuggestionsManager'
import TerminologyTable from '@/components/settings/TerminologyTable'
import FrameStandardsManager from '@/components/settings/FrameStandardsManager'
import ProfileExport from '@/components/settings/ProfileExport'
import TicketManagement from '@/components/settings/TicketManagement'
import TreatmentManagement from '@/components/settings/TreatmentManagement'
import AssociationManagement from '@/components/settings/AssociationManagement'
import DropdownManagement from '@/components/settings/DropdownManagement'
import RegistrationCodeManagement from '@/components/settings/RegistrationCodeManagement'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import { setImpersonationData } from '@/components/ImpersonationBanner'

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

export default function SettingsPage() {
  const router = useRouter()
  const toast = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [userIsAdmin, setUserIsAdmin] = useState(false)
  const [userIsPowerUserOrAdmin, setUserIsPowerUserOrAdmin] = useState(false)
  const [userHasActiveSubscription, setUserHasActiveSubscription] = useState(false)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [activeSection, setActiveSection] = useState<'profile' | 'theme' | 'users' | 'tickets' | 'treatments' | 'associations' | 'dropdowns' | 'registration' | 'knowledge' | 'news' | 'terminology' | 'frame_standards' | 'tool_suggestions' | 'conservation_areas'>('profile')

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

  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)

      // Check if user has admin access
      const adminAccess = await isAdmin()
      setUserIsAdmin(adminAccess)

      // Check if user is power user or admin
      const powerUserAccess = await isPowerUserOrAdmin()
      setUserIsPowerUserOrAdmin(powerUserAccess)

      // Check if user has active subscription
      const hasSubscription = await hasActiveSubscription()
      setUserHasActiveSubscription(hasSubscription)

      if (!powerUserAccess) {
        setAccessDenied(true)
      }
      setLoading(false)
    }
    initUser()
  }, [router])

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
    if (targetUserId === userId) {
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
    if (targetUserId === userId) {
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
    if (targetUserId === userId) {
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
    if (targetUserId === userId) {
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

  // Auto-expand sections when tabs are clicked
  useEffect(() => {
    if (activeSection === 'users') {
      setShowUserManagement(true)
    }
  }, [activeSection])

  // User Account Toggle Function
  const handleToggleUserAccount = async (targetUserId: string, currentStatus: boolean, userEmail: string) => {
    if (targetUserId === userId) {
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

  if (loading) return <LoadingSpinner text="Loading settings..." />

  // Access denied screen for non-admin users
  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-background">
        <div className="max-w-md w-full bg-surface dark:bg-surface shadow-lg rounded-lg p-8 text-center border border-border">
          <div className="flex justify-center mb-4">
            <Shield size={64} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-text-tertiary mb-6">
            You need Power User or Admin privileges to access the Settings page.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-forest-600 dark:bg-emerald-600 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-emerald-700 font-medium"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const sections = [
    { id: 'profile' as const, label: 'Profile & Export', icon: User, adminOnly: false, powerUserAllowed: true },
    { id: 'users' as const, label: 'User Management', icon: Users, adminOnly: true, powerUserAllowed: false },
    { id: 'registration' as const, label: 'Subscription Codes', icon: Shield, adminOnly: true, powerUserAllowed: false },
    { id: 'tickets' as const, label: 'Support Tickets', icon: MessageCircle, adminOnly: true, powerUserAllowed: false },
    { id: 'treatments' as const, label: 'Varroa Treatments', icon: Bug, adminOnly: true, powerUserAllowed: false },
    { id: 'associations' as const, label: 'Beekeeping Associations', icon: Building2, adminOnly: true, powerUserAllowed: false },
    { id: 'dropdowns' as const, label: 'Dropdown Values', icon: List, adminOnly: true, powerUserAllowed: false },
    { id: 'knowledge' as const, label: 'AI Knowledge Base', icon: BookOpen, adminOnly: true, powerUserAllowed: false },
    { id: 'news' as const, label: 'News Articles', icon: Newspaper, adminOnly: true, powerUserAllowed: false },
    { id: 'tool_suggestions' as const, label: 'AI Tool Suggestions', icon: Lightbulb, adminOnly: true, powerUserAllowed: false },
    { id: 'terminology' as const, label: 'Terminology', icon: BookText, adminOnly: false, powerUserAllowed: true },
    { id: 'frame_standards' as const, label: 'Frame Standards', icon: Ruler, adminOnly: true, powerUserAllowed: false },
    { id: 'conservation_areas' as const, label: 'Conservation Areas', icon: MapPin, adminOnly: true, powerUserAllowed: true },
  ].filter(section => {
    if (!section.adminOnly) return true
    if (section.powerUserAllowed && userIsPowerUserOrAdmin) return true
    return userIsAdmin
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        {userIsAdmin && (
          <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-sm font-medium rounded-full flex items-center gap-1 border border-purple-300 dark:border-purple-700">
            <Shield size={14} />
            Admin
          </span>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow">
        <div className="border-b border-border">
          <nav className="flex flex-wrap -mb-px">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeSection === section.id
                      ? 'border-forest-600 dark:border-emerald-500 text-forest-600 dark:text-emerald-500'
                      : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border'
                  }`}
                >
                  <Icon size={16} />
                  {section.label}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Profile & Export Section */}
      {activeSection === 'profile' && userId && (
        <ProfileExport isAdmin={userIsAdmin} hasActiveSubscription={userHasActiveSubscription} />
      )}

      {/* Varroa Treatments Section */}
      {activeSection === 'treatments' && (
        <TreatmentManagement />
      )}

      {/* Beekeeping Associations Section */}
      {activeSection === 'associations' && (
        <AssociationManagement />
      )}

      {/* Support Ticket Management Section */}
      {activeSection === 'tickets' && userId && (
        <TicketManagement userId={userId} />
      )}

      {/* User Management Section */}
      {activeSection === 'users' && (
      <div className="bg-surface dark:bg-surface rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users size={24} className="text-purple-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">User Management</h2>
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs font-medium rounded-full flex items-center gap-1 border border-purple-300 dark:border-purple-700">
                    <Shield size={12} />
                    Admin Only
                  </span>
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
              <div className="bg-surface-elevated dark:bg-surface rounded-lg p-4 border border-border">
                <p className="font-semibold text-foreground mb-2">Role Descriptions</p>
                <ul className="space-y-1 text-text-secondary">
                  <li className="flex items-start gap-2">
                    <span className="px-2 py-0.5 bg-surface-elevated dark:bg-surface-elevated text-foreground dark:text-foreground rounded text-xs font-medium mt-0.5">User</span>
                    <span>Standard access to their own beekeeping data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium mt-0.5 border border-blue-300 dark:border-blue-700">Power</span>
                    <span>Enhanced access with additional features and data management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs font-medium mt-0.5 flex items-center gap-0.5 border border-purple-300 dark:border-purple-700">
                      <Shield size={10} />Admin
                    </span>
                    <span>Full access including user management and settings</span>
                  </li>
                </ul>
              </div>

              {/* Status Legend */}
              <div className="bg-surface-elevated dark:bg-surface rounded-lg p-4 border border-border">
                <p className="font-semibold text-foreground mb-2">Status Symbols</p>
                <div className="space-y-2 text-text-secondary">
                  <div>
                    <p className="font-medium text-xs text-text-tertiary mb-1">Account Status:</p>
                    <div className="flex items-center gap-3 ml-2">
                      <span className="flex items-center gap-1">
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs font-medium border border-green-300 dark:border-green-700">●</span>
                        Active
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded text-xs font-medium border border-red-300 dark:border-red-700">○</span>
                        Disabled
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-xs text-text-tertiary mb-1">Subscription Status:</p>
                    <div className="grid grid-cols-2 gap-1 ml-2 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded font-medium border border-green-300 dark:border-green-700">✓</span>
                        Active
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded font-medium border border-yellow-300 dark:border-yellow-700">7d</span>
                        Expiring soon
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded font-medium border border-orange-300 dark:border-orange-700">3d!</span>
                        Expiring very soon
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded font-medium border border-red-300 dark:border-red-700">✗</span>
                        Expired
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="px-2 py-0.5 bg-surface-elevated dark:bg-surface-elevated text-foreground dark:text-foreground rounded font-medium border border-border">−</span>
                        No subscription
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-sm text-text-tertiary mb-4">
              View and manage all user accounts. Change user roles between User, Power User, and Admin.
            </p>

            {/* Tabs for Active/Deleted Users/Reactivation Requests/Subscription History */}
            <div className="mb-4 flex gap-2 border-b border-border">
              <button
                onClick={() => {
                  setShowDeletedUsers(false)
                  setShowReactivationRequests(false)
                  setShowSubscriptionHistory(false)
                  fetchUsers()
                }}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  !showDeletedUsers && !showReactivationRequests && !showSubscriptionHistory
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary'
                }`}
              >
                Active Users ({users.length})
              </button>
              <button
                onClick={() => {
                  setShowDeletedUsers(true)
                  setShowReactivationRequests(false)
                  setShowSubscriptionHistory(false)
                  fetchDeletedUsers()
                }}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  showDeletedUsers && !showReactivationRequests && !showSubscriptionHistory
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary'
                }`}
              >
                Deleted Users ({deletedUsers.length})
              </button>
              <button
                onClick={() => {
                  setShowDeletedUsers(false)
                  setShowReactivationRequests(true)
                  setShowSubscriptionHistory(false)
                  fetchReactivationRequests()
                }}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  showReactivationRequests && !showSubscriptionHistory
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary'
                }`}
              >
                Reactivation Requests{reactivationRequestsFetched ? ` (${reactivationRequests.filter(r => r.status === 'pending').length})` : ''}
              </button>
              <button
                onClick={async () => {
                  if (!subscriptionHistoryFetched) {
                    await fetchSubscriptionHistory()
                  }
                  router.push('/dashboard/settings/subscription-history')
                }}
                className="px-4 py-2 font-medium text-sm border-b-2 border-transparent text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Subscription History{subscriptionHistoryFetched ? ` (${subscriptionHistory.length})` : ''}
              </button>
            </div>

            {/* Search and Filters - Only show for Active/Deleted Users tabs */}
            {!showReactivationRequests && !showSubscriptionHistory && (
            <>
            <div className="mb-4 space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary" size={20} />
                <input
                  type="text"
                  placeholder="Search users by email or ID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Filter Row */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as 'all' | 'User' | 'Power User' | 'Admin')}
                  className="px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Roles</option>
                  <option value="User">Users</option>
                  <option value="Power User">Power Users</option>
                  <option value="Admin">Admins</option>
                </select>

                {/* Account Status Filter */}
                <select
                  value={accountStatusFilter}
                  onChange={(e) => setAccountStatusFilter(e.target.value as 'all' | 'active' | 'disabled')}
                  className="px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Accounts</option>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>

                {/* Subscription Filter */}
                <select
                  value={subscriptionFilter}
                  onChange={(e) => setSubscriptionFilter(e.target.value as 'all' | 'active' | 'expiring' | 'expired' | 'none')}
                  className="px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Subscriptions</option>
                  <option value="active">Active</option>
                  <option value="expiring">Expiring Soon</option>
                  <option value="expired">Expired</option>
                  <option value="none">No Subscription</option>
                </select>

                {/* Refresh Button */}
                <button
                  onClick={() => showDeletedUsers ? fetchDeletedUsers() : fetchUsers()}
                  disabled={loadingUsers}
                  className="ml-auto px-4 py-2 bg-surface-elevated dark:bg-surface-elevated text-text-secondary rounded-lg hover:bg-surface dark:hover:bg-surface disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingUsers ? 'Loading...' : 'Refresh'}
                </button>
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
              const filteredUsers = sourceUsers
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

              return (
                <>
                  {/* Results Count */}
                  <div className="mb-3 text-sm text-text-tertiary">
                    Showing {filteredUsers.length} of {sourceUsers.length} {showDeletedUsers ? 'deleted ' : ''}users
                  </div>

                  <div className="space-y-2">
                    {filteredUsers.map((user) => {
                      const isExpanded = expandedUserId === user.id

                      return (
                      <div key={user.id} className="bg-surface dark:bg-surface border border-border rounded hover:border-border transition-all">
                        {/* Compact Single Line */}
                        <div className="px-3 py-2">
                          <div className="flex items-center gap-4 flex-wrap">
                            {/* Expand Button */}
                            <button
                              onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                              className="flex-shrink-0 p-1 text-text-tertiary hover:text-text-tertiary rounded hover:bg-surface-elevated dark:hover:bg-surface-elevated"
                              title={isExpanded ? 'Hide details' : 'Show details'}
                            >
                              <ChevronDown
                                size={16}
                                className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </button>

                            {/* Email and Stats */}
                            <div className="min-w-0 flex items-center gap-2 flex-1 max-w-md">
                              <span className="text-sm font-medium text-foreground truncate">{user.email || 'No email'}</span>
                              {user.id === userId && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded flex-shrink-0">
                                  You
                                </span>
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
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                user.role === 'Admin'
                                  ? 'bg-purple-100 text-purple-800'
                                  : user.role === 'Power User'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-surface-elevated dark:bg-surface-elevated text-foreground dark:text-foreground'
                              }`}>
                                {user.role === 'Admin' && <Shield size={10} className="inline mr-0.5" />}
                                {user.role === 'Power User' ? 'Power' : user.role}
                              </span>

                              {/* Account Status */}
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                user.is_active !== false
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {user.is_active !== false ? '●' : '○'}
                              </span>

                              {/* Subscription Status */}
                              {user.subscription_status && (
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  user.subscription_status === 'active'
                                    ? 'bg-green-100 text-green-800'
                                    : user.subscription_status === 'expiring_soon'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : user.subscription_status === 'expiring_very_soon'
                                    ? 'bg-orange-100 text-orange-800'
                                    : user.subscription_status === 'expired'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-surface-elevated dark:bg-surface-elevated text-foreground dark:text-foreground'
                                }`}>
                                  {user.subscription_status === 'active' ? '✓' :
                                   user.subscription_status === 'expiring_soon' ? `${user.days_remaining}d` :
                                   user.subscription_status === 'expiring_very_soon' ? `${user.days_remaining}d!` :
                                   user.subscription_status === 'expired' ? '✗' : '−'}
                                </span>
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
                                  <select
                                    value={user.role}
                                    onChange={(e) => handleRoleChange(user.id, e.target.value as 'User' | 'Power User' | 'Admin')}
                                    className="px-2 py-0.5 border border-border rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  >
                                    <option value="User">User</option>
                                    <option value="Power User">Power User</option>
                                    <option value="Admin">Admin</option>
                                  </select>

                                  {/* Impersonate Button - Only for non-Admin users */}
                                  {user.role !== 'Admin' && !showDeletedUsers && (
                                    <button
                                      onClick={() => handleImpersonateUser(user.id, user.email || 'Unknown')}
                                      disabled={impersonatingUserId === user.id}
                                      className="px-2 py-0.5 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs disabled:opacity-50"
                                      title="Impersonate this user"
                                    >
                                      {impersonatingUserId === user.id ? '...' : 'Imp'}
                                    </button>
                                  )}

                                  {showDeletedUsers ? (
                                    <>
                                      {/* Restore Button for Deleted Users */}
                                      <button
                                        onClick={() => handleRestoreUser(user.id, user.email || 'Unknown')}
                                        disabled={restoringUserId === user.id}
                                        className="px-2 py-0.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs disabled:opacity-50"
                                        title="Restore user account"
                                      >
                                        {restoringUserId === user.id ? 'Restoring...' : 'Restore'}
                                      </button>

                                      {/* Hard Delete Button for Deleted Users */}
                                      <button
                                        onClick={() => handleHardDeleteUser(user.id, user.email || 'Unknown')}
                                        className="p-0.5 bg-foreground dark:bg-foreground text-background dark:text-background rounded hover:bg-text-primary dark:hover:bg-text-primary"
                                        title="Permanently Delete (CANNOT BE UNDONE)"
                                      >
                                        <Trash2 size={12} className="text-red-500" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      {/* Enable/Disable Button */}
                                      <button
                                        onClick={() => handleToggleUserAccount(user.id, user.is_active !== false, user.email || 'Unknown')}
                                        className={`px-2 py-0.5 text-white rounded hover:opacity-90 text-xs ${
                                          user.is_active !== false ? 'bg-orange-600' : 'bg-green-600'
                                        }`}
                                        title={user.is_active !== false ? 'Disable' : 'Enable'}
                                      >
                                        {user.is_active !== false ? 'Off' : 'On'}
                                      </button>

                                      {/* Soft Delete Button */}
                                      <button
                                        onClick={() => handleDeleteUser(user.id, user.email || 'Unknown')}
                                        className="p-0.5 bg-red-600 text-white rounded hover:bg-red-700"
                                        title="Soft Delete (Recoverable)"
                                      >
                                        <Trash2 size={12} />
                                      </button>

                                      {/* Hard Delete Button */}
                                      <button
                                        onClick={() => handleHardDeleteUser(user.id, user.email || 'Unknown')}
                                        className="p-0.5 bg-foreground dark:bg-foreground text-background dark:text-background rounded hover:bg-text-primary dark:hover:bg-text-primary"
                                        title="Hard Delete (PERMANENT)"
                                      >
                                        <Trash2 size={12} className="text-red-500" />
                                      </button>
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
                                      <p className="font-mono text-xs text-blue-600 break-all" title={user.latest_transaction_id}>
                                        {user.latest_transaction_id}
                                      </p>
                                      <a
                                        href={`https://dashboard.stripe.com/payments/${user.latest_transaction_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-500 hover:text-blue-700 underline mt-1 inline-block"
                                      >
                                        View in Stripe →
                                      </a>
                                    </div>
                                  ) : (
                                    <p className="text-text-tertiary italic text-xs">No transaction</p>
                                  )}
                                </div>
                              )}

                              {/* Subscription Expires */}
                              <div>
                                <span className="text-text-tertiary block mb-1">Expires</span>
                                <div className="flex flex-col gap-1">
                                  <input
                                    type="date"
                                    value={user.subscription_expires_at ? new Date(user.subscription_expires_at).toISOString().split('T')[0] : ''}
                                    onChange={(e) => handleExpiryDateChange(user.id, e.target.value)}
                                    className="px-2 py-1 border border-border rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                                    <button
                                      onClick={() => openApiaryTransferModal(user)}
                                      className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 flex items-center gap-1"
                                    >
                                      <MapPin size={10} />
                                      Manage
                                    </button>
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
                                    <p className="text-xs text-text-tertiary">
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
                                  <p className="text-xs text-green-600 mt-1">
                                    ✓ All subscription history and data preserved
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  </div>
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
                      <button
                        onClick={() => {/* Could add status filtering here */}}
                        className="px-3 py-1 bg-surface-elevated dark:bg-surface-elevated text-text-secondary rounded"
                      >
                        All ({reactivationRequests.length})
                      </button>
                      <button
                        onClick={() => {/* Could add status filtering here */}}
                        className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded"
                      >
                        Pending ({reactivationRequests.filter(r => r.status === 'pending').length})
                      </button>
                      <button
                        onClick={() => {/* Could add status filtering here */}}
                        className="px-3 py-1 bg-green-100 text-green-800 rounded"
                      >
                        Approved ({reactivationRequests.filter(r => r.status === 'approved').length})
                      </button>
                      <button
                        onClick={() => {/* Could add status filtering here */}}
                        className="px-3 py-1 bg-red-100 text-red-800 rounded"
                      >
                        Rejected ({reactivationRequests.filter(r => r.status === 'rejected').length})
                      </button>
                    </div>

                    {/* Requests list */}
                    {reactivationRequests.map((request) => (
                      <div
                        key={request.id}
                        className={`bg-surface dark:bg-surface border-2 rounded-lg p-4 ${
                          request.status === 'pending' ? 'border-yellow-200 bg-yellow-50' :
                          request.status === 'approved' ? 'border-green-200 bg-green-50' :
                          'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-foreground text-lg">{request.original_email}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                                request.status === 'pending' ? 'bg-yellow-200 text-yellow-900' :
                                request.status === 'approved' ? 'bg-green-200 text-green-900' :
                                'bg-red-200 text-red-900'
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
                              <button
                                onClick={() => handleApproveReactivation(request.id, request.original_email)}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-sm transition-colors"
                                title="Approve and restore account"
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={() => handleRejectReactivation(request.id, request.original_email)}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium text-sm transition-colors"
                                title="Reject request"
                              >
                                ✗ Reject
                              </button>
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
      </div>
      )}

      {/* Subscription Codes Section */}
      {activeSection === 'registration' && userId && (
        <RegistrationCodeManagement userId={userId} />
      )}

      {/* Dropdown Values Section */}
      {activeSection === 'dropdowns' && (
        <DropdownManagement />
      )}

      {/* AI Knowledge Base Section */}
      {activeSection === 'knowledge' && (
        <div className="bg-surface dark:bg-surface rounded-lg shadow p-6">
          <KnowledgeBaseManager />
        </div>
      )}

      {/* News Articles Section */}
      {activeSection === 'news' && (
        <div className="bg-surface dark:bg-surface rounded-lg shadow p-6">
          <NewsArticlesManager />
        </div>
      )}

      {/* AI Tool Suggestions Section */}
      {activeSection === 'tool_suggestions' && (
        <div className="bg-surface dark:bg-surface rounded-lg shadow p-6">
          <ToolSuggestionsManager />
        </div>
      )}

      {/* Terminology Section */}
      {activeSection === 'terminology' && (
        <div className="bg-surface dark:bg-surface rounded-lg shadow p-6">
          <TerminologyTable />
        </div>
      )}

      {activeSection === 'frame_standards' && (
        <div className="bg-surface dark:bg-surface rounded-lg shadow p-6">
          <FrameStandardsManager />
        </div>
      )}

      {/* Admin Apiary Transfer Modal */}
      {showApiaryTransferModal && selectedUserForTransfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface dark:bg-surface-elevated rounded-lg shadow-xl max-w-lg w-full p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-foreground">
                Manage Apiaries - {selectedUserForTransfer.first_name} {selectedUserForTransfer.last_name}
              </h3>
              <button
                onClick={() => {
                  setShowApiaryTransferModal(false)
                  setSelectedUserForTransfer(null)
                }}
                className="text-text-tertiary hover:text-foreground"
              >
                <X size={24} />
              </button>
            </div>

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
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Select Apiary to Transfer
                  </label>
                  <select
                    value={selectedApiaryId}
                    onChange={(e) => setSelectedApiaryId(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500"
                  >
                    <option value="">Select an apiary...</option>
                    {userApiaries.map((apiary) => (
                      <option key={apiary.id} value={apiary.id}>
                        {apiary.name} {apiary.city ? `(${apiary.city})` : ''} - {apiary.hives_count || 0} hives
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Transfer To
                  </label>
                  <select
                    value={selectedNewOwnerId}
                    onChange={(e) => setSelectedNewOwnerId(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500"
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
                  </select>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    onClick={() => {
                      setShowApiaryTransferModal(false)
                      setSelectedUserForTransfer(null)
                    }}
                    className="px-4 py-2 bg-sage-200 dark:bg-slate-700 text-text-primary rounded-lg hover:bg-sage-300 dark:hover:bg-slate-600"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleAdminTransferApiary}
                    disabled={!selectedApiaryId || !selectedNewOwnerId || transferring}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conservation Areas Section */}
      {activeSection === 'conservation_areas' && (
        <div className="bg-surface dark:bg-surface rounded-lg shadow p-6">
          <ConservationAreaManager />
        </div>
      )}
    </div>
  )
}
