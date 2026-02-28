'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Download } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import InfoPanel from '@/components/ui/InfoPanel'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { buildInsertSql, DATABASE_EXPORT_TABLES } from '@/lib/database-export'

interface ProfileExportProps {
  isAdmin: boolean
  hasActiveSubscription: boolean
}

export default function ProfileExport({ isAdmin, hasActiveSubscription }: ProfileExportProps) {
  const toast = useToast()
  const [exporting, setExporting] = useState(false)

  const exportDatabase = async () => {
    setExporting(true)
    try {
      // If user is admin, use admin API to export ALL users' data
      if (isAdmin) {
        // Get the current session to get auth token
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          toast.error('Session expired. Please log in again.')
          return
        }

        // Call admin API to export all data (bypasses RLS)
        const response = await fetch('/api/admin/export-all-data', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to export database')
        }

        // Get the SQL content from response
        const sqlContent = await response.text()

        // Create and download file
        const blob = new Blob([sqlContent], { type: 'text/sql' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `hivecraic-complete-export-${new Date().toISOString().split('T')[0]}.sql`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast.success('Complete database exported successfully!')
      } else {
        // Regular user: export only their own data
        const tables = [...DATABASE_EXPORT_TABLES]
        const exportResults: Record<string, number> = {}
        const exportErrors: Record<string, string> = {}

        let sqlContent = `-- =====================================================\n`
        sqlContent += `-- HiveCraic Personal Data Export\n`
        sqlContent += `-- Generated on: ${new Date().toISOString()}\n`
        sqlContent += `-- =====================================================\n\n`
        sqlContent += `-- This export includes YOUR data only\n`
        sqlContent += `-- Restore prerequisite: database schema must already exist (run migrations first)\n`
        sqlContent += `-- Data visibility depends on your row-level security permissions\n`
        sqlContent += `-- Tables: ${tables.join(', ')}\n\n`
        sqlContent += `BEGIN;\n\n`

        // Fetch and export data from each table (RLS will filter to user's data)
        for (const table of tables) {
          const { data, error } = await supabase
            .from(table)
            .select('*')

          if (error) {
            console.error(`Error fetching ${table}:`, error)
            exportResults[table] = 0
            exportErrors[table] = error.message
            continue
          }

          exportResults[table] = data?.length || 0

          if (data && data.length > 0) {
            sqlContent += `\n-- Table: ${table}\n`
            sqlContent += `-- Records: ${data.length}\n\n`

            for (const row of data) {
              sqlContent += `${buildInsertSql('public', table, row as Record<string, unknown>)}\n`
            }

            sqlContent += '\n'
          }
        }

        sqlContent += `\nCOMMIT;\n`
        sqlContent += `\n-- =====================================================\n`
        sqlContent += `-- EXPORT SUMMARY\n`
        sqlContent += `-- =====================================================\n`
        sqlContent += `-- Total tables: ${tables.length}\n`
        for (const [table, count] of Object.entries(exportResults)) {
          sqlContent += `-- ${table}: ${count} records\n`
        }
        if (Object.keys(exportErrors).length > 0) {
          sqlContent += `-- -----------------------------------------------------\n`
          sqlContent += `-- TABLES WITH EXPORT ERRORS\n`
          sqlContent += `-- -----------------------------------------------------\n`
          for (const [table, message] of Object.entries(exportErrors)) {
            sqlContent += `-- ${table}: ${message.replace(/\n/g, ' ')}\n`
          }
        }
        sqlContent += `-- =====================================================\n`
        sqlContent += `-- END OF EXPORT\n`
        sqlContent += `-- =====================================================\n`

        // Create and download file
        const blob = new Blob([sqlContent], { type: 'text/sql' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `my-beekeeping-data-${new Date().toISOString().split('T')[0]}.sql`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast.success('Your personal data exported successfully!')
      }
    } catch (error) {
      console.error('Error exporting database:', error)
      toast.error('Failed to export database. Check console for details.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Card padding="md">
      <h2 className="text-2xl font-bold text-foreground mb-6">Profile & Data Export</h2>

      {/* Export Database Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-secondary">Export Your Data</h3>
        {isAdmin ? (
          <p className="text-sm text-text-tertiary">
            <strong>Admin Export:</strong> Download complete database backup with ALL users&apos; data from ALL tables including apiaries, hives, queens, inspections, tasks, events, and more.
          </p>
        ) : hasActiveSubscription ? (
          <p className="text-sm text-text-tertiary">
            Download your personal beekeeping data including apiaries, hives, queens, inspections, tasks, events, and more in SQL format.
          </p>
        ) : (
          <InfoPanel tone="amber" title="Data export is available to users with an active subscription.">
            <p className="text-xs mt-1">
              Please renew your subscription to export your beekeeping data.
            </p>
          </InfoPanel>
        )}
        {(isAdmin || hasActiveSubscription) && (
          <Button
            onClick={exportDatabase}
            disabled={exporting}
            tone="success"
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            {exporting ? 'Exporting...' : isAdmin ? 'Export Complete Database (All Users)' : 'Export My Data'}
          </Button>
        )}
      </div>
    </Card>
  )
}
