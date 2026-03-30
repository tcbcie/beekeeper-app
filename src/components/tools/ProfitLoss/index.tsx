'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Wallet, Plus, Loader2, Info, Download } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { FinancialRecord, DropdownValue } from '@/types/records'
import FinancialRecordForm from './FinancialRecordForm'
import FinancialRecordCard from './FinancialRecordCard'
import FinancialSummary from './FinancialSummary'
import Button from '@/components/ui/Button'

type TimePeriod = 'month' | 'year' | 'all'

interface ProfitLossProps {
  userId: string
}

export default function ProfitLoss({ userId }: ProfitLossProps) {
  const toast = useToast()
  const [records, setRecords] = useState<FinancialRecord[]>([])
  const [incomeCategories, setIncomeCategories] = useState<DropdownValue[]>([])
  const [expenseCategories, setExpenseCategories] = useState<DropdownValue[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isUkNi, setIsUkNi] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('year')

  // Fetch dropdown categories
  const fetchCategories = useCallback(async () => {
    try {
      // Fetch income categories
      const { data: incomeCategory } = await supabase
        .from('dropdown_categories')
        .select('id')
        .eq('category_key', 'income_category')
        .single()

      if (incomeCategory) {
        const { data: incomeValues } = await supabase
          .from('dropdown_values')
          .select('id, value')
          .eq('category_id', incomeCategory.id)
          .eq('is_active', true)
          .order('display_order')

        setIncomeCategories(incomeValues || [])
      }

      // Fetch expense categories
      const { data: expenseCategory } = await supabase
        .from('dropdown_categories')
        .select('id')
        .eq('category_key', 'expense_category')
        .single()

      if (expenseCategory) {
        const { data: expenseValues } = await supabase
          .from('dropdown_values')
          .select('id, value')
          .eq('category_id', expenseCategory.id)
          .eq('is_active', true)
          .order('display_order')

        setExpenseCategories(expenseValues || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }, [])

  // Fetch financial records
  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('financial_records')
        .select(`
          *,
          category:dropdown_values(value)
        `)
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false })

      if (error) throw error
      setRecords(data || [])
    } catch (error) {
      console.error('Error fetching records:', error)
      toast.error('Failed to load financial records')
    } finally {
      setLoading(false)
    }
  }, [userId, toast])

  // Initial data fetch
  useEffect(() => {
    fetchCategories()
    fetchRecords()
    supabase
      .from('profiles')
      .select('is_uk_ni_resident')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setIsUkNi(data.is_uk_ni_resident || false)
      })
      .catch((err) => console.error('Failed to fetch UK/NI resident flag:', err))
  }, [fetchCategories, fetchRecords, userId])

  // Filter records by time period
  const filteredRecords = useMemo(() => {
    const now = new Date()
    let startDate: Date

    switch (timePeriod) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      case 'all':
      default:
        return records
    }

    return records.filter(r => new Date(r.transaction_date) >= startDate)
  }, [records, timePeriod])

  // Calculate totals
  const totals = useMemo(() => {
    const income = filteredRecords
      .filter(r => r.record_type === 'income')
      .reduce((sum, r) => sum + r.amount, 0)
    const expenses = filteredRecords
      .filter(r => r.record_type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0)
    return {
      income,
      expenses,
      net: income - expenses
    }
  }, [filteredRecords])

  // Handle form submit
  const handleSubmit = async (record: Partial<FinancialRecord>) => {
    setSaving(true)
    try {
      if (editingRecord?.id) {
        // Update existing record
        const { error } = await supabase
          .from('financial_records')
          .update({
            record_type: record.record_type,
            transaction_date: record.transaction_date,
            amount: record.amount,
            category_id: record.category_id,
            description: record.description || null,
            notes: record.notes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingRecord.id)
          .eq('user_id', userId)

        if (error) throw error
        toast.success('Record updated')
      } else {
        // Insert new record
        const { error } = await supabase
          .from('financial_records')
          .insert({
            user_id: userId,
            record_type: record.record_type,
            transaction_date: record.transaction_date,
            amount: record.amount,
            category_id: record.category_id,
            description: record.description || null,
            notes: record.notes || null
          })

        if (error) throw error
        toast.success('Record added')
      }

      setShowForm(false)
      setEditingRecord(null)
      fetchRecords()
    } catch (error) {
      console.error('Error saving record:', error)
      toast.error('Failed to save record')
    } finally {
      setSaving(false)
    }
  }

  // Handle edit
  const handleEdit = (record: FinancialRecord) => {
    setEditingRecord(record)
    setShowForm(true)
  }

  // Handle delete
  const handleDelete = async (record: FinancialRecord) => {
    if (!confirm('Are you sure you want to delete this record?')) return

    try {
      const { error } = await supabase
        .from('financial_records')
        .delete()
        .eq('id', record.id)
        .eq('user_id', userId)

      if (error) throw error
      toast.success('Record deleted')
      fetchRecords()
    } catch (error) {
      console.error('Error deleting record:', error)
      toast.error('Failed to delete record')
    }
  }

  // Handle cancel
  const handleCancel = () => {
    setShowForm(false)
    setEditingRecord(null)
  }

  // Handle export to CSV
  const handleExport = () => {
    if (filteredRecords.length === 0) {
      toast.error('No records to export')
      return
    }

    const headers = ['Date', 'Type', 'Category', `Amount (${isUkNi ? 'GBP' : 'EUR'})`, 'Description', 'Notes']
    const rows = filteredRecords.map(r => [
      r.transaction_date,
      r.record_type,
      r.category?.value || '',
      r.amount.toFixed(2),
      r.description || '',
      r.notes || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pl-records-${timePeriod}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success('Records exported')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-forest-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-forest-600" />
          <h3 className="font-semibold text-foreground">P&L Tracker</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExport}
            tone="neutral"
            size="sm"
            className="text-text-secondary hover:bg-surface-secondary transition-colors"
            title="Export to CSV"
          >
            <Download size={18} />
            Export
          </Button>
          <Button
            onClick={() => {
              setEditingRecord(null)
              setShowForm(true)
            }}
            tone="blue"
            size="sm"
          >
            <Plus size={18} />
            Add Record
          </Button>
        </div>
      </div>

      {/* Time Period Filter */}
      <div className="flex gap-2">
        {(['month', 'year', 'all'] as TimePeriod[]).map((period) => (
          <Button
            key={period}
            onClick={() => setTimePeriod(period)}
            size="xs"
            tone={timePeriod === period ? 'blue' : 'neutral'}
            className={`text-sm ${
              timePeriod === period
                ? ''
                : 'bg-surface-secondary text-text-secondary hover:bg-surface-secondary/80'
            }`}
          >
            {period === 'month' ? 'This Month' : period === 'year' ? 'This Year' : 'All Time'}
          </Button>
        ))}
      </div>

      {/* Summary Cards */}
      <FinancialSummary
        totalIncome={totals.income}
        totalExpenses={totals.expenses}
        netProfit={totals.net}
        isUkNi={isUkNi}
      />

      {/* Form */}
      {showForm && (
        <FinancialRecordForm
          record={editingRecord}
          incomeCategories={incomeCategories}
          expenseCategories={expenseCategories}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          saving={saving}
        />
      )}

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <div className="text-center py-8 bg-surface-secondary rounded-lg border border-border">
          <Info className="w-12 h-12 mx-auto text-text-tertiary mb-2" />
          <p className="text-text-secondary">No financial records yet</p>
          <p className="text-sm text-text-tertiary">Click &quot;Add Record&quot; to start tracking</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record) => (
            <FinancialRecordCard
              key={record.id}
              record={record}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isUkNi={isUkNi}
            />
          ))}
        </div>
      )}
    </div>
  )
}
