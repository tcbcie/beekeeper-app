'use client'
import { useState, useEffect, useCallback } from 'react'
import { useNIHBSReport } from '@/hooks/useNIHBSReport'
import type { ManualFields } from '@/hooks/useNIHBSReport'
import type { RearingGroup } from '@/hooks/useRearingGroups'
import { Download, Save } from 'lucide-react'
import Button from '@/components/ui/Button'

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
  const { reportData, loading, error, fetchReport, saveManualFields } = useNIHBSReport()

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
    if (parts.length !== 3) return dateStr
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
        { width: 38 }, { width: 26 }, { width: 18 }, { width: 38 },
      ]

      const yellowFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFFF00' } }
      const redFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFF0000' } }
      const thinBorder = {
        top: { style: 'thin' as const }, bottom: { style: 'thin' as const },
        left: { style: 'thin' as const }, right: { style: 'thin' as const },
      }

      // Row 1: Title
      const titleRow = detailsSheet.addRow([`NIHBS Conservation and Queen Rearing Group Scheme ${exportData.year} monthly returns`])
      titleRow.font = { bold: true, size: 12 }
      // Row 2: blank
      detailsSheet.addRow([])
      // Row 3: Name of group
      const nameRow = detailsSheet.addRow(['Name of group', exportData.group_name])
      nameRow.getCell(2).fill = yellowFill
      nameRow.getCell(2).font = { bold: true, size: 14 }
      // Row 4: blank
      detailsSheet.addRow([])
      // Row 5: Number of Group Members/Participants
      const membersRow = detailsSheet.addRow(['Number of Group Members/Participants', '', exportData.member_count])
      membersRow.getCell(3).fill = yellowFill
      // Row 6: Member Breakdown — Experienced/Advanced
      const expRow = detailsSheet.addRow(['Member Breakdown:', 'Experienced/Advanced', exportData.experience_counts.experienced, 'were already using colony selection and queen rearing, for a number of seasons, before joining group'])
      expRow.getCell(1).font = { bold: true }
      expRow.getCell(3).fill = yellowFill
      expRow.getCell(4).font = { italic: true, size: 10, color: { argb: 'FF666666' } }
      // Row 7: Intermediate
      const intRow = detailsSheet.addRow(['', 'Intermediate', exportData.experience_counts.intermediate, 'had some queen rearing experience prior to joining group'])
      intRow.getCell(3).fill = yellowFill
      intRow.getCell(4).font = { italic: true, size: 10, color: { argb: 'FF666666' } }
      // Row 8: Novice
      const novRow = detailsSheet.addRow(['', 'Novice', exportData.experience_counts.novice, 'no queen rearing experience prior to joining group'])
      novRow.getCell(3).fill = yellowFill
      novRow.getCell(4).font = { italic: true, size: 10, color: { argb: 'FF666666' } }
      // Row 9: blank
      detailsSheet.addRow([])
      // Row 10: Date of first graft
      const firstGraftRow = detailsSheet.addRow([`Date of first graft with group for ${exportData.year}`, '', formatDate(exportData.first_graft_date)])
      firstGraftRow.getCell(3).fill = yellowFill
      // Row 11: Date of last graft
      const lastGraftRow = detailsSheet.addRow([`Date of last graft within group for ${exportData.year}`, '', formatDate(exportData.last_graft_date)])
      lastGraftRow.getCell(3).fill = yellowFill
      // Row 12: blank
      detailsSheet.addRow([])
      // Row 13: Number of Mating Apiaries used
      const maCountRow = detailsSheet.addRow(['Number of Mating Apiaries used', '', exportData.mating_apiaries.length])
      maCountRow.getCell(3).fill = yellowFill
      // Rows 14-22: blank spacing before mating apiary table
      for (let i = 0; i < 9; i++) detailsSheet.addRow([])
      // Row 23: Mating Apiary Details header
      const maHeader = detailsSheet.addRow(['Mating Apiary Details', 'Apiary Name/Reference', '10 km Grid Reference', 'Altitude (height above sea level)'])
      maHeader.font = { bold: true }
      maHeader.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
        cell.border = thinBorder
      })
      // Row 24+: Mating apiary data (always show at least 13 rows like the template)
      const maCount = Math.max(exportData.mating_apiaries.length, 13)
      for (let i = 0; i < maCount; i++) {
        const ma = exportData.mating_apiaries[i]
        const row = detailsSheet.addRow([
          `# ${i + 1}`,
          ma?.apiary_name || '',
          ma?.grid_reference || '',
          ma?.elevation ?? '',
        ])
        row.eachCell((cell) => { cell.border = thinBorder })
      }

      // ====== Monthly Sheets ======
      for (const md of exportData.months) {
        const monthName = MONTH_NAMES[md.month - 1] || `Month ${md.month}`
        const sheetName = `${monthName} ${md.year}`
        const sheet = workbook.addWorksheet(sheetName)

        const apiaryCount = exportData.mating_apiaries.length
        const lastCol = 2 + apiaryCount // B=Total, then one col per apiary

        // Column widths: A=Label(45), B=Total(8), then one col per apiary(10 each)
        const colWidths: { width: number }[] = [{ width: 65 }, { width: 8 }]
        for (let i = 0; i < apiaryCount; i++) colWidths.push({ width: 10 })
        sheet.columns = colWidths

        // === Header Section (Rows 1-6) ===

        // Row 1: Group Name
        const r1 = sheet.addRow([])
        r1.getCell(1).value = 'Group Name'
        r1.getCell(1).font = { size: 10 }
        r1.getCell(2).value = exportData.group_name
        r1.getCell(2).fill = redFill
        r1.getCell(2).font = { bold: true, size: 14 }
        sheet.mergeCells(1, 2, 1, Math.max(lastCol, 8))

        // Row 2: blank
        sheet.addRow([])

        // Row 3: Breakdown text
        const r3 = sheet.addRow([])
        if (apiaryCount > 0) {
          r3.getCell(3).value = {
            richText: [
              { text: 'Breakdown of quantities, by the mating apiaries listed on Group Details Sheet -  You just fill in the ' },
              { font: { bold: true, color: { argb: 'FFFF0000' } }, text: 'YELLOW' },
              { text: ' boxes' },
            ],
          }
          sheet.mergeCells(3, 3, 3, Math.max(lastCol, 12))
        }

        // Row 4: Data Checks + #1-#N column numbers (one per apiary)
        const r4 = sheet.addRow([])
        r4.getCell(1).value = 'Data Checks'
        r4.getCell(1).fill = redFill
        r4.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
        r4.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
        r4.height = 22.5 // default 15 × 1.5
        for (let i = 0; i < apiaryCount; i++) {
          const cell = r4.getCell(3 + i)
          cell.value = `#${i + 1}`
          cell.font = { bold: true, size: 10 }
          cell.alignment = { horizontal: 'center' }
        }

        // Row 5: "Total" + apiary names (rotated)
        const r5 = sheet.addRow([])
        r5.getCell(2).value = 'Total'
        r5.getCell(2).font = { bold: true, size: 10 }
        r5.getCell(2).alignment = { horizontal: 'center' }
        for (let i = 0; i < apiaryCount; i++) {
          const cell = r5.getCell(3 + i)
          cell.value = exportData.mating_apiaries[i].apiary_name
          cell.font = { bold: true, size: 10 }
          cell.alignment = { textRotation: 45, horizontal: 'center' }
        }

        // Row 6: blank
        sheet.addRow([])

        // === Data Rows ===

        // Helper: add a data metric row with per-apiary breakdown (yellow fill)
        const addDataRow = (label: string, field: 'batch_count' | 'cell_count' | 'grafts_accepted' | 'queens_hatched' | 'queens_mated') => {
          const row = sheet.addRow([])
          row.getCell(1).value = label
          row.getCell(1).font = { size: 11 }
          row.getCell(1).alignment = { wrapText: true, vertical: 'middle' }
          row.getCell(2).value = md.total[field] || 0
          row.getCell(2).fill = yellowFill
          row.getCell(2).border = thinBorder
          row.getCell(2).alignment = { horizontal: 'center' }
          for (let i = 0; i < apiaryCount; i++) {
            const cell = row.getCell(3 + i)
            const ma = exportData.mating_apiaries[i]
            cell.value = (md.byApiary.get(ma.apiary_id)?.[field] as number) || 0
            cell.fill = yellowFill
            cell.border = thinBorder
            cell.alignment = { horizontal: 'center' }
          }
          return row
        }

        // Row 7: Grafting rounds
        addDataRow('Number of Grafting rounds this month', 'batch_count')
        sheet.addRow([])

        // Row 9: Cells grafted
        addDataRow('Total number of cells grafted\nor cell cups transferred from Cupkit/Jenter boxes', 'cell_count')
        sheet.addRow([])

        // Row 11: Sealed queen cells
        addDataRow('Number of Sealed queen cells achieved', 'grafts_accepted')
        sheet.addRow([])

        // Row 13: Queen cells hatched
        addDataRow('Number of queen cells hatched this month', 'queens_hatched')

        // Rows 14-16: Note about hatching
        const r14 = sheet.addRow([])
        r14.getCell(1).value = '     ^'
        const r15 = sheet.addRow([])
        r15.getCell(1).value = '     |'
        const r16 = sheet.addRow([])
        r16.getCell(1).value = "     -----------------------------------------> This is the number of cells that hatched in the calendar month - if grafted cells are due to hatch in the first few days of next month - they go into next month's figures"
        r16.getCell(1).font = { bold: true, italic: true, color: { argb: 'FFFF0000' } }

        // Row 17: blank
        sheet.addRow([])

        // === Within your group ===
        const r18 = sheet.addRow([])
        r18.getCell(1).value = 'Within your group'
        r18.getCell(1).font = { bold: true, size: 11 }

        // Row 19: Queens mated this month (per-apiary breakdown)
        addDataRow('     Number of queens mated this month', 'queens_mated')
        sheet.addRow([])

        // Row 21: Hybridised offspring (total only, manual field)
        const r21 = sheet.addRow([])
        r21.getCell(1).value = '     Number of newly mated queens showing hybridised offspring'
        r21.getCell(1).font = { size: 11 }
        r21.getCell(2).value = md.hybridised_offspring
        r21.getCell(2).fill = yellowFill
        r21.getCell(2).border = thinBorder
        r21.getCell(2).alignment = { horizontal: 'center' }
        r21.getCell(3).value = "<-------- Queens mated within group & group members mating locations - don't include any that were reported on previous returns"
        r21.getCell(3).font = { italic: true, size: 11 }

        // Row 22: blank
        sheet.addRow([])

        // === Outside your group ===
        const r23 = sheet.addRow([])
        r23.getCell(1).value = 'Outside your group'
        r23.getCell(1).font = { bold: true, size: 11 }

        // Row 24: Virgin queens distributed outside group
        const r24 = sheet.addRow([])
        r24.getCell(1).value = '     Number of virgin queens distributed outside the group\n     (include ripe queen cells sent outside the group as well)'
        r24.getCell(1).font = { size: 11 }
        r24.getCell(1).alignment = { wrapText: true, vertical: 'middle' }
        r24.getCell(2).value = md.virgins_distributed_external
        r24.getCell(2).fill = yellowFill
        r24.getCell(2).border = thinBorder
        r24.getCell(2).alignment = { horizontal: 'center' }
        r24.getCell(3).value = "NB:  You'll need to keep track of the destinations of these Virgin Queens, to check over-wintering success rates & signs of  hybridisation"
        r24.getCell(3).font = { bold: true, italic: true, size: 11, color: { argb: 'FFFF0000' } }

        // Row 25: blank
        sheet.addRow([])

        // Row 26: Virgins successfully mated outside
        const r26 = sheet.addRow([])
        r26.getCell(1).value = '     Number of virgin queens distributed outside the group\n     that were successfully mated'
        r26.getCell(1).font = { size: 11 }
        r26.getCell(1).alignment = { wrapText: true, vertical: 'middle' }
        r26.getCell(2).value = md.virgins_external_mated
        r26.getCell(2).fill = yellowFill
        r26.getCell(2).border = thinBorder
        r26.getCell(2).alignment = { horizontal: 'center' }

        // Row 27: blank
        sheet.addRow([])

        // Row 28: Sealed queen cells distributed (auto-calculated, excluded from hatched/mated above)
        const r28 = sheet.addRow([])
        r28.getCell(1).value = 'Sealed queen cells distributed'
        r28.getCell(1).font = { bold: true, size: 11 }
        r28.getCell(2).value = md.queen_cells_distributed
        r28.getCell(2).fill = yellowFill
        r28.getCell(2).border = thinBorder
        r28.getCell(2).alignment = { horizontal: 'center' }
        for (let i = 0; i < apiaryCount; i++) {
          const cell = r28.getCell(3 + i)
          const ma = exportData.mating_apiaries[i]
          cell.value = (md.byApiary.get(ma.apiary_id)?.queen_cells_distributed as number) || 0
          cell.fill = yellowFill
          cell.border = thinBorder
          cell.alignment = { horizontal: 'center' }
        }
      }

      // Generate and download
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      try {
        const a = document.createElement('a')
        a.href = url
        a.download = `NIHBS_Monthly_Return_${exportData.group_name.replace(/\s+/g, '_')}_${exportData.year}.xlsx`
        a.click()
      } finally {
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error generating Excel:', error)
    } finally {
      setExporting(false)
    }
  }, [reportData, manualEdits])

  if (ownedGroups.length === 0) return null

  const yearOptions = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2]

  return (
    <div>
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
        <Button
          onClick={handleExportExcel}
          disabled={exporting || !reportData}
          tone="success"
          size="sm"
          className="text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={14} />
          {exporting ? 'Exporting...' : 'Export NIHBS Excel'}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-600 text-sm">{error}</div>
      ) : reportData ? (
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
              <div className="bg-surface-secondary px-4 py-3 flex items-center justify-between">
                <h4 className="font-semibold text-foreground">{MONTH_NAMES[md.month - 1]} {md.year}</h4>
                <div className="flex items-center gap-2">
                  {saveStatus?.month === md.month && (
                    <span className={`text-xs ${saveStatus.success ? 'text-green-600' : 'text-red-600'}`}>
                      {saveStatus.success ? 'Saved' : 'Failed to save'}
                    </span>
                  )}
                  <Button
                    onClick={() => handleSaveMonth(md.month)}
                    disabled={savingMonth === md.month}
                    tone="blue"
                    size="xs"
                    className="text-xs disabled:opacity-50"
                  >
                    <Save size={12} />
                    {savingMonth === md.month ? 'Saving...' : 'Save'}
                  </Button>
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
                    <tr className="border-b border-border bg-blue-50 dark:bg-blue-950/20">
                      <td className="py-2 px-3 text-text-tertiary">28</td>
                      <td className="py-2 px-3 text-foreground">Sealed queen cells distributed</td>
                      <td className="py-2 px-3 text-right font-medium text-foreground">{md.queen_cells_distributed}</td>
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
                      <td className="py-2 px-3 text-foreground">
                        Virgin queens distributed outside group
                        {md.auto_virgins_distributed_external > 0 && (
                          <div className="text-xs text-text-tertiary mt-0.5">Auto: {md.auto_virgins_distributed_external} from records</div>
                        )}
                      </td>
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
                      <td className="py-2 px-3 text-foreground">
                        Virgins distributed outside - successfully mated
                        {md.auto_virgins_external_mated > 0 && (
                          <div className="text-xs text-text-tertiary mt-0.5">Auto: {md.auto_virgins_external_mated} from records</div>
                        )}
                      </td>
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
                <div className="flex justify-between text-sm">
                  <span className="text-text-tertiary">Sealed cells distributed:</span>
                  <span className="font-medium text-foreground">{md.queen_cells_distributed}</span>
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
                  <div className="text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-text-tertiary">Virgins distributed:</span>
                      <input
                        type="number"
                        min="0"
                        value={getManualField(md.month, 'virgins_distributed_external')}
                        onChange={(e) => setManualField(md.month, 'virgins_distributed_external', parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-right border border-border rounded bg-surface text-foreground text-sm"
                      />
                    </div>
                    {md.auto_virgins_distributed_external > 0 && (
                      <div className="text-xs text-text-tertiary mt-0.5">Auto: {md.auto_virgins_distributed_external} from records</div>
                    )}
                  </div>
                  <div className="text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-text-tertiary">Virgins mated externally:</span>
                      <input
                        type="number"
                        min="0"
                        value={getManualField(md.month, 'virgins_external_mated')}
                        onChange={(e) => setManualField(md.month, 'virgins_external_mated', parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-right border border-border rounded bg-surface text-foreground text-sm"
                      />
                    </div>
                    {md.auto_virgins_external_mated > 0 && (
                      <div className="text-xs text-text-tertiary mt-0.5">Auto: {md.auto_virgins_external_mated} from records</div>
                    )}
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
