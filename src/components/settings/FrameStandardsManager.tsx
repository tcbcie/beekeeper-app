'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Ruler, Plus, Edit2, Trash2, Save, X } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import TextInput from '@/components/ui/TextInput'

interface FrameStandard {
  id: string
  label: string
  width_mm: number
  height_mm: number
  display_order: number
  is_active: boolean
}

interface EditingStandard {
  id: string | null
  label: string
  width_mm: number
  height_mm: number
}

export default function FrameStandardsManager() {
  const toast = useToast()
  const confirm = useConfirm()
  const [standards, setStandards] = useState<FrameStandard[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newStandard, setNewStandard] = useState({ label: '', width_mm: 0, height_mm: 0 })
  const [editingStandard, setEditingStandard] = useState<EditingStandard | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchStandards()
  }, [])

  async function fetchStandards() {
    setLoading(true)
    const { data, error } = await supabase
      .from('frame_standards')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching frame standards:', error)
    } else {
      setStandards(data || [])
    }
    setLoading(false)
  }

  async function handleAdd() {
    if (!newStandard.label.trim() || newStandard.width_mm <= 0 || newStandard.height_mm <= 0) {
      toast.warning('Please fill in all fields with valid values')
      return
    }

    setSaving(true)
    const maxOrder = standards.length > 0 ? Math.max(...standards.map(s => s.display_order)) : 0

    const { data, error } = await supabase
      .from('frame_standards')
      .insert([{
        label: newStandard.label.trim(),
        width_mm: newStandard.width_mm,
        height_mm: newStandard.height_mm,
        display_order: maxOrder + 1
      }])
      .select()
      .single()

    if (error) {
      console.error('Error adding frame standard:', error)
      toast.error('Failed to add frame standard. Please try again.')
    } else if (data) {
      setStandards(prev => [...prev, data].sort((a, b) => a.display_order - b.display_order))
      setNewStandard({ label: '', width_mm: 0, height_mm: 0 })
      setShowAddForm(false)
    }
    setSaving(false)
  }

  async function handleUpdate() {
    if (!editingStandard || !editingStandard.id) return
    if (!editingStandard.label.trim() || editingStandard.width_mm <= 0 || editingStandard.height_mm <= 0) {
      toast.warning('Please fill in all fields with valid values')
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('frame_standards')
      .update({
        label: editingStandard.label.trim(),
        width_mm: editingStandard.width_mm,
        height_mm: editingStandard.height_mm
      })
      .eq('id', editingStandard.id)

    if (error) {
      console.error('Error updating frame standard:', error)
      toast.error('Failed to update frame standard. Please try again.')
    } else {
      setStandards(prev => prev.map(s =>
        s.id === editingStandard.id
          ? { ...s, label: editingStandard.label.trim(), width_mm: editingStandard.width_mm, height_mm: editingStandard.height_mm }
          : s
      ))
      setEditingStandard(null)
    }
    setSaving(false)
  }

  async function handleDelete(id: string, label: string) {
    const confirmed = await confirm({
      title: 'Delete Frame Standard',
      message: `Are you sure you want to delete "${label}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!confirmed) return

    const { error } = await supabase
      .from('frame_standards')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting frame standard:', error)
      toast.error('Failed to delete frame standard. Please try again.')
    } else {
      setStandards(prev => prev.filter(s => s.id !== id))
    }
  }

  function startEdit(standard: FrameStandard) {
    setEditingStandard({
      id: standard.id,
      label: standard.label,
      width_mm: standard.width_mm,
      height_mm: standard.height_mm
    })
    setShowAddForm(false)
  }

  function cancelEdit() {
    setEditingStandard(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Ruler className="text-forest-600 dark:text-emerald-500" size={24} />
          <h3 className="text-lg font-semibold text-foreground">
            Frame Standards
          </h3>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm)
            setEditingStandard(null)
          }}
          className="fj-btn fj-btn-success fj-btn-sm"
        >
          <Plus size={16} />
          Add Standard
        </button>
      </div>

      <p className="text-sm text-text-secondary">
        Manage frame standards used in the Frame Cell Calculator tool.
      </p>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-muted/30 dark:bg-muted/10 rounded-lg p-4 border border-border">
          <h4 className="font-medium text-foreground mb-3">Add New Frame Standard</h4>
          <div className="flex flex-col sm:flex-row gap-3">
            <TextInput
              type="text"
              placeholder="Label (e.g., Langstroth Deep)"
              value={newStandard.label}
              onChange={(e) => setNewStandard(prev => ({ ...prev, label: e.target.value }))}
              className="flex-1"
            />
            <TextInput
              type="number"
              placeholder="Width (mm)"
              value={newStandard.width_mm || ''}
              onChange={(e) => setNewStandard(prev => ({ ...prev, width_mm: parseInt(e.target.value) || 0 }))}
              className="w-32"
              min="1"
            />
            <TextInput
              type="number"
              placeholder="Height (mm)"
              value={newStandard.height_mm || ''}
              onChange={(e) => setNewStandard(prev => ({ ...prev, height_mm: parseInt(e.target.value) || 0 }))}
              className="w-32"
              min="1"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving}
                className="fj-btn fj-btn-success disabled:opacity-50"
              >
                <Save size={16} />
                Save
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewStandard({ label: '', width_mm: 0, height_mm: 0 })
                }}
                className="fj-btn fj-btn-neutral"
              >
                <X size={16} />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 dark:bg-muted/20">
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Label</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Width (mm)</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Height (mm)</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-foreground w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {standards.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-text-tertiary">
                  No frame standards configured.
                </td>
              </tr>
            ) : (
              standards.map((standard) => (
                <tr key={standard.id} className="hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors">
                  {editingStandard?.id === standard.id ? (
                    <>
                      <td className="px-4 py-2">
                        <TextInput
                          type="text"
                          value={editingStandard.label}
                          onChange={(e) => setEditingStandard(prev => prev ? { ...prev, label: e.target.value } : null)}
                          className="w-full px-2 py-1 rounded"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <TextInput
                          type="number"
                          value={editingStandard.width_mm}
                          onChange={(e) => setEditingStandard(prev => prev ? { ...prev, width_mm: parseInt(e.target.value) || 0 } : null)}
                          className="w-24 px-2 py-1 rounded"
                          min="1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <TextInput
                          type="number"
                          value={editingStandard.height_mm}
                          onChange={(e) => setEditingStandard(prev => prev ? { ...prev, height_mm: parseInt(e.target.value) || 0 } : null)}
                          className="w-24 px-2 py-1 rounded"
                          min="1"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={handleUpdate}
                            disabled={saving}
                            className="fj-icon-btn fj-icon-btn-green p-1.5 disabled:opacity-50"
                            title="Save"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="fj-icon-btn p-1.5"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-foreground font-medium">{standard.label}</td>
                      <td className="px-4 py-3 text-foreground">{standard.width_mm}</td>
                      <td className="px-4 py-3 text-foreground">{standard.height_mm}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => startEdit(standard)}
                            className="fj-icon-btn fj-icon-btn-blue p-1.5"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(standard.id, standard.label)}
                            className="fj-icon-btn fj-icon-btn-danger p-1.5"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-text-tertiary">
        These frame standards appear in the Frame Cell Calculator dropdown. All authenticated users can view them in the calculator.
      </p>
    </div>
  )
}
