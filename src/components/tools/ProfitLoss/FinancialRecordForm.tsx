'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { FinancialRecord, DropdownValue } from '@/types/records'

interface FinancialRecordFormProps {
  record: FinancialRecord | null
  incomeCategories: DropdownValue[]
  expenseCategories: DropdownValue[]
  onSubmit: (record: Partial<FinancialRecord>) => Promise<void>
  onCancel: () => void
  saving: boolean
}

export default function FinancialRecordForm({
  record,
  incomeCategories,
  expenseCategories,
  onSubmit,
  onCancel,
  saving
}: FinancialRecordFormProps) {
  const [recordType, setRecordType] = useState<'income' | 'expense'>(record?.record_type || 'expense')
  const [transactionDate, setTransactionDate] = useState(
    record?.transaction_date || new Date().toISOString().split('T')[0]
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
      alert('Please select a category')
      return
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid amount greater than 0')
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
        <button
          onClick={onCancel}
          className="p-1 hover:bg-surface-secondary rounded"
          aria-label="Close form"
        >
          <X size={20} className="text-text-secondary" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Toggle */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Type *
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRecordType('income')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                recordType === 'income'
                  ? 'bg-green-600 text-white'
                  : 'bg-surface-secondary text-text-secondary hover:bg-green-100 dark:hover:bg-green-900/20'
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setRecordType('expense')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                recordType === 'expense'
                  ? 'bg-red-600 text-white'
                  : 'bg-surface-secondary text-text-secondary hover:bg-red-100 dark:hover:bg-red-900/20'
              }`}
            >
              Expense
            </button>
          </div>
        </div>

        {/* Date and Amount Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Date *
            </label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Amount (EUR) *
            </label>
            <input
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
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Category *
          </label>
          <select
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
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the transaction"
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional details..."
            rows={2}
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 border border-border rounded-lg hover:bg-surface-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {record ? 'Update' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
