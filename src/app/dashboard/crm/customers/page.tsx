'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { Plus, X, Contact, Mail, Phone, Pencil, Trash2, Search, Download } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import FieldLabel from '@/components/ui/FieldLabel'
import TextInput from '@/components/ui/TextInput'
import TextAreaField from '@/components/ui/TextAreaField'
import SelectField from '@/components/ui/SelectField'
import Button from '@/components/ui/Button'
import Panel from '@/components/ui/Panel'
import { useToast } from '@/components/ui/Toast'
import { formatMoney, currencyCode } from '@/lib/crm-currency'
import { formatCrmDate } from '@/lib/crm-format'
import { toCsv, downloadCsv } from '@/lib/csv'
import type { Customer, CustomerFormData, CustomerSummary } from '@/types/crm'

type SortKey = 'name' | 'orders' | 'total' | 'recent'

const EMPTY_FORM: CustomerFormData = {
  first_name: '', surname: '', company: '', email: '', phone: '',
  address_line1: '', address_line2: '', city: '', county: '',
  postcode: '', country: '', notes: '',
}

export default function CustomersPage() {
  const toast = useToast()
  const router = useRouter()
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [isUkNi, setIsUkNi] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<CustomerFormData>(EMPTY_FORM)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('name')

  const fetchCustomers = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('crm_customer_summary')
      .select('*')
      .eq('user_id', uid)
      .order('name')
    if (error) {
      toast.error('Failed to load customers')
    } else {
      // Numeric/bigint columns arrive as strings from PostgREST — coerce them.
      setCustomers((data || []).map((r) => ({
        ...r,
        order_count: Number(r.order_count) || 0,
        orders_total: Number(r.orders_total) || 0,
      })) as CustomerSummary[])
    }
    setLoading(false)
  }, [toast])

  useEffect(() => {
    const init = async () => {
      const id = await getCurrentUserId()
      if (!id) { router.push('/login'); return }
      setUserId(id)
      const { data: profile } = await supabase
        .from('profiles').select('is_uk_ni_resident').eq('id', id).maybeSingle()
      setIsUkNi(profile?.is_uk_ni_resident || false)
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
    // Fall back to splitting the combined name for any legacy record.
    const parts = (c.name || '').trim().split(/\s+/)
    setFormData({
      first_name: c.first_name || parts[0] || '',
      surname: c.surname || parts.slice(1).join(' '),
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

  // Deep link from the customer detail page: ?edit=<id> opens that customer's
  // edit form once the list has loaded (guarded so it fires only once).
  const handledEditParam = useRef(false)
  useEffect(() => {
    if (handledEditParam.current || customers.length === 0) return
    const editId = new URLSearchParams(window.location.search).get('edit')
    if (!editId) return
    const target = customers.find((c) => c.id === editId)
    if (target) {
      handledEditParam.current = true
      handleEdit(target)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    const firstName = formData.first_name.trim()
    const surname = formData.surname.trim()
    if (!firstName) {
      toast.warning('First name is required')
      return
    }

    const payload = {
      // `name` is a generated column derived from these — never written directly.
      first_name: firstName,
      surname: surname || null,
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

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matched = q
      ? customers.filter((c) =>
          [c.name, c.company, c.email, c.phone].some((f) => f?.toLowerCase().includes(q)),
        )
      : customers
    const sorted = [...matched]
    switch (sortBy) {
      case 'orders': sorted.sort((a, b) => b.order_count - a.order_count); break
      case 'total': sorted.sort((a, b) => b.orders_total - a.orders_total); break
      case 'recent': sorted.sort((a, b) => (b.last_order_date || '').localeCompare(a.last_order_date || '')); break
      default: sorted.sort((a, b) => a.name.localeCompare(b.name))
    }
    return sorted
  }, [customers, search, sortBy])

  // Export the currently-filtered customers to CSV for bookkeeping. Totals are
  // raw numbers; the address is the combined shipping address.
  const handleExport = () => {
    const code = currencyCode(isUkNi)
    const rows = filteredCustomers.map((c) => [
      c.name,
      c.company || '',
      c.email || '',
      c.phone || '',
      [c.address_line1, c.address_line2, c.city, c.county, c.postcode, c.country].filter(Boolean).join(', '),
      c.order_count,
      (Number(c.orders_total) || 0).toFixed(2),
      c.last_order_date || '',
      code,
    ])
    const csv = toCsv(
      ['Name', 'Company', 'Email', 'Phone', 'Address', 'Orders', 'Total', 'Last order', 'Currency'],
      rows,
    )
    downloadCsv(`customers-${new Date().toISOString().slice(0, 10)}.csv`, csv)
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
                <FieldLabel>First Name *</FieldLabel>
                <TextInput
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="e.g., John"
                  className="rounded-md"
                  required
                />
              </div>
              <div>
                <FieldLabel>Surname</FieldLabel>
                <TextInput
                  value={formData.surname}
                  onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                  placeholder="e.g., Murphy"
                  className="rounded-md"
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
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
              <TextInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, company, email or phone…"
                className="rounded-md"
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
            <SelectField
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="fj-control-inline rounded-md text-sm w-full sm:w-auto"
            >
              <option value="name">Sort: Name (A–Z)</option>
              <option value="recent">Sort: Most recent order</option>
              <option value="orders">Sort: Most orders</option>
              <option value="total">Sort: Highest total</option>
            </SelectField>
            <Button
              onClick={handleExport}
              tone="neutral"
              disabled={filteredCustomers.length === 0}
              className="min-h-[48px] w-full sm:w-auto"
            >
              <Download size={16} /> Export
            </Button>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-tertiary border-b border-border">
                  <th className="py-2 pr-4 font-medium">Customer</th>
                  <th className="py-2 px-4 font-medium">Contact</th>
                  <th className="py-2 px-4 font-medium text-right">Orders</th>
                  <th className="py-2 px-4 font-medium text-right">Total</th>
                  <th className="py-2 px-4 font-medium">Last order</th>
                  <th className="py-2 pl-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 hover:bg-surface-elevated/50">
                    <td className="py-3 pr-4">
                      <Link href={`/dashboard/crm/customers/${c.id}`} className="font-medium text-foreground hover:underline focus:underline focus:outline-none">
                        {c.name}
                      </Link>
                      {c.company && <div className="text-xs text-text-tertiary">{c.company}</div>}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      {c.email && <div className="truncate max-w-[220px]">{c.email}</div>}
                      {c.phone && <div>{c.phone}</div>}
                      {!c.email && !c.phone && <span className="text-text-tertiary">—</span>}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">{c.order_count}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{formatMoney(c.orders_total, isUkNi)}</td>
                    <td className="py-3 px-4 text-text-secondary whitespace-nowrap">{formatCrmDate(c.last_order_date)}</td>
                    <td className="py-3 pl-4">
                      <div className="flex gap-1 justify-end">
                        <Button onClick={() => handleEdit(c)} tone="neutral" size="sm" aria-label="Edit customer">
                          <Pencil size={16} />
                        </Button>
                        <Button onClick={() => handleDelete(c)} tone="danger" size="sm" aria-label="Delete customer">
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filteredCustomers.map((c) => (
              <Panel key={c.id} padding="md" className="flex flex-col gap-2">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <Link href={`/dashboard/crm/customers/${c.id}`} className="text-lg font-semibold text-foreground hover:underline">
                      {c.name}
                    </Link>
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
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm border-t border-border pt-2">
                  <span className="text-text-secondary">Orders: <span className="font-medium text-foreground tabular-nums">{c.order_count}</span></span>
                  <span className="text-text-secondary">Total: <span className="font-medium text-foreground tabular-nums">{formatMoney(c.orders_total, isUkNi)}</span></span>
                  <span className="text-text-secondary">Last: <span className="font-medium text-foreground">{formatCrmDate(c.last_order_date)}</span></span>
                </div>
              </Panel>
            ))}
          </div>

          {filteredCustomers.length === 0 && (
            <p className="text-center text-text-tertiary py-8">No customers match your search.</p>
          )}
        </>
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
