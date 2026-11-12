'use client'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCurrentUserId } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { applyToolOrder, moveTool, parseToolOrder, toggleFavourite, toolOrderIds, withFavourites } from '@/lib/tool-order'
import { useSubmitLock } from '@/hooks/useSubmitLock'
import { Wrench, Droplet, Cookie, Cloud, Send, Thermometer, Grid3X3, Camera, Wallet, Package, ShoppingCart, QrCode, ArrowLeft, Scissors, ArrowUpDown, ChevronUp, ChevronDown, Star, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

// Panels load on demand: only the one on screen is downloaded, so heavy libraries
// (chart.js, QR codes) and large tabs stay out of the first load.
const GDDTracker = dynamic(() => import('@/components/tools/GDDTracker'), {
  loading: () => <LoadingSpinner text="Loading GDD tracker..." />,
  ssr: false,
})
const TBRPlanner = dynamic(() => import('@/components/tools/TBRPlanner'), {
  loading: () => <LoadingSpinner text="Loading TBR planner..." />,
  ssr: false,
})
const VarroaWeather = dynamic(() => import('@/components/tools/VarroaWeather'), {
  loading: () => <LoadingSpinner text="Loading varroa treatment check..." />,
  ssr: false,
})
const FrameCellCalculator = dynamic(() => import('@/components/tools/FrameCellCalculator'), {
  loading: () => <LoadingSpinner text="Loading cell calculator..." />,
  ssr: false,
})
const DiagnosisUploader = dynamic(() => import('@/components/tools/DiagnosisUploader'), {
  loading: () => <LoadingSpinner text="Loading diagnosis upload..." />,
  ssr: false,
})
const ProfitLoss = dynamic(() => import('@/components/tools/ProfitLoss'), {
  loading: () => <LoadingSpinner text="Loading profit and loss..." />,
  ssr: false,
})
const TraceabilityTool = dynamic(() => import('@/components/tools/TraceabilityTool'), {
  loading: () => <LoadingSpinner text="Loading traceability..." />,
  ssr: false,
})
const PurchaseList = dynamic(() => import('@/components/tools/PurchaseList'), {
  loading: () => <LoadingSpinner text="Loading purchase list..." />,
  ssr: false,
})

type ToolsSection = 'feeding' | 'fondant' | 'cells' | 'varroa' | 'gdd' | 'tbr' | 'diagnosis' | 'profitloss' | 'traceability' | 'purchases'

interface ToolCard {
 id: string
 label: string
 description: string
 icon: LucideIcon
 type: 'inline' | 'link'
 href?: string
}

interface ToolCategory {
 name: string
 tools: ToolCard[]
}

// The standard order. Each beekeeper can rearrange the cards within a section and star tools into
// a Favourites section at the top; saved in profiles.tool_order and profiles.tool_favourites
// (see docs/features/tools-card-order.md).
const TOOL_CATEGORIES: ToolCategory[] = [
 {
 name: 'Calculators',
 tools: [
 { id: 'feeding', label: 'Feeding Calculator', description: 'Calculate sugar syrup ratios for 1:1 and 3:2 feeds', icon: Droplet, type: 'inline' },
 { id: 'fondant', label: 'Fondant Recipe', description: 'Scale fondant ingredients for any batch size', icon: Cookie, type: 'inline' },
 { id: 'cells', label: 'Frame Cells', description: 'Estimate cell counts across different frame sizes', icon: Grid3X3, type: 'inline' },
 ],
 },
 {
 name: 'Hive Health',
 tools: [
 { id: 'varroa', label: 'Varroa Weather', description: 'See which days this week suit each varroa treatment', icon: Cloud, type: 'inline' },
 { id: 'gdd', label: 'GDD Tracker', description: 'Growing degree-day accumulation for forage predictions', icon: Thermometer, type: 'inline' },
 { id: 'tbr', label: 'TBR Swarm Planner', description: 'Time a total brood removal to peak foragers for the summer flow', icon: Scissors, type: 'inline' },
 { id: 'diagnosis', label: 'Diagnosis', description: 'Send photos of hive problems to help build a future diagnosis tool', icon: Camera, type: 'inline' },
 ],
 },
 {
 name: 'Business',
 tools: [
 { id: 'profitloss', label: 'Profit & Loss', description: 'Track income and expenses across your operation', icon: Wallet, type: 'inline' },
 { id: 'purchases', label: 'Purchases', description: 'Manage equipment and supply purchases', icon: ShoppingCart, type: 'inline' },
 { id: 'traceability', label: 'Provenance', description: 'Honey traceability and batch tracking records', icon: Package, type: 'inline' },
 ],
 },
 {
 name: 'Utilities',
 tools: [
 { id: 'qr-tags', label: 'QR Tags', description: 'Generate and manage QR codes for your hives', icon: QrCode, type: 'link', href: '/dashboard/qr-tags' },
 { id: 'wild-colony', label: 'Report Wild Colony', description: 'Help track wild and feral bee colonies in your area', icon: Send, type: 'link', href: '/dashboard/submit-colony' },
 ],
 },
]

const STANDARD_IDS = toolOrderIds(TOOL_CATEGORIES)
// Starred tools sit in this section, always first (see withFavourites)
const FAVOURITES = 'Favourites'
const ORDER_LOAD_TIMEOUT_MS = 5000
const ORDER_SAVE_TIMEOUT_MS = 10000
const STAR_TAP_GAP_MS = 500

export default function ToolsPage() {
 const [userId, setUserId] = useState<string | null>(null)
 const [activeSection, setActiveSection] = useState<ToolsSection | null>(null)
 const router = useRouter()
 const searchParams = useSearchParams()
 const toast = useToast()

 // Card layout: the saved order and favourites, and a draft while arranging (null = not
 // arranging). Section 0 of `categories` and of the draft is always Favourites.
 const [savedOrder, setSavedOrder] = useState<string[] | null>(null)
 const [savedFavourites, setSavedFavourites] = useState<string[] | null>(null)
 const [orderLoaded, setOrderLoaded] = useState(false)
 const [draft, setDraft] = useState<ToolCategory[] | null>(null)
 const [announcement, setAnnouncement] = useState('')
 const pendingFocusRef = useRef<{ id: string; button: 'up' | 'down' | 'star' } | null>(null)
 const lastStarTapRef = useRef(0)
 const { submitting: savingOrder, run: runSaveOrder } = useSubmitLock()
 const categories = useMemo(
 () => withFavourites(applyToolOrder(TOOL_CATEGORIES, savedOrder), savedFavourites, FAVOURITES),
 [savedOrder, savedFavourites],
 )

 // A moved row can lose keyboard focus when React moves it, so put focus back on the button
 // that was pressed, or on the other arrow once the row reaches the end of its section
 useEffect(() => {
 const pending = pendingFocusRef.current
 if (!pending) return
 pendingFocusRef.current = null
 const pressed = document.getElementById(`arrange-${pending.id}-${pending.button}`) as HTMLButtonElement | null
 const other = pending.button === 'star'
 ? null
 : document.getElementById(`arrange-${pending.id}-${pending.button === 'up' ? 'down' : 'up'}`) as HTMLButtonElement | null
 const target = pressed && !pressed.disabled ? pressed : other
 // A starred tool jumps to another section: keep the page where it is, so a beekeeper
 // starring several tools further down is not scrolled away each time
 target?.focus({ preventScroll: pending.button === 'star' })
 }, [draft])

 // Feeding calculator state
 const [sugarAmount, setSugarAmount] = useState<number>(10)

 // Fondant calculator state
 const [fondantAmount, setFondantAmount] = useState<number>(25)

 // Sync with URL params
 useEffect(() => {
 const section = searchParams.get('section')
 if (section && ['feeding', 'fondant', 'cells', 'varroa', 'gdd', 'tbr', 'diagnosis', 'profitloss', 'traceability', 'purchases'].includes(section)) {
 setActiveSection(section as ToolsSection)
 } else {
 setActiveSection(null)
 }
 }, [searchParams])

 useEffect(() => {
 let cancelled = false
 const initUser = async () => {
 const id = await getCurrentUserId()
 if (cancelled) return
 if (!id) {
 router.push('/login')
 return
 }
 setUserId(id)
 // The beekeeper's own card order and favourites. Only the card grid waits for them, and
 // never for long: on a weak signal or a failed read the standard layout is shown.
 let order: string[] | null = null
 let favourites: string[] | null = null
 try {
 const { data, error } = await supabase
 .from('profiles')
 .select('tool_order, tool_favourites')
 .eq('id', id)
 .abortSignal(AbortSignal.timeout(ORDER_LOAD_TIMEOUT_MS))
 .maybeSingle()
 if (error) console.error('Error loading tool order:', error)
 order = parseToolOrder(data?.tool_order)
 favourites = parseToolOrder(data?.tool_favourites)
 } catch (err) {
 console.error('Error loading tool order:', err)
 }
 if (cancelled) return
 setSavedOrder(order)
 setSavedFavourites(favourites)
 setOrderLoaded(true)
 }
 initUser()
 return () => { cancelled = true }
 }, [router])

 if (!userId) {
 return (
 <div className="flex items-center justify-center min-h-dvh">
 <LoadingSpinner size="lg" />
 </div>
 )
 }

 // Calculate feeding amounts
 const calculateFeeding = (sugar: number, ratio: '3:2' | '1:1') => {
 if (ratio === '3:2') {
 const water = (sugar / 3) * 2
 const totalSolution = sugar * 1.31
 const theoreticalStored = sugar * 0.944
 const actualStored = theoreticalStored * 0.8

 return {
 water: water.toFixed(2),
 totalSolution: totalSolution.toFixed(2),
 theoreticalStored: theoreticalStored.toFixed(2),
 actualStored: actualStored.toFixed(2)
 }
 } else {
 const water = sugar
 const totalSolution = sugar * 0.8 * 2
 const theoreticalStored = sugar * 0.75
 const actualStored = theoreticalStored * 0.8

 return {
 water: water.toFixed(2),
 totalSolution: totalSolution.toFixed(2),
 theoreticalStored: theoreticalStored.toFixed(2),
 actualStored: actualStored.toFixed(2)
 }
 }
 }

 const ratio32 = calculateFeeding(sugarAmount, '3:2')
 const ratio11 = calculateFeeding(sugarAmount, '1:1')

 // Calculate fondant ingredients
 const calculateFondant = (icingSugar: number) => {
 const ratio = icingSugar / 25

 return {
 icingSugar: icingSugar.toFixed(2),
 yeast: (1.25 * ratio).toFixed(2),
 water: (250 * ratio).toFixed(0),
 lemonJuice: (1000 * ratio).toFixed(0)
 }
 }

 const fondant = calculateFondant(fondantAmount)

 const handleToolClick = (toolId: ToolsSection) => {
 setActiveSection(toolId)
 router.push(`/dashboard/tools?section=${toolId}`, { scroll: false })
 }

 const handleBackToTools = () => {
 setActiveSection(null)
 router.push('/dashboard/tools', { scroll: false })
 }

 const startArranging = () => {
 setAnnouncement('')
 setDraft(categories)
 }

 const cancelArranging = () => {
 setAnnouncement('')
 setDraft(null)
 }

 const moveDraftTool = (sectionIndex: number, toolIndex: number, direction: -1 | 1) => {
 if (!draft) return
 const section = draft[sectionIndex]
 const tool = section?.tools[toolIndex]
 const target = toolIndex + direction
 if (!tool || target < 0 || target >= section.tools.length) return
 pendingFocusRef.current = { id: tool.id, button: direction === -1 ? 'up' : 'down' }
 setDraft(moveTool(draft, sectionIndex, toolIndex, direction))
 setAnnouncement(`${tool.label} moved to position ${target + 1} of ${section.tools.length} in ${section.name}`)
 }

 // Starring moves a tool to the end of Favourites; unstarring moves it back to the end of its own section
 const toggleDraftFavourite = (sectionIndex: number, toolIndex: number) => {
 if (!draft) return
 const tool = draft[sectionIndex]?.tools[toolIndex]
 if (!tool) return
 // Starring removes the row, so the next tool slides under the finger: a quick second tap
 // (gloves, a shaky hand) would star that one too. Ignore a star tap straight after another.
 const now = Date.now()
 if (now - lastStarTapRef.current < STAR_TAP_GAP_MS) return
 lastStarTapRef.current = now
 pendingFocusRef.current = { id: tool.id, button: 'star' }
 setDraft(toggleFavourite(draft, sectionIndex, toolIndex, TOOL_CATEGORIES))
 setAnnouncement(sectionIndex === 0 ? `${tool.label} removed from favourites` : `${tool.label} added to favourites`)
 }

 const resetDraft = () => {
 setDraft(withFavourites(TOOL_CATEGORIES, null, FAVOURITES))
 setAnnouncement('Standard layout restored. Tap Save order to keep it.')
 }

 const saveOrder = () => runSaveOrder(async () => {
 if (!draft) return
 const favourites = draft[0].tools.map(tool => tool.id)
 const sectionIds = toolOrderIds(draft.slice(1))
 // The standard order is saved as NULL, so tools added later land where we place them
 const standardIds = STANDARD_IDS.filter(id => !favourites.includes(id))
 const order = sectionIds.join() === standardIds.join() ? null : sectionIds
 const favouritesValue = favourites.length > 0 ? favourites : null
 // A time limit, so a weak signal ends in a clear message rather than "Saving…" for ever.
 // Saving again is safe: it writes the same layout.
 let saved = false
 try {
 const { data, error } = await supabase
 .from('profiles')
 .update({ tool_order: order, tool_favourites: favouritesValue })
 .eq('id', userId)
 .select('id')
 .abortSignal(AbortSignal.timeout(ORDER_SAVE_TIMEOUT_MS))
 if (error) console.error('Error saving tool order:', error)
 saved = !error && (data?.length ?? 0) > 0
 } catch (err) {
 console.error('Error saving tool order:', err)
 }
 if (!saved) {
 toast.error('Could not save the tool order. Check your signal and try again.')
 return
 }
 setSavedOrder(order)
 setSavedFavourites(favouritesValue)
 setDraft(null)
 setAnnouncement('')
 toast.success('Tool order saved')
 })

 return (
 <div className="space-y-6">
 <div className="flex items-center gap-3">
 <Wrench size={32} className="text-text-secondary" />
 <h1 className="text-3xl font-bold text-foreground">Tools</h1>
 </div>

 <div className="flex flex-wrap items-center justify-between gap-3">
 <p className="text-text-secondary">
 {activeSection === null && draft
 ? 'Tap the star to keep a tool in Favourites at the top. Use the arrows to change the order, then tap Save order.'
 : 'Helpful tools and utilities for managing your beekeeping operations.'}
 </p>
 {activeSection === null && !draft && orderLoaded && (
 <Button onClick={startArranging}>
 <ArrowUpDown size={18} aria-hidden="true" />
 Arrange tools
 </Button>
 )}
 </div>

 {/* Screen readers hear where a moved tool now sits */}
 <p className="sr-only" aria-live="polite">{announcement}</p>

 {/* Arrange mode: one column on every screen, so up and down mean exactly that */}
 {activeSection === null && draft && (
 <div className="space-y-6 max-w-2xl">
 {draft.map((category, sectionIndex) => (
 <section key={category.name} aria-labelledby={`arrange-section-${sectionIndex}`}>
 <h2 id={`arrange-section-${sectionIndex}`} className="text-sm font-semibold text-text-tertiary mb-3">
 {category.name}
 </h2>
 {category.tools.length === 0 ? (
 <p className="text-text-secondary">
 {sectionIndex === 0 ? 'Tap the star on a tool to add it here.' : 'All of these tools are in Favourites.'}
 </p>
 ) : (
 <ul className="bg-surface rounded-lg border border-border divide-y divide-border">
 {category.tools.map((tool, toolIndex) => (
 <li key={tool.id} className="flex items-center gap-2 sm:gap-3 p-3">
 {/* Hidden on phones so the name has room beside the three buttons */}
 <div className="hidden sm:block p-2 rounded-lg bg-surface-secondary">
 <tool.icon size={20} aria-hidden="true" className="text-forest-600 dark:text-forest-400" />
 </div>
 <span className="flex-1 min-w-0 font-semibold text-foreground">{tool.label}</span>
 <Button
 id={`arrange-${tool.id}-star`}
 onClick={() => toggleDraftFavourite(sectionIndex, toolIndex)}
 disabled={savingOrder}
 aria-label={sectionIndex === 0 ? `Remove ${tool.label} from favourites` : `Add ${tool.label} to favourites`}
 className="min-w-12 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
 >
 <Star
 size={22}
 aria-hidden="true"
 className={sectionIndex === 0 ? 'fill-forest-600 text-forest-600 dark:fill-forest-400 dark:text-forest-400' : 'text-text-secondary'}
 />
 </Button>
 <Button
 id={`arrange-${tool.id}-up`}
 onClick={() => moveDraftTool(sectionIndex, toolIndex, -1)}
 disabled={toolIndex === 0 || savingOrder}
 aria-label={`Move ${tool.label} up`}
 className="min-w-12 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
 >
 <ChevronUp size={22} aria-hidden="true" />
 </Button>
 <Button
 id={`arrange-${tool.id}-down`}
 onClick={() => moveDraftTool(sectionIndex, toolIndex, 1)}
 disabled={toolIndex === category.tools.length - 1 || savingOrder}
 aria-label={`Move ${tool.label} down`}
 className="min-w-12 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
 >
 <ChevronDown size={22} aria-hidden="true" />
 </Button>
 </li>
 ))}
 </ul>
 )}
 </section>
 ))}

 <div className="flex flex-wrap items-center gap-3">
 <Button tone="success" onClick={saveOrder} disabled={savingOrder} className="flex-1 sm:flex-none min-h-14 px-6">
 {savingOrder ? 'Saving…' : 'Save order'}
 </Button>
 <Button onClick={cancelArranging} disabled={savingOrder} className="min-h-14 px-6 disabled:opacity-60">
 Cancel
 </Button>
 </div>
 <Button
 unstyled
 onClick={resetDraft}
 disabled={savingOrder}
 className="min-h-12 px-1 font-medium text-forest-700 dark:text-forest-300 underline underline-offset-4"
 >
 Reset to the standard layout
 </Button>
 </div>
 )}

 {/* Landing Grid View: waits briefly for the saved order so the cards do not jump */}
 {activeSection === null && !draft && !orderLoaded && <LoadingSpinner text="Loading tools..." />}
 {activeSection === null && !draft && orderLoaded && (
 <div className="space-y-8">
 {/* Empty sections (no favourites yet, or every tool starred) are not shown */}
 {categories.filter(category => category.tools.length > 0).map((category, catIndex) => (
 <div key={category.name} className={`animate-fade-in-up stagger-${catIndex + 1}`}>
 <h2 className="text-sm font-semibold text-text-tertiary mb-3">
 {category.name}
 </h2>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {category.tools.map((tool) =>
 tool.type === 'link' ? (
 <Link
 key={tool.id}
 href={tool.href!}
 className="bg-surface dark:bg-surface rounded-lg shadow p-5 border border-border hover:shadow-lg hover:border-forest-500 dark:hover:border-forest-400 transition-all"
 >
 <div className="flex items-start gap-3">
 <div className="p-2 rounded-lg bg-surface-secondary">
 <tool.icon size={20} className="text-forest-600 dark:text-forest-400" />
 </div>
 <div className="flex-1 min-w-0">
 <h3 className="font-semibold text-foreground">{tool.label}</h3>
 <p className="text-sm text-text-secondary mt-1">{tool.description}</p>
 </div>
 </div>
 </Link>
 ) : (
 <Button
 key={tool.id}
 onClick={() => handleToolClick(tool.id as ToolsSection)}
 className="bg-surface dark:bg-surface rounded-lg shadow p-5 border border-border hover:shadow-lg hover:border-forest-500 dark:hover:border-forest-400 transition-all text-left"
 >
 <div className="flex items-start gap-3">
 <div className="p-2 rounded-lg bg-surface-secondary">
 <tool.icon size={20} className="text-forest-600 dark:text-forest-400" />
 </div>
 <div className="flex-1 min-w-0">
 <h3 className="font-semibold text-foreground">{tool.label}</h3>
 <p className="text-sm text-text-secondary mt-1">{tool.description}</p>
 </div>
 </div>
 </Button>
 )
 )}
 </div>
 </div>
 ))}
 </div>
 )}

 {/* Active Tool View */}
 {activeSection !== null && (
 <>
 <Button
 onClick={handleBackToTools}
 className="flex items-center gap-2 text-sm text-text-secondary hover:text-foreground transition-colors"
 >
 <ArrowLeft size={16} />
 Back to Tools
 </Button>

 {/* Feeding Calculator Tab */}
 {activeSection === 'feeding' && (
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
 <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
 <Droplet size={24} className="text-forest-600 dark:text-forest-400" />
 Feeding Calculator
 </h3>

 <div className="mb-6">
 <label className="block text-sm font-medium text-foreground mb-2">
 Sugar Amount (kg)
 </label>
 <div className="flex items-center gap-2">
 <Button
 onClick={() => setSugarAmount(Math.max(0.5, sugarAmount - 0.5))}
 className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-surface-secondary text-foreground rounded-lg hover:bg-surface-elevated font-bold text-xl flex-shrink-0"
 >
 −
 </Button>
 <input
 type="number"
 value={sugarAmount}
 onChange={(e) => setSugarAmount(Math.max(0, parseFloat(e.target.value) || 0))}
 className="flex-1 min-w-0 px-2 sm:px-4 py-2 border border-border rounded-lg bg-surface dark:bg-surface text-foreground text-center text-xl font-semibold"
 min="0"
 step="0.5"
 />
 <Button
 onClick={() => setSugarAmount(sugarAmount + 0.5)}
 className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-surface-secondary text-foreground rounded-lg hover:bg-surface-elevated font-bold text-xl flex-shrink-0"
 >
 +
 </Button>
 </div>
 </div>

 <div className="grid md:grid-cols-2 gap-6">
 <div className="bg-amber-50 dark:bg-amber-950/20 p-5 rounded-lg border border-amber-200 dark:border-amber-800">
 <h4 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-1">1:1 Ratio</h4>
 <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">Spring stimulation feeding</p>
 <div className="space-y-3">
 <div className="flex justify-between items-center pb-2 border-b border-amber-200 dark:border-amber-800">
 <span className="text-sm text-amber-800 dark:text-amber-200">Water needed:</span>
 <span className="font-semibold text-amber-900 dark:text-amber-100">{ratio11.water} L</span>
 </div>
 <div className="flex justify-between items-center pb-2 border-b border-amber-200 dark:border-amber-800">
 <span className="text-sm text-amber-800 dark:text-amber-200">Total solution:</span>
 <span className="font-semibold text-amber-900 dark:text-amber-100">{ratio11.totalSolution} L</span>
 </div>
 <div className="flex justify-between items-center pb-2 border-b border-amber-200 dark:border-amber-800">
 <span className="text-sm text-amber-800 dark:text-amber-200">Theoretical stored:</span>
 <span className="font-semibold text-amber-900 dark:text-amber-100">{ratio11.theoreticalStored} kg</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Actually stored:</span>
 <span className="font-bold text-lg text-amber-900 dark:text-amber-100">{ratio11.actualStored} kg</span>
 </div>
 </div>
 </div>

 <div className="bg-blue-50 dark:bg-blue-950/20 p-5 rounded-lg border border-blue-200 dark:border-blue-800">
 <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">3:2 Ratio</h4>
 <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">Standard winter feeding</p>
 <div className="space-y-3">
 <div className="flex justify-between items-center pb-2 border-b border-blue-200 dark:border-blue-800">
 <span className="text-sm text-blue-800 dark:text-blue-200">Water needed:</span>
 <span className="font-semibold text-blue-900 dark:text-blue-100">{ratio32.water} L</span>
 </div>
 <div className="flex justify-between items-center pb-2 border-b border-blue-200 dark:border-blue-800">
 <span className="text-sm text-blue-800 dark:text-blue-200">Total solution:</span>
 <span className="font-semibold text-blue-900 dark:text-blue-100">{ratio32.totalSolution} L</span>
 </div>
 <div className="flex justify-between items-center pb-2 border-b border-blue-200 dark:border-blue-800">
 <span className="text-sm text-blue-800 dark:text-blue-200">Theoretical stored:</span>
 <span className="font-semibold text-blue-900 dark:text-blue-100">{ratio32.theoreticalStored} kg</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Actually stored:</span>
 <span className="font-bold text-lg text-blue-900 dark:text-blue-100">{ratio32.actualStored} kg</span>
 </div>
 </div>
 </div>
 </div>

 <div className="mt-6 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
 <h5 className="font-semibold text-green-900 dark:text-green-100 mb-2">Important Notes:</h5>
 <ul className="space-y-1 text-sm text-green-800 dark:text-green-200">
 <li>• Use cold or lukewarm water to prevent HMF formation</li>
 <li>• Prepare fresh solution to avoid fermentation</li>
 <li>• 3:2 ratio is ideal for winter stores (higher sugar concentration)</li>
 <li>• 1:1 ratio is better for spring stimulation (encourages brood rearing)</li>
 </ul>
 </div>
 </div>
 )}

 {/* Fondant Tab */}
 {activeSection === 'fondant' && (
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
 <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
 <Cookie size={24} className="text-forest-600 dark:text-forest-400" />
 Making Fondant
 </h3>

 <div className="mb-6">
 <label className="block text-sm font-medium text-foreground mb-2">
 Icing Sugar Amount (kg)
 </label>
 <div className="flex items-center gap-3 w-full">
 <Button
 type="button"
 onClick={() => setFondantAmount(Math.max(1, fondantAmount - 1))}
 className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-surface-secondary text-foreground rounded-lg hover:bg-surface-elevated active:bg-surface-elevated transition-colors text-2xl font-bold touch-manipulation"
 >
 −
 </Button>
 <input
 type="number"
 value={fondantAmount}
 onChange={(e) => setFondantAmount(Math.max(1, parseFloat(e.target.value) || 1))}
 className="flex-1 min-w-0 px-4 py-3 h-12 sm:h-14 border border-border rounded-lg bg-surface text-foreground text-center text-xl font-semibold focus:border-forest-500 focus:ring-2 focus:ring-forest-500 touch-manipulation"
 step="1"
 min="1"
 />
 <Button
 type="button"
 onClick={() => setFondantAmount(fondantAmount + 1)}
 className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-surface-secondary text-foreground rounded-lg hover:bg-surface-elevated active:bg-surface-elevated transition-colors text-2xl font-bold touch-manipulation"
 >
 +
 </Button>
 </div>
 </div>

 <div className="bg-amber-50 dark:bg-amber-950/20 p-5 rounded-lg border border-amber-200 dark:border-amber-800">
 <h4 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-4">Ingredients</h4>
 <div className="space-y-3">
 <div className="flex justify-between items-center pb-2 border-b border-amber-200 dark:border-amber-800">
 <span className="text-sm text-amber-800 dark:text-amber-200">Icing Sugar:</span>
 <span className="font-semibold text-amber-900 dark:text-amber-100">{fondant.icingSugar} kg</span>
 </div>
 <div className="flex justify-between items-center pb-2 border-b border-amber-200 dark:border-amber-800">
 <span className="text-sm text-amber-800 dark:text-amber-200">Yeast:</span>
 <span className="font-semibold text-amber-900 dark:text-amber-100">{fondant.yeast} kg</span>
 </div>
 <div className="flex justify-between items-center pb-2 border-b border-amber-200 dark:border-amber-800">
 <span className="text-sm text-amber-800 dark:text-amber-200">Water:</span>
 <span className="font-semibold text-amber-900 dark:text-amber-100">{fondant.water} ml</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-sm text-amber-800 dark:text-amber-200">Lemon Juice:</span>
 <span className="font-semibold text-amber-900 dark:text-amber-100">{fondant.lemonJuice} ml</span>
 </div>
 </div>
 </div>

 <div className="mt-6 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
 <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Why These Ingredients?</h5>
 <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
 <li>
 <strong>Yeast (Fresh Baker&apos;s Yeast):</strong> Must be <em className="font-semibold text-amber-700 dark:text-amber-400">fresh baker&apos;s yeast</em> - acts as an invertase enzyme to help break down complex sugars into simpler ones
 </li>
 <li>
 <strong>Lemon Juice:</strong> Provides acidity (citric acid) which helps invert the sugar and prevents crystallization
 </li>
 </ul>
 </div>

 <div className="mt-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
 <h5 className="font-semibold text-green-900 dark:text-green-100 mb-2">Important Notes:</h5>
 <ul className="space-y-1 text-sm text-green-800 dark:text-green-200">
 <li>• Mix ingredients thoroughly until you get a dough-like consistency</li>
 <li>• DO NOT add any more water even though the dough might appear dry</li>
 <li>• This recipe is particularly used for setting up Apideas (mating nucs)</li>
 <li>• Store fondant in airtight containers to prevent drying</li>
 </ul>
 </div>
 </div>
 )}

 {/* Frame Cells Tab */}
 {activeSection === 'cells' && (
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
 <FrameCellCalculator />
 </div>
 )}

 {/* Varroa Tab */}
 {activeSection === 'varroa' && (
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
 <VarroaWeather userId={userId} />
 </div>
 )}

 {/* GDD Tab */}
 {activeSection === 'gdd' && (
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
 <GDDTracker userId={userId} />
 </div>
 )}

 {/* TBR Swarm Planner Tab */}
 {activeSection === 'tbr' && (
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
 <TBRPlanner userId={userId} />
 </div>
 )}

 {/* Diagnosis Tab */}
 {activeSection === 'diagnosis' && (
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
 <DiagnosisUploader userId={userId} />
 </div>
 )}

 {/* P&L Tab */}
 {activeSection === 'profitloss' && (
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
 <ProfitLoss userId={userId} />
 </div>
 )}

 {/* Traceability Tab */}
 {activeSection === 'traceability' && (
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
 <TraceabilityTool userId={userId} />
 </div>
 )}

 {/* Purchases Tab */}
 {activeSection === 'purchases' && (
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
 <PurchaseList userId={userId} />
 </div>
 )}

 </>
 )}
 </div>
 )
}

