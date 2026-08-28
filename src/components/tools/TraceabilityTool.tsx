'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Package, Milk, Plus, Printer, Tag } from 'lucide-react'
import type { BulkContainer, BatchLabelPointer } from '@/types/traceability'
import Button from '@/components/ui/Button'
import PrintLabelsModal from '@/components/labels/PrintLabelsModal'
import type { LabelDatum } from '@/components/labels/types'
import { formatDateGB } from '@/components/labels/dateFormat'
import { useLabelPrinting } from '@/hooks/useLabelPrinting'
import ContainersTab from './traceability/ContainersTab'
import BatchesTab from './traceability/BatchesTab'
import JarLabelsTab from './traceability/JarLabelsTab'
import ProvenanceExplainer from './traceability/ProvenanceExplainer'

type TabType = 'containers' | 'batches' | 'labels'

interface TraceabilityToolProps {
  userId: string
}

interface ProducerContext {
  producerName?: string
  producerAddress?: string
}

// Walk the container -> harvest -> hive -> apiary chain to collect the
// distinct producing cities. The output is the locality block on the wholesale
// label: a single source apiary gives 'Athenry, Ireland'; two apiaries give
// 'Athenry & Loughrea, Ireland'; three or more (or any missing city data)
// falls back to plain 'Ireland' so the label never claims a locality it
// can't substantiate from the linked source records.
function aggregateOrigin(container: BulkContainer): string {
  const cities = new Map<string, string>()
  for (const ch of container.harvests ?? []) {
    const harvestRaw = ch.harvest as unknown
    const harvest = Array.isArray(harvestRaw) ? harvestRaw[0] : harvestRaw
    const hivesRaw = (harvest as { hives?: unknown } | null)?.hives
    const hive = Array.isArray(hivesRaw) ? hivesRaw[0] : hivesRaw
    const apiariesRaw = (hive as { apiaries?: unknown } | null)?.apiaries
    const apiary = Array.isArray(apiariesRaw) ? apiariesRaw[0] : apiariesRaw
    const city = (apiary as { city?: string | null } | null)?.city?.trim()
    if (!city) continue
    const key = city.toLowerCase()
    if (!cities.has(key)) cities.set(key, city)
  }
  if (cities.size === 0) return 'Ireland'
  if (cities.size === 1) return `${cities.values().next().value}, Ireland`
  if (cities.size === 2) {
    const [a, b] = Array.from(cities.values())
    return `${a} & ${b}, Ireland`
  }
  return 'Ireland'
}

function aggregateFloralSource(container: BulkContainer): string | undefined {
  // Dedupe case-insensitively (free-text field, 'Heather' and 'heather' should
  // collapse to the same source) but preserve the first cased value seen for
  // display so the label respects whatever convention the user types.
  const seen = new Map<string, string>()
  for (const ch of container.harvests ?? []) {
    // PostgREST joins may surface as an array or a single object depending on
    // the projection — normalise both shapes before reading.
    const harvestRaw = ch.harvest as unknown
    const harvest = Array.isArray(harvestRaw) ? harvestRaw[0] : harvestRaw
    const raw = (harvest as { floral_source?: string | null } | null)?.floral_source
    const trimmed = raw?.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (!seen.has(key)) seen.set(key, trimmed)
  }
  if (seen.size === 0) return undefined
  if (seen.size === 1) return seen.values().next().value
  return 'Wildflower'
}

