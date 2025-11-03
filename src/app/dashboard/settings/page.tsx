'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId, isAdmin } from '@/lib/auth'
import { Plus, Edit2, Trash2, X, Save, Download, Shield, Users, Search, User, MessageCircle, Bug, List } from 'lucide-react'
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
  role: 'User' | 'Admin'
  created_at: string
  updated_at: string
  email?: string
  first_name?: string
  last_name?: string
  mobile_number?: string
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
  const [activeSection, setActiveSection] = useState<'profile' | 'users' | 'tickets' | 'treatments' | 'dropdowns'>('profile')
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<DropdownCategory | null>(null)
  const [editingValue, setEditingValue] = useState<{ categoryId: string; value: DropdownValue | null }>({ categoryId: '', value: null })
  const [exporting, setExporting] = useState(false)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')

  // User Management state
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)

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
      console.error('Error fetching users:', error)
      alert('Failed to fetch users. Make sure you have admin permissions.')
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleRoleChange = async (targetUserId: string, newRole: 'User' | 'Admin') => {
    if (targetUserId === userId) {
      alert('You cannot change your own role.')
      return
    }

    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', targetUserId)

      if (error) throw error

      alert(`User role updated to ${newRole} successfully!`)
      fetchUsers() // Refresh the list
    } catch (error) {
      console.error('Error updating user role:', error)
      alert('Failed to update user role.')
    }
  }

  const handleDeleteUser = async (targetUserId: string, userEmail: string) => {
    if (targetUserId === userId) {
      alert('You cannot delete your own account.')
      return
    }

    if (!confirm(`⚠️ WARNING: Are you sure you want to delete the user "${userEmail}"?\n\nThis will permanently delete:\n- User account\n- All apiaries, hives, and queens\n- All inspections and treatments\n- All team memberships\n- All data associated with this user\n\nThis action CANNOT be undone!`)) {
      return
    }

    // Double confirmation for safety
    const confirmText = prompt('Type "DELETE" (in capital letters) to confirm deletion:')
    if (confirmText !== 'DELETE') {
      alert('Deletion cancelled. Confirmation text did not match.')
      return
    }

    try {
      console.log('🗑️ Attempting to delete user:', { targetUserId, userEmail })

      // Step 1: Delete all user data in order (to avoid foreign key constraints)
      console.log('🗑️ Step 1: Deleting user data...')

      // Delete inspections
      console.log('🗑️ Deleting inspections...')
      const { error: inspError } = await supabase.from('inspections').delete().eq('user_id', targetUserId)
      if (inspError) {
        console.error('❌ Failed to delete inspections:', inspError)
        throw new Error(`Failed to delete inspections: ${inspError.message}`)
      }
      console.log('✅ Inspections deleted')

      // Delete varroa checks
      console.log('🗑️ Deleting varroa checks...')
      const { error: varroaCheckError } = await supabase.from('varroa_checks').delete().eq('user_id', targetUserId)
      if (varroaCheckError) {
        console.error('❌ Failed to delete varroa checks:', varroaCheckError)
        throw new Error(`Failed to delete varroa checks: ${varroaCheckError.message}`)
      }
      console.log('✅ Varroa checks deleted')

      // Delete varroa treatments (through hives relationship)
      console.log('🗑️ Deleting varroa treatments...')
      // First get all user's hive IDs
      const { data: userHives } = await supabase
        .from('hives')
        .select('id')
        .eq('user_id', targetUserId)

      if (userHives && userHives.length > 0) {
        const hiveIds = userHives.map(h => h.id)
        const { error: varroaTreatError } = await supabase
          .from('varroa_treatments')
          .delete()
          .in('hive_id', hiveIds)

        if (varroaTreatError) {
          console.error('❌ Failed to delete varroa treatments:', varroaTreatError)
          throw new Error(`Failed to delete varroa treatments: ${varroaTreatError.message}`)
        }
      }
      console.log('✅ Varroa treatments deleted')

      // Delete queens (must be before hives due to FK)
      console.log('🗑️ Deleting queens...')
      const { error: queensError } = await supabase.from('queens').delete().eq('user_id', targetUserId)
      if (queensError) {
        console.error('❌ Failed to delete queens:', queensError)
        throw new Error(`Failed to delete queens: ${queensError.message}`)
      }
      console.log('✅ Queens deleted')

      // Delete hives
      console.log('🗑️ Deleting hives...')
      const { error: hivesError } = await supabase.from('hives').delete().eq('user_id', targetUserId)
      if (hivesError) {
        console.error('❌ Failed to delete hives:', hivesError)
        throw new Error(`Failed to delete hives: ${hivesError.message}`)
      }
      console.log('✅ Hives deleted')

      // Delete apiaries
      console.log('🗑️ Deleting apiaries...')
      const { error: apiariesError } = await supabase.from('apiaries').delete().eq('user_id', targetUserId)
      if (apiariesError) {
        console.error('❌ Failed to delete apiaries:', apiariesError)
        throw new Error(`Failed to delete apiaries: ${apiariesError.message}`)
      }
      console.log('✅ Apiaries deleted')

      // Delete rearing batches
      console.log('🗑️ Deleting rearing batches...')
      const { error: batchesError } = await supabase.from('rearing_batches').delete().eq('user_id', targetUserId)
      if (batchesError) {
        console.error('❌ Failed to delete rearing batches:', batchesError)
        throw new Error(`Failed to delete rearing batches: ${batchesError.message}`)
      }
      console.log('✅ Rearing batches deleted')

      // Delete team memberships
      console.log('🗑️ Deleting team memberships...')
      const { error: memberError } = await supabase.from('team_members').delete().eq('user_id', targetUserId)
      if (memberError) {
        console.error('❌ Failed to delete team memberships:', memberError)
        throw new Error(`Failed to delete team memberships: ${memberError.message}`)
      }
      console.log('✅ Team memberships deleted')

      // Delete teams owned by user
      console.log('🗑️ Deleting owned teams...')
      const { error: teamsError } = await supabase.from('teams').delete().eq('owner_id', targetUserId)
      if (teamsError) {
        console.error('❌ Failed to delete teams:', teamsError)
        throw new Error(`Failed to delete teams: ${teamsError.message}`)
      }
      console.log('✅ Teams deleted')

      // Delete support tickets
      console.log('🗑️ Deleting support tickets...')
      const { error: ticketsError } = await supabase.from('support_tickets').delete().eq('user_id', targetUserId)
      if (ticketsError) {
        console.error('❌ Failed to delete support tickets:', ticketsError)
        throw new Error(`Failed to delete support tickets: ${ticketsError.message}`)
      }
      console.log('✅ Support tickets deleted')

      console.log('🗑️ Step 2: Deleting user profiles...')

      // Step 2a: Delete from user_profiles table
      console.log('🗑️ Deleting from user_profiles...')
      const { data: userProfileData, error: userProfileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', targetUserId)
        .select()

      console.log('🗑️ user_profiles deletion response:', { data: userProfileData, error: userProfileError })

      if (userProfileError) {
        console.error('❌ Delete user_profiles error:', userProfileError)
        throw new Error(`Failed to delete from user_profiles: ${userProfileError.message}`)
      }

      if (!userProfileData || userProfileData.length === 0) {
        console.warn('⚠️ No user_profiles record was deleted (may not exist)')
      } else {
        console.log('✅ user_profiles deleted:', userProfileData)
      }

      // Step 2b: Delete from profiles table (this is the one blocking auth deletion)
      console.log('🗑️ Deleting from profiles...')
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', targetUserId)
        .select()

      console.log('🗑️ profiles deletion response:', { data: profileData, error: profileError })

      if (profileError) {
        console.error('❌ Delete profiles error:', profileError)
        throw new Error(`Failed to delete from profiles: ${profileError.message}`)
      }

      if (!profileData || profileData.length === 0) {
        console.warn('⚠️ No profiles record was deleted (may not exist)')
      } else {
        console.log('✅ profiles deleted:', profileData)
      }

      console.log('🗑️ Step 3: Attempting to delete auth user...')

      // Step 3: Try to delete from auth.users via RPC function
      let authDeleted = false
      let authDeleteError = null

      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('delete_user', { user_id: targetUserId })
        console.log('🗑️ RPC delete_user response:', { data: rpcData, error: rpcError })

        if (rpcError) {
          console.warn('⚠️ RPC error:', rpcError)
          authDeleteError = rpcError.message
        } else {
          console.log('✅ Auth user deleted via RPC')
          authDeleted = true
        }
      } catch (authError) {
        console.warn('⚠️ Could not delete auth user:', authError)
        authDeleteError = authError instanceof Error ? authError.message : 'Unknown error'
      }

      // Show appropriate success message based on whether auth was deleted
      if (authDeleted) {
        alert(`✅ User "${userEmail}" has been completely deleted!\n\n• All user data removed\n• All associated records deleted\n• Authentication account deleted\n\nThe user has been completely removed from the system.`)
      } else {
        alert(`⚠️ User "${userEmail}" has been partially deleted.\n\n✅ Deleted:\n• All user data and records\n• User profile\n\n❌ Not Deleted:\n• Authentication account (still exists in Supabase Auth)\n\nReason: ${authDeleteError || 'RPC function may not exist or lack permissions'}\n\nTo complete deletion:\n1. Run SQL: sql/create_delete_auth_user_function.sql\n2. Or manually delete from Supabase Dashboard → Authentication → Users`)
      }
      fetchUsers() // Refresh the list
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
            // Try to get user email - first from user_profiles, then from RPC call to get auth user
            let userEmail = null

            // Try user_profiles first
            const { data: userProfile } = await supabase
              .from('user_profiles')
              .select('email')
              .eq('user_id', ticket.user_id)
              .maybeSingle()

            if (userProfile?.email) {
              userEmail = userProfile.email
            } else {
              // Fallback: try to get email using RPC function or from profiles table
              const { data: authUser } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', ticket.user_id)
                .maybeSingle()

              if (authUser?.email) {
                userEmail = authUser.email
              }
            }

            // Fetch resolver email if exists
            let resolverEmail = null
            if (ticket.resolved_by) {
              const { data: resolver } = await supabase
                .from('user_profiles')
                .select('email')
                .eq('user_id', ticket.resolved_by)
                .maybeSingle()

              if (resolver?.email) {
                resolverEmail = resolver.email
              } else {
                const { data: authResolver } = await supabase
                  .from('profiles')
                  .select('email')
                  .eq('id', ticket.resolved_by)
                  .maybeSingle()

                if (authResolver?.email) {
                  resolverEmail = authResolver.email
                }
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

  const exportDatabase = async () => {
    setExporting(true)
    try {
      let sqlContent = `-- =====================================================\n`
      sqlContent += `-- Hive Craic Database Export\n`
      sqlContent += `-- Generated on: ${new Date().toISOString()}\n`
      sqlContent += `-- =====================================================\n\n`
      sqlContent += `-- This export includes:\n`
      sqlContent += `--   1. Complete database schema (tables, columns, constraints, indexes)\n`
      sqlContent += `--   2. All data from all tables\n\n`
      sqlContent += `-- To restore this database:\n`
      sqlContent += `--   1. Create a new PostgreSQL database\n`
      sqlContent += `--   2. Run this SQL file against the new database\n`
      sqlContent += `--   3. Set up Supabase authentication and configure RLS policies\n\n`
      sqlContent += `-- =====================================================\n`
      sqlContent += `-- SECTION 1: DATABASE SCHEMA (from live database)\n`
      sqlContent += `-- =====================================================\n\n`

      // Fetch all table names from information_schema
      const { data: tablesData, error: tablesError } = await supabase.rpc('exec_sql', {
        query: `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `
      })

      let tables: string[]
      if (tablesError) {
        console.error('Cannot fetch schema via RPC, using direct query method')
        // Fallback: get tables from known list
        tables = ['apiaries', 'hives', 'queens', 'inspections', 'varroa_checks', 'varroa_treatments', 'dropdown_categories', 'dropdown_values', 'feedings', 'harvests', 'rearing_batches', 'support_tickets', 'user_profiles']
      } else {
        tables = tablesData.map((t: { table_name: string }) => t.table_name)
      }

      // Get schema information for each table
      for (const tableName of tables) {
        // Fetch column information
        const { data: columnsData } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)

        if (columnsData && columnsData.length > 0) {
          const sampleRow = columnsData[0]
          const columns = Object.keys(sampleRow)

          sqlContent += `\n-- Table: ${tableName}\n`
          sqlContent += `CREATE TABLE IF NOT EXISTS public.${tableName} (\n`

          // Add columns with basic type inference
          const columnDefs = columns.map(col => {
            const value = sampleRow[col]
            let dataType = 'TEXT'

            if (col === 'id' || col.endsWith('_id')) {
              dataType = 'UUID'
            } else if (typeof value === 'number') {
              if (Number.isInteger(value)) {
                dataType = 'INTEGER'
              } else {
                dataType = 'NUMERIC'
              }
            } else if (typeof value === 'boolean') {
              dataType = 'BOOLEAN'
            } else if (value instanceof Date || col.includes('date') || col.includes('_at')) {
              if (col.includes('_at') || col === 'created_at' || col === 'updated_at') {
                dataType = 'TIMESTAMP WITH TIME ZONE'
              } else {
                dataType = 'DATE'
              }
            } else if (typeof value === 'object' && value !== null) {
              dataType = 'JSONB'
            }

            return `  ${col} ${dataType}`
          }).join(',\n')

          sqlContent += columnDefs
          sqlContent += `,\n  CONSTRAINT ${tableName}_pkey PRIMARY KEY (id)\n`
          sqlContent += `);\n\n`
        }
      }

      sqlContent += `-- Note: This schema is inferred from live data.\n`
      sqlContent += `-- Foreign key constraints, indexes, triggers, and RLS policies\n`
      sqlContent += `-- should be recreated based on your specific requirements.\n\n`

      sqlContent += `-- =====================================================\n`
      sqlContent += `-- SECTION 2: DATA EXPORT\n`
      sqlContent += `-- =====================================================\n\n`

      // Fetch and export data from each table
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
      a.download = `hive-craic-complete-${new Date().toISOString().split('T')[0]}.sql`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      alert('Database exported successfully with complete schema!')
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
    { id: 'tickets' as const, label: 'Support Tickets', icon: MessageCircle, adminOnly: true },
    { id: 'treatments' as const, label: 'Varroa Treatments', icon: Bug, adminOnly: true },
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
            <p className="text-sm text-gray-600">Download all your beekeeping data in JSON format.</p>
            <button
              onClick={exportDatabase}
              disabled={exporting}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium flex items-center gap-2"
            >
              <Download size={16} />
              {exporting ? 'Exporting...' : 'Export Database'}
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
            <p className="text-sm text-gray-600 mb-4">
              View and manage all user accounts. Change user roles between User and Admin.
            </p>

            {/* Search Bar */}
            <div className="mb-4">
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
            </div>

            {/* Refresh Button */}
            <div className="mb-4">
              <button
                onClick={fetchUsers}
                disabled={loadingUsers}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
              >
                {loadingUsers ? 'Loading...' : 'Refresh Users'}
              </button>
            </div>

            {/* Users Table */}
            {loadingUsers ? (
              <div className="text-center py-8">
                <LoadingSpinner text="Loading users..." />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No users found. Click &quot;Refresh Users&quot; to load.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users
                      .filter(user =>
                        !userSearch ||
                        user.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
                        user.id.toLowerCase().includes(userSearch.toLowerCase())
                      )
                      .map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm text-gray-900">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{user.email || 'No email'}</span>
                              {user.id === userId && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-sans">
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-xs text-gray-500 font-mono max-w-xs truncate" title={user.id}>
                            {user.id.substring(0, 8)}...
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              user.role === 'Admin'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role === 'Admin' && <Shield size={12} className="inline mr-1" />}
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 text-sm">
                            {user.id === userId ? (
                              <span className="text-gray-400 text-xs italic">Cannot modify own account</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <select
                                  value={user.role}
                                  onChange={(e) => handleRoleChange(user.id, e.target.value as 'User' | 'Admin')}
                                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                  <option value="User">User</option>
                                  <option value="Admin">Admin</option>
                                </select>
                                <button
                                  onClick={() => handleDeleteUser(user.id, user.email || 'Unknown')}
                                  className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                                  title="Delete user"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 text-sm text-gray-500">
              <p className="mb-2"><strong>Role Descriptions:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>User:</strong> Standard access to their own beekeeping data</li>
                <li><strong>Admin:</strong> Full access including user management and settings</li>
              </ul>
            </div>
          </div>
        )}
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
