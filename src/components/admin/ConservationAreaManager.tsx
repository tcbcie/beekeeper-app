'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, Pencil, X, Loader2, MapPin } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface ConservationArea {
  id: string
  name: string
  type: 'apiary' | 'land'
  description: string | null
  latitude: number
  longitude: number
  radius_km: number
  county: string | null
  country: string
  nihbs_url: string | null
  apiary_id: string | null
  is_active: boolean
  created_at: string
}

interface CAFormData {
  name: string
  type: 'land' | 'apiary'
  description: string
  latitude: string
  longitude: string
  radius_km: string
  county: string
  country: 'IE' | 'NI'
  nihbs_url: string
  is_active: boolean
}

const defaultForm: CAFormData = {
  name: '',
  type: 'land',
  description: '',
  latitude: '',
  longitude: '',
  radius_km: '1',
  county: '',
  country: 'IE',
  nihbs_url: '',
  is_active: true,
}

export default function ConservationAreaManager() {
  const [areas, setAreas] = useState<ConservationArea[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingArea, setEditingArea] = useState<ConservationArea | null>(null)
  const [formData, setFormData] = useState<CAFormData>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const toast = useToast()

  const fetchAreas = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('conservation_areas')
      .select('id, name, type, description, latitude, longitude, radius_km, county, country, nihbs_url, apiary_id, is_active, created_at')
      .order('country', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      toast.error('Failed to load conservation areas')
    } else {
      setAreas((data as ConservationArea[]) || [])
    }
    setLoading(false)
  }, [toast])

  useEffect(() => {
    fetchAreas()
  }, [fetchAreas])

  const openAdd = () => {
    setEditingArea(null)
    setFormData(defaultForm)
    setShowModal(true)
  }

  const openEdit = (area: ConservationArea) => {
    setEditingArea(area)
    setFormData({
      name: area.name,
      type: area.type,
      description: area.description || '',
      latitude: area.latitude.toString(),
      longitude: area.longitude.toString(),
      radius_km: area.radius_km.toString(),
      county: area.county || '',
      country: area.country as 'IE' | 'NI',
      nihbs_url: area.nihbs_url || '',
      is_active: area.is_active,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }
    const lat = parseFloat(formData.latitude)
    const lng = parseFloat(formData.longitude)
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Valid latitude and longitude are required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        description: formData.description.trim() || null,
        latitude: lat,
        longitude: lng,
        radius_km: parseFloat(formData.radius_km) || 1,
        county: formData.county.trim() || null,
        country: formData.country,
        nihbs_url: formData.nihbs_url.trim() || null,
        is_active: formData.is_active,
      }

      if (editingArea) {
        const { error } = await supabase
          .from('conservation_areas')
          .update(payload)
          .eq('id', editingArea.id)
        if (error) throw error
        toast.success('Conservation area updated')
      } else {
        const { error } = await supabase
          .from('conservation_areas')
          .insert([{ ...payload, apiary_id: null }])
        if (error) throw error
        toast.success('Conservation area added')
      }
      setShowModal(false)
      fetchAreas()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete conservation area "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    const { error } = await supabase
      .from('conservation_areas')
      .delete()
      .eq('id', id)
    if (error) {
      toast.error('Failed to delete conservation area')
    } else {
      toast.success('Conservation area deleted')
      setAreas(prev => prev.filter(a => a.id !== id))
    }
    setDeletingId(null)
  }

  const typeBadge = (type: string) => {
    if (type === 'apiary') {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
          Apiary-linked
        </span>
      )
    }
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-700">
        Land plot
      </span>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
            <MapPin size={24} className="text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Conservation Areas</h2>
            <p className="text-sm text-text-tertiary">Manage NIHBS AMM conservation areas shown on the community map</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 dark:bg-teal-700 text-white rounded-lg hover:bg-teal-700 dark:hover:bg-teal-600 text-sm font-medium"
        >
          <Plus size={16} />
          Add Land CA
        </button>
      </div>

      <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-800 rounded-lg p-3 text-sm text-teal-900 dark:text-teal-200">
        <strong>Land CAs</strong> (editable here) are non-apiary conservation areas managed by power users and admins (e.g. Birr Castle, Galtee Valley).
        <strong className="ml-1">Apiary-linked CAs</strong> are declared by beekeepers from their own apiary form and are read-only here.
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-text-tertiary" />
        </div>
      ) : areas.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary">No conservation areas found.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-elevated dark:bg-surface border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Name</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Type</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">County</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Country</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Radius (km)</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Active</th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {areas.map((area) => (
                <tr key={area.id} className="hover:bg-surface-elevated/50 dark:hover:bg-surface-elevated/20">
                  <td className="px-4 py-3 font-medium text-foreground">{area.name}</td>
                  <td className="px-4 py-3">{typeBadge(area.type)}</td>
                  <td className="px-4 py-3 text-text-secondary">{area.county || '—'}</td>
                  <td className="px-4 py-3 text-text-secondary">{area.country}</td>
                  <td className="px-4 py-3 text-text-secondary">{area.radius_km}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${area.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                      {area.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Only land-type CAs are editable/deletable here */}
                      {area.type === 'land' ? (
                        <>
                          <button
                            onClick={() => openEdit(area)}
                            className="p-1.5 text-text-tertiary hover:text-forest-600 dark:hover:text-forest-400 rounded"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(area.id, area.name)}
                            disabled={deletingId === area.id}
                            className="p-1.5 text-text-tertiary hover:text-red-600 dark:hover:text-red-400 rounded disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === area.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-text-tertiary italic">Owner only</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface dark:bg-surface-elevated rounded-lg shadow-xl max-w-lg w-full p-6 border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {editingArea ? 'Edit Conservation Area' : 'Add Land Conservation Area'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-text-tertiary hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Birr Castle"
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Optional description..."
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Latitude *</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="53.10"
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Longitude *</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="-7.90"
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Radius (km)</label>
                  <input
                    type="number"
                    min="0.5"
                    max="100"
                    step="0.5"
                    value={formData.radius_km}
                    onChange={(e) => setFormData({ ...formData, radius_km: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Country</label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value as 'IE' | 'NI' })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="IE">Republic of Ireland</option>
                    <option value="NI">Northern Ireland</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">County</label>
                <input
                  type="text"
                  value={formData.county}
                  onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                  placeholder="e.g. Co. Offaly"
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">NIHBS URL</label>
                <input
                  type="url"
                  value={formData.nihbs_url}
                  onChange={(e) => setFormData({ ...formData, nihbs_url: e.target.value })}
                  placeholder="https://nihbs.org/..."
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-teal-600 border-border rounded focus:ring-teal-500"
                />
                <span className="text-sm text-text-secondary">Active (visible on map)</span>
              </label>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-sage-200 dark:bg-slate-700 text-text-primary rounded-lg hover:bg-sage-300 dark:hover:bg-slate-600 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-teal-600 dark:bg-teal-700 text-white rounded-lg hover:bg-teal-700 dark:hover:bg-teal-600 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {editingArea ? 'Update' : 'Add'} Conservation Area
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
