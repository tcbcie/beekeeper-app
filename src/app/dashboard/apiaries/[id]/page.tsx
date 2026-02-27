'use client'
import { useEffect } from 'react'
import { getCurrentUserId } from '@/lib/auth'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, MapPin, Map, Plus, Clock, Search } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import { useApiaryDetail } from '@/hooks'

export default function ApiaryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const apiaryId = params.id as string
  const {
    apiary,
    hives,
    recentRecords,
    stats,
    loading,
    fetchApiaryData,
  } = useApiaryDetail(apiaryId)

  useEffect(() => {
    const init = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      fetchApiaryData(id)
    }
    init()
  }, [router, fetchApiaryData])

  if (loading) return <LoadingSpinner text="Loading apiary..." />

  if (!apiary) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Apiary not found</p>
        <Button onClick={() => router.push('/dashboard/apiaries')} tone="neutral" size="sm" className="mt-4">
          Back to Apiaries
        </Button>
      </div>
    )
  }

  const daysSinceInspection = stats.lastInspectionDate
    ? Math.floor((Date.now() - new Date(stats.lastInspectionDate).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <IconButton
          onClick={() => router.push('/dashboard/apiaries')}
          className="hover:bg-surface-secondary"
          aria-label="Back to apiaries"
        >
          <ArrowLeft size={20} className="text-text-secondary" />
        </IconButton>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{apiary.name}</h1>
          <p className="text-sm text-text-secondary">
            {apiary.city && apiary.location ? `${apiary.city} - ${apiary.location}` :
             apiary.city || apiary.location || 'No location specified'}
          </p>
        </div>
        {apiary.image_url && (
          <div className="relative w-16 h-16 flex-shrink-0">
            <Image
              src={apiary.image_url}
              alt={apiary.name}
              fill
              sizes="64px"
              className="object-cover rounded-lg border border-border"
              quality={85}
            />
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Location Details */}
          <div>
            <h3 className="text-xs font-semibold text-text-tertiary uppercase mb-2">Location</h3>
            {apiary.eircode && (
              <p className="text-sm text-text-primary font-medium">{apiary.eircode}</p>
            )}
            {apiary.latitude && apiary.longitude && (
              <p className="text-xs text-text-tertiary mt-1">
                {Number(apiary.latitude).toFixed(4)}, {Number(apiary.longitude).toFixed(4)}
              </p>
            )}
            {apiary.elevation != null && (
              <p className="text-xs text-text-tertiary mt-1">
                {Math.round(Number(apiary.elevation))} m above sea level
              </p>
            )}
            {apiary.grid_reference && (
              <p className="text-xs text-text-tertiary mt-1">
                Irish Grid: {apiary.grid_reference}
              </p>
            )}
            {apiary.share_location && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                <MapPin size={10} />
                Shared publicly
              </p>
            )}
          </div>

          {/* Stats */}
          <div>
            <h3 className="text-xs font-semibold text-text-tertiary uppercase mb-2">Hives</h3>
            <p className="text-2xl font-bold text-foreground">{stats.activeHives}</p>
            <p className="text-xs text-text-tertiary">
              {stats.archivedHives > 0 && `+ ${stats.archivedHives} archived`}
            </p>
          </div>

          {/* Last Inspection */}
          <div>
            <h3 className="text-xs font-semibold text-text-tertiary uppercase mb-2">Last Inspection</h3>
            {daysSinceInspection !== null ? (
              <>
                <p className={`text-lg font-bold ${
                  daysSinceInspection < 7 ? 'text-green-600 dark:text-green-400' :
                  daysSinceInspection < 14 ? 'text-amber-600 dark:text-amber-400' :
                  'text-red-600 dark:text-red-400'
                }`}>
                  {daysSinceInspection} days ago
                </p>
                <p className="text-xs text-text-tertiary">
                  {new Date(stats.lastInspectionDate!).toLocaleDateString('en-IE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              </>
            ) : (
              <p className="text-sm text-text-tertiary">No inspections yet</p>
            )}
          </div>
        </div>

        {apiary.notes && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-text-primary">{apiary.notes}</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/dashboard/hives?apiary=${apiaryId}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-surface dark:bg-surface border border-border rounded-full hover:border-forest-500 dark:hover:border-forest-400 text-text-secondary hover:text-forest-700 dark:hover:text-forest-300 transition-colors"
        >
          <Plus size={14} />
          Add Hive
        </Link>
        <Link
          href={`/dashboard/records?apiary=${apiaryId}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-surface dark:bg-surface border border-border rounded-full hover:border-forest-500 dark:hover:border-forest-400 text-text-secondary hover:text-forest-700 dark:hover:text-forest-300 transition-colors"
        >
          <Search size={14} />
          New Inspection
        </Link>
        {apiary.latitude && apiary.longitude && (
          <Link
            href="/dashboard/community-map"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-surface dark:bg-surface border border-border rounded-full hover:border-forest-500 dark:hover:border-forest-400 text-text-secondary hover:text-forest-700 dark:hover:text-forest-300 transition-colors"
          >
            <Map size={14} />
            View on Map
          </Link>
        )}
      </div>

      {/* Hives List */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
        <h2 className="text-lg font-semibold text-foreground mb-4">Hives ({stats.totalHives})</h2>
        {hives.length > 0 ? (
          <div className="space-y-2">
            {hives.map((hive) => (
              <Link
                key={hive.id}
                href={`/dashboard/hives/${hive.id}`}
                className="flex items-center justify-between p-3 bg-surface-elevated dark:bg-surface-elevated rounded-lg border border-border hover:border-forest-500 dark:hover:border-forest-400 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground">{hive.hive_number}</span>
                  {hive.queens?.[0] && (
                    <span className="text-xs text-text-secondary">
                      Queen: {hive.queens[0].queen_number}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    hive.archived_at
                      ? 'bg-surface dark:bg-surface text-text-tertiary border border-border'
                      : hive.status === 'active'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700'
                      : hive.status === 'queenless'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700'
                      : 'bg-surface-secondary text-text-primary border border-border'
                  }`}>
                    {hive.archived_at ? 'Archived' : hive.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-text-secondary text-center py-4">No hives in this apiary</p>
        )}
      </div>

      {/* Recent Activity */}
      {recentRecords.length > 0 && (
        <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
          <div className="space-y-2">
            {recentRecords.map((record) => (
              <Link
                key={record.id}
                href={`/dashboard/records?hive=${record.hive_id}`}
                className="flex items-center justify-between p-3 bg-surface-elevated dark:bg-surface-elevated rounded-lg border border-border hover:border-forest-500 dark:hover:border-forest-400 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-text-tertiary" />
                  <span className="text-sm font-medium text-foreground">{record.type}</span>
                  <span className="text-xs text-text-secondary">- {record.hive_number}</span>
                </div>
                <span className="text-xs text-text-tertiary">
                  {new Date(record.date).toLocaleDateString('en-IE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
