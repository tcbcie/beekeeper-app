'use client'

import { Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { FinancialRecord } from '@/types/records'
import IconButton from '@/components/ui/IconButton'

interface FinancialRecordCardProps {
  record: FinancialRecord
  onEdit: (record: FinancialRecord) => void
  onDelete: (record: FinancialRecord) => void
  isUkNi?: boolean
}

export default function FinancialRecordCard({
  record,
  onEdit,
  onDelete,
  isUkNi
}: FinancialRecordCardProps) {
  const isIncome = record.record_type === 'income'

  // Format date as DD/MM/YYYY
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat(isUkNi ? 'en-GB' : 'en-IE', {
      style: 'currency',
      currency: isUkNi ? 'GBP' : 'EUR'
    }).format(amount)
  }

  return (
    <div
      className={`bg-surface rounded-lg border p-3 border-l-4 ${
        isIncome
          ? 'border-l-green-500 border-green-200 dark:border-green-800'
          : 'border-l-red-500 border-red-200 dark:border-red-800'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Icon, Type Badge, and Details */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Icon */}
          <div
            className={`p-2 rounded-lg flex-shrink-0 ${
              isIncome
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-red-100 dark:bg-red-900/30'
            }`}
          >
            {isIncome ? (
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Type Badge */}
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${
                  isIncome
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                }`}
              >
                {isIncome ? 'Income' : 'Expense'}
              </span>
              {/* Category */}
              <span className="text-sm font-medium text-foreground">
                {record.category?.value || 'Unknown'}
              </span>
            </div>

            {/* Date */}
            <p className="text-sm text-text-tertiary mt-1">
              {formatDate(record.transaction_date)}
            </p>

            {/* Description */}
            {record.description && (
              <p className="text-sm text-text-secondary mt-1 truncate">
                {record.description}
              </p>
            )}

            {/* Notes */}
            {record.notes && (
              <p className="text-xs text-text-tertiary mt-1 italic truncate">
                {record.notes}
              </p>
            )}
          </div>
        </div>

        {/* Right: Amount and Actions */}
        <div className="flex flex-col items-end gap-2">
          {/* Amount */}
          <span
            className={`text-lg font-semibold ${
              isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {isIncome ? '+' : '-'}{formatAmount(record.amount)}
          </span>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <IconButton
              onClick={() => onEdit(record)}
              tone="blue"
              size="sm"
              title="Edit"
            >
              <Pencil size={16} />
            </IconButton>
            <IconButton
              onClick={() => onDelete(record)}
              tone="danger"
              size="sm"
              title="Delete"
            >
              <Trash2 size={16} />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  )
}
