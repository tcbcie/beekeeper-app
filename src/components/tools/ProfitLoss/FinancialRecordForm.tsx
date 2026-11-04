'use client'

import { getCurrentDate } from '@/lib/date-utils'
import { useEffect, useId, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { FinancialRecord, DropdownValue } from '@/types/records'
import Button from '@/components/ui/Button'
import { RadioChoiceGroup, RadioChoiceOption } from '@/components/ui/RadioChoiceGroup'

interface FinancialRecordFormProps {
  record: FinancialRecord | null
  incomeCategories: DropdownValue[]
  expenseCategories: DropdownValue[]
  onSubmit: (record: Partial<FinancialRecord>) => Promise<void>
  onCancel: () => void
  saving: boolean
  isUkNi?: boolean
}

export default function FinancialRecordForm({
  record,
  incomeCategories,
  expenseCategories,
  onSubmit,
  onCancel,
  saving,
  isUkNi
}: FinancialRecordFormProps) {
  const toast = useToast()
  // Ties each label to its field, so tapping a label focuses it and screen readers name it.
  const fieldId = useId()
  const [recordType, setRecordType] = useState<'income' | 'expense'>(record?.record_type || 'expense')
  const [transactionDate, setTransactionDate] = useState(
    record?.transaction_date || getCurrentDate()
  )
  const [amount, setAmount] = useState(record?.amount?.toString() || '')
  const [categoryId, setCategoryId] = useState(record?.category_id || '')
  const [description, setDescription] = useState(record?.description || '')
  const [notes, setNotes] = useState(record?.notes || '')

  // Reset category when type changes (unless editing)
  useEffect(() => {
    if (!record) {
      setCategoryId('')
    }
  }, [recordType, record])

  // Get categories based on type
  const categories = recordType === 'income' ? incomeCategories : expenseCategories

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryId) {
      toast.warning('Please select a category')
      return
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.warning('Please enter a valid amount greater than 0')
      return
    }

    await onSubmit({
      record_type: recordType,
      transaction_date: transactionDate,
      amount: parsedAmount,
      category_id: categoryId,
      description: description.trim() || null,
      notes: notes.trim() || null
    })
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-foreground">
          {record ? 'Edit Record' : 'Add Record'}
        </h4>
        <Button
          onClick={onCancel}
          className="p-1 hover:bg-surface-secondary rounded"
          aria-label="Close form"
        >
          <X size={20} className="text-text-secondary" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type: a radio group, so the choice is announced and named */}
        <fieldset>
          <legend className="block text-sm font-medium text-text-secondary mb-2">
            Type *
          </legend>
          <RadioChoiceGroup className="sm:grid-cols-2">
            {(['income', 'expense'] as const).map(type => (
              <RadioChoiceOption
                key={type}
                name={`${fieldId}-type`}
                value={type}
                checked={recordType === type}
                onChange={() => setRecordType(type)}
                title={type === 'income' ? 'Income' : 'Expense'}
                tone="green"
                className="min-h-[48px] items-center"
              />
            ))}
          </RadioChoiceGroup>
        </fieldset>

        {/* Date and Amount Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${fieldId}-date`} className="block text-sm font-medium text-text-secondary mb-1">
              Date *
            </label>
            <input
              id={`${fieldId}-date`}
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
            />
          </div>
          <div>
            <label htmlFor={`${fieldId}-amount`} className="block text-sm font-medium text-text-secondary mb-1">
              Amount ({isUkNi ? 'GBP' : 'EUR'}) *
            </label>
            <input
              id={`${fieldId}-amount`}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0.01"
              required
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label htmlFor={`${fieldId}-category`} className="block text-sm font-medium text-text-secondary mb-1">
            Category *
          </label>
          <select
            id={`${fieldId}-category`}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
          >
            <option value="">Select category...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.value}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label htmlFor={`${fieldId}-description`} className="block text-sm font-medium text-text-secondary mb-1">
            Description
          </label>
          <input
            id={`${fieldId}-description`}
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the transaction"
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor={`${fieldId}-notes`} className="block text-sm font-medium text-text-secondary mb-1">
            Notes
          </label>
          <textarea
            id={`${fieldId}-notes`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional details..."
            rows={2}
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 border border-border rounded-lg hover:bg-surface-secondary transition-colors"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {record ? 'Update' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  )
}

