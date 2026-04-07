'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, GitCompareArrows } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { fetchQueenReportData } from '@/hooks/useQueenDetail'
import QueenCompareTable, { type CompareColumn } from '@/components/queens/QueenCompareTable'
import type { Queen, QueenReport, ReportTimeWindow } from '@/types/queen'

const COMPARE_MAX = 4

interface RawQueenRow {
  id: string
  user_id: string
  queen_number: string
  birth_date: string
  marking_color: string
  source: string
  subspecies: string
  lineage: string
  queen_clipped: boolean
  status: string
  performance_notes: string
  mated_at_eircode: string
  mated_date: string | null
  mother_id: string | null
  father_id: string | null
  batch_id: string | null
  batch?: { id: string; batch_name: string } | { id: string; batch_name: string }[] | null
  mother?: { id: string; queen_number: string; marking_color: string } | { id: string; queen_number: string; marking_color: string }[] | null
  father?: { id: string; queen_number: string; marking_color: string } | { id: string; queen_number: string; marking_color: string }[] | null
  hives?:
    | { id: string; hive_number: string; apiaries?: { name: string } | { name: string }[] | null }
    | { id: string; hive_number: string; apiaries?: { name: string } | { name: string }[] | null }[]
    | null
}

const firstOf = <T,>(v: T | T[] | null | undefined): T | null => {
  if (v == null) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

export default function QueenComparePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()

  const idsParam = searchParams.get('ids') ?? ''
  const requestedIds = useMemo(
    () => idsParam.split(',').map((s) => s.trim()).filter(Boolean),
    [idsParam]
  )

  const [timeWindow, setTimeWindow] = useState<ReportTimeWindow>('all')
  const [columns, setColumns] = useState<CompareColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [warning, setWarning] = useState<string | null>(null)
  // Monotonic request id — every effect run bumps it; only the latest run is
  // allowed to write state. Survives across re-renders without retriggering
  // the effect (a state-based version would loop).
  const requestIdRef = useRef(0)

  const ids = useMemo(() => {
    if (requestedIds.length > COMPARE_MAX) {
      return requestedIds.slice(0, COMPARE_MAX)
    }
    return requestedIds
  }, [requestedIds])

  useEffect(() => {
    if (requestedIds.length > COMPARE_MAX) {
      setWarning(`Only the first ${COMPARE_MAX} queens are shown; ${requestedIds.length} were requested.`)
    } else {
      setWarning(null)
    }
  }, [requestedIds])

  // Redirect to the queens list if fewer than 2 IDs supplied
  useEffect(() => {
    if (ids.length < 2) {
      toast.error('Select at least 2 queens to compare')
      router.replace('/dashboard/queens')
    }
  }, [ids.length, router, toast])

  useEffect(() => {
    if (ids.length < 2) return

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const isStale = () => requestIdRef.current !== requestId

    setLoading(true)

    const run = async () => {
      const userId = await getCurrentUserId()
      if (isStale()) return
      if (!userId) {
        router.replace('/login')
        return
      }

      // Fetch each queen row (with parents, batch, hive, apiary) in parallel.
      const queenRowResults = await Promise.allSettled(
        ids.map((id) =>
          supabase
            .from('queens')
            .select(
              `
              id, user_id, queen_number, birth_date, marking_color, source, subspecies, lineage,
              queen_clipped, status, performance_notes, mated_at_eircode, mated_date,
              mother_id, father_id, batch_id,
              batch:rearing_batches!batch_id(id, batch_name),
              mother:queens!mother_id(id, queen_number, marking_color),
              father:queens!father_id(id, queen_number, marking_color),
              hives!queen_id(id, hive_number, apiaries(name))
            `
            )
            .eq('id', id)
            .maybeSingle()
        )
      )
      if (isStale()) return

      // Build "shallow" columns first so queens that can't be fetched still
      // occupy a column with an error stub.
      type Intermediate = {
        id: string
        queen: Queen | null
        hiveId: string | null
        hiveNumber: string | null
        apiaryName: string | null
        error: string | null
      }
      const intermediates: Intermediate[] = queenRowResults.map((result, idx) => {
        const id = ids[idx]
        if (result.status === 'rejected' || result.value.error || !result.value.data) {
          return { id, queen: null, hiveId: null, hiveNumber: null, apiaryName: null, error: 'Queen not found or not accessible' }
        }
        const raw = result.value.data as unknown as RawQueenRow
        const hive = firstOf(raw.hives)
        const apiary = hive ? firstOf(hive.apiaries) : null
        const mother = firstOf(raw.mother)
        const father = firstOf(raw.father)
        const batch = firstOf(raw.batch)
        const queen: Queen = {
          id: raw.id,
          user_id: raw.user_id,
          queen_number: raw.queen_number,
          birth_date: raw.birth_date,
          marking_color: raw.marking_color,
          source: raw.source,
          subspecies: raw.subspecies,
          lineage: raw.lineage,
          queen_clipped: raw.queen_clipped,
          status: raw.status,
          performance_notes: raw.performance_notes,
          mated_at_eircode: raw.mated_at_eircode,
          mated_date: raw.mated_date,
          mother_id: raw.mother_id,
          father_id: raw.father_id,
          batch_id: raw.batch_id,
          mother: mother ?? null,
          father: father ?? null,
          batch: batch ?? null,
        }
        return {
          id: raw.id,
          queen,
          hiveId: hive?.id ?? null,
          hiveNumber: hive?.hive_number ?? null,
          apiaryName: apiary?.name ?? null,
          error: null,
        }
      })

      // Now fetch reports in parallel for queens that loaded successfully.
      const reportResults = await Promise.allSettled(
        intermediates.map((inter) =>
          inter.queen
            ? fetchQueenReportData(inter.queen.mother_id ?? null, inter.id, inter.hiveId, timeWindow)
            : Promise.resolve(null as unknown as QueenReport)
        )
      )
      if (isStale()) return

      const finalColumns: CompareColumn[] = intermediates.map((inter, idx) => {
        if (inter.error || !inter.queen) {
          return { id: inter.id, queen: null, hiveNumber: null, apiaryName: null, report: null, error: inter.error ?? 'Unknown error' }
        }
        const reportRes = reportResults[idx]
        if (reportRes.status === 'rejected') {
          return {
            id: inter.id,
            queen: inter.queen,
            hiveNumber: inter.hiveNumber,
            apiaryName: inter.apiaryName,
            report: null,
            error: 'Failed to load report data',
          }
        }
        return {
          id: inter.id,
          queen: inter.queen,
          hiveNumber: inter.hiveNumber,
          apiaryName: inter.apiaryName,
          report: reportRes.value,
          error: null,
        }
      })

      setColumns(finalColumns)
      setLoading(false)
    }

    run().catch((err) => {
      if (isStale()) return
      console.error('Compare load failed:', err)
      toast.error('Failed to load comparison')
      setLoading(false)
    })

    // Invalidate this request when the effect re-runs or the component
    // unmounts. Pending async checkpoints will see isStale() === true and
    // bail before touching state on a dead component.
    return () => {
      requestIdRef.current = requestId + 1
    }
  }, [ids, timeWindow, router, toast])

  if (ids.length < 2) {
    return <LoadingSpinner text="Redirecting…" />
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/dashboard/queens">
          <Button tone="neutral" className="p-2" aria-label="Back to queens">
            <ArrowLeft size={20} />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <GitCompareArrows size={24} className="text-forest-600 dark:text-forest-400" />
          Compare Queens
        </h1>
        <span className="text-sm text-text-secondary">
          {columns.length > 0 ? `${columns.length} queen${columns.length === 1 ? '' : 's'}` : ''}
        </span>
      </div>

      {warning && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {warning}
        </div>
      )}

      {/* Filters */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow p-4 border border-border">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-tertiary uppercase mb-1">
              Time Window
            </label>
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value as ReportTimeWindow)}
              className="px-3 py-2 rounded-md border border-border bg-surface dark:bg-surface-elevated text-foreground text-sm min-h-[44px]"
            >
              <option value="all">All time</option>
              <option value="90">Last 90 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </div>
          <p className="text-xs text-text-tertiary flex-1">
            Trait averages use the selected window. Latest inspection always shows the most recent entry.
          </p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner text="Loading comparison…" />
      ) : (
        <QueenCompareTable columns={columns} />
      )}
    </div>
  )
}
