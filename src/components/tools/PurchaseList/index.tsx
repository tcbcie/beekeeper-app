'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { ShoppingCart, Plus, Loader2, Info } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { PurchaseItem, DropdownValue } from '@/types/records'
import PurchaseItemForm from './PurchaseItemForm'
import PurchaseItemCard from './PurchaseItemCard'
import PurchaseSummary from './PurchaseSummary'
import Button from '@/components/ui/Button'

type StatusFilter = 'pending' | 'purchased' | 'all'

interface PurchaseListProps {
  userId: string
}

export default function PurchaseList({ userId }: PurchaseListProps) {
  const toast = useToast()
  const [items, setItems] = useState<PurchaseItem[]>([])
  const [categories, setCategories] = useState<DropdownValue[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<PurchaseItem | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const { data: category } = await supabase
        .from('dropdown_categories')
        .select('id')
        .eq('category_key', 'purchase_category')
        .single()

      if (category) {
        const { data: values } = await supabase
          .from('dropdown_values')
          .select('id, value')
          .eq('category_id', category.id)
          .eq('is_active', true)
          .order('display_order')

        setCategories(values || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }, [])

  // Fetch purchase items
  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('purchase_items')
        .select(`
          *,
          category:dropdown_values(value)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error fetching items:', error)
      toast.error('Failed to load purchase items')
    } finally {
      setLoading(false)
    }
  }, [userId, toast])

  // Initial data fetch
  useEffect(() => {
    fetchCategories()
    fetchItems()
  }, [fetchCategories, fetchItems])

  // Filter items by status
  const filteredItems = useMemo(() => {
    if (statusFilter === 'all') return items
    return items.filter(item => item.status === statusFilter)
  }, [items, statusFilter])

  // Calculate summary stats
  const summary = useMemo(() => {
    const pending = items.filter(i => i.status === 'pending')
    const urgent = pending.filter(i => i.priority === 'urgent')
    const estimatedTotal = pending.reduce((sum, i) => sum + (i.estimated_price || 0), 0)
    return { pendingCount: pending.length, urgentCount: urgent.length, estimatedTotal }
  }, [items])

  // Handle form submit
  const handleSubmit = async (item: Partial<PurchaseItem>) => {
    setSaving(true)
    try {
      if (editingItem?.id) {
        const { error } = await supabase
          .from('purchase_items')
          .update({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category_id: item.category_id,
            supplier: item.supplier,
            priority: item.priority,
            estimated_price: item.estimated_price,
            due_date: item.due_date,
            notes: item.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingItem.id)
          .eq('user_id', userId)

        if (error) throw error
        toast.success('Item updated')
      } else {
        const { error } = await supabase
          .from('purchase_items')
          .insert({
            user_id: userId,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category_id: item.category_id,
            supplier: item.supplier,
            priority: item.priority,
            estimated_price: item.estimated_price,
            due_date: item.due_date,
            notes: item.notes
          })

        if (error) throw error
        toast.success('Item added')
      }

      setShowForm(false)
      setEditingItem(null)
      fetchItems()
    } catch (error) {
      console.error('Error saving item:', error)
      toast.error('Failed to save item')
    } finally {
      setSaving(false)
    }
  }

  // Handle mark as purchased
  const handleMarkPurchased = async (item: PurchaseItem) => {
    try {
      const { error } = await supabase
        .from('purchase_items')
        .update({
          status: 'purchased',
          purchased_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)
        .eq('user_id', userId)

      if (error) throw error
      toast.success('Marked as purchased')
      fetchItems()
    } catch (error) {
      console.error('Error updating item:', error)
      toast.error('Failed to update item')
    }
  }

  // Handle edit
  const handleEdit = (item: PurchaseItem) => {
    setEditingItem(item)
    setShowForm(true)
  }

  // Handle delete
  const handleDelete = async (item: PurchaseItem) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const { error } = await supabase
        .from('purchase_items')
        .delete()
        .eq('id', item.id)
        .eq('user_id', userId)

      if (error) throw error
      toast.success('Item deleted')
      fetchItems()
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Failed to delete item')
    }
  }

  // Handle cancel
  const handleCancel = () => {
    setShowForm(false)
    setEditingItem(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-forest-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-forest-600" />
          <h3 className="font-semibold text-foreground">Purchase List</h3>
        </div>
        <Button
          onClick={() => {
            setEditingItem(null)
            setShowForm(true)
          }}
          tone="blue"
          size="sm"
        >
          <Plus size={18} />
          Add Item
        </Button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        {(['pending', 'purchased', 'all'] as StatusFilter[]).map((status) => (
          <Button
            key={status}
            onClick={() => setStatusFilter(status)}
            size="xs"
            tone={statusFilter === status ? 'blue' : 'neutral'}
            className={`text-sm ${
              statusFilter === status
                ? ''
                : 'bg-surface-secondary text-text-secondary hover:bg-surface-secondary/80'
            }`}
          >
            {status === 'pending' ? 'Pending' : status === 'purchased' ? 'Purchased' : 'All'}
          </Button>
        ))}
      </div>

      {/* Summary */}
      <PurchaseSummary
        pendingCount={summary.pendingCount}
        urgentCount={summary.urgentCount}
        estimatedTotal={summary.estimatedTotal}
      />

      {/* Form */}
      {showForm && (
        <PurchaseItemForm
          item={editingItem}
          categories={categories}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          saving={saving}
        />
      )}

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-8 bg-surface-secondary rounded-lg border border-border">
          <Info className="w-12 h-12 mx-auto text-text-tertiary mb-2" />
          <p className="text-text-secondary">No items found</p>
          <p className="text-sm text-text-tertiary">Click &quot;Add Item&quot; to start your list</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <PurchaseItemCard
              key={item.id}
              item={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onMarkPurchased={handleMarkPurchased}
            />
          ))}
        </div>
      )}
    </div>
  )
}
