'use client'

import { useEffect, useState } from 'react'
import { useReportsData } from '@/hooks/useReportsData'
import { exportToCSV, printReport } from '@/lib/export-utils'
import type { QueenFailureRecord, TimePeriod } from '@/types/reports'
import { useReportFilters } from '@/hooks/useReportFilters'
import ReportFilters from './ReportFilters'
import ReportExportBar from './ReportExportBar'
import ReportTable, { type Column } from './ReportTable'
import PrintableReport from './PrintableReport'

interface QueenFailuresReportProps {
  userId: string
}

export default function QueenFailuresReport({ userId }: QueenFailuresReportProps) {
  const { apiaries, hives, profile, loading, fetchBaseData, fetchQueenFailures } = useReportsData()
  const [failures, setFailures] = useState<QueenFailureRecord[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  const [filters, setFilters] = useReportFilters('queen-failures', (() => {
    const today = new Date()
    const oneYearAgo = new Date(today)
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    return {
      timePeriod: '1year' as TimePeriod,
      startDate: oneYearAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    }
  })())

  useEffect(() => {
    fetchBaseData(userId)
  }, [userId, fetchBaseData])

  useEffect(() => {
    let cancelled = false
    const loadData = async () => {
      setDataLoading(true)
      const data = await fetchQueenFailures(userId, filters.startDate, filters.endDate)
      if (cancelled) return
      setFailures(data)
      setDataLoading(false)
    }
    loadData()
    return () => {
      cancelled = true
    }
  }, [userId, filters.startDate, filters.endDate, fetchQueenFailures])

  const handleTimePeriodChange = (period: TimePeriod) => {
    const today = new Date()
    let startDate = filters.startDate

    if (period === '3months') {
      const date = new Date(today)
      date.setMonth(date.getMonth() - 3)
      startDate = date.toISOString().split('T')[0]
    } else if (period === '6months') {
      const date = new Date(today)
      date.setMonth(date.getMonth() - 6)
      startDate = date.toISOString().split('T')[0]
    } else if (period === '1year') {
      const date = new Date(today)
      date.setFullYear(date.getFullYear() - 1)
      startDate = date.toISOString().split('T')[0]
    } else if (period === 'all') {
      startDate = '2000-01-01'
    }

    setFilters(prev => ({
      ...prev,
      timePeriod: period,
      startDate,
      endDate: today.toISOString().split('T')[0]
    }))
  }

  const handleExportCSV = () => {
    const exportData = failures.map(f => ({
      failure_date: f.failure_date || '',
      queen: f.queen_label,
      batch: f.batch_name,
      reason: f.reason || '',
      comment: f.comment || '',
      recipient: f.recipient_name || ''
    }))
    exportToCSV(exportData, 'queen-failures-report')
  }

  const beekeeperName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
    : ''

  const dateRange = `${new Date(filters.startDate).toLocaleDateString('en-GB')} - ${new Date(filters.endDate).toLocaleDateString('en-GB')}`

  // Breakdown by failure reason (all reasons present, most common first).
  const reasonCounts = failures.reduce((acc, f) => {
    const reason = f.reason || 'No reason recorded'
    acc[reason] = (acc[reason] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const reasonBreakdown = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])

  const columns: Column<QueenFailureRecord>[] = [
    {
      key: 'failure_date',
      header: 'Failed',
      render: (row: QueenFailureRecord) => row.failure_date
        ? new Date(row.failure_date).toLocaleDateString('en-GB')
        : '-'
    },
    { key: 'queen_label', header: 'Queen' },
    { key: 'batch_name', header: 'Batch' },
    {
      key: 'reason',
      header: 'Reason',
      render: (row: QueenFailureRecord) => row.reason || '-'
    },
    {
      key: 'comment',
      header: 'Comment',
      className: 'max-w-xs truncate',
      render: (row: QueenFailureRecord) => row.comment || '-'
    }
  ]

  if (loading) {
    return <div className="text-center py-8 text-text-secondary">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <ReportFilters
        apiaryId={filters.apiaryId}
        hiveId={filters.hiveId}
        timePeriod={filters.timePeriod}
        startDate={filters.startDate}
        endDate={filters.endDate}
        apiaries={apiaries}
        hives={hives}
        showApiaryFilter={false}
        showHiveFilter={false}
        onApiaryChange={(value) => setFilters(prev => ({ ...prev, apiaryId: value }))}
        onHiveChange={(value) => setFilters(prev => ({ ...prev, hiveId: value }))}
        onTimePeriodChange={handleTimePeriodChange}
        onStartDateChange={(value) => setFilters(prev => ({ ...prev, startDate: value }))}
        onEndDateChange={(value) => setFilters(prev => ({ ...prev, endDate: value }))}
      />

      <ReportExportBar
        onExportCSV={handleExportCSV}
        onPrint={printReport}
        disabled={failures.length === 0 || dataLoading}
      />

      <PrintableReport
        title="Queen Failures Report"
        subtitle="Distributed queens marked as failed, by reason"
        beekeeperName={beekeeperName}
        dateRange={dateRange}
      >
        {/* Summary: total + breakdown by reason */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface-secondary p-4 rounded-lg border border-border">
            <div className="text-2xl font-bold text-text-secondary">{failures.length}</div>
            <div className="text-sm text-text-secondary">Total Failed</div>
          </div>
          {reasonBreakdown.map(([reason, count]) => (
            <div key={reason} className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">{count}</div>
              <div className="text-sm text-red-600 dark:text-red-400 truncate" title={reason}>{reason}</div>
            </div>
          ))}
        </div>

        {dataLoading ? (
          <div className="text-center py-8 text-text-secondary">Loading queen failures...</div>
        ) : (
          <ReportTable
            columns={columns}
            data={failures}
            emptyMessage="No queen failures found for the selected period"
          />
        )}
      </PrintableReport>
    </div>
  )
}
