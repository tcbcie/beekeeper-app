'use client'

import { useEffect, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import type { Supplier } from '@/types/records'
import SupplierSheet from './SupplierSheet'

interface SupplierPickerProps {
  userId: string
  id: string
  value: string
  onChange: (supplierId: string) => void
}

// Pick the supplier on an expense, or add or edit one without leaving the form
// (docs/features/profit-loss-suppliers.md).
export default function SupplierPicker({ userId, id, value, onChange }: SupplierPickerProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  // undefined = sheet closed, null = new supplier, Supplier = editing that one
  const [sheetSupplier, setSheetSupplier] = useState<Supplier | null | undefined>(undefined)

  useEffect(() => {
    supabase
      .from('suppliers')
      .select('*')
      .eq('user_id', userId)
      .order('name')
      .then(({ data, error }) => {
        if (error) { console.error('Error fetching suppliers:', error); return }
        setSuppliers(data || [])
      })
  }, [userId])

  const selected = suppliers.find(s => s.id === value) || null

  const handleSaved = (saved: Supplier) => {
    setSuppliers(prev =>
      [...prev.filter(s => s.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name))
    )
    onChange(saved.id)
    setSheetSupplier(undefined)
  }

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1">
        Supplier
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
      >
        <option value="">No supplier</option>
        {suppliers.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <div className="mt-2 flex flex-wrap gap-2">
        {selected && (
          <Button onClick={() => setSheetSupplier(selected)} className="flex items-center gap-2 min-h-12">
            <Pencil size={16} aria-hidden="true" />
            Edit supplier
          </Button>
        )}
        <Button onClick={() => setSheetSupplier(null)} className="flex items-center gap-2 min-h-12">
          <Plus size={16} aria-hidden="true" />
          New supplier
        </Button>
      </div>

      {sheetSupplier !== undefined && (
        <SupplierSheet
          key={sheetSupplier?.id ?? 'new'}
          userId={userId}
          supplier={sheetSupplier}
          onSaved={handleSaved}
          onClose={() => setSheetSupplier(undefined)}
        />
      )}
    </div>
  )
}
