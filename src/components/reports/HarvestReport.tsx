'use client'

import { useEffect, useState } from 'react'
import { useReportsData } from '@/hooks/useReportsData'
import { exportToCSV, printReport } from '@/lib/export-utils'
import type { HarvestRecord, TimePeriod } from '@/types/reports'
import { useReportFilters } from '@/hooks/useReportFilters'
import ReportFilters from './ReportFilters'
import ReportExportBar from './ReportExportBar'
import ReportTable, { type Column } from './ReportTable'
import PrintableReport from './PrintableReport'

interface HarvestReportProps {
  userId: string
}

export default function HarvestReport({ userId }: HarvestReportProps) {
  const { apiaries, hives, profile, loading, fetchBaseData, fetchHarvestData } = useReportsData()
  const [harvests, setHarvests] = useState<HarvestRecord[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  const [filters, setFilters] = useReportFilters('harvest', (() => {
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
      const data = await fetchHarvestData(userId, filters.apiaryId, filters.startDate, filters.endDate)
      setHarvests(data)
      setDataLoading(false)
    }
    loadData()
  }, [userId, filters.apiaryId, filters.startDate, filters.endDate, fetchHarvestData])

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
    const exportData = harvests.map(h => ({
      harvest_date: h.harvest_date,
      hive_number: h.hive_number,
      honey_kg: h.honey_weight ?? '',
      wax_kg: h.wax_weight ?? '',
      frames: h.frames_harvested ?? '',
      floral_source: h.floral_source || '',
      notes: h.notes
    }))
    exportToCSV(exportData, 'harvest-report')
  }

  const beekeeperName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
    : ''

  const dateRange = `${new Date(filters.startDate).toLocaleDateString('en-GB')} - ${new Date(filters.endDate).toLocaleDateString('en-GB')}`

  // Calculate totals
  const totalHoney = harvests.reduce((sum, h) => sum + (h.honey_weight || 0), 0)
  const totalWax = harvests.reduce((sum, h) => sum + (h.wax_weight || 0), 0)
  const totalFrames = harvests.reduce((sum, h) => sum + (h.frames_harvested || 0), 0)

  const columns: Column<HarvestRecord>[] = [
    {
      key: 'harvest_date',
      header: 'Date',
      render: (row: HarvestRecord) => new Date(row.harvest_date).toLocaleDateString('en-GB')
    },
    { key: 'hive_number', header: 'Hive' },
    {
      key: 'honey_weight',
      header: 'Honey (kg)',
      render: (row: HarvestRecord) => row.honey_weight != null ? row.honey_weight.toFixed(1) : '-'
    },
    {
      key: 'wax_weight',
      header: 'Wax (kg)',
      render: (row: HarvestRecord) => row.wax_weight != null ? row.wax_weight.toFixed(1) : '-'
    },
    {
      key: 'frames_harvested',
      header: 'Frames',
      render: (row: HarvestRecord) => row.frames_harvested ?? '-'
    },
    { key: 'floral_source', header: 'Floral Source' },
    { key: 'notes', header: 'Notes', className: 'max-w-xs truncate' }
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
        disabled={harvests.length === 0 || dataLoading}
      />

      <PrintableReport
        title="Harvest Report"
        subtitle="Honey and wax production summary"
        beekeeperName={beekeeperName}
        dateRange={dateRange}
      >
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg">
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{totalHoney.toFixed(1)} kg</div>
            <div className="text-sm text-amber-600 dark:text-amber-400">Total Honey</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{totalWax.toFixed(1)} kg</div>
            <div className="text-sm text-yellow-600 dark:text-yellow-400">Total Wax</div>
          </div>
          <div className="bg-forest-50 dark:bg-forest-950/30 p-4 rounded-lg">
            <div className="text-2xl font-bold text-forest-700 dark:text-forest-300">{totalFrames}</div>
            <div className="text-sm text-forest-600 dark:text-forest-400">Frames Harvested</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{harvests.length}</div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Harvest Events</div>
          </div>
        </div>

        {dataLoading ? (
          <div className="text-center py-8 text-text-secondary">Loading harvests...</div>
        ) : (
          <ReportTable
            columns={columns}
            data={harvests}
            emptyMessage="No harvests found for the selected period"
          />
        )}
      </PrintableReport>
    </div>
  )
}
