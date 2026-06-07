'use client'
import { useEffect, useState } from 'react'
import { getCurrentUserId } from '@/lib/auth'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Edit2, ExternalLink, AlertTriangle, CheckCircle, XCircle, Clock, Printer } from 'lucide-react'
import Link from 'next/link'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import QueenLineageTree from '@/components/QueenLineageTree'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import NavTabButton from '@/components/ui/NavTabButton'
import QueenReportTab from '@/components/queens/QueenReportTab'
import { useQueenDetail } from '@/hooks'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { getQueenColorFromYear, calculateQueenAge, queenRoleLabel, isProductionQueen } from '@/types/queen'
import QueenRoleBadge from '@/components/queens/QueenRoleBadge'
import { DRONE_SOURCE_OPTIONS } from '@/lib/lineage'
import { queenCodeFor, type BreederContext } from '@/lib/queen-code'
import PrintLabelsModal from '@/components/labels/PrintLabelsModal'
import { queenToLabelDatum } from '@/components/labels/queenMapping'
import { useLabelPrinting } from '@/hooks/useLabelPrinting'

export default function QueenDetailPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const queenId = params.id as string
  const [activeTab, setActiveTab] = useState<'overview' | 'report'>('overview')
  const [lineageExpanded, setLineageExpanded] = useState(true)
  const [showMatedForm, setShowMatedForm] = useState(false)
  const [matedDate, setMatedDate] = useState('')
  const [matedEircode, setMatedEircode] = useState('')
  const [cellActionLoading, setCellActionLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [breederProfile, setBreederProfile] = useState<BreederContext | null>(null)
  const [printOpen, setPrintOpen] = useState(false)
  const { enabled: labelPrintingEnabled } = useLabelPrinting()

  const {
    queen,
    hive,
    offspring,
    sightings,
    loading,
    isOwner,
    fetchQueenData,
    fetchQueenReport,
  } = useQueenDetail(queenId)

  useEffect(() => {
    const init = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setCurrentUserId(id)
      fetchQueenData(id)
      // Owner profile drives the composite queen code's country + breeder initials.
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, first_name, last_name, is_uk_ni_resident, breeder_code')
        .eq('id', id)
        .maybeSingle()
      if (profile) {
        const name = profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ')
        setBreederProfile({ name, isUkNi: !!profile.is_uk_ni_resident, breederCode: profile.breeder_code })
      }
    }
    init()
  }, [router, fetchQueenData])

  if (loading) return <LoadingSpinner text="Loading queen..." />

  if (!queen) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Queen not found</p>
        <Button onClick={() => router.push('/dashboard/queens')} tone="neutral" size="sm" className="mt-4">
          Back to Queens
        </Button>
      </div>
    )
  }

  const handleMarkMated = async () => {
    if (!currentUserId) return
    if (!matedDate) {
      toast.error('Please enter a mated date')
      return
    }
    setCellActionLoading(true)
    try {
      const { error, count } = await supabase
        .from('queens')
        .update(
          {
            status: 'active',
            mated_date: matedDate,
            mated_at_eircode: matedEircode || queen.mated_at_eircode || null,
          },
          { count: 'exact' }
        )
        .eq('id', queen.id)
        .eq('user_id', currentUserId)
        .eq('status', 'cell')
      if (error) throw error
      if (count === 0) {
        toast.error('Queen was already updated — please refresh')
        fetchQueenData(currentUserId)
        return
      }
      // Feed back mating confirmation to graft_distributions for Queen Tracker / NIHBS report
      if (queen.batch_id) {
        (async () => {
          try {
            const { data: match } = await supabase
              .from('graft_distributions')
              .select('id')
              .eq('batch_id', queen.batch_id)
              .eq('recipient_user_id', currentUserId)
              .eq('distribution_type', 'queen_cell')
              .eq('mating_confirmed', false)
              .order('distribution_date', { ascending: true })
              .limit(1)
              .maybeSingle()
            if (match) {
              const { error: distError } = await supabase
                .from('graft_distributions')
                .update({
                  mating_confirmed: true,
                  mating_confirmed_date: matedDate,
                  mating_location: matedEircode || queen.mated_at_eircode || null,
                })
                .eq('id', match.id)
              if (distError) console.error('Non-blocking: failed to update distribution mating status:', distError)
            }
          } catch (err) {
            console.error('Non-blocking: failed to update distribution mating status:', err)
          }
        })()
      }
      toast.success('Queen marked as mated')
      setShowMatedForm(false)
      setMatedDate('')
      setMatedEircode('')
      fetchQueenData(currentUserId)
    } catch {
      toast.error('Failed to update queen status')
    } finally {
      setCellActionLoading(false)
    }
  }

  const handleMarkFailed = async () => {
    if (!currentUserId) return
    if (!confirm('Mark this cell as failed? This will set the status to dead.')) return
    setCellActionLoading(true)
    try {
      const { error, count } = await supabase
        .from('queens')
        .update({ status: 'dead' }, { count: 'exact' })
        .eq('id', queen.id)
        .eq('user_id', currentUserId)
        .eq('status', 'cell')
      if (error) throw error
      if (count === 0) {
        toast.error('Queen was already updated — please refresh')
        fetchQueenData(currentUserId)
        return
      }
      toast.success('Cell marked as failed')
      fetchQueenData(currentUserId)
    } catch {
      toast.error('Failed to update queen status')
    } finally {
      setCellActionLoading(false)
    }
  }

  const markingColor = getQueenColorFromYear(queen.birth_date)
  const age = calculateQueenAge(queen.birth_date)

  // Composite (BeeBreed-style) queen code. Only apply the viewer's breeder context to queens
  // they own (the profile fetched here is the viewer's); shared queens from other beekeepers
  // keep their own provenance (distributed) or show no code.
  const ownerContext = isOwner ? breederProfile : null
  const queenCode = queenCodeFor(queen, ownerContext)
  const isOld = queen.birth_date && (Date.now() - new Date(queen.birth_date).getTime()) > 2 * 365 * 24 * 60 * 60 * 1000

  const colorBadgeClass = (color: string) => {
    switch (color) {
      case 'White': return 'bg-surface-secondary text-text-primary border-border'
      case 'Yellow': return 'bg-yellow-200 dark:bg-yellow-900/40 text-yellow-900 dark:text-yellow-200 border-yellow-400 dark:border-yellow-700'
      case 'Red': return 'bg-red-200 dark:bg-red-900/40 text-red-900 dark:text-red-200 border-red-400 dark:border-red-700'
      case 'Green': return 'bg-green-200 dark:bg-green-900/40 text-green-900 dark:text-green-200 border-green-400 dark:border-green-700'
      case 'Blue': return 'bg-blue-200 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200 border-blue-400 dark:border-blue-700'
      default: return 'bg-surface-secondary text-text-primary border-border'
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <IconButton
          onClick={() => router.push('/dashboard/queens')}
          className="hover:bg-surface-secondary"
          aria-label="Back to queens"
        >
          <ArrowLeft size={20} className="text-text-secondary" />
        </IconButton>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{queen.queen_number}</h1>
            <QueenRoleBadge role={queen.queen_role} />
            {queenCode && (
              <span className="px-2 py-0.5 text-xs font-mono font-medium rounded border border-border bg-surface-secondary text-text-secondary" title="Composite queen code (country · breeder · number · year)">
                {queenCode}
              </span>
            )}
            {markingColor && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded border ${colorBadgeClass(markingColor)}`}>
                {markingColor}
              </span>
            )}
            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${
              queen.status === 'active'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700'
                : queen.status === 'cell'
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                : queen.status === 'swarmed'
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700'
                : queen.status === 'superseded'
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700'
                : 'bg-surface-secondary text-text-secondary border-border'
            }`}>
              {queen.status === 'cell'
                ? 'Cell'
                : queen.status === 'swarmed'
                ? 'Swarmed'
                : queen.status === 'superseded'
                ? 'Superseded'
                : queen.status}
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">Age: {age}</p>
        </div>
        {labelPrintingEnabled && (
          <button
            type="button"
            onClick={() => setPrintOpen(true)}
            className="p-2 hover:bg-surface-secondary rounded-lg transition-colors"
            title="Print label"
          >
            <Printer size={18} className="text-text-secondary" />
          </button>
        )}
        {isOwner && (
          <Link
            href={`/dashboard/queens?id=${queen.id}&edit=true`}
            className="p-2 hover:bg-surface-secondary rounded-lg transition-colors"
            title="Edit Queen"
          >
            <Edit2 size={18} className="text-text-secondary" />
          </Link>
        )}
      </div>

      {/* Cell Banner */}
      {queen.status === 'cell' && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              This is a queen cell — not yet emerged or mated
            </p>
          </div>
          {isOwner && !showMatedForm && (
            <div className="flex gap-2">
              <Button
                onClick={() => setShowMatedForm(true)}
                disabled={cellActionLoading}
                className="px-4 py-2 bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 text-sm min-h-[44px]"
              >
                Mark as Mated
              </Button>
              <Button
                onClick={handleMarkFailed}
                disabled={cellActionLoading}
                className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 text-sm min-h-[44px]"
              >
                Mark as Failed
              </Button>
            </div>
          )}
          {showMatedForm && (
            <div className="mt-3 space-y-3 bg-white dark:bg-surface-elevated rounded-lg p-4 border border-amber-200 dark:border-amber-800">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Mated Date *</label>
                <input
                  type="date"
                  value={matedDate}
                  onChange={(e) => setMatedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Mated at (Eircode)</label>
                <input
                  type="text"
                  value={matedEircode}
                  onChange={(e) => setMatedEircode(e.target.value.toUpperCase())}
                  placeholder="e.g., H91 E6K2"
                  maxLength={8}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary uppercase focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleMarkMated}
                  disabled={cellActionLoading}
                  className="px-4 py-2 bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 text-sm min-h-[44px]"
                >
                  {cellActionLoading ? 'Saving...' : 'Confirm Mated'}
                </Button>
                <Button
                  onClick={() => setShowMatedForm(false)}
                  className="px-4 py-2 bg-surface-secondary text-text-primary rounded-lg hover:bg-surface-elevated text-sm min-h-[44px]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Age Warning */}
      {isOld && queen.status === 'active' && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            This queen is over 2 years old. Consider planning a replacement to maintain colony productivity.
          </p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex flex-wrap -mb-px">
          <NavTabButton
            onClick={() => setActiveTab('overview')}
            size="lg"
            tone="forest"
            active={activeTab === 'overview'}
          >
            Overview
          </NavTabButton>
          <NavTabButton
            onClick={() => setActiveTab('report')}
            size="lg"
            tone="forest"
            active={activeTab === 'report'}
          >
            Report
          </NavTabButton>
        </nav>
      </div>

      {activeTab === 'report' ? (
        <QueenReportTab queen={queen} hive={hive} fetchQueenReport={fetchQueenReport} />
      ) : (
      <>
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
              {queen.mated_date && (
                <p><span className="text-text-tertiary">Mated:</span> <span className="text-text-primary">{new Date(queen.mated_date).toLocaleDateString('en-IE')}</span></p>
              )}
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
                ) : queen.distributed_mother_queen ? (
                  // Distributed queens carry the breeder's mother as a text snapshot (no local FK).
                  <span className="text-text-primary" title={queen.distributed_mother_queen}>{queen.distributed_mother_queen.split(' (')[0]}</span>
                ) : 'Unknown'}
              </p>
              {/* Father (single drone line) is only meaningful for instrumental insemination;
                  open/station matings record a drone source + station instead. */}
              {(queen.drone_source_type === 'ii' || queen.father) && (
                <p>
                  <span className="text-text-tertiary">Father:</span>{' '}
                  {queen.father ? (
                    <Link href={`/dashboard/queens/${queen.father.id}`} className="text-forest-600 dark:text-forest-400 hover:underline">
                      {queen.father.queen_number}
                    </Link>
                  ) : 'Unknown'}
                </p>
              )}
              <p>
                <span className="text-text-tertiary">Drone source:</span>{' '}
                <span className="text-text-primary">{DRONE_SOURCE_OPTIONS.find((o) => o.value === queen.drone_source_type)?.label || 'Open-mated'}</span>
              </p>
              {queen.mating_station && (
                <p><span className="text-text-tertiary">Mating station:</span> <span className="text-text-primary">{queen.mating_station}</span></p>
              )}
              <p><span className="text-text-tertiary">Subspecies:</span> <span className="text-text-primary">{queen.subspecies || 'N/A'}</span></p>
              {!isProductionQueen(queen.queen_role) && (
                <p><span className="text-text-tertiary">Role:</span> <span className="text-text-primary">{queenRoleLabel(queen.queen_role)}{queen.origin_breeder_code ? ` · origin ${queen.origin_breeder_code}` : ''}</span></p>
              )}
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

      {/* Distributed queens show breeder provenance (the genealogy tree cannot render a
          cross-user ancestor). The tree below still surfaces locally-bred descendants, with
          the mother snapshot fed in as a fallback so the Mother slot is not "Unknown". */}
      {queen.distributed_by_name && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium mb-1">Distributed Queen — Provenance</p>
          <p>Breeder: {queen.distributed_by_name}</p>
          {queen.distributed_batch_name && <p>Batch: {queen.distributed_batch_name}</p>}
          {queen.distributed_mother_queen && <p>Mother Queen: {queen.distributed_mother_queen}</p>}
          {queen.distributed_drone_source && <p>Drone Source: {queen.distributed_drone_source}</p>}
        </div>
      )}
      <QueenLineageTree
        queenId={queenId}
        expanded={lineageExpanded}
        onToggle={() => setLineageExpanded(!lineageExpanded)}
        motherFallback={queen.distributed_mother_queen ?? undefined}
      />

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
                    : child.status === 'cell'
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                    : 'bg-surface-secondary text-text-secondary'
                }`}>
                  {child.status === 'cell' ? 'Cell' : child.status}
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
      </>
      )}

      <PrintLabelsModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        data={[queenToLabelDatum(queen, ownerContext)]}
        presetId="queen_label"
        title={`Print label — ${queen.queen_number}`}
      />
    </div>
  )
}
