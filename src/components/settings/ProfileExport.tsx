'use client'

import { getCurrentDate } from '@/lib/date-utils'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Download } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import InfoPanel from '@/components/ui/InfoPanel'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import TextInput from '@/components/ui/TextInput'
import CheckboxInput from '@/components/ui/CheckboxInput'
import { buildInsertSql, fetchAllRows, USER_EXPORT_TABLES } from '@/lib/database-export'
import { getCurrentUserId, PROFILE_COLUMNS } from '@/lib/auth'
import { mapInGroups } from '@/lib/supabase-chunk'

interface ProfileExportProps {
  isAdmin: boolean
  hasActiveSubscription: boolean
}

type AdminExportMode = 'complete' | 'schema_admin_only'

export default function ProfileExport({ isAdmin, hasActiveSubscription }: ProfileExportProps) {
  const toast = useToast()
  const [exporting, setExporting] = useState(false)
  // Admin export: password re-check for the complete export, and opt-in for sign-in secrets.
  const [adminPassword, setAdminPassword] = useState('')
  const [includeSecrets, setIncludeSecrets] = useState(false)

  const exportDatabase = async (adminMode: AdminExportMode = 'complete') => {
    if (exporting) {
      return
    }
    if (isAdmin && adminMode === 'complete' && !adminPassword) {
      toast.warning('Enter your password to export the complete database')
      return
    }

    setExporting(true)
    const controller = new AbortController()
    // The server may take its full 5 minutes for the complete export (about 110 MB).
    const timeoutId = setTimeout(() => controller.abort(), 300000)

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
          },
          body: JSON.stringify({
            mode: adminMode,
            includeSecrets,
            ...(adminMode === 'complete' ? { password: adminPassword } : {}),
          }),
          signal: controller.signal
        })

        if (!response.ok) {
          const contentType = response.headers.get('content-type') || ''
          let errorMessage = `Failed to export database (${response.status})`

          if (contentType.includes('application/json')) {
            const error = await response.json().catch(() => null)
            if (error && typeof error.error === 'string' && error.error.trim()) {
              errorMessage = error.error
            }
          } else {
            const errorText = await response.text().catch(() => '')
            if (errorText.trim()) {
              errorMessage = errorText.trim()
            }
          }

          throw new Error(errorMessage)
        }

        // Get the SQL content from response. It arrives in pieces; a file without the closing
        // line was cut short and must not be saved as if it were complete.
        const sqlContent = await response.text()
        if (!sqlContent.includes('-- END OF EXPORT')) {
          throw new Error('The export was cut short. Please try again.')
        }
        setAdminPassword('')

        // Create and download file
        const blob = new Blob([sqlContent], { type: 'text/sql' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const filePrefix = adminMode === 'schema_admin_only'
          ? 'hivecraic-empty-schema-admin-export'
          : 'hivecraic-complete-export'
        a.download = `${filePrefix}-${getCurrentDate()}.sql`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast.success(
          adminMode === 'schema_admin_only'
            ? 'Empty database export (schema + admin account) downloaded successfully!'
            : 'Complete database exported successfully!'
        )
      } else {
        // Regular user: export only their own data. RLS also lets a user read reference
        // data and team-mates' or shared rows, so every table is filtered on user_id.
        const userId = await getCurrentUserId()
        if (!userId) throw new Error('Please sign in again to export your data.')
        const tables = USER_EXPORT_TABLES.map(({ table }) => table)
        const exportResults: Record<string, number> = {}

        let sqlContent = `-- =====================================================\n`
        sqlContent += `-- HiveCraic Personal Data Export\n`
        sqlContent += `-- Generated on: ${new Date().toISOString()}\n`
        sqlContent += `-- =====================================================\n\n`
        sqlContent += `-- This export includes YOUR data only\n`
        sqlContent += `-- Restore prerequisite: database schema must already exist (run migrations first)\n`
        sqlContent += `-- Tables: profiles, ${tables.join(', ')}\n\n`
        sqlContent += `BEGIN;\n\n`

        // profiles has column-level grants, so select('*') is refused: read the
        // permitted columns of the user's own row.
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select(PROFILE_COLUMNS)
          .eq('id', userId)
          .maybeSingle()
        if (profileError) throw new Error(`Export failed for profiles: ${profileError.message}`)
        exportResults.profiles = profile ? 1 : 0
        if (profile) {
          sqlContent += `\n-- Table: profiles\n`
          sqlContent += `-- Records: 1\n\n`
          sqlContent += `${buildInsertSql('public', 'profiles', profile)}\n\n`
        }

        // Fetch every row the user owns in each table, six tables at a time.
        // The SQL is still written in table order below.
        const fetchedTables = await mapInGroups(
          tables,
          (table) => fetchAllRows(supabase, table, { column: 'user_id', value: userId }),
          6
        )
        for (const [index, table] of tables.entries()) {
          const { data, error } = fetchedTables[index]

          // A missing table would make the backup incomplete, so stop rather than
          // download a partial file marked as a success.
          if (error) throw new Error(`Export failed for ${table}: ${error.message}`)

          exportResults[table] = data.length

          if (data.length > 0) {
            sqlContent += `\n-- Table: ${table}\n`
            sqlContent += `-- Records: ${data.length}\n\n`

            for (const row of data) {
              sqlContent += `${buildInsertSql('public', table, row)}\n`
            }

            sqlContent += '\n'
          }
        }

        sqlContent += `\nCOMMIT;\n`
        sqlContent += `\n-- =====================================================\n`
        sqlContent += `-- EXPORT SUMMARY\n`
        sqlContent += `-- =====================================================\n`
        sqlContent += `-- Total tables: ${tables.length + 1}\n`
        for (const [table, count] of Object.entries(exportResults)) {
          sqlContent += `-- ${table}: ${count} records\n`
        }
        sqlContent += `-- =====================================================\n`
        sqlContent += `-- END OF EXPORT\n`
        sqlContent += `-- =====================================================\n`

        // Create and download file
        const blob = new Blob([sqlContent], { type: 'text/sql' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `my-beekeeping-data-${getCurrentDate()}.sql`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast.success('Your personal data exported successfully!')
      }
    } catch (error) {
      console.error('Error exporting database:', error)
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast.error('Export timed out. Please try again.')
      } else if (error instanceof Error && error.message) {
        toast.error(error.message)
      } else {
        toast.error('Failed to export database. Check console for details.')
      }
    } finally {
      clearTimeout(timeoutId)
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
          <div className="space-y-2">
            <p className="text-sm text-text-tertiary">
              <strong>Admin Export:</strong> Download complete database backup with ALL users&apos; data from ALL tables including apiaries, hives, queens, inspections, tasks, events, and more.
            </p>
            <p className="text-sm text-text-tertiary">
              You can also export a clean database file with schema and only your admin login-capable account seed.
            </p>
          </div>
        ) : hasActiveSubscription ? (
          <p className="text-sm text-text-tertiary">
            Download your personal beekeeping data including apiaries, hives, queens, inspections, tasks, events, and more in SQL format.
          </p>
        ) : (
          <InfoPanel tone="amber" title="Data export is available to users with an active subscription.">
            <p className="text-sm mt-1">
              Please renew your subscription to export your beekeeping data.
            </p>
          </InfoPanel>
        )}
        {(isAdmin || hasActiveSubscription) && (
          isAdmin ? (
            <div className="space-y-4">
              <div className="space-y-3 max-w-md">
                <TextInput
                  type="password"
                  label="Your password (needed for the complete export)"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={exporting}
                />
                <label className="flex items-start gap-3 text-sm text-text-secondary cursor-pointer">
                  <CheckboxInput
                    checked={includeSecrets}
                    onChange={(e) => setIncludeSecrets(e.target.checked)}
                    disabled={exporting}
                    className="mt-0.5"
                  />
                  <span>
                    Include sign-in secrets (password hashes, sign-in tokens and scale connections).
                    Only needed for a full restore; without them, users reset their passwords and reconnect scales after a restore.
                  </span>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => { void exportDatabase('complete') }}
                  disabled={exporting}
                  tone="success"
                  className="disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={16} />
                  {exporting ? 'Exporting...' : 'Export Complete Database (All Users)'}
                </Button>
                <Button
                  onClick={() => { void exportDatabase('schema_admin_only') }}
                  disabled={exporting}
                  tone="blue"
                  className="disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={16} />
                  {exporting ? 'Exporting...' : 'Export Empty Database (Schema + Admin)'}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => { void exportDatabase() }}
              disabled={exporting}
              tone="success"
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              {exporting ? 'Exporting...' : 'Export My Data'}
            </Button>
          )
        )}
      </div>
    </Card>
  )
}
