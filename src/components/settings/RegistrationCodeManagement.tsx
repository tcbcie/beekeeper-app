'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, X, Edit, Trash2, Shield, Check } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'

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

interface Association {
  id: string
  name: string
  jurisdiction: string
  county_area: string
  is_active: boolean
}

interface RegistrationCodeManagementProps {
  userId: string
}

export default function RegistrationCodeManagement({ userId }: RegistrationCodeManagementProps) {
  const toast = useToast()
  const [codes, setCodes] = useState<RegistrationCode[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [associations, setAssociations] = useState<Association[]>([])
  const [loadingAssociations, setLoadingAssociations] = useState(false)
  const [editingCodeId, setEditingCodeId] = useState<string | null>(null)
  const [editingCodeData, setEditingCodeData] = useState({
    subscription_expires_at: '',
    max_uses: '',
  })
  const [newCodeData, setNewCodeData] = useState({
    code: '',
    description: '',
    max_uses: '',
    subscription_expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    code_type: 'individual' as 'individual' | 'association',
    association_id: '',
  })

  const fetchCodes = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('registration_codes')
        .select(`
          *,
          beekeeping_associations!registration_codes_association_id_fkey(name, jurisdiction, county_area)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const transformedData = (data || []).map((code) => ({
        ...code,
        association: code.beekeeping_associations || null
      })) as RegistrationCode[]

      setCodes(transformedData)
    } catch (error) {
      console.error('Error fetching registration codes:', error)
      toast.error('Failed to fetch registration codes.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchCodes()
  }, [fetchCodes])

  const fetchAssociationsForCodes = async () => {
    setLoadingAssociations(true)
    try {
      const { data, error } = await supabase
        .from('beekeeping_associations')
        .select('*')
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
      toast.warning('Code is required')
      return
    }

    if (newCodeData.code_type === 'association' && !newCodeData.association_id) {
      toast.warning('Please select an association for association codes')
      return
    }

    try {
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

      toast.success('Subscription code created successfully!')
      setShowAddModal(false)
      setNewCodeData({
        code: '',
        description: '',
        max_uses: '',
        subscription_expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        code_type: 'individual',
        association_id: '',
      })
      fetchCodes()
    } catch (error) {
      console.error('Error creating registration code:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
        toast.error(`This code already exists. Please choose a different code.`)
      } else {
        toast.error(`Failed to create code: ${errorMessage}`)
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

      toast.success(`Code ${!currentStatus ? 'activated' : 'deactivated'} successfully!`)
      fetchCodes()
    } catch (error) {
      console.error('Error toggling code status:', error)
      toast.error('Failed to update code status.')
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

      toast.success('Code updated successfully!')
      setEditingCodeId(null)
      fetchCodes()
    } catch (error) {
      console.error('Error updating code:', error)
      toast.error('Failed to update code.')
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

      toast.success('Code deleted successfully!')
      fetchCodes()
    } catch (error) {
      console.error('Error deleting code:', error)
      toast.error('Failed to delete code.')
    }
  }

  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Shield size={24} className="text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">Subscription Codes</h2>
                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full flex items-center gap-1">
                  <Shield size={12} />
                  Admin Only
                </span>
              </div>
              <p className="text-sm text-text-tertiary">Manage codes for new user registration and subscription renewals</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-forest-600 dark:bg-emerald-600 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-emerald-700 flex items-center gap-2"
          >
            <Plus size={16} />
            Add Code
          </button>
        </div>
      </div>

      <div className="px-6 pb-6 border-t border-border pt-6">
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

        {loading ? (
          <div className="text-center py-8">
            <LoadingSpinner text="Loading subscription codes..." />
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-8 text-text-tertiary">
            No subscription codes found. Create codes for new user registration and renewals.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface dark:bg-background">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Type / Association</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Subscription Expires</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Usage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-surface dark:bg-surface-elevated divide-y divide-border">
                {codes.map((code) => {
                  const isMaxedOut = code.max_uses !== null && code.current_uses >= code.max_uses
                  const expiryDate = new Date(code.subscription_expires_at)
                  const isLifetime = expiryDate.getFullYear() > new Date().getFullYear() + 50

                  return (
                    <tr key={code.id} className="hover:bg-surface dark:bg-background">
                      <td className="px-4 py-4 text-sm font-mono font-bold text-foreground">
                        {code.code}
                      </td>
                      <td className="px-4 py-4 text-sm text-text-tertiary">
                        {code.description || <span className="italic text-text-tertiary">No description</span>}
                      </td>
                      <td className="px-4 py-4 text-sm text-text-tertiary">
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
                              <span className="text-xs text-text-tertiary">
                                {code.association.name}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-text-tertiary">
                        {editingCodeId === code.id ? (
                          <input
                            type="date"
                            value={editingCodeData.subscription_expires_at}
                            onChange={(e) => setEditingCodeData({...editingCodeData, subscription_expires_at: e.target.value})}
                            className="px-2 py-1 border border-border rounded text-sm"
                            min={new Date().toISOString().split('T')[0]}
                          />
                        ) : isLifetime ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-indigo-600">Never</span>
                            <span className="text-xs text-text-tertiary">Lifetime access</span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{expiryDate.toLocaleDateString()}</span>
                            <span className="text-xs text-text-tertiary">Fixed expiration</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-text-tertiary">
                        {editingCodeId === code.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-text-tertiary">{code.current_uses} /</span>
                            <input
                              type="number"
                              value={editingCodeData.max_uses}
                              onChange={(e) => setEditingCodeData({...editingCodeData, max_uses: e.target.value})}
                              className="w-20 px-2 py-1 border border-border rounded text-sm"
                              min="0"
                              placeholder="∞"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{code.current_uses} / {code.max_uses === null ? '∞' : code.max_uses}</span>
                            {isMaxedOut && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">Maxed</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          code.is_active && !isMaxedOut
                            ? 'bg-green-100 text-green-800'
                            : 'bg-surface-elevated dark:bg-surface-elevated text-foreground dark:text-foreground'
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
                              className="px-2 py-1 bg-surface-elevated dark:bg-surface-elevated text-foreground dark:text-foreground rounded hover:bg-surface dark:hover:bg-surface border border-border flex items-center gap-1"
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

        <div className="mt-4 text-sm text-text-tertiary">
          <p className="mb-2"><strong>Code Status:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Active:</strong> Code is valid and can be used for registration</li>
            <li><strong>Disabled:</strong> Code has been manually deactivated</li>
            <li><strong>Expired:</strong> Code has passed its expiration date</li>
            <li><strong>Maxed:</strong> Code has reached its maximum usage limit</li>
          </ul>
        </div>
      </div>

      {/* Add Code Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface dark:bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-foreground">Create Subscription Code</h3>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewCodeData({
                    code: '',
                    description: '',
                    max_uses: '',
                    subscription_expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
                    code_type: 'individual',
                    association_id: '',
                  })
                }}
                className="text-text-tertiary hover:text-text-tertiary"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCodeData.code}
                  onChange={(e) => setNewCodeData({ ...newCodeData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., BEEKEEPER2025"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                  required
                  autoComplete="off"
                />
                <p className="mt-1 text-xs text-text-tertiary">Will be automatically converted to uppercase</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
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
                    <span className="text-sm text-text-secondary">Individual</span>
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
                    <span className="text-sm text-text-secondary">Association Member</span>
                  </label>
                </div>
                <p className="mt-1 text-xs text-text-tertiary">
                  {newCodeData.code_type === 'individual' ? 'For direct user subscriptions' : 'For beekeeping association members'}
                </p>
              </div>

              {newCodeData.code_type === 'association' && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Association <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newCodeData.association_id}
                    onChange={(e) => setNewCodeData({ ...newCodeData, association_id: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    <p className="mt-1 text-xs text-text-tertiary">Loading associations...</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                <textarea
                  value={newCodeData.description}
                  onChange={(e) => setNewCodeData({ ...newCodeData, description: e.target.value })}
                  placeholder="Optional description for internal reference"
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Max Uses</label>
                <input
                  type="number"
                  value={newCodeData.max_uses}
                  onChange={(e) => setNewCodeData({ ...newCodeData, max_uses: e.target.value })}
                  placeholder="Leave empty for unlimited"
                  min="1"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-1 text-xs text-text-tertiary">Leave empty for unlimited uses</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Subscription Expiration Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newCodeData.subscription_expires_at}
                  onChange={(e) => setNewCodeData({ ...newCodeData, subscription_expires_at: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
                <p className="mt-1 text-xs text-text-tertiary">Fixed date when subscriptions activated with this code will expire</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const date = new Date()
                      date.setMonth(date.getMonth() + 1)
                      setNewCodeData({ ...newCodeData, subscription_expires_at: date.toISOString().split('T')[0] })
                    }}
                    className="text-xs px-2 py-1 bg-surface-elevated dark:bg-surface-elevated text-text-secondary rounded hover:bg-surface dark:hover:bg-surface"
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
                    className="text-xs px-2 py-1 bg-surface-elevated dark:bg-surface-elevated text-text-secondary rounded hover:bg-surface dark:hover:bg-surface"
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
                    className="text-xs px-2 py-1 bg-surface-elevated dark:bg-surface-elevated text-text-secondary rounded hover:bg-surface dark:hover:bg-surface"
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
                    setShowAddModal(false)
                    setNewCodeData({
                      code: '',
                      description: '',
                      max_uses: '',
                      subscription_expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
                      code_type: 'individual',
                      association_id: ''
                    })
                  }}
                  className="flex-1 px-4 py-2 bg-sage-200 dark:bg-slate-700 text-text-secondary rounded-lg hover:bg-sage-300 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-forest-600 dark:bg-emerald-600 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-emerald-700"
                >
                  Create Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
