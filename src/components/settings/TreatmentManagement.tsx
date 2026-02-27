'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, X, Edit2, Trash2, Save } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import FieldLabel from '@/components/ui/FieldLabel'
import TextInput from '@/components/ui/TextInput'
import TextAreaField from '@/components/ui/TextAreaField'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import Surface from '@/components/ui/Surface'
import { TableBody, TableContainer, TableHeaderRow, TableRow } from '@/components/ui/TableStyles'

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

interface TreatmentFormData {
  product_name: string
  active_ingredients: string
  notes: string
  application_method: string
  treatment_duration: string
  temperature_range: string
  honey_flow_restrictions: string
  withdrawal_period_days: number
}

const emptyFormData: TreatmentFormData = {
  product_name: '',
  active_ingredients: '',
  notes: '',
  application_method: '',
  treatment_duration: '',
  temperature_range: '',
  honey_flow_restrictions: '',
  withdrawal_period_days: 0,
}

export default function TreatmentManagement() {
  const toast = useToast()
  const [treatments, setTreatments] = useState<VarroaTreatment[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<VarroaTreatment | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState<TreatmentFormData>(emptyFormData)

  const fetchTreatments = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('varroa_treatment_products')
        .select('*')
        .order('product_name')

      if (error) {
        console.error('Error fetching varroa treatment products:', error)
        toast.error('Failed to fetch varroa treatment products.')
        return
      }

      setTreatments(data || [])
    } catch (error) {
      console.error('Error fetching varroa treatment products:', error)
      toast.error('Failed to fetch varroa treatment products.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchTreatments()
  }, [fetchTreatments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editing) {
        const { error } = await supabase
          .from('varroa_treatment_products')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editing.id)

        if (error) throw error
        toast.success('Varroa treatment product updated successfully!')
      } else {
        const { error } = await supabase
          .from('varroa_treatment_products')
          .insert([formData])

        if (error) throw error
        toast.success('Varroa treatment product added successfully!')
      }

      fetchTreatments()
      resetForm()
    } catch (error) {
      console.error('Error saving varroa treatment product:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to save varroa treatment product: ${errorMessage}`)
    }
  }

  const handleEdit = (treatment: VarroaTreatment) => {
    setEditing(treatment)
    setFormData({
      product_name: treatment.product_name,
      active_ingredients: treatment.active_ingredients,
      notes: treatment.notes || '',
      application_method: treatment.application_method,
      treatment_duration: treatment.treatment_duration,
      temperature_range: treatment.temperature_range,
      honey_flow_restrictions: treatment.honey_flow_restrictions,
      withdrawal_period_days: treatment.withdrawal_period_days,
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this varroa treatment product? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('varroa_treatment_products')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Varroa treatment product deleted successfully!')
      fetchTreatments()
    } catch (error) {
      console.error('Error deleting varroa treatment product:', error)
      toast.error('Failed to delete varroa treatment product.')
    }
  }

  const resetForm = () => {
    setShowAddForm(false)
    setEditing(null)
    setFormData(emptyFormData)
  }

  return (
    <Card padding="none">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Varroa Treatments</h2>
            <p className="text-text-tertiary mt-2">Manage approved varroa treatment products for Ireland</p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 border-t border-border pt-6 space-y-4">
        {/* Add Treatment Button */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-text-tertiary">
            Reference data for approved varroa mite treatment products in Ireland.
          </p>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            tone="success"
          >
            {showAddForm ? <X size={16} /> : <Plus size={16} />}
            {showAddForm ? 'Cancel' : 'Add Treatment'}
          </Button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <Surface padded="md" elevated={false} className="bg-surface dark:bg-background">
            <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              {editing ? 'Edit Treatment' : 'Add New Treatment'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Product Name *</FieldLabel>
                <TextInput
                  type="text"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="rounded-md"
                  required
                />
              </div>

              <div>
                <FieldLabel>Active Ingredients *</FieldLabel>
                <TextInput
                  type="text"
                  value={formData.active_ingredients}
                  onChange={(e) => setFormData({ ...formData, active_ingredients: e.target.value })}
                  className="rounded-md"
                  required
                />
              </div>

              <div>
                <FieldLabel>Application Method *</FieldLabel>
                <TextInput
                  type="text"
                  value={formData.application_method}
                  onChange={(e) => setFormData({ ...formData, application_method: e.target.value })}
                  className="rounded-md"
                  required
                />
              </div>

              <div>
                <FieldLabel>Treatment Duration *</FieldLabel>
                <TextInput
                  type="text"
                  value={formData.treatment_duration}
                  onChange={(e) => setFormData({ ...formData, treatment_duration: e.target.value })}
                  className="rounded-md"
                  required
                />
              </div>

              <div>
                <FieldLabel>Temperature Range *</FieldLabel>
                <TextInput
                  type="text"
                  value={formData.temperature_range}
                  onChange={(e) => setFormData({ ...formData, temperature_range: e.target.value })}
                  className="rounded-md"
                  required
                />
              </div>

              <div>
                <FieldLabel>Honey Flow Restrictions *</FieldLabel>
                <TextInput
                  type="text"
                  value={formData.honey_flow_restrictions}
                  onChange={(e) => setFormData({ ...formData, honey_flow_restrictions: e.target.value })}
                  className="rounded-md"
                  required
                />
              </div>

              <div>
                <FieldLabel>Withdrawal Period (days) *</FieldLabel>
                <TextInput
                  type="number"
                  value={formData.withdrawal_period_days}
                  onChange={(e) => setFormData({ ...formData, withdrawal_period_days: parseInt(e.target.value) })}
                  className="rounded-md"
                  min="0"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <FieldLabel>Notes</FieldLabel>
                <TextAreaField
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="rounded-md"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                tone="success"
                className="px-6"
              >
                <Save size={16} />
                {editing ? 'Update' : 'Add'} Treatment
              </Button>
              <Button
                type="button"
                onClick={resetForm}
                tone="neutral"
                className="px-6"
              >
                Cancel
              </Button>
            </div>
            </form>
          </Surface>
        )}

        {/* Treatments Table */}
        {loading ? (
          <div className="text-center py-8">
            <LoadingSpinner text="Loading varroa treatments..." />
          </div>
        ) : treatments.length === 0 ? (
          <div className="text-center py-8 text-text-tertiary">
            No varroa treatments found. Add your first treatment above.
          </div>
        ) : (
          <TableContainer className="border-none rounded-none">
            <table className="w-full border-collapse">
              <thead>
                <TableHeaderRow>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Actions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Product Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Active Ingredients
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Application Method
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Temperature
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Honey Flow
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Withdrawal (days)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Notes
                  </th>
                </TableHeaderRow>
              </thead>
              <TableBody>
                {treatments.map((treatment) => (
                  <TableRow key={treatment.id}>
                    {editing?.id === treatment.id ? (
                      /* Inline Edit Mode */
                      <>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <IconButton
                              onClick={handleSubmit}
                              tone="green"
                              size="xs"
                              title="Save"
                            >
                              <Save size={18} />
                            </IconButton>
                            <IconButton
                              onClick={resetForm}
                              size="xs"
                              title="Cancel"
                            >
                              <X size={18} />
                            </IconButton>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <TextInput
                            type="text"
                            value={formData.product_name}
                            onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                            className="w-full px-2 py-1 text-sm rounded"
                            placeholder="Product name"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <TextInput
                            type="text"
                            value={formData.active_ingredients}
                            onChange={(e) => setFormData({ ...formData, active_ingredients: e.target.value })}
                            className="w-full px-2 py-1 text-sm rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <TextInput
                            type="text"
                            value={formData.application_method}
                            onChange={(e) => setFormData({ ...formData, application_method: e.target.value })}
                            className="w-full px-2 py-1 text-sm rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <TextInput
                            type="text"
                            value={formData.treatment_duration}
                            onChange={(e) => setFormData({ ...formData, treatment_duration: e.target.value })}
                            className="w-full px-2 py-1 text-sm rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <TextInput
                            type="text"
                            value={formData.temperature_range}
                            onChange={(e) => setFormData({ ...formData, temperature_range: e.target.value })}
                            className="w-full px-2 py-1 text-sm rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <TextInput
                            type="text"
                            value={formData.honey_flow_restrictions}
                            onChange={(e) => setFormData({ ...formData, honey_flow_restrictions: e.target.value })}
                            className="w-full px-2 py-1 text-sm rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <TextInput
                            type="number"
                            value={formData.withdrawal_period_days}
                            onChange={(e) => setFormData({ ...formData, withdrawal_period_days: parseInt(e.target.value) })}
                            className="w-full px-2 py-1 text-sm rounded"
                            min="0"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <TextAreaField
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-2 py-1 text-sm rounded"
                            rows={2}
                          />
                        </td>
                      </>
                    ) : (
                      /* Display Mode */
                      <>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <IconButton
                              onClick={() => handleEdit(treatment)}
                              tone="blue"
                              size="xs"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </IconButton>
                            <IconButton
                              onClick={() => handleDelete(treatment.id)}
                              tone="danger"
                              size="xs"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </IconButton>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                          {treatment.product_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-tertiary">
                          {treatment.active_ingredients}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-tertiary">
                          {treatment.application_method}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-tertiary">
                          {treatment.treatment_duration}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-tertiary">
                          {treatment.temperature_range}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-tertiary">
                          {treatment.honey_flow_restrictions}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-tertiary text-center">
                          {treatment.withdrawal_period_days === 0 ? 'None' : treatment.withdrawal_period_days}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-tertiary">
                          <div className="max-w-xs truncate" title={treatment.notes || ''}>
                            {treatment.notes || '-'}
                          </div>
                        </td>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </table>
          </TableContainer>
        )}
      </div>
    </Card>
  )
}
