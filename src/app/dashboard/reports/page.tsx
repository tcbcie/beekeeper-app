'use client'
import { useState } from 'react'
import { BarChart3, Bug, Droplet, ClipboardList } from 'lucide-react'
import HiveHealthDashboard from '@/components/reports/HiveHealthDashboard'
import VarroaReport from '@/components/reports/VarroaReport'
import HarvestReport from '@/components/reports/HarvestReport'
import InspectionReport from '@/components/reports/InspectionReport'

type ReportType = 'hive-health' | 'varroa' | 'harvest' | 'inspections' | null

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>(null)

  const reports = [
    {
      id: 'hive-health' as ReportType,
      title: 'Hive Health Dashboard',
      description: 'Overview of all hives with health indicators, population strength, and recent inspection status',
      icon: BarChart3,
      color: 'blue'
    },
    {
      id: 'varroa' as ReportType,
      title: 'Varroa Management',
      description: 'Track varroa mite levels and treatment effectiveness across your apiaries',
      icon: Bug,
      color: 'red'
    },
    {
      id: 'harvest' as ReportType,
      title: 'Harvest & Productivity',
      description: 'Monitor honey production and harvest data across apiaries and hives',
      icon: Droplet,
      color: 'amber'
    },
    {
      id: 'inspections' as ReportType,
      title: 'Inspection Summary',
      description: 'Recent inspection history with trends and patterns',
      icon: ClipboardList,
      color: 'green'
    }
  ]

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-900/50',
      red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-900/50',
      amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-900/50',
      green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-900/50'
    }
    return colorMap[color as keyof typeof colorMap] || colorMap.blue
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-text-secondary mt-2">
          Analyze your beekeeping data with comprehensive reports
        </p>
      </div>

      {/* Report Selection Grid */}
      {!selectedReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((report) => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={`p-6 rounded-lg border-2 transition-all text-left ${getColorClasses(report.color)}`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-white/50 dark:bg-black/20">
                  <report.icon size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{report.title}</h3>
                  <p className="text-sm opacity-80">{report.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Report Content Area */}
      {selectedReport && (
        <div className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6 border border-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              {reports.find(r => r.id === selectedReport)?.title}
            </h2>
            <button
              onClick={() => setSelectedReport(null)}
              className="px-4 py-2 text-sm bg-sage-100 dark:bg-slate-800 text-foreground rounded-lg hover:bg-sage-200 dark:hover:bg-slate-700 transition-colors"
            >
              Back to Reports
            </button>
          </div>

          {/* Report Content */}
          {selectedReport === 'hive-health' && <HiveHealthDashboard />}
          {selectedReport === 'varroa' && <VarroaReport />}
          {selectedReport === 'harvest' && <HarvestReport />}
          {selectedReport === 'inspections' && <InspectionReport />}
        </div>
      )}
    </div>
  )
}
