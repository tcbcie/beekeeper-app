'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

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

export default function DropdownManagement() {
  const toast = useToast()
  const [categories, setCategories] = useState<CategoryWithValues[]>([])
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<DropdownCategory | null>(null)
  const [editingValue, setEditingValue] = useState<{ categoryId: string; value: DropdownValue | null }>({ categoryId: '', value: null })
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')
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
    fetchCategories()
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
      const categoriesWithSortedValues = (data as CategoryWithValues[]).map((cat) => ({
        ...cat,
        dropdown_values: (cat.dropdown_values || []).sort((a: DropdownValue, b: DropdownValue) => a.display_order - b.display_order)
      }))
      setCategories(categoriesWithSortedValues)
    }
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
        toast.error(error.message)
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
        toast.error(error.message)
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

  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">Dropdown Values Management</h2>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setEditingValue({ categoryId: '__new__', value: null })
                setValueFormData({ value: '', display_order: 0 })
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
            >
              <Plus size={16} />
              Add Value
            </button>
            <button
              onClick={() => setShowCategoryForm(!showCategoryForm)}
              className="px-4 py-2 bg-forest-600 dark:bg-emerald-600 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-emerald-700 font-medium flex items-center gap-2"
            >
              {showCategoryForm ? <X size={16} /> : <Plus size={16} />}
              {showCategoryForm ? 'Cancel' : 'Add Category'}
            </button>
          </div>
        </div>

        {showCategoryForm && (
          <div className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h3>
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={categoryFormData.category_name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, category_name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md"
                  placeholder="e.g., Queen Marking Colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Category Key * (used in code)
                </label>
                <input
                  type="text"
                  value={categoryFormData.category_key}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, category_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  className="w-full px-3 py-2 border border-border rounded-md font-mono text-sm"
                  placeholder="e.g., queen_marking_colors"
                  required
                  disabled={!!editingCategory}
                />
                <p className="text-xs text-text-tertiary mt-1">Lowercase with underscores, cannot be changed after creation</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Description
                </label>
                <textarea
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md"
                  placeholder="Brief description of this dropdown category"
                  rows={2}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-forest-600 dark:bg-emerald-600 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-emerald-700"
                >
                  {editingCategory ? 'Update' : 'Add'} Category
                </button>
                <button
                  type="button"
                  onClick={resetCategoryForm}
                  className="px-6 py-2 bg-surface-elevated dark:bg-surface-elevated rounded-lg hover:bg-surface dark:hover:bg-surface border border-border"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Category Filter */}
        <div className="mb-4 flex items-center gap-4">
          <label className="text-sm font-medium text-text-secondary">Filter by Category:</label>
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-md text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.category_name}</option>
            ))}
          </select>
          <span className="text-sm text-text-tertiary">
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
        {(editingValue.categoryId !== '' || editingValue.value !== null) && (
          <form onSubmit={handleValueSubmit} className="bg-surface dark:bg-background p-4 rounded-lg mb-4 space-y-3">
            <h3 className="font-semibold text-foreground">
              {editingValue.value ? 'Edit Value' : 'Add New Value'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Category *
                </label>
                <select
                  value={editingValue.categoryId === '__new__' ? '' : editingValue.categoryId}
                  onChange={(e) => setEditingValue({ ...editingValue, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm"
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
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Value *
                </label>
                <input
                  type="text"
                  value={valueFormData.value}
                  onChange={(e) => setValueFormData({ ...valueFormData, value: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm"
                  placeholder="Enter value"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={valueFormData.display_order}
                  onChange={(e) => setValueFormData({ ...valueFormData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-forest-600 dark:bg-emerald-600 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-emerald-700 text-sm"
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
                className="px-4 py-2 bg-surface-elevated dark:bg-surface-elevated rounded-lg hover:bg-surface dark:hover:bg-surface border border-border text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Values Table */}
        {categories.length === 0 ? (
          <div className="bg-surface dark:bg-background rounded-lg p-12 text-center text-text-tertiary">
            No dropdown categories configured yet. Click &ldquo;Add Category&rdquo; to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-surface dark:bg-background">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface dark:bg-surface-elevated divide-y divide-border">
                {categories
                  .filter(cat => selectedCategoryFilter === 'all' || cat.id === selectedCategoryFilter)
                  .flatMap(category =>
                    (category.dropdown_values || [])
                      .sort((a, b) => a.display_order - b.display_order)
                      .map(value => ({ category, value }))
                  )
                  .map(({ category, value }) => (
                    <tr key={value.id} className="hover:bg-surface dark:bg-background">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-foreground">{category.category_name}</div>
                          <div className="text-xs text-text-tertiary font-mono">{category.category_key}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-foreground">{value.value}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-text-tertiary">#{value.display_order}</span>
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
              <div className="text-center py-8 text-text-tertiary">
                No values found. Click &ldquo;Add Value&rdquo; to create the first one.
              </div>
            )}
          </div>
        )}

        {/* Categories Management */}
        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Manage Categories</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div key={category.id} className="border border-border rounded-lg p-4 hover:border-indigo-300 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{category.category_name}</h4>
                    <p className="text-xs text-text-tertiary font-mono">{category.category_key}</p>
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
                  <p className="text-xs text-text-tertiary mt-1">{category.description}</p>
                )}
                <p className="text-xs text-text-tertiary mt-2">
                  {category.dropdown_values?.length || 0} value{(category.dropdown_values?.length || 0) !== 1 ? 's' : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
