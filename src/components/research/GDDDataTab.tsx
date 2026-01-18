'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Thermometer, Share2, Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface GDDRecord {
  id: string
  apiary_id: string
  vegetation_type_id: string
  year: number
  start_date: string
  end_date: string | null
  gdd_value: number | null
  is_shared: boolean
  notes: string | null
  apiaries?: { name: string }
  dropdown_values?: { value: string }
}

interface GDDDataTabProps {
  userId: string
}

export default function GDDDataTab({ userId }: GDDDataTabProps) {
  const [records, setRecords] = useState<GDDRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('gdd_records')
        .select(`
          *,
          apiaries(name),
          dropdown_values(value)
        `)
        .eq('user_id', userId)
        .order('year', { ascending: false })
        .order('start_date', { ascending: false })

      setRecords(data || [])
    } catch (error) {
      console.error('Error fetching GDD records:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-forest-600" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Thermometer size={24} className="text-forest-600 dark:text-forest-400" />
          <h2 className="text-xl font-semibold text-foreground">GDD Data</h2>
        </div>
        <Link
          href="/dashboard/tools?tool=gdd"
          className="flex items-center gap-2 px-4 py-2 text-sm bg-forest-600 text-white rounded-lg hover:bg-forest-700 transition-colors"
        >
          <ExternalLink size={16} />
          Add Records
        </Link>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Growing Degree Days (GDD)</strong> measures accumulated heat units to predict plant development.
          This data helps track when vegetation blooms in your area.
        </p>
      </div>

      {/* Records Table */}
      {records.length > 0 ? (
        <div className="bg-surface dark:bg-surface rounded-lg border border-border overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-sage-100 dark:bg-slate-800 border-b border-border">
                  <th className="text-left p-3 text-sm font-semibold text-foreground">Year</th>
                  <th className="text-left p-3 text-sm font-semibold text-foreground">Apiary</th>
                  <th className="text-left p-3 text-sm font-semibold text-foreground">Vegetation</th>
                  <th className="text-left p-3 text-sm font-semibold text-foreground">Bloom Date</th>
                  <th className="text-left p-3 text-sm font-semibold text-foreground">End Date</th>
                  <th className="text-right p-3 text-sm font-semibold text-foreground">GDD</th>
                  <th className="text-center p-3 text-sm font-semibold text-foreground">Shared</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-border hover:bg-sage-50 dark:hover:bg-slate-700/50">
                    <td className="p-3 text-foreground font-medium">{record.year}</td>
                    <td className="p-3 text-foreground">{record.apiaries?.name || '-'}</td>
                    <td className="p-3 text-foreground">{record.dropdown_values?.value || '-'}</td>
                    <td className="p-3 text-text-secondary">{new Date(record.start_date).toLocaleDateString()}</td>
                    <td className="p-3 text-text-secondary">
                      {record.end_date ? new Date(record.end_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-3 text-right">
                      {record.gdd_value !== null ? (
                        <span className="font-semibold text-forest-700 dark:text-forest-400">{record.gdd_value}</span>
                      ) : (
                        <span className="text-text-tertiary">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex p-1.5 rounded-full ${
                          record.is_shared
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                        }`}
                        title={record.is_shared ? 'Shared with nearby beekeepers' : 'Not shared'}
                      >
                        <Share2 size={14} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-border">
            {records.map((record) => (
              <div key={record.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{record.dropdown_values?.value || 'Unknown'}</span>
                  <span className="text-sm text-text-secondary">{record.year}</span>
                </div>
                <div className="text-sm text-text-secondary">{record.apiaries?.name || '-'}</div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-tertiary">
                    {new Date(record.start_date).toLocaleDateString()}
                    {record.end_date && ` - ${new Date(record.end_date).toLocaleDateString()}`}
                  </span>
                  <div className="flex items-center gap-2">
                    {record.gdd_value !== null && (
                      <span className="font-semibold text-forest-700 dark:text-forest-400">{record.gdd_value} GDD</span>
                    )}
                    {record.is_shared && (
                      <Share2 size={14} className="text-green-600" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-surface dark:bg-surface rounded-lg border border-border">
          <Thermometer size={48} className="mx-auto mb-3 text-text-tertiary opacity-50" />
          <p className="text-text-secondary mb-4">No GDD records yet.</p>
          <Link
            href="/dashboard/tools?tool=gdd"
            className="inline-flex items-center gap-2 px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 transition-colors"
          >
            <ExternalLink size={16} />
            Add Your First Record
          </Link>
        </div>
      )}

      {/* Legend */}
      <div className="text-xs text-text-tertiary">
        <p>GDD calculated from January 1st to bloom observation date. Base temperature: 6°C (Irish phenology standard).</p>
      </div>
    </div>
  )
}
