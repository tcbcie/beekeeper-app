'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import FieldLabel from '@/components/ui/FieldLabel'
import TextInput from '@/components/ui/TextInput'
import SelectField from '@/components/ui/SelectField'
import TextAreaField from '@/components/ui/TextAreaField'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import Badge from '@/components/ui/Badge'
import Surface from '@/components/ui/Surface'
import { TableBody, TableContainer, TableHeaderRow, TableRow } from '@/components/ui/TableStyles'

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
    <Card padding="none">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">Dropdown Values Management</h2>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setEditingValue({ categoryId: '__new__', value: null })
                setValueFormData({ value: '', display_order: 0 })
              }}
              tone="success"
            >
              <Plus size={16} />
              Add Value
            </Button>
            <Button
              onClick={() => setShowCategoryForm(!showCategoryForm)}
              tone="success"
            >
              {showCategoryForm ? <X size={16} /> : <Plus size={16} />}
              {showCategoryForm ? 'Cancel' : 'Add Category'}
            </Button>
          </div>
        </div>

        {showCategoryForm && (
          <Card padding="md" className="shadow-lg">
            <h3 className="text-xl font-semibold mb-4">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h3>
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <FieldLabel required>
                  Category Name
                </FieldLabel>
                <TextInput
                  type="text"
                  value={categoryFormData.category_name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, category_name: e.target.value })}
                  placeholder="e.g., Queen Marking Colors"
                  required
                />
              </div>

              <div>
                <FieldLabel required>
                  Category Key (used in code)
                </FieldLabel>
                <TextInput
                  type="text"
                  value={categoryFormData.category_key}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, category_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  className="font-mono text-sm"
                  placeholder="e.g., queen_marking_colors"
                  required
                  disabled={!!editingCategory}
                />
                <p className="text-xs text-text-tertiary mt-1">Lowercase with underscores, cannot be changed after creation</p>
              </div>

              <div>
                <FieldLabel>
                  Description
                </FieldLabel>
                <TextAreaField
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  placeholder="Brief description of this dropdown category"
                  rows={2}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  tone="success"
                >
                  {editingCategory ? 'Update' : 'Add'} Category
                </Button>
                <Button
                  type="button"
                  onClick={resetCategoryForm}
                  tone="neutral"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Category Filter */}
        <div className="mb-4 flex items-center gap-4">
          <label className="text-sm font-medium text-text-secondary">Filter by Category:</label>
          <SelectField
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="fj-control-inline text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.category_name}</option>
            ))}
          </SelectField>
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
          <Surface padded="sm" elevated={false} className="mb-4 bg-surface dark:bg-background">
            <form onSubmit={handleValueSubmit} className="space-y-3">
            <h3 className="font-semibold text-foreground">
              {editingValue.value ? 'Edit Value' : 'Add New Value'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <FieldLabel required>
                  Category
                </FieldLabel>
                <SelectField
                  value={editingValue.categoryId === '__new__' ? '' : editingValue.categoryId}
                  onChange={(e) => setEditingValue({ ...editingValue, categoryId: e.target.value })}
                  className="text-sm"
                  required
                  disabled={!!editingValue.value}
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                  ))}
                </SelectField>
              </div>
              <div>
                <FieldLabel required>
                  Value
                </FieldLabel>
                <TextInput
                  type="text"
                  value={valueFormData.value}
                  onChange={(e) => setValueFormData({ ...valueFormData, value: e.target.value })}
                  className="text-sm"
                  placeholder="Enter value"
                  required
                />
              </div>
              <div>
                <FieldLabel>
                  Display Order
                </FieldLabel>
                <TextInput
                  type="number"
                  value={valueFormData.display_order}
                  onChange={(e) => setValueFormData({ ...valueFormData, display_order: parseInt(e.target.value) || 0 })}
                  className="text-sm"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                tone="success"
                size="sm"
              >
                <Save size={14} className="inline mr-1" />
                {editingValue.value ? 'Update' : 'Add'} Value
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setEditingValue({ categoryId: '', value: null })
                  setValueFormData({ value: '', display_order: 0 })
                }}
                tone="neutral"
                size="sm"
              >
                Cancel
              </Button>
            </div>
            </form>
          </Surface>
        )}

        {/* Values Table */}
        {categories.length === 0 ? (
          <Surface padded="lg" elevated={false} className="text-center text-text-tertiary bg-surface dark:bg-background">
            No dropdown categories configured yet. Click &ldquo;Add Category&rdquo; to get started.
          </Surface>
        ) : (
          <TableContainer className="border-none rounded-none">
            <table className="min-w-full">
              <thead>
                <TableHeaderRow className="bg-surface dark:bg-background border-b border-border">
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
                </TableHeaderRow>
              </thead>
              <TableBody>
                {categories
                  .filter(cat => selectedCategoryFilter === 'all' || cat.id === selectedCategoryFilter)
                  .flatMap(category =>
                    (category.dropdown_values || [])
                      .sort((a, b) => a.display_order - b.display_order)
                      .map(value => ({ category, value }))
                  )
                  .map(({ category, value }) => (
                    <TableRow key={value.id}>
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
                          <Badge tone="green">
                            Active
                          </Badge>
                        ) : (
                          <Badge tone="red">
                            Inactive
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <IconButton
                            onClick={() => handleEditValue(category.id, value)}
                            tone="blue"
                            size="xs"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </IconButton>
                          <IconButton
                            onClick={() => handleToggleValueStatus(value.id, value.is_active)}
                            tone={value.is_active ? 'amber' : 'green'}
                            size="xs"
                            title={value.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {value.is_active ? <X size={16} /> : <Plus size={16} />}
                          </IconButton>
                          <IconButton
                            onClick={() => handleDeleteValue(value.id)}
                            tone="danger"
                            size="xs"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </div>
                      </td>
                    </TableRow>
                  ))}
              </TableBody>
            </table>
            {categories
              .filter(cat => selectedCategoryFilter === 'all' || cat.id === selectedCategoryFilter)
              .every(cat => !cat.dropdown_values || cat.dropdown_values.length === 0) && (
              <div className="text-center py-8 text-text-tertiary">
                No values found. Click &ldquo;Add Value&rdquo; to create the first one.
              </div>
            )}
          </TableContainer>
        )}

        {/* Categories Management */}
        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Manage Categories</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div key={category.id} className="border border-border rounded-lg p-4 hover:border-accent-primary transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{category.category_name}</h4>
                    <p className="text-xs text-text-tertiary font-mono">{category.category_key}</p>
                  </div>
                  <div className="flex gap-1">
                    <IconButton
                      onClick={() => handleEditCategory(category)}
                      tone="blue"
                      size="xs"
                      title="Edit Category"
                    >
                      <Edit2 size={14} />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDeleteCategory(category.id)}
                      tone="danger"
                      size="xs"
                      title="Delete Category"
                    >
                      <Trash2 size={14} />
                    </IconButton>
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
    </Card>
  )
}
