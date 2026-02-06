'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Download } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

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
        const tables = [
          'apiaries',
          'batch_containers',
          'batch_feedback',
          'batch_grafts',
          'batch_runs',
          'bulk_containers',
          'colonies',
          'colony_movements',
          'container_harvests',
          'diagnosis_images',
          'diagnosis_image_comments',
          'feedings',
          'financial_records',
          'frame_standards',
          'gdd_records',
          'harvests',
          'hive_configuration_history',
          'hives',
          'inspections',
          'mating_nuc_inspections',
          'mating_nucs',
          'profiles',
          'purchase_items',
          'push_subscriptions',
          'queens',
          'rearing_batches',
          'subscription_history',
          'support_tickets',
          'tasks_events',
          'team_apiaries',
          'team_invitations',
          'team_members',
          'teams',
          'varroa_checks',
          'varroa_treatment_products',
          'varroa_treatments',
          'wild_colonies',
          'wild_colony_inspections'
        ]

        let sqlContent = `-- =====================================================\n`
        sqlContent += `-- HiveCraic Personal Data Export\n`
        sqlContent += `-- Generated on: ${new Date().toISOString()}\n`
        sqlContent += `-- =====================================================\n\n`
        sqlContent += `-- This export includes YOUR data only\n`
        sqlContent += `-- Tables: ${tables.join(', ')}\n\n`

        // Fetch and export data from each table (RLS will filter to user's data)
        for (const table of tables) {
          const { data, error } = await supabase
            .from(table)
            .select('*')

          if (error) {
            console.error(`Error fetching ${table}:`, error)
            continue
          }

          if (data && data.length > 0) {
            sqlContent += `\n-- Table: ${table}\n`
            sqlContent += `-- Records: ${data.length}\n\n`

            // Get column names from first record
            const columns = Object.keys(data[0])

            for (const row of data) {
              const values = columns.map(col => {
                const value = row[col]
                if (value === null) return 'NULL'
                if (typeof value === 'boolean') return value ? 'true' : 'false'
                if (typeof value === 'number') return value.toString()
                if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`
                if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`
                return `'${value}'`
              }).join(', ')

              sqlContent += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values});\n`
            }

            sqlContent += '\n'
          }
        }

        sqlContent += `\n-- =====================================================\n`
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
    <div className="bg-surface dark:bg-surface rounded-lg shadow p-6">
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
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 font-medium">
              Data export is available to users with an active subscription.
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Please renew your subscription to export your beekeeping data.
            </p>
          </div>
        )}
        {(isAdmin || hasActiveSubscription) && (
          <button
            onClick={exportDatabase}
            disabled={exporting}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-sage-300 dark:disabled:bg-slate-600 font-medium flex items-center gap-2"
          >
            <Download size={16} />
            {exporting ? 'Exporting...' : isAdmin ? 'Export Complete Database (All Users)' : 'Export My Data'}
          </button>
        )}
      </div>
    </div>
  )
}
