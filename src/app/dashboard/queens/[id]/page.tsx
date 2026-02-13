'use client'
import { useEffect } from 'react'
import { getCurrentUserId } from '@/lib/auth'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Edit2, ExternalLink, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import QueenLineageTree from '@/components/QueenLineageTree'
import { useQueenDetail } from '@/hooks'
import { getQueenColorFromYear, calculateQueenAge } from '@/types/queen'

export default function QueenDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queenId = params.id as string

  const {
    queen,
    hive,
    offspring,
    sightings,
    loading,
    isOwner,
    fetchQueenData,
  } = useQueenDetail(queenId)

  useEffect(() => {
    const init = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      fetchQueenData(id)
    }
    init()
  }, [router, fetchQueenData])

  if (loading) return <LoadingSpinner text="Loading queen..." />

  if (!queen) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Queen not found</p>
        <button onClick={() => router.push('/dashboard/queens')} className="mt-4 text-forest-600 dark:text-forest-400 hover:underline">
          Back to Queens
        </button>
      </div>
    )
  }

  const markingColor = getQueenColorFromYear(queen.birth_date)
  const age = calculateQueenAge(queen.birth_date)
  const isOld = queen.birth_date && (Date.now() - new Date(queen.birth_date).getTime()) > 2 * 365 * 24 * 60 * 60 * 1000

  const colorBadgeClass = (color: string) => {
    switch (color) {
      case 'White': return 'bg-slate-100 dark:bg-slate-700 text-text-primary border-slate-300 dark:border-slate-600'
      case 'Yellow': return 'bg-yellow-200 text-yellow-900 border-yellow-400'
      case 'Red': return 'bg-red-200 text-red-900 border-red-400'
      case 'Green': return 'bg-green-200 text-green-900 border-green-400'
      case 'Blue': return 'bg-blue-200 text-blue-900 border-blue-400'
      default: return 'bg-sage-100 dark:bg-slate-700 text-text-primary border-border'
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/queens')}
          className="p-2 hover:bg-sage-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          aria-label="Back to queens"
        >
          <ArrowLeft size={20} className="text-text-secondary" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{queen.queen_number}</h1>
            {markingColor && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded border ${colorBadgeClass(markingColor)}`}>
                {markingColor}
              </span>
            )}
            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${
              queen.status === 'active'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700'
                : 'bg-sage-100 dark:bg-slate-700 text-text-secondary border-border'
            }`}>
              {queen.status}
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">Age: {age}</p>
        </div>
        {isOwner && (
          <Link
            href={`/dashboard/queens?id=${queen.id}&edit=true`}
            className="p-2 hover:bg-sage-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Edit Queen"
          >
            <Edit2 size={18} className="text-text-secondary" />
          </Link>
        )}
      </div>

      {/* Age Warning */}
      {isOld && queen.status === 'active' && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            This queen is over 2 years old. Consider planning a replacement to maintain colony productivity.
          </p>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Identity */}
          <div>
            <h3 className="text-xs font-semibold text-text-tertiary uppercase mb-2">Identity</h3>
            <div className="space-y-1.5 text-sm">
              <p><span className="text-text-tertiary">Source:</span> <span className="text-text-primary">{queen.source || 'N/A'}</span></p>
              <p><span className="text-text-tertiary">Born:</span> <span className="text-text-primary">{queen.birth_date ? new Date(queen.birth_date).toLocaleDateString('en-IE') : 'N/A'}</span></p>
              <p><span className="text-text-tertiary">Clipped:</span> <span className="text-text-primary">{queen.queen_clipped ? 'Yes' : 'No'}</span></p>
              {queen.mated_at_eircode && (
                <p><span className="text-text-tertiary">Mated at:</span> <span className="text-text-primary">{queen.mated_at_eircode}</span></p>
              )}
            </div>
          </div>

          {/* Genetics */}
          <div>
            <h3 className="text-xs font-semibold text-text-tertiary uppercase mb-2">Genetics</h3>
            <div className="space-y-1.5 text-sm">
              <p>
                <span className="text-text-tertiary">Mother:</span>{' '}
                {queen.mother ? (
                  <Link href={`/dashboard/queens/${queen.mother.id}`} className="text-forest-600 dark:text-forest-400 hover:underline">
                    {queen.mother.queen_number}
                  </Link>
                ) : 'Unknown'}
              </p>
              <p>
                <span className="text-text-tertiary">Father:</span>{' '}
                {queen.father ? (
                  <Link href={`/dashboard/queens/${queen.father.id}`} className="text-forest-600 dark:text-forest-400 hover:underline">
                    {queen.father.queen_number}
                  </Link>
                ) : 'Unknown'}
              </p>
              <p><span className="text-text-tertiary">Subspecies:</span> <span className="text-text-primary">{queen.subspecies || 'N/A'}</span></p>
              <p><span className="text-text-tertiary">Lineage:</span> <span className="text-text-primary">{queen.lineage || 'N/A'}</span></p>
              {queen.batch && (
                <p>
                  <span className="text-text-tertiary">Batch:</span>{' '}
                  <Link href={`/dashboard/batches`} className="text-forest-600 dark:text-forest-400 hover:underline">
                    {queen.batch.batch_name}
                  </Link>
                </p>
              )}
            </div>
          </div>

          {/* Assignment */}
          <div>
            <h3 className="text-xs font-semibold text-text-tertiary uppercase mb-2">Assignment</h3>
            {hive ? (
              <div className="space-y-1.5 text-sm">
                <p>
                  <span className="text-text-tertiary">Hive:</span>{' '}
                  <Link href={`/dashboard/hives/${hive.id}`} className="text-forest-600 dark:text-forest-400 hover:underline inline-flex items-center gap-1">
                    {hive.hive_number}
                    <ExternalLink size={12} />
                  </Link>
                </p>
                {hive.apiary_name && (
                  <p><span className="text-text-tertiary">Apiary:</span> <span className="text-text-primary">{hive.apiary_name}</span></p>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-tertiary">Not assigned to a hive</p>
            )}
            {queen.performance_notes && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-text-tertiary font-medium mb-1">Performance Notes</p>
                <p className="text-sm text-text-primary">{queen.performance_notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {hive && (
          <Link
            href={`/dashboard/hives/${hive.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-surface dark:bg-surface border border-border rounded-full hover:border-forest-500 dark:hover:border-forest-400 text-text-secondary hover:text-forest-700 dark:hover:text-forest-300 transition-colors"
          >
            <ExternalLink size={14} />
            View Hive
          </Link>
        )}
        {queen.batch && (
          <Link
            href="/dashboard/batches"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-surface dark:bg-surface border border-border rounded-full hover:border-forest-500 dark:hover:border-forest-400 text-text-secondary hover:text-forest-700 dark:hover:text-forest-300 transition-colors"
          >
            <ExternalLink size={14} />
            View Batch
          </Link>
        )}
      </div>

      {/* Lineage Tree */}
      <QueenLineageTree queenId={queenId} />

      {/* Offspring */}
      {offspring.length > 0 && (
        <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Offspring ({offspring.length})</h2>
          <div className="space-y-2">
            {offspring.map((child) => (
              <Link
                key={child.id}
                href={`/dashboard/queens/${child.id}`}
                className="flex items-center justify-between p-3 bg-surface-elevated dark:bg-surface-elevated rounded-lg border border-border hover:border-forest-500 dark:hover:border-forest-400 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${colorBadgeClass(child.marking_color)}`}>
                    {child.marking_color || 'None'}
                  </span>
                  <span className="font-medium text-foreground">{child.queen_number}</span>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                  child.status === 'active'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-sage-100 dark:bg-slate-700 text-text-secondary'
                }`}>
                  {child.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Queen Sighting Timeline */}
      {sightings.length > 0 && (
        <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Sighting History</h2>
          <div className="space-y-2">
            {sightings.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/records?hive=${s.hive_id}`}
                className="flex items-center justify-between p-3 bg-surface-elevated dark:bg-surface-elevated rounded-lg border border-border hover:border-forest-500 dark:hover:border-forest-400 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-text-tertiary" />
                  <span className="text-sm text-text-primary">{s.hive_number}</span>
                  <div className="flex items-center gap-1.5">
                    {s.queen_seen ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                        <CheckCircle size={12} /> Seen
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-red-700 dark:text-red-400">
                        <XCircle size={12} /> Not seen
                      </span>
                    )}
                    {s.eggs_present && (
                      <span className="text-xs text-amber-700 dark:text-amber-400">Eggs present</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-text-tertiary">
                  {new Date(s.inspection_date).toLocaleDateString('en-IE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
