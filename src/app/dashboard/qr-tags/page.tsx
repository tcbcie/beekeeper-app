'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { Plus, Trash2, Link2, Link2Off, Printer, QrCode, Users } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import ModalShell from '@/components/ui/ModalShell'
import FormActionRow from '@/components/ui/FormActionRow'
import FieldLabel from '@/components/ui/FieldLabel'
import TextInput from '@/components/ui/TextInput'
import SelectField from '@/components/ui/SelectField'
import Button from '@/components/ui/Button'
import { generateTagCode } from '@/lib/qr-tags'
import { QRCodeSVG } from 'qrcode.react'

interface QrTag {
 id: string
 code: string
 hive_id: string | null
 team_id: string | null
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

interface TeamOption {
 id: string
 name: string
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

 // Team/shared state
 const [ownedTeams, setOwnedTeams] = useState<TeamOption[]>([])
 const [teamNames, setTeamNames] = useState<Record<string, string>>({})
 const [sharedTags, setSharedTags] = useState<QrTag[]>([])
 const [sharedHivesByTeam, setSharedHivesByTeam] = useState<Record<string, HiveOption[]>>({})
 const [generateTeamId, setGenerateTeamId] = useState('')
 const [memberTeamIds, setMemberTeamIds] = useState<string[]>([])

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
 .select('id, code, hive_id, team_id, label, created_at, assigned_at')
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

 const fetchTeamData = useCallback(async (uid: string) => {
 // Owned teams
 const { data: owned, error: ownedError } = await supabase
  .from('teams')
  .select('id, name')
  .eq('owner_id', uid)
 if (ownedError) {
  showToast('Failed to load team data', 'error')
  return { memberOnlyIds: [] as string[], allTeamIds: [] as string[] }
 }
 const ownedList: TeamOption[] = (owned || []).map(t => ({ id: t.id, name: t.name }))
 setOwnedTeams(ownedList)

 // Member teams (via team_members)
 const { data: memberships, error: memberError } = await supabase
  .from('team_members')
  .select('team_id, teams(id, name)')
  .eq('user_id', uid)
 if (memberError) {
  showToast('Failed to load team memberships', 'error')
 }
 const memberTeams: TeamOption[] = (memberships || []).map(m => {
  const team = Array.isArray(m.teams) ? m.teams[0] : m.teams
  return { id: (team as { id: string; name: string })?.id || m.team_id, name: (team as { id: string; name: string })?.name || '' }
 })

 // Build names map
 const names: Record<string, string> = {}
 ownedList.forEach(t => { names[t.id] = t.name })
 memberTeams.forEach(t => { names[t.id] = t.name })
 setTeamNames(names)

 // Member-only IDs (teams user didn't create) for shared tags
 const ownedIds = new Set(ownedList.map(t => t.id))
 const memberOnlyIds = memberTeams.filter(t => !ownedIds.has(t.id)).map(t => t.id)
 const allTeamIds = [...new Set([...ownedList.map(t => t.id), ...memberTeams.map(t => t.id)])]
 return { memberOnlyIds, allTeamIds }
 }, [showToast])

 const fetchSharedTags = useCallback(async (uid: string, teamIdsToFetch: string[]) => {
 if (teamIdsToFetch.length === 0) { setSharedTags([]); return }

 const { data, error } = await supabase
  .from('qr_tags')
  .select('id, code, hive_id, team_id, label, created_at, assigned_at')
  .in('team_id', teamIdsToFetch)
  .neq('user_id', uid)
  .order('created_at', { ascending: false })

 if (error) { setSharedTags([]); return }

 // Fetch hive details for assigned shared tags
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

 setSharedTags((data || []).map(t => ({
  ...t,
  hive: t.hive_id ? hiveMap[t.hive_id] || null : null,
 })))
 }, [])

