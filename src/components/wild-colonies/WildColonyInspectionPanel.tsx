'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, ClipboardList } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { WildColonyInspection, WildColonyInspectionFormData } from '@/types/wild-colonies'
import WildColonyInspectionCard from './WildColonyInspectionCard'
import WildColonyInspectionForm from './WildColonyInspectionForm'
import { useToast } from '@/components/ui/Toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface WildColonyInspectionPanelProps {
  colonyId: string
  userId: string
}

export default function WildColonyInspectionPanel({ colonyId, userId }: WildColonyInspectionPanelProps) {
  const toast = useToast()
  const [inspections, setInspections] = useState<WildColonyInspection[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingInspection, setEditingInspection] = useState<WildColonyInspection | null>(null)

  const fetchInspections = useCallback(async () => {
    const { data, error } = await supabase
      .from('wild_colony_inspections')
      .select('*')
      .eq('wild_colony_id', colonyId)
      .order('inspection_date', { ascending: false })

    if (error) {
      console.error('Error fetching inspections:', error)
      toast.error('Failed to load inspections')
    } else {
      setInspections(data || [])
    }
    setLoading(false)
  }, [colonyId, toast])

  useEffect(() => {
    fetchInspections()
  }, [fetchInspections])

  const handleSubmit = async (formData: WildColonyInspectionFormData, imageUrl: string | null) => {
    const dataToSave = {
      wild_colony_id: colonyId,
      user_id: userId,
      inspection_date: formData.inspection_date,
      inspection_time: formData.inspection_time || null,
      activity_level: formData.activity_level,
      population_estimate: formData.population_estimate || null,
      forager_traffic: formData.forager_traffic,
      pollen_observed: formData.pollen_observed,
      drones_observed: formData.drones_observed,
      orientation_flights: formData.orientation_flights,
      temperament: formData.temperament,
      robbing_activity: formData.robbing_activity,
      dead_bees_observed: formData.dead_bees_observed,
      dead_bees_count: formData.dead_bees_count,
      deformed_wings_observed: formData.deformed_wings_observed,
      colony_status: formData.colony_status || null,
      swarm_activity_observed: formData.swarm_activity_observed,
      weather_temp: formData.weather_temp,
      weather_condition: formData.weather_condition || null,
      notes: formData.notes || null,
      image_url: imageUrl,
    }

    if (editingInspection) {
      const { error } = await supabase
        .from('wild_colony_inspections')
        .update(dataToSave)
        .eq('id', editingInspection.id)

      if (error) {
        console.error('Error updating inspection:', error)
        throw error
      }
      toast.success('Inspection updated')
    } else {
      const { error } = await supabase
        .from('wild_colony_inspections')
        .insert([dataToSave])

      if (error) {
        console.error('Error creating inspection:', error)
        throw error
      }
      toast.success('Inspection recorded')
    }

    setShowForm(false)
    setEditingInspection(null)
    fetchInspections()
  }

  const handleEdit = (inspection: WildColonyInspection) => {
    setEditingInspection(inspection)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this inspection record?')) return

    const { error } = await supabase
      .from('wild_colony_inspections')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting inspection:', error)
      toast.error('Failed to delete inspection')
    } else {
      toast.success('Inspection deleted')
      fetchInspections()
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingInspection(null)
  }

  if (loading) {
    return (
      <div className="p-6 bg-sage-50 dark:bg-slate-800/30">
        <LoadingSpinner size="sm" />
      </div>
    )
  }

  return (
    <div className="p-6 bg-sage-50 dark:bg-slate-800/30 border-t border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ClipboardList size={20} className="text-amber-600" />
          Inspections ({inspections.length})
        </h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 bg-amber-600 dark:bg-amber-500 text-white rounded-lg hover:bg-amber-700 dark:hover:bg-amber-600 font-medium flex items-center gap-1.5 text-sm"
          >
            <Plus size={16} />
            Add Inspection
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-amber-800">
          <h4 className="text-md font-medium text-foreground mb-4">
            {editingInspection ? 'Edit Inspection' : 'New Inspection'}
          </h4>
          <WildColonyInspectionForm
            initialData={editingInspection ? {
              inspection_date: editingInspection.inspection_date,
              inspection_time: editingInspection.inspection_time || '',
              activity_level: editingInspection.activity_level,
              population_estimate: editingInspection.population_estimate || '',
              forager_traffic: editingInspection.forager_traffic,
              pollen_observed: editingInspection.pollen_observed,
              drones_observed: editingInspection.drones_observed,
              orientation_flights: editingInspection.orientation_flights,
              temperament: editingInspection.temperament,
              robbing_activity: editingInspection.robbing_activity,
              dead_bees_observed: editingInspection.dead_bees_observed,
              dead_bees_count: editingInspection.dead_bees_count,
              deformed_wings_observed: editingInspection.deformed_wings_observed,
              colony_status: editingInspection.colony_status || '',
              swarm_activity_observed: editingInspection.swarm_activity_observed,
              weather_temp: editingInspection.weather_temp,
              weather_condition: editingInspection.weather_condition || '',
              notes: editingInspection.notes || '',
            } : undefined}
            initialImageUrl={editingInspection?.image_url}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isEditing={!!editingInspection}
          />
        </div>
      )}

      {/* Inspections List */}
      {inspections.length === 0 && !showForm ? (
        <div className="text-center py-8 text-text-secondary">
          <ClipboardList size={32} className="mx-auto mb-2 opacity-50" />
          <p>No inspections recorded yet.</p>
          <p className="text-sm mt-1">Click &quot;Add Inspection&quot; to record your first observation.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inspections.map((inspection) => (
            <WildColonyInspectionCard
              key={inspection.id}
              inspection={inspection}
              isOwner={inspection.user_id === userId}
              onEdit={() => handleEdit(inspection)}
              onDelete={() => handleDelete(inspection.id)}
              onImageClick={(url) => window.open(url, '_blank')}
            />
          ))}
        </div>
      )}
    </div>
  )
}
