'use client'

import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import ModalShell from '@/components/ui/ModalShell'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import FormActionRow from '@/components/ui/FormActionRow'
import Button from '@/components/ui/Button'
import TextInput from '@/components/ui/TextInput'
import TextAreaField from '@/components/ui/TextAreaField'
import type { Supplier } from '@/types/records'

interface SupplierSheetProps {
  userId: string
  // null = add a new supplier
  supplier: Supplier | null
  onSaved: (supplier: Supplier) => void
  onDeleted: (supplierId: string) => void
  onClose: () => void
}

// Add or edit a supplier from the expense form (docs/features/profit-loss-suppliers.md).
// It opens inside the expense <form>, so it has no <form> of its own: Enter saves
// the supplier here instead of submitting the expense.
export default function SupplierSheet({ userId, supplier, onSaved, onDeleted, onClose }: SupplierSheetProps) {
  const toast = useToast()
  const confirm = useConfirm()
  const [name, setName] = useState(supplier?.name || '')
  const [phone, setPhone] = useState(supplier?.phone || '')
  const [email, setEmail] = useState(supplier?.email || '')
  const [notes, setNotes] = useState(supplier?.notes || '')
  const [nameError, setNameError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (saving) return
    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError('Enter the supplier\'s name')
      return
    }
    setSaving(true)
    const fields = {
      name: trimmedName,
      phone: phone.trim() || null,
      email: email.trim() || null,
      notes: notes.trim() || null,
    }
    const { data, error } = supplier
      ? await supabase
          .from('suppliers')
          .update({ ...fields, updated_at: new Date().toISOString() })
          .eq('id', supplier.id)
          .eq('user_id', userId)
          .select()
          .single()
      : await supabase
          .from('suppliers')
          .insert({ ...fields, user_id: userId })
          .select()
          .single()
    setSaving(false)
    if (error || !data) {
      console.error('Error saving supplier:', error)
      toast.error('Supplier not saved. Check your connection and try again.')
      return
    }
    toast.success('Supplier saved')
    onSaved(data as Supplier)
  }

  // Deleting keeps the expenses: the database clears their supplier (on delete set null).
  const handleDelete = async () => {
    if (!supplier || saving) return
    setSaving(true)
    const { count, error: countError } = await supabase
      .from('financial_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('supplier_id', supplier.id)
    setSaving(false)
    if (countError) {
      console.error('Error counting supplier expenses:', countError)
      toast.error('Supplier not deleted. Check your connection and try again.')
      return
    }
    const used = count ?? 0
    const ok = await confirm({
      title: `Delete ${supplier.name}?`,
      message: used > 0
        ? `It will be removed from ${used} ${used === 1 ? 'expense' : 'expenses'}. The expenses themselves are kept.`
        : 'It is not used on any expense.',
      confirmLabel: 'Delete supplier',
      variant: 'danger',
    })
    if (!ok) return
    setSaving(true)
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', supplier.id)
      .eq('user_id', userId)
    setSaving(false)
    if (error) {
      console.error('Error deleting supplier:', error)
      toast.error('Supplier not deleted. Check your connection and try again.')
      return
    }
    toast.success('Supplier deleted')
    onDeleted(supplier.id)
  }

  const saveOnEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <ModalShell
      title={supplier ? 'Edit supplier' : 'New supplier'}
      onClose={onClose}
      closeDisabled={saving}
      bodyClassName="p-4 sm:p-6"
      footer={(
        <FormActionRow className="flex-wrap justify-end">
          {supplier && (
            <Button tone="danger" onClick={handleDelete} disabled={saving} className="mr-auto flex items-center gap-2">
              <Trash2 size={16} aria-hidden="true" />
              Delete supplier
            </Button>
          )}
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button tone="success" onClick={handleSave} disabled={saving} className="flex items-center gap-2">
            {saving && <Loader2 size={16} className="animate-spin" />}
            Save supplier
          </Button>
        </FormActionRow>
      )}
    >
      <div className="space-y-4" onKeyDown={saveOnEnter}>
        <TextInput
          label="Name"
          required
          value={name}
          onChange={(e) => { setName(e.target.value); setNameError(undefined) }}
          error={nameError}
          placeholder="For example, Thornes"
          autoComplete="organization"
          enterKeyHint="done"
        />
        <TextInput
          label="Phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="off"
          enterKeyHint="done"
        />
        <TextInput
          label="Email"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          enterKeyHint="done"
        />
        <TextAreaField
          label="Notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Account number, opening hours..."
        />
      </div>
    </ModalShell>
  )
}
