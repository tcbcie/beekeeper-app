'use client'
import { useState, useEffect, useCallback } from 'react'
import { useNIHBSReport } from '@/hooks/useNIHBSReport'
import type { ManualFields, MonthlyData } from '@/hooks/useNIHBSReport'
import type { RearingGroup } from '@/hooks/useRearingGroups'
import { Download, Save } from 'lucide-react'

interface NIHBSMonthlyReturnProps {
  ownedGroups: RearingGroup[]
  userId: string
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function NIHBSMonthlyReturn({ ownedGroups, userId }: NIHBSMonthlyReturnProps) {
  const now = new Date()
  const [selectedGroupId, setSelectedGroupId] = useState<string>(ownedGroups[0]?.id || '')
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear())
  const [manualEdits, setManualEdits] = useState<Map<number, ManualFields>>(new Map())
  const [savingMonth, setSavingMonth] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)
  const { reportData, loading, fetchReport, saveManualFields } = useNIHBSReport()

  useEffect(() => {
    if (!selectedGroupId) return
    const group = ownedGroups.find((g) => g.id === selectedGroupId)
    if (group) {
      fetchReport(selectedGroupId, group.name, selectedYear)
      setManualEdits(new Map())
    }
  }, [selectedGroupId, selectedYear, ownedGroups, fetchReport])

  useEffect(() => {
    if (ownedGroups.length > 0 && !ownedGroups.find((g) => g.id === selectedGroupId)) {
      setSelectedGroupId(ownedGroups[0].id)
    }
  }, [ownedGroups, selectedGroupId])

  // Initialise manual edits from report data
  useEffect(() => {
    if (!reportData) return
    const edits = new Map<number, ManualFields>()
    for (const md of reportData.months) {
      edits.set(md.month, {
        hybridised_offspring: md.hybridised_offspring,
        virgins_distributed_external: md.virgins_distributed_external,
        virgins_external_mated: md.virgins_external_mated,
      })
    }
    setManualEdits(edits)
  }, [reportData])

  const getManualField = (month: number, field: keyof ManualFields): number => {
    return manualEdits.get(month)?.[field] ?? 0
  }

  const setManualField = (month: number, field: keyof ManualFields, value: number) => {
    setManualEdits((prev) => {
      const next = new Map(prev)
      const existing = next.get(month) || { hybridised_offspring: 0, virgins_distributed_external: 0, virgins_external_mated: 0 }
      next.set(month, { ...existing, [field]: value })
      return next
    })
  }

  const [saveStatus, setSaveStatus] = useState<{ month: number; success: boolean } | null>(null)

  const handleSaveMonth = async (month: number) => {
    const fields = manualEdits.get(month)
    if (!fields) return
    setSavingMonth(month)
    setSaveStatus(null)
    const success = await saveManualFields(selectedGroupId, month, selectedYear, fields, userId)
    setSavingMonth(null)
    setSaveStatus({ month, success })
    setTimeout(() => setSaveStatus(null), 3000)
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-'
    // Parse date string directly to avoid timezone shift (e.g. "2026-05-01" in UTC → April 30 in BST)
    const parts = dateStr.split('-')
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  const handleExportExcel = useCallback(async () => {
    if (!reportData) return
    setExporting(true)
    try {
      // Merge current manual edits into report data so export reflects unsaved UI values
      const exportMonths = reportData.months.map((md) => {
        const edits = manualEdits.get(md.month)
        if (!edits) return md
        return { ...md, ...edits }
      })
      const exportData = { ...reportData, months: exportMonths }

      const ExcelJS = await import('exceljs')
      const workbook = new ExcelJS.Workbook()

      // ====== Sheet 1: Group Details Sheet ======
      const detailsSheet = workbook.addWorksheet('Group Details Sheet')
      detailsSheet.columns = [
        { width: 30 }, { width: 20 }, { width: 20 }, { width: 20 },
      ]

      const titleRow = detailsSheet.addRow(['NIHBS Conservation & Queen Rearing Group'])
      titleRow.font = { bold: true, size: 14 }
      detailsSheet.addRow([])

      detailsSheet.addRow(['Group Name:', exportData.group_name])
      detailsSheet.addRow(['Year:', exportData.year])
      detailsSheet.addRow(['Number of Members:', exportData.member_count])
      detailsSheet.addRow([])

      const expHeader = detailsSheet.addRow(['Experience Breakdown'])
      expHeader.font = { bold: true }
      detailsSheet.addRow(['Experienced:', exportData.experience_counts.experienced])
      detailsSheet.addRow(['Intermediate:', exportData.experience_counts.intermediate])
      detailsSheet.addRow(['Novice:', exportData.experience_counts.novice])
      detailsSheet.addRow([])

      detailsSheet.addRow(['First Graft Date:', formatDate(exportData.first_graft_date)])
      detailsSheet.addRow(['Last Graft Date:', formatDate(exportData.last_graft_date)])
      detailsSheet.addRow(['Number of Mating Apiaries:', exportData.mating_apiaries.length])
      detailsSheet.addRow([])

      if (exportData.mating_apiaries.length > 0) {
        const maHeader = detailsSheet.addRow(['#', 'Mating Apiary Name', '10km Grid Reference', 'Altitude (m)'])
        maHeader.font = { bold: true }
        maHeader.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
          cell.border = {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' },
          }
        })

        exportData.mating_apiaries.forEach((ma, i) => {
          const row = detailsSheet.addRow([i + 1, ma.apiary_name, ma.grid_reference || '-', ma.elevation ?? '-'])
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' }, bottom: { style: 'thin' },
              left: { style: 'thin' }, right: { style: 'thin' },
            }
          })
        })
      }

      // Style the label cells in details
      detailsSheet.eachRow((row) => {
        const firstCell = row.getCell(1)
        if (typeof firstCell.value === 'string' && firstCell.value.endsWith(':')) {
          firstCell.font = { bold: true }
        }
      })

      // ====== Monthly Sheets ======
      for (const md of exportData.months) {
        const monthName = MONTH_NAMES[md.month - 1]
        const sheetName = `${monthName} ${md.year}`
        const sheet = workbook.addWorksheet(sheetName)

        // Column widths: Label | Sub-label | Total | one per mating apiary
        const colWidths = [{ width: 5 }, { width: 35 }, { width: 12 }]
        exportData.mating_apiaries.forEach(() => colWidths.push({ width: 14 }))
        sheet.columns = colWidths

        // Header row
        const headerValues = ['', 'Metric', 'Total']
        exportData.mating_apiaries.forEach((ma) => headerValues.push(ma.apiary_name))
        const headerRow = sheet.addRow(headerValues)
        headerRow.font = { bold: true }
        headerRow.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
          cell.border = {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' },
          }
        })

        // Title row
        const titleRow2 = sheet.addRow(['', `${monthName} ${md.year} - Monthly Return`])
        titleRow2.font = { bold: true, size: 12 }
        sheet.addRow([])

        // Helper to add a metric row
        const addMetricRow = (num: string, label: string, getValue: (d: MonthlyData, apiaryId: string) => number | string) => {
          const values: (string | number)[] = [num, label, getValue(md, 'total')]
          exportData.mating_apiaries.forEach((ma) => {
            values.push(getValue(md, ma.apiary_id))
          })
          const row = sheet.addRow(values)
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' }, bottom: { style: 'thin' },
              left: { style: 'thin' }, right: { style: 'thin' },
            }
          })
          return row
        }

        const getApiaryVal = (md: MonthlyData, apiaryId: string, field: keyof typeof md.total): number => {
          if (apiaryId === 'total') return md.total[field] as number
          return (md.byApiary.get(apiaryId)?.[field] as number) || 0
        }

        // Row 7: Grafting rounds
        addMetricRow('7', 'Number of grafting rounds', (md, aid) => getApiaryVal(md, aid, 'batch_count'))
        sheet.addRow([])

        // Row 9: Cells grafted
        addMetricRow('9', 'Number of cells grafted', (md, aid) => getApiaryVal(md, aid, 'cell_count'))
        sheet.addRow([])

        // Row 11: Sealed queen cells
        addMetricRow('11', 'Number of sealed queen cells', (md, aid) => getApiaryVal(md, aid, 'grafts_accepted'))
        sheet.addRow([])

        // Row 13: Queen cells hatched
        addMetricRow('13', 'Number of queen cells hatched', (md, aid) => getApiaryVal(md, aid, 'queens_hatched'))
        sheet.addRow([])
        sheet.addRow([])
        sheet.addRow([])

        // Row 19: Queens mated within group (total only)
        const matedValues: (string | number)[] = ['19', 'Queens successfully mated within group', md.total.queens_mated]
        exportData.mating_apiaries.forEach(() => matedValues.push(''))
        const matedRow = sheet.addRow(matedValues)
        matedRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' },
          }
        })
        sheet.addRow([])

        // Row 21: Hybridised offspring
        const hybValues: (string | number)[] = ['21', 'Hybridised offspring from queens mated in group', md.hybridised_offspring]
        exportData.mating_apiaries.forEach(() => hybValues.push(''))
        const hybRow = sheet.addRow(hybValues)
        hybRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' },
          }
        })
        sheet.addRow([])
        sheet.addRow([])

        // Row 24: Virgin queens distributed outside
        const virgValues: (string | number)[] = ['24', 'Virgin queens distributed outside group', md.virgins_distributed_external]
        exportData.mating_apiaries.forEach(() => virgValues.push(''))
        const virgRow = sheet.addRow(virgValues)
        virgRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' },
          }
        })
        sheet.addRow([])

        // Row 26: Virgins outside successfully mated
        const virgMatedValues: (string | number)[] = ['26', 'Virgins distributed outside - successfully mated', md.virgins_external_mated]
        exportData.mating_apiaries.forEach(() => virgMatedValues.push(''))
        const virgMatedRow = sheet.addRow(virgMatedValues)
        virgMatedRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' },
          }
        })
      }

      // Generate and download
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `NIHBS_Monthly_Return_${exportData.group_name.replace(/\s+/g, '_')}_${exportData.year}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating Excel:', error)
    } finally {
      setExporting(false)
    }
  }, [reportData, manualEdits])

  if (ownedGroups.length === 0) return null

  const yearOptions = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2]

  return (
    <div className="mt-6 pt-6 border-t border-border">
      <h3 className="text-lg font-semibold text-foreground mb-4">NIHBS Monthly Returns</h3>

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
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button
          onClick={handleExportExcel}
          disabled={exporting || !reportData || reportData.months.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={14} />
          {exporting ? 'Exporting...' : 'Export NIHBS Excel'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : reportData && reportData.months.length > 0 ? (
        <div className="space-y-6">
          {/* Summary */}
          <div className="p-4 bg-surface-elevated dark:bg-surface-elevated rounded-lg border border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-text-tertiary">Members:</span>
                <span className="ml-2 font-medium text-foreground">{reportData.member_count}</span>
              </div>
              <div>
                <span className="text-text-tertiary">Mating Apiaries:</span>
                <span className="ml-2 font-medium text-foreground">{reportData.mating_apiaries.length}</span>
              </div>
              <div>
                <span className="text-text-tertiary">First Graft:</span>
                <span className="ml-2 font-medium text-foreground">{formatDate(reportData.first_graft_date)}</span>
              </div>
              <div>
                <span className="text-text-tertiary">Last Graft:</span>
                <span className="ml-2 font-medium text-foreground">{formatDate(reportData.last_graft_date)}</span>
              </div>
            </div>
          </div>

          {/* Monthly breakdown */}
          {reportData.months.map((md) => (
            <div key={md.month} className="border border-border rounded-lg overflow-hidden">
              <div className="bg-sage-50 dark:bg-slate-800 px-4 py-3 flex items-center justify-between">
                <h4 className="font-semibold text-foreground">{MONTH_NAMES[md.month - 1]} {md.year}</h4>
                <div className="flex items-center gap-2">
                  {saveStatus?.month === md.month && (
                    <span className={`text-xs ${saveStatus.success ? 'text-green-600' : 'text-red-600'}`}>
                      {saveStatus.success ? 'Saved' : 'Failed to save'}
                    </span>
                  )}
                  <button
                    onClick={() => handleSaveMonth(md.month)}
                    disabled={savingMonth === md.month}
                    className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    <Save size={12} />
                    {savingMonth === md.month ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      <th className="text-left py-2 px-3 text-text-tertiary font-medium w-8">#</th>
                      <th className="text-left py-2 px-3 text-text-tertiary font-medium">Metric</th>
                      <th className="text-right py-2 px-3 text-text-tertiary font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="py-2 px-3 text-text-tertiary">7</td>
                      <td className="py-2 px-3 text-foreground">Grafting rounds</td>
                      <td className="py-2 px-3 text-right font-medium text-foreground">{md.total.batch_count}</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2 px-3 text-text-tertiary">9</td>
                      <td className="py-2 px-3 text-foreground">Cells grafted</td>
                      <td className="py-2 px-3 text-right font-medium text-foreground">{md.total.cell_count}</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2 px-3 text-text-tertiary">11</td>
                      <td className="py-2 px-3 text-foreground">Sealed queen cells</td>
                      <td className="py-2 px-3 text-right font-medium text-foreground">{md.total.grafts_accepted}</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2 px-3 text-text-tertiary">13</td>
                      <td className="py-2 px-3 text-foreground">Queen cells hatched</td>
                      <td className="py-2 px-3 text-right font-medium text-foreground">{md.total.queens_hatched}</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2 px-3 text-text-tertiary">19</td>
                      <td className="py-2 px-3 text-foreground">Queens mated within group</td>
                      <td className="py-2 px-3 text-right font-medium text-foreground">{md.total.queens_mated}</td>
                    </tr>
                    <tr className="border-b border-border bg-amber-50 dark:bg-amber-950/20">
                      <td className="py-2 px-3 text-text-tertiary">21</td>
                      <td className="py-2 px-3 text-foreground">Hybridised offspring</td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          value={getManualField(md.month, 'hybridised_offspring')}
                          onChange={(e) => setManualField(md.month, 'hybridised_offspring', parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-right border border-border rounded bg-surface text-foreground text-sm"
                        />
                      </td>
                    </tr>
                    <tr className="border-b border-border bg-amber-50 dark:bg-amber-950/20">
                      <td className="py-2 px-3 text-text-tertiary">24</td>
                      <td className="py-2 px-3 text-foreground">Virgin queens distributed outside group</td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          value={getManualField(md.month, 'virgins_distributed_external')}
                          onChange={(e) => setManualField(md.month, 'virgins_distributed_external', parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-right border border-border rounded bg-surface text-foreground text-sm"
                        />
                      </td>
                    </tr>
                    <tr className="bg-amber-50 dark:bg-amber-950/20">
                      <td className="py-2 px-3 text-text-tertiary">26</td>
                      <td className="py-2 px-3 text-foreground">Virgins distributed outside - successfully mated</td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          value={getManualField(md.month, 'virgins_external_mated')}
                          onChange={(e) => setManualField(md.month, 'virgins_external_mated', parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-right border border-border rounded bg-surface text-foreground text-sm"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-tertiary">Grafting rounds:</span>
                  <span className="font-medium text-foreground">{md.total.batch_count}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-tertiary">Cells grafted:</span>
                  <span className="font-medium text-foreground">{md.total.cell_count}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-tertiary">Sealed queen cells:</span>
                  <span className="font-medium text-foreground">{md.total.grafts_accepted}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-tertiary">Queen cells hatched:</span>
                  <span className="font-medium text-foreground">{md.total.queens_hatched}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-tertiary">Queens mated:</span>
                  <span className="font-medium text-foreground">{md.total.queens_mated}</span>
                </div>
                <div className="pt-2 border-t border-border space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-tertiary">Hybridised offspring:</span>
                    <input
                      type="number"
                      min="0"
                      value={getManualField(md.month, 'hybridised_offspring')}
                      onChange={(e) => setManualField(md.month, 'hybridised_offspring', parseInt(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-right border border-border rounded bg-surface text-foreground text-sm"
                    />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-tertiary">Virgins distributed:</span>
                    <input
                      type="number"
                      min="0"
                      value={getManualField(md.month, 'virgins_distributed_external')}
                      onChange={(e) => setManualField(md.month, 'virgins_distributed_external', parseInt(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-right border border-border rounded bg-surface text-foreground text-sm"
                    />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-tertiary">Virgins mated externally:</span>
                    <input
                      type="number"
                      min="0"
                      value={getManualField(md.month, 'virgins_external_mated')}
                      onChange={(e) => setManualField(md.month, 'virgins_external_mated', parseInt(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-right border border-border rounded bg-surface text-foreground text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-text-tertiary text-sm">
          No rearing data for {selectedYear}. Batches with graft dates in this year will appear here.
        </div>
      )}
    </div>
  )
}
