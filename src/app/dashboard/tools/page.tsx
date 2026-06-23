'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCurrentUserId } from '@/lib/auth'
import { Wrench, Droplet, Cookie, Cloud, Send, Thermometer, Grid3X3, Camera, Wallet, Package, ShoppingCart, QrCode, ArrowLeft, Scissors } from 'lucide-react'
import Link from 'next/link'
import GDDTracker from '@/components/tools/GDDTracker'
import TBRPlanner from '@/components/tools/TBRPlanner'
import VarroaWeather from '@/components/tools/VarroaWeather'
import FrameCellCalculator from '@/components/tools/FrameCellCalculator'
import DiagnosisUploader from '@/components/tools/DiagnosisUploader'
import ProfitLoss from '@/components/tools/ProfitLoss'
import TraceabilityTool from '@/components/tools/TraceabilityTool'
import PurchaseList from '@/components/tools/PurchaseList'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Button from '@/components/ui/Button'

type ToolsSection = 'feeding' | 'fondant' | 'cells' | 'varroa' | 'gdd' | 'tbr' | 'diagnosis' | 'profitloss' | 'traceability' | 'purchases'

export default function ToolsPage() {
 const [userId, setUserId] = useState<string | null>(null)
 const [activeSection, setActiveSection] = useState<ToolsSection | null>(null)
 const router = useRouter()
 const searchParams = useSearchParams()

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
 const initUser = async () => {
 const id = await getCurrentUserId()
 if (!id) {
 router.push('/login')
 return
 }
 setUserId(id)
 }
 initUser()
 }, [router])

 if (!userId) {
 return (
 <div className="flex items-center justify-center min-h-screen">
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

 const toolCategories = [
 {
 name: 'Calculators',
 tools: [
 { id: 'feeding' as const, label: 'Feeding Calculator', description: 'Calculate sugar syrup ratios for 1:1 and 3:2 feeds', icon: Droplet, type: 'inline' as const },
 { id: 'fondant' as const, label: 'Fondant Recipe', description: 'Scale fondant ingredients for any batch size', icon: Cookie, type: 'inline' as const },
 { id: 'cells' as const, label: 'Frame Cells', description: 'Estimate cell counts across different frame sizes', icon: Grid3X3, type: 'inline' as const },
 ],
 },
 {
 name: 'Hive Health',
 tools: [
 { id: 'varroa' as const, label: 'Varroa Weather', description: 'Weather-based varroa pressure forecasts for your apiaries', icon: Cloud, type: 'inline' as const },
 { id: 'gdd' as const, label: 'GDD Tracker', description: 'Growing degree-day accumulation for forage predictions', icon: Thermometer, type: 'inline' as const },
 { id: 'tbr' as const, label: 'TBR Swarm Planner', description: 'Time a total brood removal to peak foragers for the summer flow', icon: Scissors, type: 'inline' as const },
 { id: 'diagnosis' as const, label: 'Diagnosis', description: 'Upload photos for AI-assisted hive health analysis', icon: Camera, type: 'inline' as const },
 ],
 },
 {
 name: 'Business',
 tools: [
 { id: 'profitloss' as const, label: 'Profit & Loss', description: 'Track income and expenses across your operation', icon: Wallet, type: 'inline' as const },
 { id: 'purchases' as const, label: 'Purchases', description: 'Manage equipment and supply purchases', icon: ShoppingCart, type: 'inline' as const },
 { id: 'traceability' as const, label: 'Provenance', description: 'Honey traceability and batch tracking records', icon: Package, type: 'inline' as const },
 ],
 },
 {
 name: 'Utilities',
 tools: [
 { id: 'qr-tags' as const, label: 'QR Tags', description: 'Generate and manage QR codes for your hives', icon: QrCode, type: 'link' as const, href: '/dashboard/qr-tags' },
 { id: 'wild-colony' as const, label: 'Report Wild Colony', description: 'Help track wild and feral bee colonies in your area', icon: Send, type: 'link' as const, href: '/dashboard/submit-colony' },
 ],
 },
 ]

 return (
 <div className="space-y-6">
 <div className="flex items-center gap-3">
 <Wrench size={32} className="text-text-secondary" />
 <h1 className="text-3xl font-bold text-foreground">Tools</h1>
 </div>

 <p className="text-text-secondary">
 Helpful tools and utilities for managing your beekeeping operations.
 </p>

 {/* Landing Grid View */}
 {activeSection === null && (
 <div className="space-y-8">
 {toolCategories.map((category, catIndex) => (
 <div key={category.name} className={`animate-fade-in-up stagger-${catIndex + 1}`}>
 <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">
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

