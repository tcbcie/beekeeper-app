'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId, isAdmin } from '@/lib/auth'
import { Plus, Edit2, Trash2, X, Save, ChevronDown, ChevronRight, Download, Database, Shield, Users, Search } from 'lucide-react'
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
}

export default function SettingsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [categories, setCategories] = useState<CategoryWithValues[]>([])
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<DropdownCategory | null>(null)
  const [editingValue, setEditingValue] = useState<{ categoryId: string; value: DropdownValue | null }>({ categoryId: '', value: null })
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const [showExportSection, setShowExportSection] = useState(false)

  // User Management state
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)

  const [categoryFormData, setCategoryFormData] = useState({
    category_name: '',
    category_key: '',
    description: '',
  })

  const [valueFormData, setValueFormData] = useState({
    value: '',
    display_order: 0,
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
      setIsAdminUser(adminAccess)

      if (!adminAccess) {
        setAccessDenied(true)
        setLoading(false)
        return
      }

      fetchCategories()
    }
    initUser()
  }, [])

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

  const handleToggleValueActive = async (value: DropdownValue) => {
    const { error } = await supabase
      .from('dropdown_values')
      .update({ is_active: !value.is_active })
      .eq('id', value.id)

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

  // Fetch users when user management section is opened
  useEffect(() => {
    if (showUserManagement && users.length === 0) {
      fetchUsers()
    }
  }, [showUserManagement])

  const exportDatabase = async () => {
    setExporting(true)
    try {
      // Define all tables to export
      const tables = ['apiaries', 'hives', 'queens', 'inspections', 'varroa_checks', 'varroa_treatments', 'dropdown_categories', 'dropdown_values']

      let sqlContent = `-- Tribes Beekeeping App Database Export\n`
      sqlContent += `-- Generated on: ${new Date().toISOString()}\n\n`
      sqlContent += `-- NOTE: This is a data-only export. Run this against an existing database schema.\n\n`

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

      // Create and download file
      const blob = new Blob([sqlContent], { type: 'text/sql' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `beekeeper-database-${new Date().toISOString().split('T')[0]}.sql`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      alert('Database exported successfully!')
    } catch (error) {
      console.error('Error exporting database:', error)
      alert('Failed to export database. Check console for details.')
    } finally {
      setExporting(false)
    }
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900">Settings ⚙️</h1>
          <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full flex items-center gap-1">
            <Shield size={14} />
            Admin Only
          </span>
        </div>
        <button
          onClick={() => setShowCategoryForm(!showCategoryForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2"
        >
          {showCategoryForm ? <X size={16} /> : <Plus size={16} />}
          {showCategoryForm ? 'Cancel' : 'Add Category'}
        </button>
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

      <div className="space-y-6">
        {categories.map((category) => {
          const isExpanded = expandedCategories.has(category.id)

          return (
            <div key={category.id} className="bg-white rounded-lg shadow">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => toggleCategory(category.id)}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown size={20} className="text-gray-500" />
                      ) : (
                        <ChevronRight size={20} className="text-gray-500" />
                      )}
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{category.category_name}</h2>
                        <p className="text-sm text-gray-500 font-mono">{category.category_key}</p>
                        {category.description && (
                          <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-6 pb-6 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-700 uppercase">Values</h3>
                <button
                  onClick={() => {
                    setEditingValue({ categoryId: category.id, value: null })
                    const maxOrder = category.dropdown_values.reduce((max, v) => Math.max(max, v.display_order), 0)
                    setValueFormData({ value: '', display_order: maxOrder + 1 })
                  }}
                  className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                >
                  <Plus size={14} /> Add Value
                </button>
              </div>

              {editingValue.categoryId === category.id && (
                <form onSubmit={handleValueSubmit} className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Value *</label>
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
                      <label className="block text-xs font-medium text-gray-700 mb-1">Display Order</label>
                      <input
                        type="number"
                        value={valueFormData.display_order}
                        onChange={(e) => setValueFormData({ ...valueFormData, display_order: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-1"
                    >
                      <Save size={14} /> {editingValue.value ? 'Update' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={resetValueForm}
                      className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {category.dropdown_values.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No values yet. Add your first value above.</p>
                ) : (
                  category.dropdown_values.map((value) => (
                    <div
                      key={value.id}
                      className={`flex justify-between items-center p-3 rounded-lg border ${
                        value.is_active ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-300 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 font-mono w-8">#{value.display_order}</span>
                        <span className={`font-medium ${!value.is_active ? 'line-through text-gray-500' : ''}`}>
                          {value.value}
                        </span>
                        {!value.is_active && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Inactive</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleValueActive(value)}
                          className={`text-xs px-3 py-1 rounded ${
                            value.is_active
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {value.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleEditValue(category.id, value)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteValue(value.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
                </div>
              )}
            </div>
          )
        })}

        {categories.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            No dropdown categories configured yet. Click &ldquo;Add Category&rdquo; to get started.
          </div>
        )}
      </div>

      {/* User Management Section - Collapsible */}
      <div className="bg-white rounded-lg shadow">
        <div
          className="p-6 cursor-pointer hover:bg-gray-50"
          onClick={() => setShowUserManagement(!showUserManagement)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showUserManagement ? (
                <ChevronDown size={20} className="text-gray-500" />
              ) : (
                <ChevronRight size={20} className="text-gray-500" />
              )}
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
                No users found. Click "Refresh Users" to load.
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
                              <span className="text-gray-400 text-xs italic">Cannot modify own role</span>
                            ) : (
                              <select
                                value={user.role}
                                onChange={(e) => handleRoleChange(user.id, e.target.value as 'User' | 'Admin')}
                                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              >
                                <option value="User">User</option>
                                <option value="Admin">Admin</option>
                              </select>
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

      {/* Database Export Section - Collapsible */}
      <div className="bg-white rounded-lg shadow">
        <div
          className="p-6 cursor-pointer"
          onClick={() => setShowExportSection(!showExportSection)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showExportSection ? (
                <ChevronDown size={20} className="text-gray-500" />
              ) : (
                <ChevronRight size={20} className="text-gray-500" />
              )}
              <div className="p-3 bg-blue-100 rounded-lg">
                <Database size={24} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Database Export</h2>
                <p className="text-sm text-gray-500">Export your data as SQL backup</p>
              </div>
            </div>
          </div>
        </div>

        {showExportSection && (
          <div className="px-6 pb-6 border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-600 mb-4">
              Export your entire beekeeping database as an SQL file. This creates a complete backup
              of all your apiaries, hives, queens, inspections, and treatments.
            </p>
            <ul className="text-sm text-gray-600 space-y-1 mb-4">
              <li>• Includes all tables and data</li>
              <li>• SQL format compatible with PostgreSQL</li>
              <li>• Use for backup or migration purposes</li>
            </ul>
            <button
              onClick={exportDatabase}
              disabled={exporting}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Export Database
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
