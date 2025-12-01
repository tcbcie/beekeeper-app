'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUserId } from '@/lib/auth'
import { Wrench, Droplet } from 'lucide-react'

export default function ToolsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const router = useRouter()

  // Feeding calculator state
  const [sugarAmount, setSugarAmount] = useState<number>(10)

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  // Calculate feeding amounts
  const calculateFeeding = (sugar: number, ratio: '3:2' | '1:1') => {
    if (ratio === '3:2') {
      // 3:2 ratio (3 parts sugar : 2 parts water)
      const water = (sugar / 3) * 2
      const totalSolution = sugar * 1.31 // density factor for 3:2
      const theoreticalStored = sugar * 0.944 // 94.4% efficiency
      const actualStored = theoreticalStored * 0.8 // 80% actual utilization

      return {
        water: water.toFixed(2),
        totalSolution: totalSolution.toFixed(2),
        theoreticalStored: theoreticalStored.toFixed(2),
        actualStored: actualStored.toFixed(2)
      }
    } else {
      // 1:1 ratio (1 part sugar : 1 part water)
      const water = sugar
      const totalSolution = sugar * 0.8 * 2 // density factor for 1:1
      const theoreticalStored = sugar * 0.75 // 75% efficiency
      const actualStored = theoreticalStored * 0.8 // 80% actual utilization

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

  const tools = [
    {
      icon: Droplet,
      title: 'Feeding Calculator',
      description: 'Calculate sugar-to-water ratios and feeding quantities',
      status: 'Available',
      onClick: () => setActiveTool(activeTool === 'feeding' ? null : 'feeding')
    }
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((tool, index) => (
          <div key={index}>
            <div
              onClick={tool.onClick}
              className={`bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border hover:shadow-md transition-shadow cursor-pointer hover:border-forest-300 dark:hover:border-forest-700 ${
                activeTool === 'feeding' && tool.title === 'Feeding Calculator' ? 'border-forest-500 dark:border-forest-500' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-forest-100 dark:bg-forest-900/50">
                  <tool.icon size={24} className="text-forest-700 dark:text-forest-300" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {tool.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Feeding Calculator Tool */}
            {tool.title === 'Feeding Calculator' && activeTool === 'feeding' && (
              <div className="mt-4 bg-surface dark:bg-surface rounded-lg shadow-lg p-6 border border-forest-300 dark:border-forest-700">
                <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Droplet size={24} className="text-forest-600 dark:text-forest-400" />
                  Bee Feeding Calculator
                </h3>

                {/* Sugar Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Sugar Amount (kg)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSugarAmount(Math.max(0.5, sugarAmount - 0.5))}
                      className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-sage-200 dark:bg-slate-700 text-foreground rounded-lg hover:bg-sage-300 dark:hover:bg-slate-600 font-bold text-xl flex-shrink-0"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={sugarAmount}
                      onChange={(e) => setSugarAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="flex-1 min-w-0 px-2 sm:px-4 py-2 border border-border rounded-lg bg-surface dark:bg-surface text-foreground text-center text-xl font-semibold"
                      min="0"
                      step="0.5"
                    />
                    <button
                      onClick={() => setSugarAmount(sugarAmount + 0.5)}
                      className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-sage-200 dark:bg-slate-700 text-foreground rounded-lg hover:bg-sage-300 dark:hover:bg-slate-600 font-bold text-xl flex-shrink-0"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Results Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* 3:2 Ratio */}
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-5 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      3:2 Ratio
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                      Standard winter feeding
                    </p>
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

                  {/* 1:1 Ratio */}
                  <div className="bg-amber-50 dark:bg-amber-950/20 p-5 rounded-lg border border-amber-200 dark:border-amber-800">
                    <h4 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-1">
                      1:1 Ratio
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
                      Spring stimulation feeding
                    </p>
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
                </div>

                {/* Important Notes */}
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
          </div>
        ))}
      </div>
    </div>
  )
}
