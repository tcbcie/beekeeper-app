'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface FinancialSummaryProps {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  isUkNi?: boolean
}

export default function FinancialSummary({
  totalIncome,
  totalExpenses,
  netProfit,
  isUkNi
}: FinancialSummaryProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat(isUkNi ? 'en-GB' : 'en-IE', {
      style: 'currency',
      currency: isUkNi ? 'GBP' : 'EUR'
    }).format(amount)
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Income Card */}
      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-xs font-medium text-green-700 dark:text-green-300">Income</span>
        </div>
        <p className="text-lg font-bold text-green-600 dark:text-green-400">
          {formatAmount(totalIncome)}
        </p>
      </div>

      {/* Expenses Card */}
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span className="text-xs font-medium text-red-700 dark:text-red-300">Expenses</span>
        </div>
        <p className="text-lg font-bold text-red-600 dark:text-red-400">
          {formatAmount(totalExpenses)}
        </p>
      </div>

      {/* Net Profit/Loss Card */}
      <div className={`rounded-lg p-3 border ${
        netProfit >= 0
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
      }`}>
        <div className="flex items-center gap-2 mb-1">
          {netProfit >= 0 ? (
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          ) : (
            <Minus className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          )}
          <span className={`text-xs font-medium ${
            netProfit >= 0
              ? 'text-blue-700 dark:text-blue-300'
              : 'text-orange-700 dark:text-orange-300'
          }`}>
            {netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
          </span>
        </div>
        <p className={`text-lg font-bold ${
          netProfit >= 0
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-orange-600 dark:text-orange-400'
        }`}>
          {formatAmount(Math.abs(netProfit))}
        </p>
      </div>
    </div>
  )
}