function addYears(iso: string | null | undefined, years: number): string | null {
  if (!iso) return null
  // Accept 'YYYY-MM-DD' (DB date) and full ISO; both safe to parse.
  const normalised = iso.includes('T') ? iso : `${iso}T00:00:00`
  const d = new Date(normalised)
  if (Number.isNaN(d.getTime())) return null
  d.setFullYear(d.getFullYear() + years)
  // Re-encode as YYYY-MM-DD so formatDateGB can normalise/format.
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function containerToLabelDatum(
  container: BulkContainer,
  context: ProducerContext
): LabelDatum {
  const extracted = formatDateGB(container.extraction_date)
  const bestBefore = formatDateGB(addYears(container.extraction_date, 2))
  return {
    id: container.id,
    primaryText: container.container_code || '—',
    balkaniExtras: {
      salesName: 'Irish Honey',
      floralSource: aggregateFloralSource(container),
      netWeight: container.total_weight_kg != null ? `${container.total_weight_kg} kg` : undefined,
      moistureContent: container.moisture_content != null ? `${container.moisture_content}%` : undefined,
      lotCode: container.container_code || '—',
      extractedDate: extracted ?? undefined,
      bestBeforeDate: bestBefore ?? undefined,
      origin: aggregateOrigin(container),
      producerName: context.producerName,
      producerAddress: context.producerAddress,
    },
  }
}

export default function TraceabilityTool({ userId }: TraceabilityToolProps) {
  const { enabled: labelPrintingEnabled } = useLabelPrinting(userId)

  const [activeTab, setActiveTab] = useState<TabType>('containers')

  // Container state
  const [containers, setContainers] = useState<BulkContainer[]>([])
  const [selectedContainerIds, setSelectedContainerIds] = useState<Set<string>>(new Set())
  const [printContainers, setPrintContainers] = useState<BulkContainer[] | null>(null)
  const [producerContext, setProducerContext] = useState<ProducerContext>({})

  // Load the producer's name and address from their profile so EU-compliant
  // balkani labels can show the legally-required producer block. Read-only:
  // if any field is missing the label degrades gracefully. Re-runs whenever
  // a print modal is opened so a user who has just edited their profile in
  // another tab sees the fresh values without a full page reload.
  const loadProducerContext = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from('profiles')
      .select('first_name, last_name, producer_address')
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      console.error('Failed to load producer profile for labels', error)
      return
    }
    const fullName = [data?.first_name, data?.last_name]
      .filter((s): s is string => !!s && s.trim().length > 0)
      .join(' ')
    setProducerContext({
      producerName: fullName || undefined,
      producerAddress: data?.producer_address || undefined,
    })
  }, [userId])

  useEffect(() => {
    if (!labelPrintingEnabled) return
    loadProducerContext()
  }, [labelPrintingEnabled, loadProducerContext])

  // Refresh the producer context when the print modal opens so a profile
  // edit (made in another tab/page since mount) shows up on the next label.
  useEffect(() => {
    if (printContainers === null) return
    loadProducerContext()
  }, [printContainers, loadProducerContext])

  // Prune selection of container ids that no longer exist after a refetch /
  // delete. Without this the bulk-print button shows a count that includes
  // deleted rows, and `containers.filter(...)` silently drops them.
  useEffect(() => {
    setSelectedContainerIds(prev => {
      if (prev.size === 0) return prev
      const live = new Set(containers.map(c => c.id))
      let changed = false
      const next = new Set<string>()
      for (const id of prev) {
        if (live.has(id)) next.add(id)
        else changed = true
      }
      return changed ? next : prev
    })
  }, [containers])
  const [showContainerForm, setShowContainerForm] = useState(false)
  const [showBatchForm, setShowBatchForm] = useState(false)
  const [showLabelForm, setShowLabelForm] = useState(false)

  // Which printed jar labels point at which batch. Held here rather than in
  // JarLabelsTab because the batch form needs it too: editing a batch that a
  // live label points at changes what customers see when they scan.
  const [labelPointers, setLabelPointers] = useState<BatchLabelPointer[]>([])

  const fetchLabelPointers = useCallback(async () => {
    const { data, error } = await supabase
      .from('trace_labels')
      .select('id, name, code, current_batch_id, is_active')
      .eq('user_id', userId)
      .not('current_batch_id', 'is', null)

    if (error) {
      console.error('Error fetching jar label pointers:', error)
      return
    }
    setLabelPointers((data || []) as BatchLabelPointer[])
  }, [userId])

  useEffect(() => {
    fetchLabelPointers()
  }, [fetchLabelPointers])

  const fetchContainers = useCallback(async () => {
    const { data, error } = await supabase
      .from('bulk_containers')
      .select(`
        *,
        harvests:container_harvests(
          id,
          harvest_id,
          harvest:harvests(
            id,
            harvest_date,
            honey_weight,
            unit,
            floral_source,
            hive_id,
            hives(
              hive_number,
              apiary_id,
              apiaries(id, name, city)
            )
          )
        ),
        batch_usage:batch_containers(
          weight_used_kg,
          batch:batch_runs(batch_code, total_weight_kg)
        )
      `)
      .eq('user_id', userId)
      .order('extraction_date', { ascending: false })

    if (error) {
      console.error('Error fetching containers:', error)
      return
    }

    setContainers(data || [])
  }, [userId])


  // Containers are shared by both tabs (the batch form links to containers),
  // so the shell owns them and refreshes on tab switch as before.
  useEffect(() => {
    fetchContainers()
  }, [activeTab, fetchContainers])

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package size={24} className="text-forest-600 dark:text-forest-400" />
          <h2 className="text-xl font-semibold text-foreground">Honey Provenance</h2>
        </div>
        <div className="flex items-center gap-2">
          {labelPrintingEnabled && activeTab === 'containers' && selectedContainerIds.size > 0 && (
            <Button
              onClick={() => setPrintContainers(containers.filter(c => selectedContainerIds.has(c.id)))}
              className="flex items-center gap-2 px-4 py-2 bg-surface-elevated text-foreground border border-border rounded-lg hover:bg-surface-secondary transition-colors"
            >
              <Printer size={18} />
              <span className="hidden sm:inline">Print selected ({selectedContainerIds.size})</span>
              <span className="sm:hidden">{selectedContainerIds.size}</span>
            </Button>
          )}
          <Button
            onClick={() => {
              if (activeTab === 'containers') setShowContainerForm(true)
              else if (activeTab === 'batches') setShowBatchForm(true)
              else setShowLabelForm(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">
              {activeTab === 'containers' ? 'New Bulk Honey' : activeTab === 'batches' ? 'New Batch' : 'New Jar Label'}
            </span>
          </Button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        <Button
          onClick={() => setActiveTab('containers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'containers'
              ? 'bg-amber-600 text-white'
              : 'bg-surface-elevated text-text-secondary hover:bg-surface-elevated/80'
          }`}
        >
          <Package size={18} />
          <span>Bulk Honey</span>
        </Button>
        <Button
          onClick={() => setActiveTab('batches')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'batches'
              ? 'bg-amber-600 text-white'
              : 'bg-surface-elevated text-text-secondary hover:bg-surface-elevated/80'
          }`}
        >
          <Milk size={18} />
          <span>Batches</span>
        </Button>
        <Button
          onClick={() => setActiveTab('labels')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'labels'
              ? 'bg-amber-600 text-white'
              : 'bg-surface-elevated text-text-secondary hover:bg-surface-elevated/80'
          }`}
        >
          <Tag size={18} />
          <span>Jar Labels</span>
        </Button>
      </div>

      {/* Names the Bulk Honey -> Batch -> Jar Label chain, which none of the
          three tab labels conveys on its own. */}
      <ProvenanceExplainer activeTab={activeTab} />

      {activeTab === 'labels' ? (
        <JarLabelsTab
          userId={userId}
          showLabelForm={showLabelForm}
          setShowLabelForm={setShowLabelForm}
          onLabelsChanged={fetchLabelPointers}
        />
      ) : activeTab === 'containers' ? (
        <ContainersTab
          userId={userId}
          containers={containers}
          fetchContainers={fetchContainers}
          labelPrintingEnabled={labelPrintingEnabled}
          selectedContainerIds={selectedContainerIds}
          setSelectedContainerIds={setSelectedContainerIds}
          setPrintContainers={setPrintContainers}
          showContainerForm={showContainerForm}
          setShowContainerForm={setShowContainerForm}
        />
      ) : (
        <BatchesTab
          userId={userId}
          containers={containers}
          showBatchForm={showBatchForm}
          setShowBatchForm={setShowBatchForm}
          labelPointers={labelPointers}
        />
      )}
      <PrintLabelsModal
        open={printContainers !== null}
        onClose={() => setPrintContainers(null)}
        data={(printContainers ?? []).map(c => containerToLabelDatum(c, producerContext))}
        presetId="balkani_label"
        title={printContainers && printContainers.length === 1
          ? `Print label — ${printContainers[0].container_code}`
          : `Print ${printContainers?.length ?? 0} balkani labels`}
      />
    </div>
  )
}