 const fetchSharedHives = useCallback(async (allTeamIds: string[]) => {
 if (allTeamIds.length === 0) { setSharedHivesByTeam({}); return }

 const { data: teamApiaries } = await supabase
  .from('team_apiaries')
  .select('team_id, apiary_id')
  .in('team_id', allTeamIds)
 if (!teamApiaries || teamApiaries.length === 0) { setSharedHivesByTeam({}); return }

 const apiaryToTeams: Record<string, string[]> = {}
 for (const ta of teamApiaries) {
  if (!apiaryToTeams[ta.apiary_id]) apiaryToTeams[ta.apiary_id] = []
  apiaryToTeams[ta.apiary_id].push(ta.team_id)
 }

 const { data: hivesData } = await supabase
  .from('hives')
  .select('id, hive_number, apiary_id, apiaries(name)')
  .in('apiary_id', Object.keys(apiaryToTeams))
  .is('archived_at', null)
  .order('hive_number')
 if (!hivesData) { setSharedHivesByTeam({}); return }

 const byTeam: Record<string, HiveOption[]> = {}
 for (const h of hivesData) {
  const apiaryData = h.apiaries
  const apiary = Array.isArray(apiaryData) ? apiaryData[0] : apiaryData
  const opt: HiveOption = { id: h.id, hive_number: h.hive_number, apiary_name: (apiary as { name: string })?.name ?? null }
  const teams = apiaryToTeams[h.apiary_id] || []
  for (const tid of teams) {
   if (!byTeam[tid]) byTeam[tid] = []
   byTeam[tid].push(opt)
  }
 }
 setSharedHivesByTeam(byTeam)
 }, [])

 useEffect(() => {
 const init = async () => {
 const uid = await getCurrentUserId()
 if (!uid) return
 setUserId(uid)
 const [, , teamData] = await Promise.all([fetchTags(uid), fetchHives(uid), fetchTeamData(uid)])
 if (teamData) {
  setMemberTeamIds(teamData.memberOnlyIds)
  await Promise.all([fetchSharedTags(uid, teamData.memberOnlyIds), fetchSharedHives(teamData.allTeamIds)])
 }
 setLoading(false)
 }
 init()
 }, [fetchTags, fetchHives, fetchTeamData, fetchSharedTags, fetchSharedHives])

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
 newTags.push({ code, user_id: userId, label, team_id: generateTeamId || null })
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
 setGenerateTeamId('')
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
 if (memberTeamIds.length > 0) await fetchSharedTags(userId, memberTeamIds)
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

 const allPrintTags = [...tags, ...sharedTags]

