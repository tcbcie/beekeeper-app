'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import ModalShell from '@/components/ui/ModalShell'
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
  onClose: () => void
}

// Add or edit a supplier from the expense form (docs/features/profit-loss-suppliers.md).
// It opens inside the expense <form>, so it has no <form> of its own: Enter saves
// the supplier here instead of submitting the expense.
export default function SupplierSheet({ userId, supplier, onSaved, onClose }: SupplierSheetProps) {
  const toast = useToast()
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
        <FormActionRow className="justify-end">
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
