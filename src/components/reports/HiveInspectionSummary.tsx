'use client'

import { useEffect, useState } from 'react'
import { useReportsData } from '@/hooks/useReportsData'
import { exportToCSV, printReport } from '@/lib/export-utils'
import type { InspectionSummaryRecord, TimePeriod, ReportFilters } from '@/types/reports'
import ReportFilters from './ReportFilters'
import ReportExportBar from './ReportExportBar'
import ReportTable from './ReportTable'
import PrintableReport from './PrintableReport'

interface HiveInspectionSummaryProps {
  userId: string
}

export default function HiveInspectionSummary({ userId }: HiveInspectionSummaryProps) {
  const { apiaries, hives, profile, loading, fetchBaseData, fetchInspectionSummary } = useReportsData()
  const [inspections, setInspections] = useState<InspectionSummaryRecord[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  const [filters, setFilters] = useState<ReportFilters>(() => {
    const today = new Date()
    const oneYearAgo = new Date(today)
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    return {
      apiaryId: '',
      hiveId: '',
      timePeriod: '1year' as TimePeriod,
      startDate: oneYearAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    }
  })

  useEffect(() => {
    fetchBaseData(userId)
  }, [userId, fetchBaseData])

  useEffect(() => {
    const loadData = async () => {
      if (!filters.hiveId) {
        setInspections([])
        return
      }
      setDataLoading(true)
      const data = await fetchInspectionSummary(userId, filters.hiveId, filters.startDate, filters.endDate)
      setInspections(data)
      setDataLoading(false)
    }
    loadData()
  }, [userId, filters.hiveId, filters.startDate, filters.endDate, fetchInspectionSummary])

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
    const exportData = inspections.map(i => ({
      inspection_date: i.inspection_date,
      queen_seen: i.queen_seen ? 'Yes' : 'No',
      eggs_present: i.eggs_present ? 'Yes' : 'No',
      brood_pattern: i.brood_pattern_rating,
      temperament: i.temperament_rating,
      population: i.population_strength,
      honey_supers: i.honey_supers,
      notes: i.notes
    }))
    exportToCSV(exportData, 'hive-inspection-summary')
  }

  const beekeeperName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
    : ''

  const selectedHive = hives.find(h => h.id === filters.hiveId)
  const dateRange = `${new Date(filters.startDate).toLocaleDateString('en-GB')} - ${new Date(filters.endDate).toLocaleDateString('en-GB')}`

  const renderRating = (rating: number) => {
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500']
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className={`w-3 h-3 rounded-full ${n <= rating ? colors[rating - 1] : 'bg-gray-200 dark:bg-gray-700'}`}
          />
        ))}
      </div>
    )
  }

  const columns = [
    {
      key: 'inspection_date',
      header: 'Date',
      render: (row: InspectionSummaryRecord) => new Date(row.inspection_date).toLocaleDateString('en-GB')
    },
    {
      key: 'queen_seen',
      header: 'Queen',
      render: (row: InspectionSummaryRecord) => row.queen_seen ? '✓' : '✗'
    },
    {
      key: 'eggs_present',
      header: 'Eggs',
      render: (row: InspectionSummaryRecord) => row.eggs_present ? '✓' : '✗'
    },
    {
      key: 'brood_pattern_rating',
      header: 'Brood',
      render: (row: InspectionSummaryRecord) => renderRating(row.brood_pattern_rating)
    },
    {
      key: 'temperament_rating',
      header: 'Temper',
      render: (row: InspectionSummaryRecord) => renderRating(row.temperament_rating)
    },
    {
      key: 'population_strength',
      header: 'Population',
      render: (row: InspectionSummaryRecord) => renderRating(row.population_strength)
    },
    { key: 'honey_supers', header: 'Supers' },
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
        onApiaryChange={(value) => setFilters(prev => ({ ...prev, apiaryId: value, hiveId: '' }))}
        onHiveChange={(value) => setFilters(prev => ({ ...prev, hiveId: value }))}
        onTimePeriodChange={handleTimePeriodChange}
        onStartDateChange={(value) => setFilters(prev => ({ ...prev, startDate: value }))}
        onEndDateChange={(value) => setFilters(prev => ({ ...prev, endDate: value }))}
      />

      {!filters.hiveId && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-amber-800 dark:text-amber-200">
          Please select a hive to view its inspection history.
        </div>
      )}

      {filters.hiveId && (
        <>
          <ReportExportBar
            onExportCSV={handleExportCSV}
            onPrint={printReport}
            disabled={inspections.length === 0 || dataLoading}
          />

          <PrintableReport
            title="Hive Inspection Summary"
            subtitle={selectedHive ? `Hive: ${selectedHive.hive_number}` : ''}
            beekeeperName={beekeeperName}
            dateRange={dateRange}
          >
            {dataLoading ? (
              <div className="text-center py-8 text-text-secondary">Loading inspections...</div>
            ) : (
              <ReportTable
                columns={columns}
                data={inspections}
                emptyMessage="No inspections found for the selected hive and period"
              />
            )}
          </PrintableReport>
        </>
      )}
    </div>
  )
}
