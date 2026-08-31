'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUserId } from '@/lib/auth'
import { BookOpen, ChevronDown, Check, Trash2 } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Button from '@/components/ui/Button'
import { useLogbook } from '@/hooks/useLogbook'
import { LOGBOOK_STAGES, getTotalSkillCount } from '@/lib/logbook-skills'
import type { LogbookCategory, LogbookSkill, LogbookEntryFormData } from '@/types/logbook'

export default function LogbookPage() {
 const router = useRouter()
 const [userId, setUserId] = useState<string | null>(null)
 const [selectedStageId, setSelectedStageId] = useState('stage_2')
 const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
 const [activeSkillId, setActiveSkillId] = useState<string | null>(null)
 const [formData, setFormData] = useState<LogbookEntryFormData>({
 assessor_name: '',
 assessor_fibka_number: '',
 completed_date: new Date().toISOString().split('T')[0],
 notes: '',
 })
 const [saving, setSaving] = useState(false)

 const { entries, loading, fetchEntries, saveEntry, deleteEntry } = useLogbook()

 const stage = useMemo(
 () => LOGBOOK_STAGES.find(s => s.id === selectedStageId),
 [selectedStageId]
 )

 const totalSkills = useMemo(() => (stage ? getTotalSkillCount(stage) : 0), [stage])
 const completedCount = useMemo(() => {
 if (!stage) return 0
 return stage.categories.reduce(
 (sum, cat) => sum + cat.skills.filter(s => entries[s.id]).length,
 0
 )
 }, [stage, entries])

 useEffect(() => {
 const init = async () => {
 const id = await getCurrentUserId()
 if (!id) {
 router.push('/login')
 return
 }
 setUserId(id)
 await fetchEntries(id)
 }
 init()
 }, [fetchEntries, router])

 const toggleCategory = (categoryId: string) => {
 setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }))
 }

 const openForm = (skill: LogbookSkill) => {
 const existing = entries[skill.id]
 if (existing) {
 setFormData({
 assessor_name: existing.assessor_name,
 assessor_fibka_number: existing.assessor_fibka_number || '',
 completed_date: existing.completed_date,
 notes: existing.notes || '',
 })
 } else {
 setFormData({
 assessor_name: '',
 assessor_fibka_number: '',
 completed_date: new Date().toISOString().split('T')[0],
 notes: '',
 })
 }
 setActiveSkillId(skill.id)
 }

 const handleSave = async () => {
 if (!userId || !activeSkillId) return
 if (!formData.assessor_name.trim()) return
 setSaving(true)
 const ok = await saveEntry(userId, activeSkillId, formData)
 if (ok) setActiveSkillId(null)
 setSaving(false)
 }

 const handleDelete = async (skillId: string, entryId: string) => {
 setSaving(true)
 await deleteEntry(skillId, entryId)
 if (activeSkillId === skillId) setActiveSkillId(null)
 setSaving(false)
 }

 const getCategoryCompletedCount = (category: LogbookCategory) =>
 category.skills.filter(s => entries[s.id]).length

 if (loading) return <LoadingSpinner />
 if (!stage) return null

 const progressPercent = totalSkills > 0 ? Math.round((completedCount / totalSkills) * 100) : 0

 return (
 <div className="p-4 sm:p-6 max-w-3xl mx-auto">
 {/* Header */}
 <div className="flex items-center gap-3 mb-6">
 <BookOpen size={28} className="text-forest-600 dark:text-forest-400" />
 <h1 className="text-2xl font-bold text-foreground">FIBKA Logbook</h1>
 </div>

 {/* Stage selector */}
 {LOGBOOK_STAGES.length > 1 && (
 <div className="mb-4">
 <select
 value={selectedStageId}
 onChange={e => {
 setSelectedStageId(e.target.value)
 setExpandedCategories({})
 setActiveSkillId(null)
 }}
 className="w-full sm:w-auto px-3 py-2 text-sm rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-forest-500 focus:border-transparent"
 >
 {LOGBOOK_STAGES.map(s => (
 <option key={s.id} value={s.id}>{s.name}</option>
 ))}
 </select>
 </div>
 )}

 {/* Overall progress */}
 <div className="bg-surface dark:bg-surface rounded-lg shadow border border-border p-4 mb-6">
 <div className="flex justify-between items-center mb-2">
 <span className="text-sm font-medium text-foreground">Overall Progress</span>
 <span className="text-sm text-text-secondary">
 {completedCount} / {totalSkills} skills ({progressPercent}%)
 </span>
 </div>
 <div className="w-full bg-surface-secondary rounded-full h-3">
 <div
 className="bg-forest-600 dark:bg-forest-500 h-3 rounded-full transition-all duration-300"
 style={{ width: `${progressPercent}%` }}
 />
 </div>
 </div>

 {/* Categories accordion */}
 <div className="space-y-3">
 {stage.categories.map(category => {
 const catCompleted = getCategoryCompletedCount(category)
 const isExpanded = expandedCategories[category.id]

 return (
 <div
 key={category.id}
 className="bg-surface dark:bg-surface rounded-lg shadow border border-border overflow-hidden"
 >
 {/* Category header */}
 <Button
 onClick={() => toggleCategory(category.id)}
 aria-expanded={!!isExpanded}
 aria-controls={`skills-${category.id}`}
 className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-secondary transition-colors"
 >
 <div className="flex items-center gap-3">
 <ChevronDown
 size={20}
 className={`text-text-tertiary transition-transform ${isExpanded ? '' : '-rotate-90'}`}
 />
 <span className="font-semibold text-foreground">{category.name}</span>
 </div>
 <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
 catCompleted === category.skills.length
 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
 : 'bg-surface-secondary text-text-secondary border border-border'
 }`}>
 {catCompleted}/{category.skills.length}
 </span>
 </Button>

 {/* Skills list */}
 {isExpanded && (
 <div id={`skills-${category.id}`} className="border-t border-border">
 {category.skills.map(skill => {
 const entry = entries[skill.id]
 const isActive = activeSkillId === skill.id

 return (
 <div key={skill.id}>
 <Button
 onClick={() => isActive ? setActiveSkillId(null) : openForm(skill)}
 className={`w-full flex items-start gap-3 p-3 px-4 text-left hover:bg-surface-secondary transition-colors border-b border-border last:border-b-0 ${
 isActive ? 'bg-blue-50 dark:bg-blue-950/20' : ''
 }`}
 >
 <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
 entry
 ? 'bg-green-500 border-green-500 text-white'
 : 'border-border'
 }`}>
 {entry && <Check size={12} />}
 </div>
 <div className="flex-1 min-w-0">
 <p className={`text-sm ${entry ? 'text-foreground' : 'text-text-secondary'}`}>
 {skill.description}
 </p>
 {entry && !isActive && (
 <p className="text-sm text-text-tertiary mt-1">
 Assessed by {entry.assessor_name} on {new Date(entry.completed_date).toLocaleDateString('en-IE')}
 </p>
 )}
 </div>
 </Button>

 {/* Inline form */}
 {isActive && (
 <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border-b border-border">
 <div className="space-y-3">
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Assessor Name <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 value={formData.assessor_name}
 onChange={e => setFormData(prev => ({ ...prev, assessor_name: e.target.value }))}
 maxLength={200}
 className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-forest-500 focus:border-transparent"
 placeholder="Enter assessor name"
 />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 FIBKA Number
 </label>
 <input
 type="text"
 value={formData.assessor_fibka_number}
 onChange={e => setFormData(prev => ({ ...prev, assessor_fibka_number: e.target.value }))}
 maxLength={50}
 className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-forest-500 focus:border-transparent"
 placeholder="Optional"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Date Completed <span className="text-red-500">*</span>
 </label>
 <input
 type="date"
 value={formData.completed_date}
 max={new Date().toISOString().split('T')[0]}
 onChange={e => setFormData(prev => ({ ...prev, completed_date: e.target.value }))}
 className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-forest-500 focus:border-transparent"
 />
 </div>
 </div>
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Notes
 </label>
 <textarea
 value={formData.notes}
 onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
 rows={2}
 className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none"
 placeholder="Optional notes"
 />
 </div>
 <div className="flex gap-2">
 <Button
 onClick={handleSave}
 disabled={saving || !formData.assessor_name.trim()}
 className="px-4 py-2 text-sm font-medium bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 disabled:opacity-50 transition-colors"
 >
 {saving ? 'Saving...' : 'Save'}
 </Button>
 {entry && (
 <Button
 onClick={() => handleDelete(skill.id, entry.id)}
 disabled={saving}
 className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition-colors flex items-center gap-1"
 >
 <Trash2 size={14} />
 Remove
 </Button>
 )}
 <Button
 onClick={() => setActiveSkillId(null)}
 className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-surface-secondary transition-colors"
 >
 Cancel
 </Button>
 </div>
 </div>
 </div>
 )}
 </div>
 )
 })}
 </div>
 )}
 </div>
 )
 })}
 </div>
 </div>
 )
}

