'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useReportsData } from '@/hooks/useReportsData'
import { exportToCSV, printReport } from '@/lib/export-utils'
import type { DAFMTreatmentRecord, TimePeriod, ReportFilters as ReportFiltersState } from '@/types/reports'
import ReportFilters from './ReportFilters'
import ReportExportBar from './ReportExportBar'

interface DAFMVarroaReportProps {
  userId: string
}

export default function DAFMVarroaReport({ userId }: DAFMVarroaReportProps) {
  const { apiaries, hives, profile, loading, fetchBaseData, fetchDAFMTreatments } = useReportsData()
  const [treatments, setTreatments] = useState<DAFMTreatmentRecord[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  const [filters, setFilters] = useState<ReportFiltersState>(() => {
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
    const loadTreatments = async () => {
      setDataLoading(true)
      const data = await fetchDAFMTreatments(userId, filters.apiaryId, filters.startDate, filters.endDate)
      setTreatments(data)
      setDataLoading(false)
    }
    loadTreatments()
  }, [userId, filters.apiaryId, filters.startDate, filters.endDate, fetchDAFMTreatments])

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
    exportToCSV(treatments, 'dafm-varroa-treatments', [
      'treatment_date',
      'hive_number',
      'apiary_name',
      'eircode',
      'treatment_type',
      'batch_number',
      'dosage',
      'application_method',
      'notes'
    ])
  }

  const beekeeperName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
    : ''

  const dateRange = `${new Date(filters.startDate).toLocaleDateString('en-GB')} - ${new Date(filters.endDate).toLocaleDateString('en-GB')}`

  // Get unique apiaries and products for summary
  const uniqueApiaries = [...new Set(treatments.map(t => t.apiary_name))].filter(Boolean)
  const uniqueProducts = [...new Set(treatments.map(t => t.treatment_type))].filter(Boolean)
  const uniqueHives = [...new Set(treatments.map(t => t.hive_number))].filter(Boolean)

  // Get selected apiary details
  const selectedApiary = filters.apiaryId
    ? apiaries.find(a => a.id === filters.apiaryId)
    : null

  if (loading) {
    return <div className="text-center py-8 text-text-secondary">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Filters - hidden on print */}
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
        disabled={treatments.length === 0 || dataLoading}
      />

      {/* Official Report Document */}
      <div className="print-container bg-white dark:bg-slate-900 rounded-lg border-2 border-[#006853] dark:border-[#00a67d] shadow-lg overflow-hidden">

        {/* Official Header with DAFM Branding */}
        <div className="bg-gradient-to-r from-[#006853] to-[#008060] text-white p-6 print-header">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* DAFM Logo Placeholder - replace src with actual logo */}
              <div className="flex-shrink-0 bg-white rounded-lg p-2 shadow-md">
                <Image
                  src="/dafm-logo.png"
                  alt="DAFM Logo"
                  width={80}
                  height={80}
                  className="object-contain"
                  onError={(e) => {
                    // Hide if logo not found
                    e.currentTarget.style.display = 'none'
                  }}
                />
                {/* Fallback text if no logo */}
                <div className="hidden text-[#006853] font-bold text-center text-xs">
                  DAFM
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Varroa Treatment Record
                </h1>
                <p className="text-emerald-100 text-sm mt-1">
                  Department of Agriculture, Food and the Marine
                </p>
                <p className="text-emerald-200 text-xs mt-0.5">
                  An Roinn Talmhaíochta, Bia agus Mara
                </p>
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="print-date-box bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm">
                <p className="text-emerald-100 text-xs uppercase tracking-wider">Report Generated</p>
                <p className="font-semibold">{new Date().toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Beekeeper & Period Information */}
        <div className="bg-gradient-to-b from-emerald-50 to-white dark:from-slate-800 dark:to-slate-900 p-6 border-b border-emerald-200 dark:border-slate-700">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Beekeeper Details */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-emerald-100 dark:border-slate-700">
              <h3 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3">
                Beekeeper Details
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👤</span>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{beekeeperName || 'Not specified'}</p>
                  </div>
                </div>
                {profile?.email && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📧</span>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                      <p className="font-medium text-gray-700 dark:text-gray-300">{profile.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reporting Period */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-emerald-100 dark:border-slate-700">
              <h3 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3">
                Reporting Period
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📅</span>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Date Range</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{dateRange}</p>
                  </div>
                </div>
                {selectedApiary && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📍</span>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Apiary</p>
                      <p className="font-medium text-gray-700 dark:text-gray-300">
                        {selectedApiary.name}
                        {selectedApiary.eircode && ` (${selectedApiary.eircode})`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Treatment Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg">
              <div className="text-3xl font-bold">{treatments.length}</div>
              <div className="text-emerald-100 text-sm font-medium">Total Treatments</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
              <div className="text-3xl font-bold">{uniqueHives.length}</div>
              <div className="text-blue-100 text-sm font-medium">Hives Treated</div>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white shadow-lg">
              <div className="text-3xl font-bold">{uniqueProducts.length}</div>
              <div className="text-amber-100 text-sm font-medium">Products Used</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
              <div className="text-3xl font-bold">{uniqueApiaries.length}</div>
              <div className="text-purple-100 text-sm font-medium">Apiaries</div>
            </div>
          </div>
        </div>

        {/* Treatment Records Table */}
        <div className="p-6">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Treatment Records
          </h3>

          {dataLoading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              Loading treatment records...
            </div>
          ) : treatments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600">
              <span className="text-4xl mb-4 block">🐝</span>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No varroa treatments found</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Try adjusting your date range or apiary filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
              <table className="w-full print-table">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-slate-800 dark:to-slate-700">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b-2 border-emerald-500">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b-2 border-emerald-500">
                      Hive
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b-2 border-emerald-500">
                      Apiary / Eircode
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b-2 border-emerald-500">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b-2 border-emerald-500">
                      Batch No.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b-2 border-emerald-500">
                      Dosage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b-2 border-emerald-500">
                      Method
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {treatments.map((treatment, idx) => (
                    <tr
                      key={idx}
                      className={`${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-gray-50 dark:bg-slate-800/50'} hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {new Date(treatment.treatment_date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          {treatment.hive_number}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        <div>{treatment.apiary_name}</div>
                        {treatment.eircode && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{treatment.eircode}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {treatment.treatment_type}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-mono">
                        {treatment.batch_number || (
                          <span className="text-gray-400 dark:text-gray-500 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {treatment.dosage}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {treatment.application_method || (
                          <span className="text-gray-400 dark:text-gray-500 italic">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-slate-800 px-6 py-4 border-t border-gray-200 dark:border-slate-700">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <p>
              This record is maintained in accordance with DAFM requirements for varroa treatment documentation.
            </p>
            <p className="font-medium">
              Generated by HiveCraic • {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {/* Instructions for adding logo */}
      <div className="no-print bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> To display the DAFM logo, add the logo image file as <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">/public/dafm-logo.png</code>
        </p>
      </div>
    </div>
  )
}
