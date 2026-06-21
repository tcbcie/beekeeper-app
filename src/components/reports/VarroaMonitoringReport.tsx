'use client'

import { useEffect, useState } from 'react'
import { useReportsData } from '@/hooks/useReportsData'
import { exportToCSV, printReport } from '@/lib/export-utils'
import type { VarroaMonitoringRecord, TimePeriod } from '@/types/reports'
import { useReportFilters } from '@/hooks/useReportFilters'
import ReportFilters from './ReportFilters'
import ReportExportBar from './ReportExportBar'
import ReportTable, { type Column } from './ReportTable'
import PrintableReport from './PrintableReport'

interface VarroaMonitoringReportProps {
  userId: string
}

export default function VarroaMonitoringReport({ userId }: VarroaMonitoringReportProps) {
  const { apiaries, hives, profile, loading, fetchBaseData, fetchVarroaMonitoring } = useReportsData()
  const [records, setRecords] = useState<VarroaMonitoringRecord[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  const [filters, setFilters] = useReportFilters('varroa', (() => {
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
      const data = await fetchVarroaMonitoring(userId, filters.hiveId, filters.startDate, filters.endDate)
      setRecords(data)
      setDataLoading(false)
    }
    loadData()
  }, [userId, filters.hiveId, filters.startDate, filters.endDate, fetchVarroaMonitoring])

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
    const exportData = records.map(r => ({
      date: r.date,
      type: r.type,
      hive_number: r.hive_number,
      method: r.method || '',
      mites_count: r.mites_count ?? '',
      infestation_rate: r.infestation_rate ?? '',
      treatment_type: r.treatment_type || '',
      dosage: r.dosage || '',
      action_threshold_reached: r.action_threshold_reached ? 'Yes' : 'No'
    }))
    exportToCSV(exportData, 'varroa-monitoring')
  }

  const beekeeperName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
    : ''

  const dateRange = `${new Date(filters.startDate).toLocaleDateString('en-GB')} - ${new Date(filters.endDate).toLocaleDateString('en-GB')}`

  // Calculate summary stats
  const checks = records.filter(r => r.type === 'check')
  const treatments = records.filter(r => r.type === 'treatment')
  const avgInfestation = checks.length > 0
    ? checks.reduce((sum, c) => sum + (c.infestation_rate || 0), 0) / checks.length
    : 0
  const thresholdBreaches = checks.filter(c => c.action_threshold_reached).length

  const columns: Column<VarroaMonitoringRecord>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (row: VarroaMonitoringRecord) => new Date(row.date).toLocaleDateString('en-GB')
    },
    {
      key: 'type',
      header: 'Type',
      render: (row: VarroaMonitoringRecord) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          row.type === 'check'
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        }`}>
          {row.type === 'check' ? 'Check' : 'Treatment'}
        </span>
      )
    },
    { key: 'hive_number', header: 'Hive' },
    {
      key: 'details',
      header: 'Details',
      render: (row: VarroaMonitoringRecord) => row.type === 'check'
        ? `${row.method || '-'} - ${row.mites_count ?? '-'} mites`
        : `${row.treatment_type || '-'} - ${row.dosage || '-'}`
    },
    {
      key: 'infestation_rate',
      header: 'Infestation %',
      render: (row: VarroaMonitoringRecord) => row.infestation_rate != null
        ? `${row.infestation_rate.toFixed(1)}%`
        : '-'
    },
    {
      key: 'action_threshold_reached',
      header: 'Threshold',
      render: (row: VarroaMonitoringRecord) => row.type === 'check' ? (
        row.action_threshold_reached ? (
          <span className="text-red-600 dark:text-red-400 font-medium">Exceeded</span>
        ) : (
          <span className="text-green-600 dark:text-green-400">OK</span>
        )
      ) : '-'
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
        onApiaryChange={(value) => setFilters(prev => ({ ...prev, apiaryId: value, hiveId: '' }))}
        onHiveChange={(value) => setFilters(prev => ({ ...prev, hiveId: value }))}
        onTimePeriodChange={handleTimePeriodChange}
        onStartDateChange={(value) => setFilters(prev => ({ ...prev, startDate: value }))}
        onEndDateChange={(value) => setFilters(prev => ({ ...prev, endDate: value }))}
      />

      <ReportExportBar
        onExportCSV={handleExportCSV}
        onPrint={printReport}
        disabled={records.length === 0 || dataLoading}
      />

      <PrintableReport
        title="Varroa Monitoring Report"
        subtitle="Mite checks and treatment history"
        beekeeperName={beekeeperName}
        dateRange={dateRange}
      >
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{checks.length}</div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Varroa Checks</div>
          </div>
          <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">{treatments.length}</div>
            <div className="text-sm text-green-600 dark:text-green-400">Treatments</div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg">
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{avgInfestation.toFixed(1)}%</div>
            <div className="text-sm text-amber-600 dark:text-amber-400">Avg Infestation</div>
          </div>
          <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">{thresholdBreaches}</div>
            <div className="text-sm text-red-600 dark:text-red-400">Threshold Breaches</div>
          </div>
        </div>

        {dataLoading ? (
          <div className="text-center py-8 text-text-secondary">Loading data...</div>
        ) : (
          <ReportTable
            columns={columns}
            data={records}
            emptyMessage="No varroa monitoring records found for the selected period"
          />
        )}
      </PrintableReport>
    </div>
  )
}
