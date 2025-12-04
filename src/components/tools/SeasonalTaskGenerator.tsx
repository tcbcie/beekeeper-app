'use client'

import { useState } from 'react'
import { getSeasonalTasks } from '@/lib/tool-calculations'
import { Calendar, AlertCircle, Star, Lightbulb } from 'lucide-react'

export function SeasonalTaskGenerator() {
  const currentMonth = new Date().getMonth() + 1
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  const tasks = getSeasonalTasks(selectedMonth)

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Select Month</label>
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="w-full px-4 py-2 rounded-lg border border-sage-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-foreground focus:outline-none focus:ring-2 focus:ring-forest-500">
          {months.map((month, index) => (
            <option key={index} value={index + 1}>
              {month} {index + 1 === currentMonth && '(Current Month)'}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-forest-50 dark:bg-forest-900/20 p-4 rounded-lg border border-forest-200 dark:border-forest-800">
        <h3 className="text-xl font-bold text-forest-900 dark:text-forest-100 flex items-center gap-2">
          <Calendar size={24} />
          {tasks.month} Beekeeping Tasks
        </h3>
      </div>

      <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-800">
        <h4 className="font-semibold text-lg mb-4 text-red-900 dark:text-red-100 flex items-center gap-2">
          <AlertCircle size={20} />
          Critical Tasks
        </h4>
        <ul className="space-y-2">
          {tasks.critical.map((task, i) => (
            <li key={i} className="flex items-start gap-2 text-red-800 dark:text-red-200">
              <span className="font-bold">•</span><span>{task}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-lg mb-4 text-blue-900 dark:text-blue-100 flex items-center gap-2">
          <Star size={20} />
          Recommended Tasks
        </h4>
        <ul className="space-y-2">
          {tasks.recommended.map((task, i) => (
            <li key={i} className="flex items-start gap-2 text-blue-800 dark:text-blue-200">
              <span className="font-bold">•</span><span>{task}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
        <h4 className="font-semibold text-lg mb-4 text-green-900 dark:text-green-100 flex items-center gap-2">
          <Lightbulb size={20} />
          Optional Tasks
        </h4>
        <ul className="space-y-2">
          {tasks.optional.map((task, i) => (
            <li key={i} className="flex items-start gap-2 text-green-800 dark:text-green-200">
              <span className="font-bold">•</span><span>{task}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-sage-50 dark:bg-slate-800/50 p-4 rounded-lg">
        <p className="text-sm text-text-secondary text-center">
          Tasks are tailored for Ireland&apos;s climate. Adjust timing based on your local weather patterns.
        </p>
      </div>
    </div>
  )
}
