'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCurrentUserId } from '@/lib/auth'
import { FileText, ClipboardList, Search, LayoutGrid, Apple, Archive, Crown, XCircle } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  DAFMVarroaReport,
  VarroaMonitoringReport,
  HiveInspectionSummary,
  ApiaryOverview,
  HarvestReport,
  ArchivedHivesReport,
  QueenFailuresReport
} from '@/components/reports'
import RearingGroupReport from '@/components/rearing-groups/RearingGroupReport'
import NIHBSMonthlyReturn from '@/components/rearing-groups/NIHBSMonthlyReturn'
import { useRearingGroups } from '@/hooks/useRearingGroups'
import Button from '@/components/ui/Button'

type ReportSection = 'dafm-varroa' | 'varroa-monitoring' | 'hive-inspection' | 'apiary-overview' | 'harvest' | 'archived-hives' | 'queen-failures' | 'rearing-report' | 'nihbs-returns'

export default function ReportsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<ReportSection>('dafm-varroa')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { ownedRearingGroups, fetchRearingGroups } = useRearingGroups()

  // Sync with URL params
  useEffect(() => {
    const section = searchParams.get('section')
    if (section && ['dafm-varroa', 'varroa-monitoring', 'hive-inspection', 'apiary-overview', 'harvest', 'archived-hives', 'queen-failures', 'rearing-report', 'nihbs-returns'].includes(section)) {
      setActiveSection(section as ReportSection)
    }
  }, [searchParams])

  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)
      fetchRearingGroups(id)
    }
    initUser()
  }, [router, fetchRearingGroups])

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const hasRearingGroups = ownedRearingGroups.length > 0

  const sections = [
    { id: 'dafm-varroa' as const, label: 'DAFM Varroa', icon: FileText },
    { id: 'varroa-monitoring' as const, label: 'Varroa Monitoring', icon: Search },
    { id: 'hive-inspection' as const, label: 'Inspection Summary', icon: ClipboardList },
    { id: 'apiary-overview' as const, label: 'Apiary Overview', icon: LayoutGrid },
    { id: 'harvest' as const, label: 'Harvest', icon: Apple },
    { id: 'archived-hives' as const, label: 'Archived Hives', icon: Archive },
    { id: 'queen-failures' as const, label: 'Queen Failures', icon: XCircle },
    ...(hasRearingGroups ? [
      { id: 'rearing-report' as const, label: 'Rearing Report', icon: Crown },
      { id: 'nihbs-returns' as const, label: 'NIHBS Returns', icon: Crown },
    ] : []),
  ]

  // Fall back to default tab if active section is no longer available
  // (e.g. URL deep-link to rearing tab by a non-owner, or groups deleted externally)
  const isRearingTab = activeSection === 'rearing-report' || activeSection === 'nihbs-returns'
  const effectiveSection = (isRearingTab && !hasRearingGroups) ? 'dafm-varroa' : activeSection

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 no-print">
        <FileText size={32} className="text-text-secondary" />
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
      </div>

      <p className="text-text-secondary no-print">
        Generate and export reports for compliance, monitoring, and record keeping.
      </p>

      {/* Tab Navigation */}
      <nav className="border-b border-border pb-3 no-print">
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <Button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              tone={effectiveSection === section.id ? 'success' : 'neutral'}
              size="sm"
              className={`inline-flex items-center gap-2 ${
                effectiveSection === section.id
                  ? ''
                  : 'bg-surface-secondary text-text-secondary hover:bg-surface-elevated'
              }`}
            >
              <section.icon size={16} />
              {section.label}
            </Button>
          ))}
        </div>
      </nav>

      {/* Report Content */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
        {effectiveSection === 'dafm-varroa' && (
          <DAFMVarroaReport userId={userId} />
        )}

        {effectiveSection === 'varroa-monitoring' && (
          <VarroaMonitoringReport userId={userId} />
        )}

        {effectiveSection === 'hive-inspection' && (
          <HiveInspectionSummary userId={userId} />
        )}

        {effectiveSection === 'apiary-overview' && (
          <ApiaryOverview userId={userId} />
        )}

        {effectiveSection === 'harvest' && (
          <HarvestReport userId={userId} />
        )}

        {effectiveSection === 'archived-hives' && (
          <ArchivedHivesReport userId={userId} />
        )}

        {effectiveSection === 'queen-failures' && (
          <QueenFailuresReport userId={userId} />
        )}

        {effectiveSection === 'rearing-report' && (
          <RearingGroupReport ownedGroups={ownedRearingGroups} />
        )}

        {effectiveSection === 'nihbs-returns' && (
          <NIHBSMonthlyReturn ownedGroups={ownedRearingGroups} userId={userId} />
        )}
      </div>
    </div>
  )
}
