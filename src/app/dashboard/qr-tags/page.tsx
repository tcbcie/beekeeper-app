'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { Plus, Trash2, Link2, Link2Off, Printer, QrCode } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import ModalShell from '@/components/ui/ModalShell'
import FormActionRow from '@/components/ui/FormActionRow'
import FieldLabel from '@/components/ui/FieldLabel'
import TextInput from '@/components/ui/TextInput'
import SelectField from '@/components/ui/SelectField'
import { generateTagCode } from '@/lib/qr-tags'
import { QRCodeSVG } from 'qrcode.react'

interface QrTag {
  id: string
  code: string
  hive_id: string | null
  label: string | null
  created_at: string
  assigned_at: string | null
  hive?: { hive_number: string; apiaries: { name: string } | null } | null
}

interface HiveOption {
  id: string
  hive_number: string
  apiary_name: string | null
}

export default function QrTagsPage() {
  const [tags, setTags] = useState<QrTag[]>([])
  const [hives, setHives] = useState<HiveOption[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const { showToast } = useToast()

  // Generate modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateQuantity, setGenerateQuantity] = useState(1)
  const [generateLabel, setGenerateLabel] = useState('')
  const [generating, setGenerating] = useState(false)

  // Assign modal state
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assigningTag, setAssigningTag] = useState<QrTag | null>(null)
  const [selectedHiveId, setSelectedHiveId] = useState('')

  // Delete confirmation
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null)

  // Load logo as base64 for QR codes
  const [logoBase64, setLogoBase64] = useState<string>('')
  useEffect(() => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      setLogoBase64(canvas.toDataURL('image/png'))
    }
    img.src = '/logo_trans.png'
  }, [])

  const fetchTags = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('qr_tags')
      .select('id, code, hive_id, label, created_at, assigned_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })

    if (error) {
      showToast('Failed to load tags', 'error')
      return
    }

    // Fetch hive details for assigned tags
    const hiveIds = (data || []).filter(t => t.hive_id).map(t => t.hive_id!)
    const hiveMap: Record<string, { hive_number: string; apiaries: { name: string } | null }> = {}

    if (hiveIds.length > 0) {
      const { data: hivesData } = await supabase
        .from('hives')
        .select('id, hive_number, apiaries(name)')
        .in('id', hiveIds)

      if (hivesData) {
        for (const h of hivesData) {
          const apiaryData = h.apiaries
          hiveMap[h.id] = {
            hive_number: h.hive_number,
            apiaries: Array.isArray(apiaryData) ? apiaryData[0] ?? null : apiaryData,
          }
        }
      }
    }

    setTags((data || []).map(t => ({
      ...t,
      hive: t.hive_id ? hiveMap[t.hive_id] || null : null,
    })))
  }, [showToast])

  const fetchHives = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('hives')
      .select('id, hive_number, apiaries(name)')
      .eq('user_id', uid)
      .is('archived_at', null)
      .order('hive_number')

    if (data) {
      setHives(data.map(h => {
        const apiaryData = h.apiaries
        const apiary = Array.isArray(apiaryData) ? apiaryData[0] : apiaryData
        return {
          id: h.id,
          hive_number: h.hive_number,
          apiary_name: apiary?.name ?? null,
        }
      }))
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      const uid = await getCurrentUserId()
      if (!uid) return
      setUserId(uid)
      await Promise.all([fetchTags(uid), fetchHives(uid)])
      setLoading(false)
    }
    init()
  }, [fetchTags, fetchHives])

  const handleGenerate = async () => {
    if (!userId) return
    setGenerating(true)

    try {
      const newTags = []
      for (let i = 0; i < generateQuantity; i++) {
        const code = generateTagCode()
        const label = generateLabel
          ? (generateQuantity > 1 ? `${generateLabel} ${i + 1}` : generateLabel)
          : null
        newTags.push({ code, user_id: userId, label })
      }

      const { error } = await supabase.from('qr_tags').insert(newTags)

      if (error) {
        // Handle unique constraint collision — retry with new codes
        if (error.code === '23505') {
          showToast('Code collision — please try again', 'error')
        } else {
          showToast('Failed to generate tags', 'error')
        }
        return
      }

      showToast(`Generated ${generateQuantity} tag${generateQuantity > 1 ? 's' : ''}`, 'success')
      setShowGenerateModal(false)
      setGenerateQuantity(1)
      setGenerateLabel('')
      await fetchTags(userId)
    } finally {
      setGenerating(false)
    }
  }

  const handleAssign = async () => {
    if (!assigningTag || !userId) return

    const hiveId = selectedHiveId || null
    const { error } = await supabase
      .from('qr_tags')
      .update({
        hive_id: hiveId,
        assigned_at: hiveId ? new Date().toISOString() : null,
      })
      .eq('id', assigningTag.id)

    if (error) {
      showToast('Failed to assign tag', 'error')
      return
    }

    showToast(hiveId ? 'Tag assigned to hive' : 'Tag unassigned', 'success')
    setShowAssignModal(false)
    setAssigningTag(null)
    setSelectedHiveId('')
    await fetchTags(userId)
  }

  const handleDelete = async (tagId: string) => {
    if (!userId) return

    const { error } = await supabase
      .from('qr_tags')
      .delete()
      .eq('id', tagId)

    if (error) {
      showToast('Failed to delete tag', 'error')
      return
    }

    showToast('Tag deleted', 'success')
    setDeletingTagId(null)
    await fetchTags(userId)
  }

  const qrContainerRef = useRef<HTMLDivElement>(null)

  const handlePrintBatch = () => {
    if (tags.length === 0 || !qrContainerRef.current) return

    const escapeHtml = (str: string) =>
      str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    // Serialise each hidden QRCodeSVG to a data URI
    const qrHtml = tags.map(tag => {
      const svg = qrContainerRef.current?.querySelector(`[data-tag-code="${tag.code}"]`)
      let imgTag = ''
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg)
        const dataUri = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
        imgTag = `<img src="${dataUri}" width="150" height="150" />`
      }
      return `
        <div style="display:inline-block;text-align:center;padding:16px;page-break-inside:avoid;">
          ${imgTag}
          <p style="margin:4px 0 0;font-size:9px;color:#999;">www.hivecraic.com</p>
          <p style="margin:2px 0 0;font-size:12px;font-weight:bold;">${tag.code}</p>
          ${tag.label ? `<p style="margin:2px 0 0;font-size:10px;color:#666;">${escapeHtml(tag.label)}</p>` : ''}
        </div>
      `
    }).join('')

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head><title>QR Tags Batch Print</title></head>
        <body style="font-family:sans-serif;padding:20px;">
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${qrHtml}
          </div>
          <script>window.onload=function(){window.print();}<\/script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">QR Tags</h1>
          <p className="text-text-tertiary mt-1">Generate reusable QR tags and assign them to hives</p>
        </div>
        <div className="flex gap-2">
          {tags.length > 0 && (
            <button
              onClick={handlePrintBatch}
              className="px-4 py-2 bg-sage-200 dark:bg-slate-700 text-foreground rounded-lg hover:bg-sage-300 dark:hover:bg-slate-600 border border-border font-medium flex items-center gap-2 text-sm"
            >
              <Printer size={16} />
              Print All
            </button>
          )}
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            Generate Tags
          </button>
        </div>
      </div>

      {/* Tags List */}
      {tags.length === 0 ? (
        <div className="bg-surface rounded-lg shadow-lg p-12 text-center border border-border">
          <QrCode size={48} className="mx-auto mb-4 text-text-tertiary" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No QR Tags Yet</h2>
          <p className="text-text-tertiary mb-6">Generate tags, print them, and attach to your hives. Tags can be reassigned at any time.</p>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Generate Your First Tags
          </button>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {tags.map(tag => (
              <div key={tag.id} className="bg-surface rounded-lg shadow p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-foreground">{tag.code}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setAssigningTag(tag)
                        setSelectedHiveId(tag.hive_id || '')
                        setShowAssignModal(true)
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                      title={tag.hive_id ? 'Reassign' : 'Assign'}
                    >
                      {tag.hive_id ? <Link2 size={16} /> : <Link2Off size={16} />}
                    </button>
                    {deletingTagId === tag.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDelete(tag.id)}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeletingTagId(null)}
                          className="px-2 py-1 text-xs bg-sage-200 dark:bg-slate-700 text-foreground rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingTagId(tag.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                {tag.label && <p className="text-sm text-text-secondary mb-1">{tag.label}</p>}
                <p className="text-sm">
                  {tag.hive ? (
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      Hive {tag.hive.hive_number}
                      {tag.hive.apiaries && <span className="text-text-tertiary font-normal"> — {tag.hive.apiaries.name}</span>}
                    </span>
                  ) : (
                    <span className="text-text-tertiary italic">Unassigned</span>
                  )}
                </p>
                <p className="text-xs text-text-tertiary mt-1">
                  Created {new Date(tag.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-surface rounded-lg shadow-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-sage-50 dark:bg-slate-800">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-text-secondary">Code</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-text-secondary">Label</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-text-secondary">Assigned Hive</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-text-secondary">Created</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tags.map(tag => (
                  <tr key={tag.id} className="hover:bg-sage-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-mono font-bold text-foreground">{tag.code}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{tag.label || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      {tag.hive ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          Hive {tag.hive.hive_number}
                          {tag.hive.apiaries && <span className="text-text-tertiary font-normal"> — {tag.hive.apiaries.name}</span>}
                        </span>
                      ) : (
                        <span className="text-text-tertiary italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-tertiary">
                      {new Date(tag.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => {
                            setAssigningTag(tag)
                            setSelectedHiveId(tag.hive_id || '')
                            setShowAssignModal(true)
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                          title={tag.hive_id ? 'Reassign' : 'Assign to hive'}
                        >
                          {tag.hive_id ? <Link2 size={16} /> : <Link2Off size={16} />}
                        </button>
                        {deletingTagId === tag.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDelete(tag.id)}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingTagId(null)}
                              className="px-2 py-1 text-xs bg-sage-200 dark:bg-slate-700 text-foreground rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingTagId(tag.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Generate Modal */}
      {showGenerateModal && (
        <ModalShell
          title="Generate QR Tags"
          maxWidthClassName="max-w-sm"
          onClose={() => setShowGenerateModal(false)}
          closeOnBackdrop
          bodyClassName="p-6 space-y-4"
        >
          <div>
            <FieldLabel>Quantity (1-50)</FieldLabel>
            <TextInput
              type="number"
              min={1}
              max={50}
              value={generateQuantity}
              onChange={e => setGenerateQuantity(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
            />
          </div>
          <div>
            <FieldLabel>Label prefix (optional)</FieldLabel>
            <TextInput
              type="text"
              value={generateLabel}
              onChange={e => setGenerateLabel(e.target.value)}
              placeholder="e.g. Apiary A"
              maxLength={50}
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="fj-btn fj-btn-blue w-full disabled:opacity-50"
          >
            {generating ? 'Generating...' : `Generate ${generateQuantity} Tag${generateQuantity > 1 ? 's' : ''}`}
          </button>
        </ModalShell>
      )}

      {/* Assign Modal */}
      {/* Hidden QR codes for offline-safe batch print */}
      <div ref={qrContainerRef} className="hidden" aria-hidden="true">
        {tags.map(tag => {
          const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/hive-scan/tag/${tag.code}`
          return (
            <QRCodeSVG
              key={tag.id}
              data-tag-code={tag.code}
              value={url}
              size={150}
              level="H"
              includeMargin
              imageSettings={logoBase64 ? {
                src: logoBase64,
                height: 30,
                width: 30,
                excavate: true,
              } : undefined}
            />
          )
        })}
      </div>

      {showAssignModal && assigningTag && (
        <ModalShell
          title={`${assigningTag.hive_id ? 'Reassign' : 'Assign'} Tag ${assigningTag.code}`}
          maxWidthClassName="max-w-sm"
          onClose={() => { setShowAssignModal(false); setAssigningTag(null) }}
          closeOnBackdrop
          bodyClassName="p-6 space-y-4"
        >
          <div>
            <FieldLabel>Select Hive</FieldLabel>
            <SelectField
              value={selectedHiveId}
              onChange={e => setSelectedHiveId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {hives.filter(h => {
                // Exclude hives already assigned to another tag
                const taken = tags.some(t => t.hive_id === h.id && t.id !== assigningTag?.id)
                return !taken
              }).map(h => (
                <option key={h.id} value={h.id}>
                  Hive {h.hive_number}{h.apiary_name ? ` (${h.apiary_name})` : ''}
                </option>
              ))}
            </SelectField>
          </div>
          <FormActionRow>
            <button
              onClick={handleAssign}
              className="fj-btn fj-btn-blue fj-btn-sm flex-1"
            >
              {selectedHiveId ? 'Assign' : 'Unassign'}
            </button>
            <button
              onClick={() => { setShowAssignModal(false); setAssigningTag(null) }}
              className="fj-btn fj-btn-neutral fj-btn-sm flex-1"
            >
              Cancel
            </button>
          </FormActionRow>
        </ModalShell>
      )}
    </div>
  )
}
