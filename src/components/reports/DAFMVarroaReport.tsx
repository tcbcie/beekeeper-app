'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { useReportsData } from '@/hooks/useReportsData'
import { exportToCSV, printReport, exportToImage } from '@/lib/export-utils'
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
  const reportRef = useRef<HTMLDivElement>(null)

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

  const handleExportImage = async () => {
    if (reportRef.current) {
      await exportToImage(reportRef.current, 'dafm-varroa-report', 'png')
    }
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
        onExportImage={handleExportImage}
        disabled={treatments.length === 0 || dataLoading}
      />

      {/* Official Report Document */}
      <div ref={reportRef} className="print-container bg-surface-elevated rounded-lg border-2 border-[#006853] dark:border-[#00a67d] shadow-lg overflow-hidden">

        {/* Official Header with DAFM Branding */}
        <div className="bg-gradient-to-r from-[#006853] to-[#008060] text-white p-6 print-header">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* DAFM Logo */}
              <div className="flex-shrink-0 bg-surface rounded-lg p-2 shadow-md border border-border">
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
              <div className="print-date-box bg-black/10 rounded-lg px-4 py-2 backdrop-blur-sm">
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
        <div className="bg-gradient-to-b from-emerald-50 to-surface p-6 border-b border-emerald-200 dark:border-emerald-900/40">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Beekeeper Details */}
            <div className="bg-surface-elevated rounded-lg p-4 shadow-sm border border-emerald-100 dark:border-emerald-900/40">
              <h3 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3">
                Beekeeper Details
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  
                  <div>
                    <p className="text-sm text-text-secondary">Name</p>
                    <p className="font-semibold text-foreground">{beekeeperName || 'Not specified'}</p>
                  </div>
                </div>
                {profile?.email && (
                  <div className="flex items-center gap-2">
                    
                    <div>
                      <p className="text-sm text-text-secondary">Email</p>
                      <p className="font-medium text-text-secondary">{profile.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reporting Period */}
            <div className="bg-surface-elevated rounded-lg p-4 shadow-sm border border-emerald-100 dark:border-emerald-900/40">
              <h3 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3">
                Reporting Period
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  
                  <div>
                    <p className="text-sm text-text-secondary">Date Range</p>
                    <p className="font-semibold text-foreground">{dateRange}</p>
                  </div>
                </div>
                {selectedApiary && (
                  <div className="flex items-center gap-2">
                    
                    <div>
                      <p className="text-sm text-text-secondary">Apiary</p>
                      <p className="font-medium text-text-secondary">
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
        <div className="p-6 border-b border-border">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
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
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
            Treatment Records
          </h3>

          {dataLoading ? (
            <div className="text-center py-12 text-text-secondary">
              <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              Loading treatment records...
            </div>
          ) : treatments.length === 0 ? (
            <div className="text-center py-12 bg-surface-secondary rounded-lg border-2 border-dashed border-border">
              
              <p className="text-text-secondary font-medium">No varroa treatments found</p>
              <p className="text-text-tertiary text-sm mt-1">Try adjusting your date range or apiary filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full print-table">
                <thead>
                  <tr className="bg-surface-secondary">
                    <th className="px-4 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider border-b-2 border-emerald-500">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider border-b-2 border-emerald-500">
                      Hive
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider border-b-2 border-emerald-500">
                      Apiary / Eircode
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider border-b-2 border-emerald-500">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider border-b-2 border-emerald-500">
                      Batch No.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider border-b-2 border-emerald-500">
                      Dosage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider border-b-2 border-emerald-500">
                      Method
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {treatments.map((treatment, idx) => (
                    <tr
                      key={idx}
                      className={`${idx % 2 === 0 ? 'bg-surface-elevated' : 'bg-surface-secondary/50'} hover:bg-surface-secondary transition-colors`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">
                        {new Date(treatment.treatment_date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          {treatment.hive_number}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        <div>{treatment.apiary_name}</div>
                        {treatment.eircode && (
                          <div className="text-xs text-text-secondary font-mono">{treatment.eircode}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {treatment.treatment_type}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary font-mono">
                        {treatment.batch_number || (
                          <span className="text-text-tertiary italic">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {treatment.dosage}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {treatment.application_method || (
                          <span className="text-text-tertiary italic">-</span>
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
        <div className="bg-surface-secondary px-6 py-4 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-text-secondary">
            <p>
              This record is maintained in accordance with DAFM requirements for varroa treatment documentation.
            </p>
            <p className="font-medium">
              Generated by HiveCraic | {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
