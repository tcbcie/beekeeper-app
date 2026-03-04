'use client'
import { useState, useEffect } from 'react'
import { useRearingGroupReport } from '@/hooks/useRearingGroupReport'
import type { RearingGroup } from '@/hooks/useRearingGroups'

interface RearingGroupReportProps {
  ownedGroups: RearingGroup[]
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function RearingGroupReport({ ownedGroups }: RearingGroupReportProps) {
  const now = new Date()
  const [selectedGroupId, setSelectedGroupId] = useState<string>(ownedGroups[0]?.id || '')
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear())
  const { report, loadingReport, fetchReport } = useRearingGroupReport()

  // Fetch report when selection changes
  useEffect(() => {
    if (!selectedGroupId) return
    const group = ownedGroups.find((g) => g.id === selectedGroupId)
    if (group) {
      fetchReport(selectedGroupId, group.name, selectedMonth, selectedYear)
    }
  }, [selectedGroupId, selectedMonth, selectedYear, ownedGroups, fetchReport])

  // Update selected group if owned groups change
  useEffect(() => {
    if (ownedGroups.length > 0 && !ownedGroups.find((g) => g.id === selectedGroupId)) {
      setSelectedGroupId(ownedGroups[0].id)
    }
  }, [ownedGroups, selectedGroupId])

  if (ownedGroups.length === 0) return null

  // Generate year options (current year and 2 previous)
  const yearOptions = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2]

  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Rearing Report</h3>

      {/* Selectors */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm"
        >
          {ownedGroups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm"
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={i + 1} value={i + 1}>{name}</option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {loadingReport ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : report && report.members.length > 0 ? (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-text-tertiary font-medium">Member</th>
                  <th className="text-right py-2 px-3 text-text-tertiary font-medium">Batches</th>
                  <th className="text-right py-2 px-3 text-text-tertiary font-medium">Sealed Cells</th>
                  <th className="text-right py-2 px-3 text-text-tertiary font-medium">Queens Hatched</th>
                  <th className="text-right py-2 px-3 text-text-tertiary font-medium">Queens Mated</th>
                  <th className="text-right py-2 px-3 text-text-tertiary font-medium">Cells Distributed</th>
                </tr>
              </thead>
              <tbody>
                {report.members.map((member) => (
                    <tr key={member.user_id} className="border-b border-border">
                      <td className="py-2 px-3 text-foreground">{member.member_name}</td>
                      <td className="py-2 px-3 text-right text-foreground">{member.batch_count}</td>
                      <td className="py-2 px-3 text-right text-foreground">{member.grafts_accepted}</td>
                      <td className="py-2 px-3 text-right text-foreground">{member.queens_hatched}</td>
                      <td className="py-2 px-3 text-right text-foreground">{member.queens_mated}</td>
                      <td className="py-2 px-3 text-right text-foreground">{member.queen_cells_distributed}</td>
                    </tr>
                  ))}
                <tr className="font-bold">
                  <td className="py-2 px-3 text-foreground">Totals</td>
                  <td className="py-2 px-3 text-right text-foreground">{report.totals.batch_count}</td>
                  <td className="py-2 px-3 text-right text-foreground">{report.totals.grafts_accepted}</td>
                  <td className="py-2 px-3 text-right text-foreground">{report.totals.queens_hatched}</td>
                  <td className="py-2 px-3 text-right text-foreground">{report.totals.queens_mated}</td>
                  <td className="py-2 px-3 text-right text-foreground">{report.totals.queen_cells_distributed}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {report.members.map((member) => (
                <div key={member.user_id} className="p-3 rounded-lg border border-border bg-surface">
                  <div className="font-medium text-foreground mb-2">{member.member_name}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-text-tertiary">Batches:</div>
                    <div className="text-right text-foreground">{member.batch_count}</div>
                    <div className="text-text-tertiary">Sealed Cells:</div>
                    <div className="text-right text-foreground">{member.grafts_accepted}</div>
                    <div className="text-text-tertiary">Queens Hatched:</div>
                    <div className="text-right text-foreground">{member.queens_hatched}</div>
                    <div className="text-text-tertiary">Queens Mated:</div>
                    <div className="text-right text-foreground">{member.queens_mated}</div>
                    <div className="text-text-tertiary">Cells Distributed:</div>
                    <div className="text-right text-foreground">{member.queen_cells_distributed}</div>
                  </div>
                </div>
              ))}
            {/* Mobile Totals */}
            <div className="p-3 rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
              <div className="font-bold text-foreground mb-2">Totals</div>
              <div className="grid grid-cols-2 gap-2 text-sm font-medium">
                <div className="text-text-tertiary">Batches:</div>
                <div className="text-right text-foreground">{report.totals.batch_count}</div>
                <div className="text-text-tertiary">Sealed Cells:</div>
                <div className="text-right text-foreground">{report.totals.grafts_accepted}</div>
                <div className="text-text-tertiary">Queens Hatched:</div>
                <div className="text-right text-foreground">{report.totals.queens_hatched}</div>
                <div className="text-text-tertiary">Queens Mated:</div>
                <div className="text-right text-foreground">{report.totals.queens_mated}</div>
                <div className="text-text-tertiary">Cells Distributed:</div>
                <div className="text-right text-foreground">{report.totals.queen_cells_distributed}</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-text-tertiary text-sm">
          No rearing data for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
        </div>
      )}
    </div>
  )
}