 const handlePrintBatch = () => {
 if (allPrintTags.length === 0 || !qrContainerRef.current) return

 const escapeHtml = (str: string) =>
 str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

 // Serialise each hidden QRCodeSVG to a data URI
 const qrHtml = allPrintTags.map(tag => {
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
 <p style="margin:2px 0 0;font-size:12px;font-weight:bold;">${escapeHtml(tag.code)}</p>
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
 {allPrintTags.length > 0 && (
 <Button
 onClick={handlePrintBatch}
 className="px-4 py-2 bg-surface-secondary text-foreground rounded-lg hover:bg-surface-elevated border border-border font-medium flex items-center gap-2 text-sm"
 >
 <Printer size={16} />
 Print All
 </Button>
 )}
 <Button
 onClick={() => setShowGenerateModal(true)}
 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 text-sm"
 >
 <Plus size={16} />
 Generate Tags
 </Button>
 </div>
 </div>

 {/* Tags List */}
 {tags.length === 0 && sharedTags.length === 0 ? (
 <div className="bg-surface rounded-lg shadow-lg p-12 text-center border border-border">
 <QrCode size={48} className="mx-auto mb-4 text-text-tertiary" />
 <h2 className="text-xl font-semibold text-foreground mb-2">No QR Tags Yet</h2>
 <p className="text-text-tertiary mb-6">Generate tags, print them, and attach to your hives. Tags can be reassigned at any time.</p>
 <Button
 onClick={() => setShowGenerateModal(true)}
 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
 >
 Generate Your First Tags
 </Button>
 </div>
 ) : (
 <>
 {/* My Tags */}
 {tags.length > 0 && (
 <>
 <h2 className="text-lg font-semibold text-foreground mb-3">My Tags</h2>
 {/* Mobile Cards */}
 <div className="md:hidden space-y-3">
 {tags.map(tag => (
 <div key={tag.id} className="bg-surface rounded-lg shadow p-4 border border-border">
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-2">
 <span className="font-mono font-bold text-foreground">{tag.code}</span>
 {tag.team_id && teamNames[tag.team_id] && (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full">
  <Users size={10} />{teamNames[tag.team_id]}
  </span>
 )}
 </div>
 <div className="flex gap-1">
 <Button
 onClick={() => {
 setAssigningTag(tag)
 setSelectedHiveId(tag.hive_id || '')
 setShowAssignModal(true)
 }}
 className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
 title={tag.hive_id ? 'Reassign' : 'Assign'}
 >
 {tag.hive_id ? <Link2 size={16} /> : <Link2Off size={16} />}
 </Button>
 {deletingTagId === tag.id ? (
 <div className="flex gap-1">
 <Button
 onClick={() => handleDelete(tag.id)}
 className="px-2 py-1 text-xs bg-red-600 text-white rounded"
 >
 Confirm
 </Button>
 <Button
 onClick={() => setDeletingTagId(null)}
 className="px-2 py-1 text-xs bg-surface-secondary text-foreground rounded"
 >
 Cancel
 </Button>
 </div>
 ) : (
 <Button
 onClick={() => setDeletingTagId(tag.id)}
 className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
 >
 <Trash2 size={16} />
 </Button>
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
 <thead className="bg-surface-secondary">
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
 <tr key={tag.id} className="hover:bg-surface-secondary">
 <td className="px-4 py-3 font-mono font-bold text-foreground">
 <span>{tag.code}</span>
 {tag.team_id && teamNames[tag.team_id] && (
  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full">
  <Users size={10} />{teamNames[tag.team_id]}
  </span>
 )}
 </td>
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
 <Button
 onClick={() => {
 setAssigningTag(tag)
 setSelectedHiveId(tag.hive_id || '')
 setShowAssignModal(true)
 }}
 className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
 title={tag.hive_id ? 'Reassign' : 'Assign to hive'}
 >
 {tag.hive_id ? <Link2 size={16} /> : <Link2Off size={16} />}
 </Button>
 {deletingTagId === tag.id ? (
 <div className="flex gap-1">
 <Button
 onClick={() => handleDelete(tag.id)}
 className="px-2 py-1 text-xs bg-red-600 text-white rounded"
 >
 Confirm
 </Button>
 <Button
 onClick={() => setDeletingTagId(null)}
 className="px-2 py-1 text-xs bg-surface-secondary text-foreground rounded"
 >
 Cancel
 </Button>
 </div>
 ) : (
 <Button
 onClick={() => setDeletingTagId(tag.id)}
 className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
 >
 <Trash2 size={16} />
 </Button>
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
 </>
 )}

 {/* Shared with Me */}
 {sharedTags.length > 0 && (
 <>
 <h2 className="text-lg font-semibold text-foreground mt-8 mb-3 flex items-center gap-2">
 <Users size={18} className="text-blue-600" />
 Shared with Me
 </h2>

 {/* Shared Mobile Cards */}
 <div className="md:hidden space-y-3">
 {sharedTags.map(tag => (
 <div key={tag.id} className="bg-surface rounded-lg shadow p-4 border border-blue-200 dark:border-blue-800">
  <div className="flex items-center justify-between mb-2">
  <div className="flex items-center gap-2">
   <span className="font-mono font-bold text-foreground">{tag.code}</span>
   {tag.team_id && teamNames[tag.team_id] && (
   <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full">
   <Users size={10} />{teamNames[tag.team_id]}
   </span>
   )}
  </div>
  <Button
   onClick={() => {
   setAssigningTag(tag)
   setSelectedHiveId(tag.hive_id || '')
   setShowAssignModal(true)
   }}
   className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
   title={tag.hive_id ? 'Reassign' : 'Assign'}
  >
   {tag.hive_id ? <Link2 size={16} /> : <Link2Off size={16} />}
  </Button>
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

 {/* Shared Desktop Table */}
 <div className="hidden md:block bg-surface rounded-lg shadow-lg border border-blue-200 dark:border-blue-800 overflow-hidden">
 <table className="w-full">
  <thead className="bg-surface-secondary">
  <tr>
   <th className="text-left px-4 py-3 text-sm font-semibold text-text-secondary">Code</th>
   <th className="text-left px-4 py-3 text-sm font-semibold text-text-secondary">Team</th>
   <th className="text-left px-4 py-3 text-sm font-semibold text-text-secondary">Label</th>
   <th className="text-left px-4 py-3 text-sm font-semibold text-text-secondary">Assigned Hive</th>
   <th className="text-left px-4 py-3 text-sm font-semibold text-text-secondary">Created</th>
   <th className="text-right px-4 py-3 text-sm font-semibold text-text-secondary">Actions</th>
  </tr>
  </thead>
  <tbody className="divide-y divide-border">
  {sharedTags.map(tag => (
   <tr key={tag.id} className="hover:bg-surface-secondary">
   <td className="px-4 py-3 font-mono font-bold text-foreground">{tag.code}</td>
   <td className="px-4 py-3 text-sm">
    {tag.team_id && teamNames[tag.team_id] && (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full">
     <Users size={10} />{teamNames[tag.team_id]}
    </span>
    )}
   </td>
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
    <Button
    onClick={() => {
     setAssigningTag(tag)
     setSelectedHiveId(tag.hive_id || '')
     setShowAssignModal(true)
    }}
    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
    title={tag.hive_id ? 'Reassign' : 'Assign to hive'}
    >
    {tag.hive_id ? <Link2 size={16} /> : <Link2Off size={16} />}
    </Button>
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
 onClose={() => { setShowGenerateModal(false); setGenerateTeamId('') }}
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
 {ownedTeams.length > 0 && (
 <div>
 <FieldLabel>For</FieldLabel>
 <SelectField
  value={generateTeamId}
  onChange={e => setGenerateTeamId(e.target.value)}
 >
  <option value="">My hives</option>
  {ownedTeams.map(t => (
  <option key={t.id} value={t.id}>Team: {t.name}</option>
  ))}
 </SelectField>
 </div>
 )}
 <Button
 onClick={handleGenerate}
 disabled={generating}
 className="fj-btn fj-btn-blue w-full disabled:opacity-50"
 >
 {generating ? 'Generating...' : `Generate ${generateQuantity} Tag${generateQuantity > 1 ? 's' : ''}`}
 </Button>
 </ModalShell>
 )}

 {/* Assign Modal */}
 {/* Hidden QR codes for offline-safe batch print */}
 <div ref={qrContainerRef} className="hidden" aria-hidden="true">
 {allPrintTags.map(tag => {
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
 {(() => {
 // Use shared hives when assigning a shared tag, own hives otherwise
 const hiveList = assigningTag?.team_id
  ? (sharedHivesByTeam[assigningTag.team_id] || [])
  : hives
 const allTags = [...tags, ...sharedTags]
 return hiveList.filter(h => {
  const taken = allTags.some(t => t.hive_id === h.id && t.id !== assigningTag?.id)
  return !taken
 }).map(h => (
  <option key={h.id} value={h.id}>
  Hive {h.hive_number}{h.apiary_name ? ` (${h.apiary_name})` : ''}
  </option>
 ))
 })()}
 </SelectField>
 </div>
 <FormActionRow>
 <Button
 onClick={handleAssign}
 className="fj-btn fj-btn-blue fj-btn-sm flex-1"
 >
 {selectedHiveId ? 'Assign' : 'Unassign'}
 </Button>
 <Button
 onClick={() => { setShowAssignModal(false); setAssigningTag(null) }}
 className="fj-btn fj-btn-neutral fj-btn-sm flex-1"
 >
 Cancel
 </Button>
 </FormActionRow>
 </ModalShell>
 )}
 </div>
 )
}

