'use client'

import { useEffect, useState } from 'react'
import { useReportsData } from '@/hooks/useReportsData'
import { exportToCSV, printReport } from '@/lib/export-utils'
import type { ArchivedHiveRecord, TimePeriod } from '@/types/reports'
import { useReportFilters } from '@/hooks/useReportFilters'
import ReportFilters from './ReportFilters'
import ReportExportBar from './ReportExportBar'
import ReportTable, { type Column } from './ReportTable'
import PrintableReport from './PrintableReport'

interface ArchivedHivesReportProps {
  userId: string
}

export default function ArchivedHivesReport({ userId }: ArchivedHivesReportProps) {
  const { apiaries, hives, profile, loading, fetchBaseData, fetchArchivedHives } = useReportsData()
  const [archivedHives, setArchivedHives] = useState<ArchivedHiveRecord[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  const [filters, setFilters] = useReportFilters('archived-hives', (() => {
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
    const loadData = async () => {
      setDataLoading(true)
      const data = await fetchArchivedHives(userId, filters.apiaryId, filters.startDate, filters.endDate)
      setArchivedHives(data)
      setDataLoading(false)
    }
    loadData()
  }, [userId, filters.apiaryId, filters.startDate, filters.endDate, fetchArchivedHives])

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
    const exportData = archivedHives.map(h => ({
      archived_date: h.archived_at,
      hive_number: h.hive_number,
      apiary: h.apiary_name,
      reason: h.archive_reason || '',
      notes: h.archive_notes || ''
    }))
    exportToCSV(exportData, 'archived-hives-report')
  }

  const beekeeperName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
    : ''

  const dateRange = `${new Date(filters.startDate).toLocaleDateString('en-GB')} - ${new Date(filters.endDate).toLocaleDateString('en-GB')}`

  // Calculate breakdown by reason
  const reasonCounts = archivedHives.reduce((acc, h) => {
    const reason = h.archive_reason || 'Unknown'
    acc[reason] = (acc[reason] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Get top reasons sorted by count
  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  const columns: Column<ArchivedHiveRecord>[] = [
    {
      key: 'archived_at',
      header: 'Archived Date',
      render: (row: ArchivedHiveRecord) => new Date(row.archived_at).toLocaleDateString('en-GB')
    },
    { key: 'hive_number', header: 'Hive' },
    { key: 'apiary_name', header: 'Apiary' },
    {
      key: 'archive_reason',
      header: 'Reason',
      render: (row: ArchivedHiveRecord) => row.archive_reason || '-'
    },
    {
      key: 'archive_notes',
      header: 'Notes',
      className: 'max-w-xs truncate',
      render: (row: ArchivedHiveRecord) => row.archive_notes || '-'
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
        disabled={archivedHives.length === 0 || dataLoading}
      />

      <PrintableReport
        title="Archived Hives Report"
        subtitle="Overview of hives removed from active management"
        beekeeperName={beekeeperName}
        dateRange={dateRange}
      >
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-surface-secondary p-4 rounded-lg border border-border">
            <div className="text-2xl font-bold text-text-secondary">{archivedHives.length}</div>
            <div className="text-sm text-text-secondary">Total Archived</div>
          </div>
          {topReasons.map(([reason, count]) => (
            <div key={reason} className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg">
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{count}</div>
              <div className="text-sm text-amber-600 dark:text-amber-400 truncate" title={reason}>{reason}</div>
            </div>
          ))}
        </div>

        {dataLoading ? (
          <div className="text-center py-8 text-text-secondary">Loading archived hives...</div>
        ) : (
          <ReportTable
            columns={columns}
            data={archivedHives}
            emptyMessage="No archived hives found for the selected period"
          />
        )}
      </PrintableReport>
    </div>
  )
}
