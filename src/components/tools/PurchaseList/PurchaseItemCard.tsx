'use client'

import { Pencil, Trash2, Check, Calendar, Store } from 'lucide-react'
import { PurchaseItem } from '@/types/records'
import IconButton from '@/components/ui/IconButton'

interface PurchaseItemCardProps {
  item: PurchaseItem
  onEdit: (item: PurchaseItem) => void
  onDelete: (item: PurchaseItem) => void
  onMarkPurchased: (item: PurchaseItem) => void
}

const priorityStyles = {
  urgent: {
    border: 'border-l-red-500',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
  },
  high: {
    border: 'border-l-orange-500',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'
  },
  medium: {
    border: 'border-l-amber-500',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
  },
  low: {
    border: 'border-l-gray-400',
    badge: 'bg-surface-secondary text-text-secondary'
  }
}

export default function PurchaseItemCard({
  item,
  onEdit,
  onDelete,
  onMarkPurchased
}: PurchaseItemCardProps) {
  const isPurchased = item.status === 'purchased'
  const style = priorityStyles[item.priority]

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR'
    }).format(price)
  }

  return (
    <div
      className={`bg-surface rounded-lg border p-3 border-l-4 ${style.border} ${
        isPurchased ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Item name */}
            <span className={`font-medium text-foreground ${isPurchased ? 'line-through' : ''}`}>
              {item.name}
            </span>
            {/* Priority badge */}
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${style.badge}`}>
              {item.priority}
            </span>
            {/* Category badge */}
            {item.category?.value && (
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                {item.category.value}
              </span>
            )}
          </div>

          {/* Quantity and supplier row */}
          <div className="flex items-center gap-4 mt-1 text-sm text-text-secondary">
            {item.quantity && (
              <span>
                {item.quantity} {item.unit || 'units'}
              </span>
            )}
            {item.supplier && (
              <span className="flex items-center gap-1">
                <Store size={14} />
                {item.supplier}
              </span>
            )}
            {item.due_date && (
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {formatDate(item.due_date)}
              </span>
            )}
          </div>

          {/* Notes */}
          {item.notes && (
            <p className="text-xs text-text-tertiary mt-1 italic truncate">
              {item.notes}
            </p>
          )}
        </div>

        {/* Right: Price and Actions */}
        <div className="flex flex-col items-end gap-2">
          {/* Price */}
          {item.estimated_price && (
            <span className="text-lg font-semibold text-foreground">
              {formatPrice(item.estimated_price)}
            </span>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1">
            {!isPurchased && (
              <IconButton
                onClick={() => onMarkPurchased(item)}
                tone="green"
                size="sm"
                title="Mark as purchased"
              >
                <Check size={16} />
              </IconButton>
            )}
            <IconButton
              onClick={() => onEdit(item)}
              tone="blue"
              size="sm"
              title="Edit"
            >
              <Pencil size={16} />
            </IconButton>
            <IconButton
              onClick={() => onDelete(item)}
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
