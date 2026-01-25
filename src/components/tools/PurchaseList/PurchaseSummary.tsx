'use client'

import { ShoppingCart, AlertTriangle, Wallet } from 'lucide-react'

interface PurchaseSummaryProps {
  pendingCount: number
  urgentCount: number
  estimatedTotal: number
}

export default function PurchaseSummary({
  pendingCount,
  urgentCount,
  estimatedTotal
}: PurchaseSummaryProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Pending Items */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-1">
          <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Pending</span>
        </div>
        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
          {pendingCount} items
        </p>
      </div>

      {/* Urgent Items */}
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span className="text-xs font-medium text-red-700 dark:text-red-300">Urgent</span>
        </div>
        <p className="text-lg font-bold text-red-600 dark:text-red-400">
          {urgentCount} items
        </p>
      </div>

      {/* Estimated Total */}
      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-xs font-medium text-green-700 dark:text-green-300">Est. Total</span>
        </div>
        <p className="text-lg font-bold text-green-600 dark:text-green-400">
          {formatAmount(estimatedTotal)}
        </p>
      </div>
    </div>
  )
}
