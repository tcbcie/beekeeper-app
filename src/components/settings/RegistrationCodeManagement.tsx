'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, X, Edit, Trash2, Shield, Check } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import FieldLabel from '@/components/ui/FieldLabel'
import TextInput from '@/components/ui/TextInput'
import SelectField from '@/components/ui/SelectField'
import TextAreaField from '@/components/ui/TextAreaField'
import ModalShell from '@/components/ui/ModalShell'
import FormActionRow from '@/components/ui/FormActionRow'
import { RadioChoiceGroup, RadioChoiceOption } from '@/components/ui/RadioChoiceGroup'
import InfoPanel from '@/components/ui/InfoPanel'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import Surface from '@/components/ui/Surface'

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

  const resetNewCodeForm = useCallback(() => {
    setNewCodeData({
      code: '',
      description: '',
      max_uses: '',
      subscription_expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      code_type: 'individual',
      association_id: '',
    })
  }, [])

  const closeAddModal = useCallback(() => {
    setShowAddModal(false)
    resetNewCodeForm()
  }, [resetNewCodeForm])

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
      closeAddModal()
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
    <Card padding="none">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Surface tone="purple" padded="sm" elevated={false}>
              <Shield size={24} className="text-purple-700 dark:text-purple-300" />
            </Surface>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">Subscription Codes</h2>
                <Badge tone="purple" className="gap-1">
                  <Shield size={12} />
                  Admin Only
                </Badge>
              </div>
              <p className="text-sm text-text-tertiary">Manage codes for new user registration and subscription renewals</p>
            </div>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            tone="success"
          >
            <Plus size={16} />
            Add Code
          </Button>
        </div>
      </div>

      <div className="px-6 pb-6 border-t border-border pt-6">
        <InfoPanel tone="blue" title="How Subscription Codes Work:" className="mb-4">
          <ul className="text-sm space-y-1 list-disc list-inside">
            <li><strong>New User Registration:</strong> Users enter a code during sign-up to create their account and receive initial subscription</li>
            <li><strong>Subscription Renewal:</strong> Existing users can enter codes to extend their subscription from the Profile page</li>
            <li><strong>Subscription Duration:</strong> How many days of subscription time the code grants when activated (30, 90, 180, or 365 days)</li>
            <li><strong>Code Management:</strong> Codes remain active until you manually deactivate them - no automatic expiration</li>
          </ul>
        </InfoPanel>

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
                    <tr key={code.id} className="hover:bg-surface-elevated/60">
                      <td className="px-4 py-4 text-sm font-mono font-bold text-foreground">
                        {code.code}
                      </td>
                      <td className="px-4 py-4 text-sm text-text-tertiary">
                        {code.description || <span className="italic text-text-tertiary">No description</span>}
                      </td>
                      <td className="px-4 py-4 text-sm text-text-tertiary">
                        {code.code_type === 'individual' ? (
                          <Badge tone="blue">Individual</Badge>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <Badge tone="purple">Association</Badge>
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
                          <TextInput
                            type="date"
                            value={editingCodeData.subscription_expires_at}
                            onChange={(e) => setEditingCodeData({...editingCodeData, subscription_expires_at: e.target.value})}
                            className="fj-control-inline px-2 py-1 text-sm"
                            min={new Date().toISOString().split('T')[0]}
                          />
                        ) : isLifetime ? (
                          <div className="flex flex-col">
                            <span className="font-semibold fj-text-info">Never</span>
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
                            <TextInput
                              type="number"
                              value={editingCodeData.max_uses}
                              onChange={(e) => setEditingCodeData({...editingCodeData, max_uses: e.target.value})}
                              className="fj-control-inline w-20 px-2 py-1 text-sm"
                              min="0"
                              placeholder="Unlimited"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{code.current_uses} / {code.max_uses === null ? 'Unlimited' : code.max_uses}</span>
                            {isMaxedOut && (
                              <Badge tone="amber">Maxed</Badge>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <Badge
                          tone={
                            code.is_active && !isMaxedOut
                              ? 'green'
                              : isMaxedOut
                                ? 'amber'
                                : 'neutral'
                          }
                        >
                          {code.is_active ? (isMaxedOut ? 'Maxed Out' : 'Active') : 'Disabled'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {editingCodeId === code.id ? (
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleSaveCodeEdit(code.id)}
                              tone="success"
                              size="xs"
                              title="Save changes"
                            >
                              <Check size={14} />
                              Save
                            </Button>
                            <IconButton
                              onClick={handleCancelCodeEdit}
                              size="xs"
                              title="Cancel editing"
                              aria-label="Cancel editing"
                            >
                              <X size={14} />
                            </IconButton>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <IconButton
                              onClick={() => handleEditCode(code)}
                              tone="blue"
                              size="xs"
                              title="Edit code"
                              aria-label="Edit code"
                            >
                              <Edit size={14} />
                            </IconButton>
                            <Button
                              onClick={() => handleToggleCodeActive(code.id, code.is_active)}
                              tone={code.is_active ? 'amber' : 'success'}
                              size="xs"
                              title={code.is_active ? 'Deactivate code' : 'Activate code'}
                            >
                              {code.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <IconButton
                              onClick={() => handleDeleteCode(code.id, code.code)}
                              tone="danger"
                              size="xs"
                              title="Delete code"
                              aria-label="Delete code"
                            >
                              <Trash2 size={14} />
                            </IconButton>
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
        <ModalShell
          title="Create Subscription Code"
          onClose={closeAddModal}
          maxWidthClassName="max-w-xl"
        >
          <form onSubmit={handleCreateCode} className="space-y-4">
              <div>
                <FieldLabel required>
                  Code
                </FieldLabel>
                <TextInput
                  type="text"
                  value={newCodeData.code}
                  onChange={(e) => setNewCodeData({ ...newCodeData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., BEEKEEPER2025"
                  className="font-mono"
                  tone="purple"
                  required
                  autoComplete="off"
                />
                <p className="mt-1 text-xs text-text-tertiary">Will be automatically converted to uppercase</p>
              </div>

              <div>
                <FieldLabel required>Code Type</FieldLabel>
                <RadioChoiceGroup className="sm:grid-cols-2">
                  <RadioChoiceOption
                    name="code_type"
                    value="individual"
                    tone="purple"
                    checked={newCodeData.code_type === 'individual'}
                    onChange={(e) =>
                      setNewCodeData({ ...newCodeData, code_type: e.target.value as 'individual' | 'association', association_id: '' })
                    }
                    title="Individual"
                    description="Direct user subscription code"
                  />
                  <RadioChoiceOption
                    name="code_type"
                    value="association"
                    tone="purple"
                    checked={newCodeData.code_type === 'association'}
                    onChange={(e) => {
                      setNewCodeData({ ...newCodeData, code_type: e.target.value as 'individual' | 'association' })
                      if (!associations.length) fetchAssociationsForCodes()
                    }}
                    title="Association Member"
                    description="Restrict to selected association"
                  />
                </RadioChoiceGroup>
                <p className="mt-1 text-xs text-text-tertiary">
                  {newCodeData.code_type === 'individual' ? 'For direct user subscriptions' : 'For beekeeping association members'}
                </p>
              </div>

              {newCodeData.code_type === 'association' && (
                <div>
                  <FieldLabel required>Association</FieldLabel>
                  <SelectField
                    value={newCodeData.association_id}
                    onChange={(e) => setNewCodeData({ ...newCodeData, association_id: e.target.value })}
                    tone="purple"
                    required={newCodeData.code_type === 'association'}
                  >
                    <option value="">Select an association...</option>
                    {associations.map((assoc) => (
                      <option key={assoc.id} value={assoc.id}>
                        {assoc.name} ({assoc.jurisdiction})
                      </option>
                    ))}
                  </SelectField>
                  {loadingAssociations && (
                    <p className="mt-1 text-xs text-text-tertiary">Loading associations...</p>
                  )}
                </div>
              )}

              <div>
                <FieldLabel>Description</FieldLabel>
                <TextAreaField
                  value={newCodeData.description}
                  onChange={(e) => setNewCodeData({ ...newCodeData, description: e.target.value })}
                  placeholder="Optional description for internal reference"
                  rows={2}
                  tone="purple"
                />
              </div>

              <div>
                <FieldLabel>Max Uses</FieldLabel>
                <TextInput
                  type="number"
                  value={newCodeData.max_uses}
                  onChange={(e) => setNewCodeData({ ...newCodeData, max_uses: e.target.value })}
                  placeholder="Leave empty for unlimited"
                  min="1"
                  tone="purple"
                />
                <p className="mt-1 text-xs text-text-tertiary">Leave empty for unlimited uses</p>
              </div>

              <div>
                <FieldLabel required>Subscription Expiration Date</FieldLabel>
                <TextInput
                  type="date"
                  value={newCodeData.subscription_expires_at}
                  onChange={(e) => setNewCodeData({ ...newCodeData, subscription_expires_at: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  tone="purple"
                  required
                />
                <p className="mt-1 text-xs text-text-tertiary">Fixed date when subscriptions activated with this code will expire</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      const date = new Date()
                      date.setMonth(date.getMonth() + 1)
                      setNewCodeData({ ...newCodeData, subscription_expires_at: date.toISOString().split('T')[0] })
                    }}
                    tone="neutral"
                    size="xs"
                  >
                    +1 month
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      const date = new Date()
                      date.setMonth(date.getMonth() + 6)
                      setNewCodeData({ ...newCodeData, subscription_expires_at: date.toISOString().split('T')[0] })
                    }}
                    tone="neutral"
                    size="xs"
                  >
                    +6 months
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      const date = new Date()
                      date.setFullYear(date.getFullYear() + 1)
                      setNewCodeData({ ...newCodeData, subscription_expires_at: date.toISOString().split('T')[0] })
                    }}
                    tone="neutral"
                    size="xs"
                  >
                    +1 year
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      const date = new Date()
                      date.setFullYear(date.getFullYear() + 100)
                      setNewCodeData({ ...newCodeData, subscription_expires_at: date.toISOString().split('T')[0] })
                    }}
                    tone="purple"
                    size="xs"
                  >
                    Lifetime
                  </Button>
                </div>
              </div>

              <FormActionRow className="pt-2">
                <Button
                  type="button"
                  onClick={closeAddModal}
                  tone="neutral"
                  fullWidth
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  tone="success"
                  fullWidth
                >
                  Create Code
                </Button>
              </FormActionRow>
          </form>
        </ModalShell>
      )}
    </Card>
  )
}
