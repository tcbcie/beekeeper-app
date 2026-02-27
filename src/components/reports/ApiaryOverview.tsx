'use client'

import { useEffect, useState } from 'react'
import { useReportsData } from '@/hooks/useReportsData'
import { exportToCSV, printReport } from '@/lib/export-utils'
import type { HiveOverviewRecord } from '@/types/reports'
import ReportExportBar from './ReportExportBar'
import ReportTable, { type Column } from './ReportTable'
import PrintableReport from './PrintableReport'

interface ApiaryOverviewProps {
  userId: string
}

export default function ApiaryOverview({ userId }: ApiaryOverviewProps) {
  const { apiaries, profile, loading, fetchBaseData, fetchApiaryOverview } = useReportsData()
  const [selectedApiary, setSelectedApiary] = useState('')
  const [hiveData, setHiveData] = useState<HiveOverviewRecord[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    fetchBaseData(userId)
  }, [userId, fetchBaseData])

  useEffect(() => {
    const loadData = async () => {
      if (!selectedApiary) {
        setHiveData([])
        return
      }
      setDataLoading(true)
      const data = await fetchApiaryOverview(userId, selectedApiary)
      setHiveData(data)
      setDataLoading(false)
    }
    loadData()
  }, [userId, selectedApiary, fetchApiaryOverview])

  const handleExportCSV = () => {
    const exportData = hiveData.map(h => ({
      hive_number: h.hive_number,
      status: h.status,
      last_inspection: h.last_inspection_date || 'Never',
      queen_seen: h.queen_seen === null ? '-' : h.queen_seen ? 'Yes' : 'No',
      population: h.population_strength ?? '-',
      notes: h.notes || ''
    }))
    exportToCSV(exportData, 'apiary-overview')
  }

  const beekeeperName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
    : ''

  const apiary = apiaries.find(a => a.id === selectedApiary)

  const renderRating = (rating: number | null) => {
    if (rating === null) return '-'
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500']
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className={`w-3 h-3 rounded-full ${n <= rating ? colors[rating - 1] : 'bg-surface-secondary border border-border'}`}
          />
        ))}
      </div>
    )
  }

  const columns: Column<HiveOverviewRecord>[] = [
    { key: 'hive_number', header: 'Hive' },
    {
      key: 'status',
      header: 'Status',
      render: (row: HiveOverviewRecord) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          row.status === 'active'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
            : 'bg-surface-secondary text-text-secondary border border-border'
        }`}>
          {row.status}
        </span>
      )
    },
    {
      key: 'last_inspection_date',
      header: 'Last Inspection',
      render: (row: HiveOverviewRecord) => row.last_inspection_date
        ? new Date(row.last_inspection_date).toLocaleDateString('en-GB')
        : 'Never'
    },
    {
      key: 'queen_seen',
      header: 'Queen',
      render: (row: HiveOverviewRecord) => row.queen_seen === null ? '-' : row.queen_seen ? '✓' : '✗'
    },
    {
      key: 'population_strength',
      header: 'Population',
      render: (row: HiveOverviewRecord) => renderRating(row.population_strength)
    },
    { key: 'notes', header: 'Latest Notes', className: 'max-w-xs truncate' }
  ]

  if (loading) {
    return <div className="text-center py-8 text-text-secondary">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Apiary Selection */}
      <div className="no-print">
        <select
          value={selectedApiary}
          onChange={(e) => setSelectedApiary(e.target.value)}
          className="px-4 py-2 border border-border rounded-lg bg-surface text-foreground"
        >
          <option value="">Select an Apiary</option>
          {apiaries.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedApiary && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-amber-800 dark:text-amber-200">
          Please select an apiary to view its overview.
        </div>
      )}

      {selectedApiary && (
        <>
          <ReportExportBar
            onExportCSV={handleExportCSV}
            onPrint={printReport}
            disabled={hiveData.length === 0 || dataLoading}
          />

          <PrintableReport
            title="Apiary Overview"
            subtitle={apiary ? `${apiary.name}${apiary.eircode ? ` - ${apiary.eircode}` : ''}` : ''}
            beekeeperName={beekeeperName}
          >
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-forest-50 dark:bg-forest-950/30 p-4 rounded-lg">
                <div className="text-2xl font-bold text-forest-700 dark:text-forest-300">{hiveData.length}</div>
                <div className="text-sm text-forest-600 dark:text-forest-400">Total Hives</div>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {hiveData.filter(h => h.status === 'active').length}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">Active</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {hiveData.filter(h => h.queen_seen === true).length}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Queen Confirmed</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg">
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {hiveData.filter(h => h.last_inspection_date === null).length}
                </div>
                <div className="text-sm text-amber-600 dark:text-amber-400">Never Inspected</div>
              </div>
            </div>

            {dataLoading ? (
              <div className="text-center py-8 text-text-secondary">Loading hives...</div>
            ) : (
              <ReportTable
                columns={columns}
                data={hiveData}
                emptyMessage="No hives found in this apiary"
              />
            )}
          </PrintableReport>
        </>
      )}
    </div>
  )
}
