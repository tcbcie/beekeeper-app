'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId, isAdmin } from '@/lib/auth'
import { Plus, Edit2, Edit, Trash2, X, Save, Download, Shield, Users, Search, User, MessageCircle, Bug, List, ChevronDown, Building2, Check } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useRouter } from 'next/navigation'

interface DropdownCategory {
  id: string
  category_name: string
  category_key: string
  description: string
  created_at?: string
}

interface DropdownValue {
  id: string
  category_id: string
  value: string
  display_order: number
  is_active: boolean
  created_at?: string
}

interface CategoryWithValues extends DropdownCategory {
  dropdown_values: DropdownValue[]
}

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
  subscription_expires_at?: string | null
  subscription_status?: 'active' | 'expiring_soon' | 'expiring_very_soon' | 'expired' | 'no_subscription'
  days_remaining?: number
  deleted_at?: string | null
}

interface RegistrationCode {
  id: string
  code: string
  description: string | null
  created_by: string | null
  created_at: string
  is_active: boolean
  max_uses: number | null
  current_uses: number
  updated_at: string
  subscription_expires_at: string
  code_type: 'individual' | 'association'
  association_id: string | null
  association?: {
    name: string
    jurisdiction: string
    county_area: string | null
  }
}

interface SupportTicket {
  id: string
  user_id: string
  ticket_type: 'problem' | 'suggestion'
  subject: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  admin_notes: string | null
  resolved_by?: string | null
  resolved_at?: string | null
  created_at: string
  updated_at: string
  user_profiles?: {
    email: string
  } | null
  resolver?: {
    email: string
  } | null
}

interface VarroaTreatment {
  id: string
  product_name: string
  active_ingredients: string
  notes: string | null
  application_method: string
  treatment_duration: string
  temperature_range: string
  honey_flow_restrictions: string
  withdrawal_period_days: number
  created_at?: string
  updated_at?: string
}

interface Association {
  id: string
  name: string
  jurisdiction: string
  county_area: string
  created_at?: string
  updated_at?: string
}

interface TicketUpdate {
  status?: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  admin_notes?: string
  resolved_by?: string
  resolved_at?: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [userIsAdmin, setUserIsAdmin] = useState(false)
  const [categories, setCategories] = useState<CategoryWithValues[]>([])
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [activeSection, setActiveSection] = useState<'profile' | 'users' | 'tickets' | 'treatments' | 'associations' | 'dropdowns' | 'registration'>('profile')
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<DropdownCategory | null>(null)
  const [editingValue, setEditingValue] = useState<{ categoryId: string; value: DropdownValue | null }>({ categoryId: '', value: null })
  const [exporting, setExporting] = useState(false)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')

  // User Management state
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [deletedUsers, setDeletedUsers] = useState<UserProfile[]>([])
  const [showDeletedUsers, setShowDeletedUsers] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<'all' | 'User' | 'Power User' | 'Admin'>('all')
  const [accountStatusFilter, setAccountStatusFilter] = useState<'all' | 'active' | 'disabled'>('all')
  const [subscriptionFilter, setSubscriptionFilter] = useState<'all' | 'active' | 'expiring' | 'expired' | 'none'>('all')
  const [restoringUserId, setRestoringUserId] = useState<string | null>(null)

