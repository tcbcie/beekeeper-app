'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { Plus, X, Contact, Mail, Phone, MapPin, Pencil, Trash2 } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import FieldLabel from '@/components/ui/FieldLabel'
import TextInput from '@/components/ui/TextInput'
import TextAreaField from '@/components/ui/TextAreaField'
import Button from '@/components/ui/Button'
import Panel from '@/components/ui/Panel'
import { useToast } from '@/components/ui/Toast'
import type { Customer, CustomerFormData } from '@/types/crm'

const EMPTY_FORM: CustomerFormData = {
  name: '', company: '', email: '', phone: '',
  address_line1: '', address_line2: '', city: '', county: '',
  postcode: '', country: '', notes: '',
}

export default function CustomersPage() {
  const toast = useToast()
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<CustomerFormData>(EMPTY_FORM)

  const fetchCustomers = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('crm_customers')
      .select('*')
      .eq('user_id', uid)
      .order('name')
    if (error) {
      toast.error('Failed to load customers')
    } else {
      setCustomers((data || []) as Customer[])
    }
    setLoading(false)
  }, [toast])

  useEffect(() => {
    const init = async () => {
      const id = await getCurrentUserId()
      if (!id) { router.push('/login'); return }
      setUserId(id)
      fetchCustomers(id)
    }
    init()
  }, [router, fetchCustomers])

  const resetForm = () => {
    setShowForm(false)
    setEditing(null)
    setFormData(EMPTY_FORM)
  }

  const handleEdit = (c: Customer) => {
    setEditing(c)
    setFormData({
      name: c.name,
      company: c.company || '',
      email: c.email || '',
      phone: c.phone || '',
      address_line1: c.address_line1 || '',
      address_line2: c.address_line2 || '',
      city: c.city || '',
      county: c.county || '',
      postcode: c.postcode || '',
      country: c.country || '',
      notes: c.notes || '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    if (!formData.name.trim()) {
      toast.warning('Customer name is required')
      return
    }

    const payload = {
      name: formData.name.trim(),
      company: formData.company.trim() || null,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      address_line1: formData.address_line1.trim() || null,
      address_line2: formData.address_line2.trim() || null,
      city: formData.city.trim() || null,
      county: formData.county.trim() || null,
      postcode: formData.postcode.trim() || null,
      country: formData.country.trim() || null,
      notes: formData.notes.trim() || null,
    }

    setSaving(true)
    try {
      if (editing) {
        const { error } = await supabase
          .from('crm_customers')
          .update(payload)
          .eq('id', editing.id)
          .eq('user_id', userId)
        if (error) throw error
        toast.success('Customer updated')
      } else {
        const { error } = await supabase
          .from('crm_customers')
          .insert([{ ...payload, user_id: userId }])
        if (error) throw error
        toast.success('Customer added')
      }
      resetForm()
      fetchCustomers(userId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save customer')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (c: Customer) => {
    if (!userId) return
    if (!confirm(`Delete "${c.name}"? Their orders will also be deleted. Income already recognised in the ledger is kept.`)) return
    const { error } = await supabase
      .from('crm_customers')
      .delete()
      .eq('id', c.id)
      .eq('user_id', userId)
    if (error) {
      toast.error('Failed to delete customer')
    } else {
      toast.success('Customer deleted')
      fetchCustomers(userId)
    }
  }

  if (loading) return <LoadingSpinner text="Loading customers..." />

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">Customers 👥</h1>
        <Button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          tone="success"
          className="min-h-[48px]"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Add Customer'}
        </Button>
      </div>

      {showForm && (
        <Panel padding="lg">
          <h3 className="text-xl font-semibold mb-4 text-foreground">
            {editing ? 'Edit Customer' : 'Add New Customer'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Name *</FieldLabel>
                <TextInput
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., John Murphy"
                  className="rounded-md"
                  required
                />
              </div>
              <div>
                <FieldLabel>Company</FieldLabel>
                <TextInput
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Optional"
                  className="rounded-md"
                />
              </div>
              <div>
                <FieldLabel>Email</FieldLabel>
                <TextInput
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@example.com"
                  className="rounded-md"
                />
              </div>
              <div>
                <FieldLabel>Phone</FieldLabel>
                <TextInput
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Optional"
                  className="rounded-md"
                />
              </div>
            </div>

            <details className="field-journal-panel p-4">
              <summary className="cursor-pointer text-sm font-medium text-text-secondary">
                Shipping address (optional)
              </summary>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="md:col-span-2">
                  <FieldLabel>Address line 1</FieldLabel>
                  <TextInput
                    value={formData.address_line1}
                    onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                    className="rounded-md"
                  />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Address line 2</FieldLabel>
                  <TextInput
                    value={formData.address_line2}
                    onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                    className="rounded-md"
                  />
                </div>
                <div>
                  <FieldLabel>City / Town</FieldLabel>
                  <TextInput
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="rounded-md"
                  />
                </div>
                <div>
                  <FieldLabel>County</FieldLabel>
                  <TextInput
                    value={formData.county}
                    onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                    className="rounded-md"
                  />
                </div>
                <div>
                  <FieldLabel>Eircode / Postcode</FieldLabel>
                  <TextInput
                    value={formData.postcode}
                    onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                    className="rounded-md"
                  />
                </div>
                <div>
                  <FieldLabel>Country</FieldLabel>
                  <TextInput
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="rounded-md"
                  />
                </div>
              </div>
            </details>

            <div>
              <FieldLabel>Notes</FieldLabel>
              <TextAreaField
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Preferences, delivery instructions, etc."
                className="rounded-md"
              />
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button type="submit" tone="success" disabled={saving} className="min-h-[48px] px-6">
                {editing ? 'Update' : 'Add'} Customer
              </Button>
              <Button type="button" onClick={resetForm} tone="neutral" className="min-h-[48px] px-6">
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      )}

      {customers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customers.map((c) => (
            <Panel key={c.id} padding="md" className="flex flex-col gap-2">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{c.name}</h3>
                  {c.company && <p className="text-sm text-text-tertiary">{c.company}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button onClick={() => handleEdit(c)} tone="neutral" size="sm" aria-label="Edit customer">
                    <Pencil size={16} />
                  </Button>
                  <Button onClick={() => handleDelete(c)} tone="danger" size="sm" aria-label="Delete customer">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
              <div className="text-sm text-text-secondary space-y-1">
                {c.email && (
                  <p className="flex items-center gap-2">
                    <Mail size={14} className="text-text-tertiary" /> {c.email}
                  </p>
                )}
                {c.phone && (
                  <p className="flex items-center gap-2">
                    <Phone size={14} className="text-text-tertiary" /> {c.phone}
                  </p>
                )}
                {(c.city || c.postcode) && (
                  <p className="flex items-center gap-2">
                    <MapPin size={14} className="text-text-tertiary" />
                    {[c.city, c.postcode].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}

      {customers.length === 0 && !showForm && (
        <EmptyState
          icon={Contact}
          title="No Customers Yet"
          description="Add your first customer to start tracking sales and orders."
          actionLabel="Add Customer"
          actionOnClick={() => setShowForm(true)}
        />
      )}
    </div>
  )
}
