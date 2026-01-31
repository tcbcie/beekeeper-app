'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCurrentUserId } from '@/lib/auth'
import { FileText, ClipboardList, Search, LayoutGrid, Apple } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  DAFMVarroaReport,
  VarroaMonitoringReport,
  HiveInspectionSummary,
  ApiaryOverview,
  HarvestReport
} from '@/components/reports'

type ReportSection = 'dafm-varroa' | 'varroa-monitoring' | 'hive-inspection' | 'apiary-overview' | 'harvest'

export default function ReportsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<ReportSection>('dafm-varroa')
  const router = useRouter()
  const searchParams = useSearchParams()

  // Sync with URL params
  useEffect(() => {
    const section = searchParams.get('section')
    if (section && ['dafm-varroa', 'varroa-monitoring', 'hive-inspection', 'apiary-overview', 'harvest'].includes(section)) {
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
    }
    initUser()
  }, [router])

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const sections = [
    { id: 'dafm-varroa' as const, label: 'DAFM Varroa', icon: FileText },
    { id: 'varroa-monitoring' as const, label: 'Varroa Monitoring', icon: Search },
    { id: 'hive-inspection' as const, label: 'Inspection Summary', icon: ClipboardList },
    { id: 'apiary-overview' as const, label: 'Apiary Overview', icon: LayoutGrid },
    { id: 'harvest' as const, label: 'Harvest', icon: Apple },
  ]

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
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeSection === section.id
                  ? 'bg-forest-600 text-white dark:bg-forest-500'
                  : 'bg-sage-100 dark:bg-slate-700 text-text-secondary hover:bg-sage-200 dark:hover:bg-slate-600'
              }`}
            >
              <section.icon size={16} />
              {section.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Report Content */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
        {activeSection === 'dafm-varroa' && (
          <DAFMVarroaReport userId={userId} />
        )}

        {activeSection === 'varroa-monitoring' && (
          <VarroaMonitoringReport userId={userId} />
        )}

        {activeSection === 'hive-inspection' && (
          <HiveInspectionSummary userId={userId} />
        )}

        {activeSection === 'apiary-overview' && (
          <ApiaryOverview userId={userId} />
        )}

        {activeSection === 'harvest' && (
          <HarvestReport userId={userId} />
        )}
      </div>
    </div>
  )
}