  // Support Tickets state
  const [showTicketManagement, setShowTicketManagement] = useState(false)
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null)
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('open')

  // Varroa Treatments state
  const [showVarroaTreatments, setShowVarroaTreatments] = useState(false)
  const [varroaTreatments, setVarroaTreatments] = useState<VarroaTreatment[]>([])
  const [loadingVarroaTreatments, setLoadingVarroaTreatments] = useState(false)
  const [editingVarroaTreatment, setEditingVarroaTreatment] = useState<VarroaTreatment | null>(null)
  const [showAddVarroaTreatment, setShowAddVarroaTreatment] = useState(false)

  // Associations state
  const [showAssociations, setShowAssociations] = useState(false)
  const [associations, setAssociations] = useState<Association[]>([])
  const [loadingAssociations, setLoadingAssociations] = useState(false)
  const [editingAssociation, setEditingAssociation] = useState<Association | null>(null)
  const [showAddAssociation, setShowAddAssociation] = useState(false)
  const [jurisdictionFilter, setJurisdictionFilter] = useState<'all' | 'NI' | 'ROI'>('all')
  const [countyFilter, setCountyFilter] = useState<string>('all')

  // Registration Codes state
  const [registrationCodes, setRegistrationCodes] = useState<RegistrationCode[]>([])
  const [loadingCodes, setLoadingCodes] = useState(false)
  const [showAddCodeModal, setShowAddCodeModal] = useState(false)
  const [editingCodeId, setEditingCodeId] = useState<string | null>(null)
  const [editingCodeData, setEditingCodeData] = useState<{
    subscription_expires_at: string
    max_uses: string
  }>({
    subscription_expires_at: '',
    max_uses: '',
  })
  const [newCodeData, setNewCodeData] = useState({
    code: '',
    description: '',
    max_uses: '',
    subscription_expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0], // Default: 1 year from now
    code_type: 'individual' as 'individual' | 'association',
    association_id: '',
  })

  const [categoryFormData, setCategoryFormData] = useState({
    category_name: '',
    category_key: '',
    description: '',
  })

  const [valueFormData, setValueFormData] = useState({
    value: '',
    display_order: 0,
  })

  const [varroaTreatmentFormData, setVarroaTreatmentFormData] = useState({
    product_name: '',
    active_ingredients: '',
    notes: '',
    application_method: '',
    treatment_duration: '',
    temperature_range: '',
    honey_flow_restrictions: '',
    withdrawal_period_days: 0,
  })

  const [associationFormData, setAssociationFormData] = useState({
    name: '',
    jurisdiction: '',
    county_area: '',
  })

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

      if (!adminAccess) {
        setAccessDenied(true)
        setLoading(false)
        return
      }

      fetchCategories()
    }
    initUser()
  }, [router])

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('dropdown_categories')
      .select(`
        *,
        dropdown_values (
          id,
          category_id,
          value,
          display_order,
          is_active,
          created_at
        )
      `)
      .order('category_name')

    if (!error && data) {
      // Sort values within each category by display_order
      const categoriesWithSortedValues = (data as CategoryWithValues[]).map((cat) => ({
        ...cat,
        dropdown_values: (cat.dropdown_values || []).sort((a: DropdownValue, b: DropdownValue) => a.display_order - b.display_order)
      }))
      setCategories(categoriesWithSortedValues)
    }
    setLoading(false)
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('dropdown_categories')
          .update(categoryFormData)
          .eq('id', editingCategory.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('dropdown_categories')
          .insert([categoryFormData])

        if (error) throw error
      }

      fetchCategories()
      resetCategoryForm()
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message)
      }
    }
  }

  const handleValueSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingValue.value) {
        const { error } = await supabase
          .from('dropdown_values')
          .update(valueFormData)
          .eq('id', editingValue.value.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('dropdown_values')
          .insert([{
            ...valueFormData,
            category_id: editingValue.categoryId,
            is_active: true,
          }])

        if (error) throw error
      }

      fetchCategories()
      resetValueForm()
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message)
      }
    }
  }

  const handleEditCategory = (category: DropdownCategory) => {
    setEditingCategory(category)
    setCategoryFormData({
      category_name: category.category_name,
      category_key: category.category_key,
      description: category.description,
    })
    setShowCategoryForm(true)
  }

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Are you sure you want to delete this category? This will also delete all associated values.')) {
      const { error } = await supabase
        .from('dropdown_categories')
        .delete()
        .eq('id', id)

      if (!error) fetchCategories()
    }
  }

  const handleEditValue = (categoryId: string, value: DropdownValue) => {
    setEditingValue({ categoryId, value })
    setValueFormData({
      value: value.value,
      display_order: value.display_order,
    })
  }

  const handleDeleteValue = async (id: string) => {
    if (confirm('Are you sure you want to delete this value?')) {
      const { error } = await supabase
        .from('dropdown_values')
        .delete()
        .eq('id', id)

      if (!error) fetchCategories()
    }
  }

  const handleToggleValueStatus = async (valueId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('dropdown_values')
      .update({ is_active: !currentStatus })
      .eq('id', valueId)

    if (!error) fetchCategories()
  }

  const resetCategoryForm = () => {
    setShowCategoryForm(false)
    setEditingCategory(null)
    setCategoryFormData({
      category_name: '',
      category_key: '',
      description: '',
    })
  }

  const resetValueForm = () => {
    setEditingValue({ categoryId: '', value: null })
    setValueFormData({
      value: '',
      display_order: 0,
    })
  }

  // User Management Functions
  const fetchUsers = async () => {
    console.log('👥 fetchUsers called')
    setLoadingUsers(true)
    try {
      // Call the function that joins user_profiles with auth.users to get emails
      // Uses RPC (Remote Procedure Call) to execute the database function
      const { data, error } = await supabase
        .rpc('get_users_with_email')

      console.log('📥 fetchUsers response:', { dataCount: data?.length, error })

      if (error) throw error

      if (data) {
        console.log('📊 Users data:', data.map((u: UserProfile) => ({
          email: u.email,
          role: u.role,
          is_active: u.is_active
        })))
        setUsers(data as UserProfile[])
        console.log('✅ Users state updated')
      }
    } catch (error) {
      console.error('❌ Error fetching users:', error)
      alert('Failed to fetch users. Make sure you have admin permissions.')
    } finally {
      setLoadingUsers(false)
    }
  }

  const fetchDeletedUsers = async () => {
    console.log('🗑️ fetchDeletedUsers called')
    setLoadingUsers(true)
    try {
      const { data, error } = await supabase
        .from('deleted_profiles')
        .select('*')
        .order('deleted_at', { ascending: false })

      console.log('📥 fetchDeletedUsers response:', { dataCount: data?.length, error })

      if (error) throw error

      if (data) {
        setDeletedUsers(data as UserProfile[])
        console.log('✅ Deleted users state updated')
      }
    } catch (error) {
      console.error('❌ Error fetching deleted users:', error)
      alert('Failed to fetch deleted users. Make sure you have admin permissions.')
    } finally {
      setLoadingUsers(false)
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
      alert('Invalid email format. Please enter a valid email address.')
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
        alert(`Failed to restore user: ${data.message}`)
        return
      }

      alert('User account restored successfully!')
      // Refresh both lists
      fetchDeletedUsers()
      fetchUsers()
    } catch (error) {
      console.error('Error restoring user:', error)
      alert('Failed to restore user account.')
    } finally {
      setRestoringUserId(null)
    }
  }

  const handleRoleChange = async (targetUserId: string, newRole: 'User' | 'Power User' | 'Admin') => {
    if (targetUserId === userId) {
      alert('You cannot change your own role.')
      return
    }

    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', targetUserId)

      if (error) throw error

      alert(`User role updated to ${newRole} successfully!`)
      fetchUsers() // Refresh the list
    } catch (error) {
      console.error('Error updating user role:', error)
      alert('Failed to update user role.')
    }
  }

  const handleExpiryDateChange = async (targetUserId: string, newExpiryDate: string) => {
    if (!newExpiryDate) {
      alert('Please enter a valid date.')
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

      alert('Subscription expiry date updated successfully!')
      fetchUsers() // Refresh the list
    } catch (error) {
      console.error('Error updating subscription expiry date:', error)
      alert('Failed to update subscription expiry date.')
    }
  }

  const handleDeleteUser = async (targetUserId: string, userEmail: string) => {
    if (targetUserId === userId) {
      alert('You cannot delete your own account.')
      return
    }

    if (!confirm(`⚠️ WARNING: Are you sure you want to delete the user "${userEmail}"?\n\n✅ SOFT DELETE - Preserves all data:\n- User will be marked as deleted\n- Account will be disabled (cannot login)\n- All subscription history PRESERVED\n- All beekeeping data PRESERVED\n- Account can be restored later\n\nThis is a SAFE deletion that preserves payment history.`)) {
      return
    }

    try {
      console.log('🗑️ Soft deleting user:', { targetUserId, userEmail })

      // Call soft_delete_user function
      const { data, error } = await supabase
        .rpc('soft_delete_user', {
          p_user_id: targetUserId
        })

      if (error) throw error

      if (data && !data.success) {
        alert(`Failed to delete user: ${data.message}`)
        return
      }

      alert(`✅ User "${userEmail}" has been soft deleted successfully!\n\n✅ Preserved:\n• All subscription history\n• All payment records\n• All beekeeping data (hives, inspections, etc.)\n• All team memberships\n\n🚫 Account Status:\n• User cannot log in\n• Marked as deleted\n• Can be restored by admin at any time\n\nThis is a SAFE deletion that preserves all data for compliance and recovery.`)

      // Refresh both user lists
      fetchUsers()
      fetchDeletedUsers()
    } catch (error) {
      console.error('❌ Error deleting user:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to delete user: ${errorMessage}`)
    }
  }

  // Fetch users when user management section is opened
  useEffect(() => {
    if (showUserManagement && users.length === 0) {
      fetchUsers()
    }
  }, [showUserManagement, users.length])

  const fetchTickets = useCallback(async () => {
    setLoadingTickets(true)
    try {
      // Fetch tickets without joins first
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false })

      if (ticketFilter !== 'all') {
        query = query.eq('status', ticketFilter)
      }

      const { data: ticketsData, error: ticketsError } = await query

      if (ticketsError) {
        // Check if it's a table not found error
        if (ticketsError.message?.includes('relation "support_tickets" does not exist') ||
            ticketsError.code === '42P01') {
          console.error('Support tickets table does not exist. Please run the migration.')
          alert('Support tickets table not found. Please run the SQL migration: sql/create_support_tickets.sql')
          setTickets([])
          return
        }
        console.error('Error details:', ticketsError)
        throw ticketsError
      }

      // Enrich tickets with user emails
      if (ticketsData && ticketsData.length > 0) {
        const enrichedTickets = await Promise.all(
          ticketsData.map(async (ticket) => {
            // Get user email from profiles table
            let userEmail = null
            const { data: authUser } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', ticket.user_id)
              .maybeSingle()

            if (authUser?.email) {
              userEmail = authUser.email
            }

            // Fetch resolver email if exists
            let resolverEmail = null
            if (ticket.resolved_by) {
              const { data: authResolver } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', ticket.resolved_by)
                .maybeSingle()

              if (authResolver?.email) {
                resolverEmail = authResolver.email
              }
            }

            return {
              ...ticket,
              user_profiles: userEmail ? { email: userEmail } : null,
              resolver: resolverEmail ? { email: resolverEmail } : null,
            }
          })
        )
        console.log('Fetched tickets with user data:', enrichedTickets)
        setTickets(enrichedTickets)
      } else {
        setTickets([])
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Full error details:', error)
      alert(`Failed to fetch tickets: ${errorMessage}\n\nCheck browser console for details.`)
      setTickets([])
    } finally {
      setLoadingTickets(false)
    }
  }, [ticketFilter])

  // Fetch tickets when ticket management section is opened
  useEffect(() => {
    if (showTicketManagement) {
      fetchTickets()
    }
  }, [showTicketManagement, fetchTickets])

  // Fetch Varroa Treatment Products
  const fetchVarroaTreatments = useCallback(async () => {
    setLoadingVarroaTreatments(true)
    try {
      const { data, error } = await supabase
        .from('varroa_treatment_products')
        .select('*')
        .order('product_name')

      if (error) {
        console.error('Error fetching varroa treatment products:', error)
        alert('Failed to fetch varroa treatment products.')
        return
      }

      setVarroaTreatments(data || [])
    } catch (error) {
      console.error('Error fetching varroa treatment products:', error)
      alert('Failed to fetch varroa treatment products.')
    } finally {
      setLoadingVarroaTreatments(false)
    }
  }, [])

  // Auto-expand sections when tabs are clicked
  useEffect(() => {
    if (activeSection === 'treatments') {
      setShowVarroaTreatments(true)
    } else if (activeSection === 'associations') {
      setShowAssociations(true)
    } else if (activeSection === 'tickets') {
      setShowTicketManagement(true)
    } else if (activeSection === 'users') {
      setShowUserManagement(true)
    }
  }, [activeSection])

  // Fetch varroa treatments when section is opened
  useEffect(() => {
    if (showVarroaTreatments) {
      fetchVarroaTreatments()
    }
  }, [showVarroaTreatments, fetchVarroaTreatments])

  // Fetch Associations
  const fetchAssociations = useCallback(async () => {
    setLoadingAssociations(true)
    try {
      const { data, error } = await supabase
        .from('beekeeping_associations')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching associations:', error)
        alert('Failed to fetch beekeeping associations.')
        return
      }

      setAssociations(data || [])
    } catch (error) {
      console.error('Error fetching associations:', error)
      alert('Failed to fetch beekeeping associations.')
    } finally {
      setLoadingAssociations(false)
    }
  }, [])

  // Fetch associations when section is opened
  useEffect(() => {
    if (showAssociations) {
      fetchAssociations()
    }
  }, [showAssociations, fetchAssociations])

  // Fetch registration codes when section is opened
  useEffect(() => {
    if (activeSection === 'registration') {
      fetchRegistrationCodes()
    }
  }, [activeSection])

  const handleTicketUpdate = async (ticketId: string, updates: TicketUpdate) => {
    try {
      const updateData: TicketUpdate & { resolved_by?: string; resolved_at?: string } = { ...updates }

      // Set resolved_by and resolved_at if status is being set to resolved or closed
      if (updates.status === 'resolved' || updates.status === 'closed') {
        updateData.resolved_by = userId || undefined
        updateData.resolved_at = new Date().toISOString()
      }

      console.log('Updating ticket with data:', updateData)

      const { data, error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId)
        .select()

      if (error) {
        console.error('Update error:', error)
        throw error
      }

      console.log('Update successful:', data)
      alert('Ticket updated successfully!')
      fetchTickets()
      setEditingTicket(null)
    } catch (error) {
      console.error('Error updating ticket:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to update ticket: ${errorMessage}\n\nCheck browser console for details.`)
    }
  }

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', ticketId)

      if (error) throw error

      alert('Ticket deleted successfully!')
      fetchTickets()
    } catch (error) {
      console.error('Error deleting ticket:', error)
      alert('Failed to delete ticket.')
    }
  }

  // Varroa Treatment Product CRUD functions
  const handleVarroaTreatmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingVarroaTreatment) {
        // Update existing treatment product
        const { error } = await supabase
          .from('varroa_treatment_products')
          .update({
            ...varroaTreatmentFormData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingVarroaTreatment.id)

        if (error) throw error
        alert('Varroa treatment product updated successfully!')
      } else {
        // Create new treatment product
        const { error } = await supabase
          .from('varroa_treatment_products')
          .insert([varroaTreatmentFormData])

        if (error) throw error
        alert('Varroa treatment product added successfully!')
      }

      fetchVarroaTreatments()
      resetVarroaTreatmentForm()
    } catch (error) {
      console.error('Error saving varroa treatment product:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to save varroa treatment product: ${errorMessage}`)
    }
  }

  const handleEditVarroaTreatment = (treatment: VarroaTreatment) => {
    setEditingVarroaTreatment(treatment)
    setVarroaTreatmentFormData({
      product_name: treatment.product_name,
      active_ingredients: treatment.active_ingredients,
      notes: treatment.notes || '',
      application_method: treatment.application_method,
      treatment_duration: treatment.treatment_duration,
      temperature_range: treatment.temperature_range,
      honey_flow_restrictions: treatment.honey_flow_restrictions,
      withdrawal_period_days: treatment.withdrawal_period_days,
    })
    // Don't show the add form - we're doing inline editing in the table
  }

  const handleDeleteVarroaTreatment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this varroa treatment product? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('varroa_treatment_products')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('Varroa treatment product deleted successfully!')
      fetchVarroaTreatments()
    } catch (error) {
      console.error('Error deleting varroa treatment product:', error)
      alert('Failed to delete varroa treatment product.')
    }
  }

  const resetVarroaTreatmentForm = () => {
    setShowAddVarroaTreatment(false)
    setEditingVarroaTreatment(null)
    setVarroaTreatmentFormData({
      product_name: '',
      active_ingredients: '',
      notes: '',
      application_method: '',
      treatment_duration: '',
      temperature_range: '',
      honey_flow_restrictions: '',
      withdrawal_period_days: 0,
    })
  }

  // Association CRUD functions
  const handleAssociationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingAssociation) {
        // Update existing association
        const { error } = await supabase
          .from('beekeeping_associations')
          .update({
            ...associationFormData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingAssociation.id)

        if (error) throw error
        alert('Beekeeping association updated successfully!')
      } else {
        // Create new association
        const { error } = await supabase
          .from('beekeeping_associations')
          .insert([associationFormData])

        if (error) throw error
        alert('Beekeeping association added successfully!')
      }

      fetchAssociations()
      resetAssociationForm()
    } catch (error) {
      console.error('Error saving beekeeping association:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to save beekeeping association: ${errorMessage}`)
    }
  }

  const handleEditAssociation = (association: Association) => {
    setEditingAssociation(association)
    setAssociationFormData({
      name: association.name,
      jurisdiction: association.jurisdiction,
      county_area: association.county_area,
    })
    // Don't show the add form - we're doing inline editing in the table
  }

  const handleDeleteAssociation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this beekeeping association? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('beekeeping_associations')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('Beekeeping association deleted successfully!')
      fetchAssociations()
    } catch (error) {
      console.error('Error deleting beekeeping association:', error)
      alert('Failed to delete beekeeping association.')
    }
  }

  const resetAssociationForm = () => {
    setShowAddAssociation(false)
    setEditingAssociation(null)
    setAssociationFormData({
      name: '',
      jurisdiction: '',
      county_area: '',
    })
  }

  // Registration Codes Functions
  const fetchRegistrationCodes = async () => {
    setLoadingCodes(true)
    try {
      const { data, error } = await supabase
        .from('registration_codes')
        .select(`
          *,
          beekeeping_associations!registration_codes_association_id_fkey(name, jurisdiction, county_area)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform the data to match our interface
      const transformedData = (data || []).map((code) => ({
        ...code,
        association: code.beekeeping_associations || null
      })) as RegistrationCode[]

      setRegistrationCodes(transformedData)
    } catch (error) {
      console.error('Error fetching registration codes:', error)
      alert('Failed to fetch registration codes.')
    } finally {
      setLoadingCodes(false)
    }
  }

  const fetchAssociationsForCodes = async () => {
    setLoadingAssociations(true)
    try {
      const { data, error } = await supabase
        .from('beekeeping_associations')
        .select('id, name, jurisdiction, county_area')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setAssociations(data || [])
    } catch (error) {
      console.error('Error fetching associations:', error)
    } finally {
      setLoadingAssociations(false)
    }
  }

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newCodeData.code.trim()) {
      alert('Code is required')
      return
    }

    // Validate association code has association selected
    if (newCodeData.code_type === 'association' && !newCodeData.association_id) {
      alert('Please select an association for association codes')
      return
    }

    try {
      // Convert date to end of day (23:59:59)
      const subscriptionExpiryDate = new Date(newCodeData.subscription_expires_at)
      subscriptionExpiryDate.setHours(23, 59, 59, 999)

      const { error } = await supabase
        .from('registration_codes')
        .insert([{
          code: newCodeData.code.toUpperCase().trim(),
          description: newCodeData.description.trim() || null,
          max_uses: newCodeData.max_uses ? parseInt(newCodeData.max_uses) : null,
          subscription_expires_at: subscriptionExpiryDate.toISOString(),
          code_type: newCodeData.code_type,
          association_id: newCodeData.code_type === 'association' ? newCodeData.association_id : null,
          created_by: userId
        }])

      if (error) throw error

      alert('Subscription code created successfully!')
      setShowAddCodeModal(false)
      setNewCodeData({
        code: '',
        description: '',
        max_uses: '',
        subscription_expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        code_type: 'individual' as 'individual' | 'association',
        association_id: '',
      })
      fetchRegistrationCodes()
    } catch (error) {
      console.error('Error creating registration code:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Check if it's a duplicate code error
      if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
        alert(`This code already exists. Please choose a different code.`)
      } else {
        alert(`Failed to create code: ${errorMessage}`)
      }
    }
  }

  const handleToggleCodeActive = async (codeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('registration_codes')
        .update({ is_active: !currentStatus })
        .eq('id', codeId)

      if (error) throw error

      alert(`Code ${!currentStatus ? 'activated' : 'deactivated'} successfully!`)
      fetchRegistrationCodes()
    } catch (error) {
      console.error('Error toggling code status:', error)
      alert('Failed to update code status.')
    }
  }

  const handleEditCode = (code: RegistrationCode) => {
    setEditingCodeId(code.id)
    setEditingCodeData({
      subscription_expires_at: new Date(code.subscription_expires_at).toISOString().split('T')[0],
      max_uses: code.max_uses?.toString() || '',
    })
  }

  const handleSaveCodeEdit = async (codeId: string) => {
    try {
      // Convert date to end of day (23:59:59)
      const subscriptionExpiryDate = new Date(editingCodeData.subscription_expires_at)
      subscriptionExpiryDate.setHours(23, 59, 59, 999)

      const { error } = await supabase
        .from('registration_codes')
        .update({
          subscription_expires_at: subscriptionExpiryDate.toISOString(),
          max_uses: editingCodeData.max_uses ? parseInt(editingCodeData.max_uses) : null,
        })
        .eq('id', codeId)

      if (error) throw error

      alert('Code updated successfully!')
      setEditingCodeId(null)
      fetchRegistrationCodes()
    } catch (error) {
      console.error('Error updating code:', error)
      alert('Failed to update code.')
    }
  }

  const handleCancelCodeEdit = () => {
    setEditingCodeId(null)
    setEditingCodeData({
      subscription_expires_at: '',
      max_uses: '',
    })
  }

  const handleDeleteCode = async (codeId: string, code: string) => {
    if (!confirm(`Are you sure you want to delete the code "${code}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('registration_codes')
        .delete()
        .eq('id', codeId)

      if (error) throw error

      alert('Code deleted successfully!')
      fetchRegistrationCodes()
    } catch (error) {
      console.error('Error deleting code:', error)
      alert('Failed to delete code.')
    }
  }

  // User Account Toggle Function
  const handleToggleUserAccount = async (targetUserId: string, currentStatus: boolean, userEmail: string) => {
    console.log('🔄 handleToggleUserAccount called:', { targetUserId, currentStatus, userEmail })

    if (targetUserId === userId) {
      alert('You cannot disable your own account.')
      return
    }

    const action = currentStatus ? 'disable' : 'enable'
    const newStatus = !currentStatus
    console.log(`📋 Action: ${action}, New status: ${newStatus}`)

    if (!confirm(`Are you sure you want to ${action} the account for "${userEmail}"?`)) {
      console.log('❌ User cancelled')
      return
    }

    try {
      console.log('🚀 Calling toggle_user_account RPC...')
      const { data, error } = await supabase
        .rpc('toggle_user_account', {
          target_user_id: targetUserId,
          enable_account: newStatus
        })

      console.log('📥 RPC Response:', { data, error })

      if (error) throw error

      console.log('✅ Toggle successful, showing alert...')
      alert(data.message || `Account ${action}d successfully!`)

      console.log('🔄 Calling fetchUsers to refresh...')
      await fetchUsers()
      console.log('✅ Users refreshed')
    } catch (error) {
      console.error('❌ Error toggling user account:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to ${action} account: ${errorMessage}`)
    }
  }

  const exportDatabase = async () => {
    setExporting(true)
    try {
      // If user is admin, use admin API to export ALL users' data
      if (userIsAdmin) {
        console.log('Admin export: fetching all users data via API...')

        // Get the current session to get auth token
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          alert('Session expired. Please log in again.')
          return
        }

        // Call admin API to export all data (bypasses RLS)
        const response = await fetch('/api/admin/export-all-data', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to export database')
        }

        // Get the SQL content from response
        const sqlContent = await response.text()

        // Create and download file
        const blob = new Blob([sqlContent], { type: 'text/sql' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `hivecraic-complete-export-${new Date().toISOString().split('T')[0]}.sql`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        alert('✅ Complete database exported successfully!\n\nThis export includes ALL users\' data from ALL tables including tasks_events.')
      } else {
        // Regular user: export only their own data
        console.log('User export: fetching current user data only...')

        const tables = [
          'apiaries',
          'colonies',
          'colony_movements',
          'feedings',
          'harvests',
          'hives',
          'inspections',
          'queens',
          'rearing_batches',
          'tasks_events',
          'team_apiaries',
          'team_invitations',
          'team_members',
          'teams',
          'varroa_checks',
          'varroa_treatments'
        ]

        let sqlContent = `-- =====================================================\n`
        sqlContent += `-- HiveCraic Personal Data Export\n`
        sqlContent += `-- Generated on: ${new Date().toISOString()}\n`
        sqlContent += `-- =====================================================\n\n`
        sqlContent += `-- This export includes YOUR data only\n`
        sqlContent += `-- Tables: ${tables.join(', ')}\n\n`

        // Fetch and export data from each table (RLS will filter to user's data)
        for (const table of tables) {
          const { data, error } = await supabase
            .from(table)
            .select('*')

          if (error) {
            console.error(`Error fetching ${table}:`, error)
            continue
          }

          if (data && data.length > 0) {
            sqlContent += `\n-- Table: ${table}\n`
            sqlContent += `-- Records: ${data.length}\n\n`

            // Get column names from first record
            const columns = Object.keys(data[0])

            for (const row of data) {
              const values = columns.map(col => {
                const value = row[col]
                if (value === null) return 'NULL'
                if (typeof value === 'boolean') return value ? 'true' : 'false'
                if (typeof value === 'number') return value.toString()
                if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`
                if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`
                return `'${value}'`
              }).join(', ')

              sqlContent += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values});\n`
            }

            sqlContent += '\n'
          }
        }

        sqlContent += `\n-- =====================================================\n`
        sqlContent += `-- END OF EXPORT\n`
        sqlContent += `-- =====================================================\n`

        // Create and download file
        const blob = new Blob([sqlContent], { type: 'text/sql' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `my-beekeeping-data-${new Date().toISOString().split('T')[0]}.sql`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        alert('✅ Your personal data exported successfully!\n\nThis export includes your data from all tables including tasks and events.')
      }
    } catch (error) {
      console.error('Error exporting database:', error)
      alert('Failed to export database. Check console for details.')
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <LoadingSpinner text="Loading settings..." />

  // Access denied screen for non-admin users
  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <div className="flex justify-center mb-4">
            <Shield size={64} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You need administrator privileges to access the Settings page.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const sections = [
    { id: 'profile' as const, label: 'Profile & Export', icon: User, adminOnly: false },
    { id: 'users' as const, label: 'User Management', icon: Users, adminOnly: true },
    { id: 'registration' as const, label: 'Subscription Codes', icon: Shield, adminOnly: true },
    { id: 'tickets' as const, label: 'Support Tickets', icon: MessageCircle, adminOnly: true },
    { id: 'treatments' as const, label: 'Varroa Treatments', icon: Bug, adminOnly: true },
    { id: 'associations' as const, label: 'Beekeeping Associations', icon: Building2, adminOnly: true },
    { id: 'dropdowns' as const, label: 'Dropdown Values', icon: List, adminOnly: true },
  ].filter(section => !section.adminOnly || userIsAdmin)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        {userIsAdmin && (
          <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full flex items-center gap-1">
            <Shield size={14} />
            Admin
          </span>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex flex-wrap -mb-px">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeSection === section.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
      {activeSection === 'profile' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile & Data Export</h2>

          {/* Export Database Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">Export Your Data</h3>
            {userIsAdmin ? (
              <p className="text-sm text-gray-600">
                <strong>Admin Export:</strong> Download complete database backup with ALL users&apos; data from ALL tables including apiaries, hives, queens, inspections, tasks, events, and more.
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                Download your personal beekeeping data including apiaries, hives, queens, inspections, tasks, events, and more in SQL format.
              </p>
            )}
            <button
              onClick={exportDatabase}
              disabled={exporting}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium flex items-center gap-2"
            >
              <Download size={16} />
              {exporting ? 'Exporting...' : userIsAdmin ? 'Export Complete Database (All Users)' : 'Export My Data'}
            </button>
          </div>
        </div>
      )}

      {/* Varroa Treatments Section */}
      {activeSection === 'treatments' && (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Varroa Treatments</h2>
              <p className="text-gray-600 mt-2">Manage approved varroa treatment products for Ireland</p>
            </div>
          </div>
        </div>

        {showVarroaTreatments && (
          <div className="px-6 pb-6 border-t border-gray-200 pt-6 space-y-4">
            {/* Add Treatment Button */}
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Reference data for approved varroa mite treatment products in Ireland.
              </p>
              <button
                onClick={() => setShowAddVarroaTreatment(!showAddVarroaTreatment)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
              >
                {showAddVarroaTreatment ? <X size={16} /> : <Plus size={16} />}
                {showAddVarroaTreatment ? 'Cancel' : 'Add Treatment'}
              </button>
            </div>

            {/* Add/Edit Form */}
            {showAddVarroaTreatment && (
              <form onSubmit={handleVarroaTreatmentSubmit} className="bg-gray-50 p-6 rounded-lg space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingVarroaTreatment ? 'Edit Treatment' : 'Add New Treatment'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={varroaTreatmentFormData.product_name}
                      onChange={(e) => setVarroaTreatmentFormData({ ...varroaTreatmentFormData, product_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Active Ingredients *
                    </label>
                    <input
                      type="text"
                      value={varroaTreatmentFormData.active_ingredients}
                      onChange={(e) => setVarroaTreatmentFormData({ ...varroaTreatmentFormData, active_ingredients: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Application Method *
                    </label>
                    <input
                      type="text"
                      value={varroaTreatmentFormData.application_method}
                      onChange={(e) => setVarroaTreatmentFormData({ ...varroaTreatmentFormData, application_method: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Treatment Duration *
                    </label>
                    <input
                      type="text"
                      value={varroaTreatmentFormData.treatment_duration}
                      onChange={(e) => setVarroaTreatmentFormData({ ...varroaTreatmentFormData, treatment_duration: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Temperature Range *
                    </label>
                    <input
                      type="text"
                      value={varroaTreatmentFormData.temperature_range}
                      onChange={(e) => setVarroaTreatmentFormData({ ...varroaTreatmentFormData, temperature_range: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Honey Flow Restrictions *
                    </label>
                    <input
                      type="text"
                      value={varroaTreatmentFormData.honey_flow_restrictions}
                      onChange={(e) => setVarroaTreatmentFormData({ ...varroaTreatmentFormData, honey_flow_restrictions: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Withdrawal Period (days) *
                    </label>
                    <input
                      type="number"
                      value={varroaTreatmentFormData.withdrawal_period_days}
                      onChange={(e) => setVarroaTreatmentFormData({ ...varroaTreatmentFormData, withdrawal_period_days: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="0"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={varroaTreatmentFormData.notes}
                      onChange={(e) => setVarroaTreatmentFormData({ ...varroaTreatmentFormData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Save size={16} />
                    {editingVarroaTreatment ? 'Update' : 'Add'} Treatment
                  </button>
                  <button
                    type="button"
                    onClick={resetVarroaTreatmentForm}
                    className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Treatments Table */}
            {loadingVarroaTreatments ? (
              <div className="text-center py-8">
                <LoadingSpinner text="Loading varroa treatments..." />
              </div>
            ) : varroaTreatments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No varroa treatments found. Add your first treatment above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-300">
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Product Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Active Ingredients
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Application Method
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Temperature
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Honey Flow
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Withdrawal (days)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {varroaTreatments.map((treatment) => (
                      <tr key={treatment.id} className="hover:bg-gray-50">
                        {editingVarroaTreatment?.id === treatment.id ? (
                          /* Inline Edit Mode */
                          <>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    handleVarroaTreatmentSubmit(e)
                                  }}
                                  className="text-green-600 hover:text-green-900"
                                  title="Save"
                                >
                                  <Save size={18} />
                                </button>
                                <button
                                  onClick={() => resetVarroaTreatmentForm()}
                                  className="text-gray-600 hover:text-gray-900"
                                  title="Cancel"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={varroaTreatmentFormData.product_name}
                                onChange={(e) => setVarroaTreatmentFormData({ ...varroaTreatmentFormData, product_name: e.target.value })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                placeholder="Product name"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={varroaTreatmentFormData.active_ingredients}
                                onChange={(e) => setVarroaTreatmentFormData({ ...varroaTreatmentFormData, active_ingredients: e.target.value })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={varroaTreatmentFormData.application_method}
                                onChange={(e) => setVarroaTreatmentFormData({ ...varroaTreatmentFormData, application_method: e.target.value })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={varroaTreatmentFormData.treatment_duration}
                                onChange={(e) => setVarroaTreatmentFormData({ ...varroaTreatmentFormData, treatment_duration: e.target.value })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={varroaTreatmentFormData.temperature_range}
                                onChange={(e) => setVarroaTreatmentFormData({ ...varroaTreatmentFormData, temperature_range: e.target.value })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={varroaTreatmentFormData.honey_flow_restrictions}
                                onChange={(e) => setVarroaTreatmentFormData({ ...varroaTreatmentFormData, honey_flow_restrictions: e.target.value })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={varroaTreatmentFormData.withdrawal_period_days}
                                onChange={(e) => setVarroaTreatmentFormData({ ...varroaTreatmentFormData, withdrawal_period_days: parseInt(e.target.value) })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                min="0"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <textarea
                                value={varroaTreatmentFormData.notes}
                                onChange={(e) => setVarroaTreatmentFormData({ ...varroaTreatmentFormData, notes: e.target.value })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                rows={2}
                              />
                            </td>
                          </>
                        ) : (
                          /* Display Mode */
                          <>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEditVarroaTreatment(treatment)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Edit"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteVarroaTreatment(treatment.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {treatment.product_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {treatment.active_ingredients}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {treatment.application_method}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {treatment.treatment_duration}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {treatment.temperature_range}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {treatment.honey_flow_restrictions}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 text-center">
                              {treatment.withdrawal_period_days === 0 ? 'None' : treatment.withdrawal_period_days}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              <div className="max-w-xs truncate" title={treatment.notes || ''}>
                                {treatment.notes || '-'}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Beekeeping Associations Section */}
      {activeSection === 'associations' && (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Beekeeping Associations</h2>
              <p className="text-gray-600 mt-2">Manage beekeeping associations across Ireland</p>
            </div>
          </div>
        </div>

        {showAssociations && (
          <div className="px-6 pb-6 border-t border-gray-200 pt-6 space-y-4">
            {/* Add Association Button */}
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Beekeeping associations from Northern Ireland and the Republic of Ireland.
              </p>
              <button
                onClick={() => setShowAddAssociation(!showAddAssociation)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
              >
                {showAddAssociation ? <X size={16} /> : <Plus size={16} />}
                {showAddAssociation ? 'Cancel' : 'Add Association'}
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Jurisdiction:</label>
                <select
                  value={jurisdictionFilter}
                  onChange={(e) => setJurisdictionFilter(e.target.value as 'all' | 'NI' | 'ROI')}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">All Jurisdictions</option>
                  <option value="NI">Northern Ireland</option>
                  <option value="ROI">Republic of Ireland</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">County/Area:</label>
                <select
                  value={countyFilter}
                  onChange={(e) => setCountyFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">All Counties/Areas</option>
                  {Array.from(new Set(associations.map(a => a.county_area))).sort().map(county => (
                    <option key={county} value={county}>{county}</option>
                  ))}
                </select>
              </div>

              {(jurisdictionFilter !== 'all' || countyFilter !== 'all') && (
                <button
                  onClick={() => {
                    setJurisdictionFilter('all')
                    setCountyFilter('all')
                  }}
                  className="ml-auto px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Add/Edit Form */}
            {showAddAssociation && (
              <form onSubmit={handleAssociationSubmit} className="bg-gray-50 p-6 rounded-lg space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingAssociation ? 'Edit Association' : 'Add New Association'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Association Name *
                    </label>
                    <input
                      type="text"
                      value={associationFormData.name}
                      onChange={(e) => setAssociationFormData({ ...associationFormData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Jurisdiction *
                    </label>
                    <input
                      type="text"
                      value={associationFormData.jurisdiction}
                      onChange={(e) => setAssociationFormData({ ...associationFormData, jurisdiction: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., Northern Ireland, Republic of Ireland"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      County/Area *
                    </label>
                    <input
                      type="text"
                      value={associationFormData.county_area}
                      onChange={(e) => setAssociationFormData({ ...associationFormData, county_area: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., County Antrim, Dublin"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Save size={16} />
                    {editingAssociation ? 'Update' : 'Add'} Association
                  </button>
                  <button
                    type="button"
                    onClick={resetAssociationForm}
                    className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Associations Table */}
            {loadingAssociations ? (
              <div className="text-center py-8">
                <LoadingSpinner text="Loading associations..." />
              </div>
            ) : associations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No associations found. Add your first association above.
              </div>
            ) : (() => {
              // Apply filters
              const filteredAssociations = associations.filter(association => {
                if (jurisdictionFilter !== 'all' && association.jurisdiction !== jurisdictionFilter) {
                  return false
                }
                if (countyFilter !== 'all' && association.county_area !== countyFilter) {
                  return false
                }
                return true
              })

              return filteredAssociations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No associations match the selected filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-300">
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Association Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Jurisdiction
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          County/Area
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAssociations.map((association) => (
                      <tr key={association.id} className="hover:bg-gray-50">
                        {editingAssociation?.id === association.id ? (
                          /* Inline Edit Mode */
                          <>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    handleAssociationSubmit(e)
                                  }}
                                  className="text-green-600 hover:text-green-900"
                                  title="Save"
                                >
                                  <Save size={18} />
                                </button>
                                <button
                                  onClick={() => resetAssociationForm()}
                                  className="text-gray-600 hover:text-gray-900"
                                  title="Cancel"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={associationFormData.name}
                                onChange={(e) => setAssociationFormData({ ...associationFormData, name: e.target.value })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                placeholder="Association name"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={associationFormData.jurisdiction}
                                onChange={(e) => setAssociationFormData({ ...associationFormData, jurisdiction: e.target.value })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                placeholder="Jurisdiction"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={associationFormData.county_area}
                                onChange={(e) => setAssociationFormData({ ...associationFormData, county_area: e.target.value })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                placeholder="County/Area"
                              />
                            </td>
                          </>
                        ) : (
                          /* Display Mode */
                          <>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEditAssociation(association)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Edit"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button
                                  onClick={() => handleDeleteAssociation(association.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {association.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {association.jurisdiction}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {association.county_area}
                            </td>
                          </>
                        )}
                      </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </div>
        )}
      </div>
      )}

      {/* Support Ticket Management Section */}
      {activeSection === 'tickets' && (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900">Support Ticket Management</h2>
          <p className="text-gray-600 mt-2">Manage and respond to user support tickets</p>
        </div>

        {showTicketManagement && (
          <div className="px-6 pb-6 space-y-4">
            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTicketFilter(filter)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    ticketFilter === filter
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>

            {/* Tickets List */}
            {loadingTickets ? (
              <div className="text-center py-8">
                <LoadingSpinner text="Loading tickets..." />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No tickets found for this filter.
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="border rounded-lg p-4 bg-gray-50">
                    {editingTicket?.id === ticket.id ? (
                      /* Edit Form */
                      <div className="space-y-3">
                        {/* Ticket Header - Read Only */}
                        <div className="bg-gray-100 p-4 rounded-lg">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {ticket.subject}
                          </h3>
                          <p className="text-sm text-gray-500 mb-2">
                            From: {ticket.user_profiles?.email || 'Unknown'} |{' '}
                            {new Date(ticket.created_at).toLocaleString()}
                          </p>
                          <div className="flex gap-2 mb-3">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-600">
                              {ticket.ticket_type.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">
                            {ticket.description}
                          </p>
                        </div>

                        {/* Edit Fields */}
                        <h4 className="font-semibold text-gray-900 mt-2">Update Ticket</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Status
                            </label>
                            <select
                              value={editingTicket.status}
                              onChange={(e) =>
                                setEditingTicket({ ...editingTicket, status: e.target.value as 'open' | 'in_progress' | 'resolved' | 'closed' })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Priority
                            </label>
                            <select
                              value={editingTicket.priority}
                              onChange={(e) =>
                                setEditingTicket({ ...editingTicket, priority: e.target.value as 'low' | 'normal' | 'high' | 'urgent' })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                              <option value="low">Low</option>
                              <option value="normal">Normal</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Admin Notes (visible to user)
                          </label>
                          <textarea
                            value={editingTicket.admin_notes || ''}
                            onChange={(e) =>
                              setEditingTicket({ ...editingTicket, admin_notes: e.target.value })
                            }
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Response to the user..."
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleTicketUpdate(ticket.id, {
                                status: editingTicket.status,
                                priority: editingTicket.priority,
                                admin_notes: editingTicket.admin_notes || undefined,
                              })
                            }
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={() => setEditingTicket(null)}
                            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display Mode */
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {ticket.subject}
                            </h3>
                            <p className="text-sm text-gray-500">
                              From: {ticket.user_profiles?.email || 'Unknown'} |{' '}
                              {new Date(ticket.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                console.log('Editing ticket:', ticket)
                                setEditingTicket(ticket)
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTicket(ticket.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              ticket.status === 'open'
                                ? 'bg-blue-100 text-blue-800'
                                : ticket.status === 'in_progress'
                                ? 'bg-yellow-100 text-yellow-800'
                                : ticket.status === 'resolved'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {ticket.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              ticket.priority === 'urgent'
                                ? 'bg-red-100 text-red-600'
                                : ticket.priority === 'high'
                                ? 'bg-orange-100 text-orange-600'
                                : ticket.priority === 'normal'
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {ticket.priority.toUpperCase()}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              ticket.ticket_type === 'problem'
                                ? 'bg-red-100 text-red-600'
                                : 'bg-blue-100 text-blue-600'
                            }`}
                          >
                            {ticket.ticket_type.toUpperCase()}
                          </span>
                        </div>

                        <p className="text-gray-700 mb-3 whitespace-pre-wrap">
                          {ticket.description}
                        </p>

                        {ticket.admin_notes && (
                          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-2">
                            <p className="text-sm font-semibold text-blue-900 mb-1">
                              Your Response:
                            </p>
                            <p className="text-sm text-blue-800 whitespace-pre-wrap">
                              {ticket.admin_notes}
                            </p>
                          </div>
                        )}

                        {ticket.resolved_by && ticket.resolved_at && (
                          <p className="text-xs text-gray-500">
                            Resolved by: {ticket.resolver?.email || 'Unknown'} on{' '}
                            {new Date(ticket.resolved_at!).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Statistics */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-gray-900 mb-2">Ticket Statistics</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total:</span>
                  <span className="ml-2 font-bold">{tickets.length}</span>
                </div>
                <div>
                  <span className="text-blue-600">Open:</span>
                  <span className="ml-2 font-bold">
                    {tickets.filter((t) => t.status === 'open').length}
                  </span>
                </div>
                <div>
                  <span className="text-yellow-600">In Progress:</span>
                  <span className="ml-2 font-bold">
                    {tickets.filter((t) => t.status === 'in_progress').length}
                  </span>
                </div>
                <div>
                  <span className="text-green-600">Resolved:</span>
                  <span className="ml-2 font-bold">
                    {tickets.filter((t) => t.status === 'resolved').length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Closed:</span>
                  <span className="ml-2 font-bold">
                    {tickets.filter((t) => t.status === 'closed').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
      {/* User Management Section */}
      {activeSection === 'users' && (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users size={24} className="text-purple-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900">User Management</h2>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full flex items-center gap-1">
                    <Shield size={12} />
                    Admin Only
                  </span>
                </div>
                <p className="text-sm text-gray-500">Manage user accounts and roles</p>
              </div>
            </div>
          </div>
        </div>

        {showUserManagement && (
          <div className="px-6 pb-6 border-t border-gray-200 pt-6">
            {/* Legend and Role Descriptions */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {/* Role Descriptions */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-semibold text-gray-900 mb-2">Role Descriptions</p>
                <ul className="space-y-1 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium mt-0.5">User</span>
                    <span>Standard access to their own beekeeping data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium mt-0.5">Power</span>
                    <span>Enhanced access with additional features and data management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium mt-0.5 flex items-center gap-0.5">
                      <Shield size={10} />Admin
                    </span>
                    <span>Full access including user management and settings</span>
                  </li>
                </ul>
              </div>

              {/* Status Legend */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-semibold text-gray-900 mb-2">Status Symbols</p>
                <div className="space-y-2 text-gray-700">
                  <div>
                    <p className="font-medium text-xs text-gray-600 mb-1">Account Status:</p>
                    <div className="flex items-center gap-3 ml-2">
                      <span className="flex items-center gap-1">
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">●</span>
                        Active
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs font-medium">○</span>
                        Disabled
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-xs text-gray-600 mb-1">Subscription Status:</p>
                    <div className="grid grid-cols-2 gap-1 ml-2 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded font-medium">✓</span>
                        Active
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded font-medium">7d</span>
                        Expiring soon
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded font-medium">3d!</span>
                        Expiring very soon
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-medium">✗</span>
                        Expired
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded font-medium">−</span>
                        No subscription
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              View and manage all user accounts. Change user roles between User, Power User, and Admin.
            </p>

            {/* Tabs for Active/Deleted Users */}
            <div className="mb-4 flex gap-2 border-b border-gray-200">
              <button
                onClick={() => {
                  setShowDeletedUsers(false)
                  fetchUsers()
                }}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  !showDeletedUsers
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Active Users ({users.length})
              </button>
              <button
                onClick={() => {
                  setShowDeletedUsers(true)
                  fetchDeletedUsers()
                }}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  showDeletedUsers
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Deleted Users ({deletedUsers.length})
              </button>
            </div>

            {/* Search and Filters */}
            <div className="mb-4 space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search users by email or ID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Filter Row */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as 'all' | 'User' | 'Power User' | 'Admin')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
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
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Accounts</option>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>

                {/* Subscription Filter */}
                <select
                  value={subscriptionFilter}
                  onChange={(e) => setSubscriptionFilter(e.target.value as 'all' | 'active' | 'expiring' | 'expired' | 'none')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
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
                  className="ml-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
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
              <div className="text-center py-8 text-gray-500">
                No users found. Click &quot;Refresh&quot; to load.
              </div>
            ) : (showDeletedUsers && deletedUsers.length === 0) ? (
              <div className="text-center py-8 text-gray-500">
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
                  <div className="mb-3 text-sm text-gray-600">
                    Showing {filteredUsers.length} of {sourceUsers.length} {showDeletedUsers ? 'deleted ' : ''}users
                  </div>

                  <div className="space-y-2">
                    {filteredUsers.map((user) => {
                      const isExpanded = expandedUserId === user.id

                      return (
                      <div key={user.id} className="bg-white border border-gray-200 rounded hover:border-gray-300 transition-all">
                        {/* Compact Single Line */}
                        <div className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            {/* Expand Button */}
                            <button
                              onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                              title={isExpanded ? 'Hide details' : 'Show details'}
                            >
                              <ChevronDown
                                size={16}
                                className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </button>

                            {/* Email */}
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 truncate">{user.email || 'No email'}</span>
                              {user.id === userId && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded flex-shrink-0">
                                  You
                                </span>
                              )}
                            </div>

                            {/* Status Badges */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {/* Role Badge */}
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                user.role === 'Admin'
                                  ? 'bg-purple-100 text-purple-800'
                                  : user.role === 'Power User'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
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
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {user.subscription_status === 'active' ? '✓' :
                                   user.subscription_status === 'expiring_soon' ? `${user.days_remaining}d` :
                                   user.subscription_status === 'expiring_very_soon' ? `${user.days_remaining}d!` :
                                   user.subscription_status === 'expired' ? '✗' : '−'}
                                </span>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {user.id === userId ? (
                                <span className="text-gray-400 text-xs italic px-2">Your account</span>
                              ) : (
                                <>
                                  {/* Role Selector */}
                                  <select
                                    value={user.role}
                                    onChange={(e) => handleRoleChange(user.id, e.target.value as 'User' | 'Power User' | 'Admin')}
                                    className="px-2 py-0.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  >
                                    <option value="User">User</option>
                                    <option value="Power User">Power User</option>
                                    <option value="Admin">Admin</option>
                                  </select>

                                  {showDeletedUsers ? (
                                    /* Restore Button for Deleted Users */
                                    <button
                                      onClick={() => handleRestoreUser(user.id, user.email || 'Unknown')}
                                      disabled={restoringUserId === user.id}
                                      className="px-2 py-0.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs disabled:opacity-50"
                                      title="Restore user account"
                                    >
                                      {restoringUserId === user.id ? 'Restoring...' : 'Restore'}
                                    </button>
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

                                      {/* Delete Button */}
                                      <button
                                        onClick={() => handleDeleteUser(user.id, user.email || 'Unknown')}
                                        className="p-0.5 bg-red-600 text-white rounded hover:bg-red-700"
                                        title="Delete"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              {/* User ID */}
                              <div>
                                <span className="text-gray-500 block mb-1">User ID</span>
                                <p className="font-mono text-gray-700 truncate" title={user.id}>
                                  {user.id.substring(0, 12)}...
                                </p>
                              </div>

                              {/* Joined Date */}
                              <div>
                                <span className="text-gray-500 block mb-1">Joined</span>
                                <p className="text-gray-900">
                                  {new Date(user.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>

                              {/* Subscription Code */}
                              <div>
                                <span className="text-gray-500 block mb-1">Sub Code</span>
                                {user.registration_code ? (
                                  <div>
                                    <p className="font-mono font-semibold text-indigo-600">{user.registration_code}</p>
                                    {user.code_description && (
                                      <p className="text-gray-500 italic truncate" title={user.code_description}>
                                        {user.code_description}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-gray-400 italic">None</p>
                                )}
                              </div>

                              {/* Subscription Expires */}
                              <div>
                                <span className="text-gray-500 block mb-1">Expires</span>
                                <div className="flex flex-col gap-1">
                                  <input
                                    type="date"
                                    value={user.subscription_expires_at ? new Date(user.subscription_expires_at).toISOString().split('T')[0] : ''}
                                    onChange={(e) => handleExpiryDateChange(user.id, e.target.value)}
                                    className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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

                              {/* Deleted At (only show for deleted users) */}
                              {showDeletedUsers && user.deleted_at && (
                                <div className="col-span-2">
                                  <span className="text-gray-500 block mb-1">Deleted On</span>
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
                                    <span className="text-xs text-gray-500">
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
          </div>
        )}
      </div>
      )}

      {/* Subscription Codes Section */}
      {activeSection === 'registration' && (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Shield size={24} className="text-indigo-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900">Subscription Codes</h2>
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full flex items-center gap-1">
                    <Shield size={12} />
                    Admin Only
                  </span>
                </div>
                <p className="text-sm text-gray-500">Manage codes for new user registration and subscription renewals</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddCodeModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <Plus size={16} />
              Add Code
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 border-t border-gray-200 pt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-900 font-medium mb-2">
              How Subscription Codes Work:
            </p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li><strong>New User Registration:</strong> Users enter a code during sign-up to create their account and receive initial subscription</li>
              <li><strong>Subscription Renewal:</strong> Existing users can enter codes to extend their subscription from the Profile page</li>
              <li><strong>Subscription Duration:</strong> How many days of subscription time the code grants when activated (30, 90, 180, or 365 days)</li>
              <li><strong>Code Management:</strong> Codes remain active until you manually deactivate them - no automatic expiration</li>
            </ul>
          </div>

          {loadingCodes ? (
            <div className="text-center py-8">
              <LoadingSpinner text="Loading subscription codes..." />
            </div>
          ) : registrationCodes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No subscription codes found. Create codes for new user registration and renewals.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type / Association
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subscription Duration
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subscription Expires
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {registrationCodes.map((code) => {
                    const isMaxedOut = code.max_uses !== null && code.current_uses >= code.max_uses
                    return (
                      <tr key={code.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm font-mono font-bold text-gray-900">
                          {code.code}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {code.description || <span className="italic text-gray-400">No description</span>}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {code.code_type === 'individual' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Individual
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                Association
                              </span>
                              {code.association && (
                                <span className="text-xs text-gray-600">
                                  {code.association.name}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {(() => {
                            const expiryDate = new Date(code.subscription_expires_at)
                            const isLifetime = expiryDate.getFullYear() > new Date().getFullYear() + 50
                            const daysUntil = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

                            if (isLifetime) {
                              return (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-indigo-600">
                                    Lifetime
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    (Never expires)
                                  </span>
                                </div>
                              )
                            } else {
                              return (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-900">
                                    {expiryDate.toLocaleDateString()}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    ({daysUntil > 0 ? `in ${daysUntil} days` : 'expired'})
                                  </span>
                                </div>
                              )
                            }
                          })()}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {editingCodeId === code.id ? (
                            <input
                              type="date"
                              value={editingCodeData.subscription_expires_at}
                              onChange={(e) => setEditingCodeData({...editingCodeData, subscription_expires_at: e.target.value})}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                              min={new Date().toISOString().split('T')[0]}
                            />
                          ) : (
                            (() => {
                              const expiryDate = new Date(code.subscription_expires_at)
                              const isLifetime = expiryDate.getFullYear() > new Date().getFullYear() + 50

                              if (isLifetime) {
                                return (
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-indigo-600">
                                      Never
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      Lifetime access
                                    </span>
                                  </div>
                                )
                              } else {
                                return (
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-gray-900">
                                      {expiryDate.toLocaleDateString()}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      Fixed expiration
                                    </span>
                                  </div>
                                )
                              }
                            })()
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {editingCodeId === code.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">{code.current_uses} /</span>
                              <input
                                type="number"
                                value={editingCodeData.max_uses}
                                onChange={(e) => setEditingCodeData({...editingCodeData, max_uses: e.target.value})}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                min="0"
                                placeholder="∞"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>
                                {code.current_uses} / {code.max_uses === null ? '∞' : code.max_uses}
                              </span>
                              {isMaxedOut && (
                                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                                  Maxed
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            code.is_active && !isMaxedOut
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {code.is_active ? (isMaxedOut ? 'Maxed Out' : 'Active') : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {editingCodeId === code.id ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSaveCodeEdit(code.id)}
                                className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                                title="Save changes"
                              >
                                <Check size={14} />
                                Save
                              </button>
                              <button
                                onClick={handleCancelCodeEdit}
                                className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-1"
                                title="Cancel editing"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditCode(code)}
                                className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                                title="Edit code"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleToggleCodeActive(code.id, code.is_active)}
                                className={`px-2 py-1 text-white rounded hover:opacity-90 flex items-center gap-1 ${
                                  code.is_active ? 'bg-orange-600' : 'bg-green-600'
                                }`}
                                title={code.is_active ? 'Deactivate code' : 'Activate code'}
                              >
                                {code.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleDeleteCode(code.id, code.code)}
                                className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                                title="Delete code"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-500">
            <p className="mb-2"><strong>Code Status:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Active:</strong> Code is valid and can be used for registration</li>
              <li><strong>Disabled:</strong> Code has been manually deactivated</li>
              <li><strong>Expired:</strong> Code has passed its expiration date</li>
              <li><strong>Maxed:</strong> Code has reached its maximum usage limit</li>
            </ul>
          </div>
        </div>
      </div>
      )}

      {/* Add Code Modal */}
      {showAddCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Create Subscription Code</h3>
              <button
                onClick={() => {
                  setShowAddCodeModal(false)
                  setNewCodeData({
                    code: '',
                    description: '',
                    max_uses: '',
                    subscription_expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
                    code_type: 'individual' as 'individual' | 'association',
                    association_id: '',
                  })
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCodeData.code}
                  onChange={(e) => setNewCodeData({ ...newCodeData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., BEEKEEPER2025"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                  required
                  autoComplete="off"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Will be automatically converted to uppercase
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="code_type"
                      value="individual"
                      checked={newCodeData.code_type === 'individual'}
                      onChange={(e) => setNewCodeData({ ...newCodeData, code_type: e.target.value as 'individual' | 'association', association_id: '' })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Individual</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="code_type"
                      value="association"
                      checked={newCodeData.code_type === 'association'}
                      onChange={(e) => {
                        setNewCodeData({ ...newCodeData, code_type: e.target.value as 'individual' | 'association' })
                        if (!associations.length) fetchAssociationsForCodes()
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Association Member</span>
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {newCodeData.code_type === 'individual' ? 'For direct user subscriptions' : 'For beekeeping association members'}
                </p>
              </div>

              {newCodeData.code_type === 'association' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Association <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newCodeData.association_id}
                    onChange={(e) => setNewCodeData({ ...newCodeData, association_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required={newCodeData.code_type === 'association'}
                  >
                    <option value="">Select an association...</option>
                    {associations.map((assoc) => (
                      <option key={assoc.id} value={assoc.id}>
                        {assoc.name} ({assoc.jurisdiction})
                      </option>
                    ))}
                  </select>
                  {loadingAssociations && (
                    <p className="mt-1 text-xs text-gray-500">Loading associations...</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newCodeData.description}
                  onChange={(e) => setNewCodeData({ ...newCodeData, description: e.target.value })}
                  placeholder="Optional description for internal reference"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Uses
                </label>
                <input
                  type="number"
                  value={newCodeData.max_uses}
                  onChange={(e) => setNewCodeData({ ...newCodeData, max_uses: e.target.value })}
                  placeholder="Leave empty for unlimited"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty for unlimited uses
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subscription Expiration Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newCodeData.subscription_expires_at}
                  onChange={(e) => setNewCodeData({ ...newCodeData, subscription_expires_at: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Fixed date when subscriptions activated with this code will expire
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const date = new Date()
                      date.setMonth(date.getMonth() + 1)
                      setNewCodeData({ ...newCodeData, subscription_expires_at: date.toISOString().split('T')[0] })
                    }}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    +1 month
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const date = new Date()
                      date.setMonth(date.getMonth() + 6)
                      setNewCodeData({ ...newCodeData, subscription_expires_at: date.toISOString().split('T')[0] })
                    }}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    +6 months
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const date = new Date()
                      date.setFullYear(date.getFullYear() + 1)
                      setNewCodeData({ ...newCodeData, subscription_expires_at: date.toISOString().split('T')[0] })
                    }}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    +1 year
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const date = new Date()
                      date.setFullYear(date.getFullYear() + 100)
                      setNewCodeData({ ...newCodeData, subscription_expires_at: date.toISOString().split('T')[0] })
                    }}
                    className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                  >
                    Lifetime
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCodeModal(false)
                    setNewCodeData({
                      code: '',
                      description: '',
                      max_uses: '',
                      subscription_expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
                      code_type: 'individual' as 'individual' | 'association',
                      association_id: ''
                    })
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Create Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dropdown Values Section */}
      {activeSection === 'dropdowns' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Dropdown Values Management</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditingValue({ categoryId: '', value: null })
                    setValueFormData({ value: '', display_order: 0 })
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add Value
                </button>
                <button
                  onClick={() => setShowCategoryForm(!showCategoryForm)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2"
                >
                  {showCategoryForm ? <X size={16} /> : <Plus size={16} />}
                  {showCategoryForm ? 'Cancel' : 'Add Category'}
                </button>
              </div>
            </div>

          {showCategoryForm && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-4">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={categoryFormData.category_name}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, category_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Queen Marking Colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Key * (used in code)
                  </label>
                  <input
                    type="text"
                    value={categoryFormData.category_key}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, category_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                    placeholder="e.g., queen_marking_colors"
                    required
                    disabled={!!editingCategory}
                  />
                  <p className="text-xs text-gray-500 mt-1">Lowercase with underscores, cannot be changed after creation</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={categoryFormData.description}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Brief description of this dropdown category"
                    rows={2}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    {editingCategory ? 'Update' : 'Add'} Category
                  </button>
                  <button
                    type="button"
                    onClick={resetCategoryForm}
                    className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

            {/* Category Filter */}
            <div className="mb-4 flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Filter by Category:</label>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                ))}
              </select>
              <span className="text-sm text-gray-500">
                {(() => {
                  const filtered = categories.flatMap(c =>
                    selectedCategoryFilter === 'all' || c.id === selectedCategoryFilter
                      ? c.dropdown_values || []
                      : []
                  )
                  return `Showing ${filtered.length} value${filtered.length !== 1 ? 's' : ''}`
                })()}
              </span>
            </div>

            {/* Add/Edit Value Form */}
            {editingValue.categoryId !== '' && (
              <form onSubmit={handleValueSubmit} className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
                <h3 className="font-semibold text-gray-900">
                  {editingValue.value ? 'Edit Value' : 'Add New Value'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      value={editingValue.categoryId}
                      onChange={(e) => setEditingValue({ ...editingValue, categoryId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      required
                      disabled={!!editingValue.value}
                    >
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Value *
                    </label>
                    <input
                      type="text"
                      value={valueFormData.value}
                      onChange={(e) => setValueFormData({ ...valueFormData, value: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="Enter value"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={valueFormData.display_order}
                      onChange={(e) => setValueFormData({ ...valueFormData, display_order: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                  >
                    <Save size={14} className="inline mr-1" />
                    {editingValue.value ? 'Update' : 'Add'} Value
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingValue({ categoryId: '', value: null })
                      setValueFormData({ value: '', display_order: 0 })
                    }}
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Values Table */}
            {categories.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-12 text-center text-gray-500">
                No dropdown categories configured yet. Click &ldquo;Add Category&rdquo; to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categories
                      .filter(cat => selectedCategoryFilter === 'all' || cat.id === selectedCategoryFilter)
                      .flatMap(category =>
                        (category.dropdown_values || [])
                          .sort((a, b) => a.display_order - b.display_order)
                          .map(value => ({ category, value }))
                      )
                      .map(({ category, value }) => (
                        <tr key={value.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{category.category_name}</div>
                              <div className="text-xs text-gray-500 font-mono">{category.category_key}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{value.value}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-500">#{value.display_order}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {value.is_active ? (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEditValue(category.id, value)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleToggleValueStatus(value.id, value.is_active)}
                                className={value.is_active ? "text-yellow-600 hover:text-yellow-900" : "text-green-600 hover:text-green-900"}
                                title={value.is_active ? 'Deactivate' : 'Activate'}
                              >
                                {value.is_active ? <X size={16} /> : <Plus size={16} />}
                              </button>
                              <button
                                onClick={() => handleDeleteValue(value.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {categories
                  .filter(cat => selectedCategoryFilter === 'all' || cat.id === selectedCategoryFilter)
                  .every(cat => !cat.dropdown_values || cat.dropdown_values.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    No values found. Click &ldquo;Add Value&rdquo; to create the first one.
                  </div>
                )}
              </div>
            )}

            {/* Categories Management */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Categories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                  <div key={category.id} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{category.category_name}</h4>
                        <p className="text-xs text-gray-500 font-mono">{category.category_key}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit Category"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Category"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {category.description && (
                      <p className="text-xs text-gray-600 mt-1">{category.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {category.dropdown_values?.length || 0} value{(category.dropdown_values?.length || 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
