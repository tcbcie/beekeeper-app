'use client'

import { useState, useMemo, useEffect } from 'react'
import { Grid3X3 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface FrameStandard {
  id: string
  label: string
  width_mm: number
  height_mm: number
}

// Fallback frame presets if database fetch fails
const FALLBACK_PRESETS: FrameStandard[] = [
  { id: 'british_national_deep', label: 'British National Deep', width_mm: 335, height_mm: 195 },
  { id: 'british_national_shallow', label: 'British National Shallow', width_mm: 335, height_mm: 115 },
  { id: 'langstroth_deep', label: 'Langstroth Deep', width_mm: 425, height_mm: 210 },
  { id: 'langstroth_medium', label: 'Langstroth Medium', width_mm: 425, height_mm: 146 },
  { id: 'langstroth_shallow', label: 'Langstroth Shallow', width_mm: 425, height_mm: 117 },
  { id: 'dadant_modified_deep', label: 'Dadant Modified Deep', width_mm: 425, height_mm: 270 },
  { id: 'dadant_modified_shallow', label: 'Dadant Modified Shallow', width_mm: 425, height_mm: 127 },
  { id: 'smith', label: 'Smith', width_mm: 350, height_mm: 195 },
  { id: 'commercial', label: 'Commercial', width_mm: 406, height_mm: 195 },
]

export default function FrameCellCalculator() {
  const [frameStandards, setFrameStandards] = useState<FrameStandard[]>(FALLBACK_PRESETS)
  const [selectedStandardId, setSelectedStandardId] = useState<string>('custom')
  const [width, setWidth] = useState<number>(335)
  const [height, setHeight] = useState<number>(195)
  const [cellSize, setCellSize] = useState<number>(5.4)
  const [sides, setSides] = useState<number>(2)

  // Fetch frame standards from database
  useEffect(() => {
    async function fetchFrameStandards() {
      const { data, error } = await supabase
        .from('frame_standards')
        .select('id, label, width_mm, height_mm')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) {
        console.error('Error fetching frame standards:', error)
        // Keep fallback presets
      } else if (data && data.length > 0) {
        setFrameStandards(data)
        // Set first standard as default
        setSelectedStandardId(data[0].id)
        setWidth(data[0].width_mm)
        setHeight(data[0].height_mm)
      }
    }

    fetchFrameStandards()
  }, [])

  // Update dimensions when frame standard changes
  function handleStandardChange(standardId: string) {
    setSelectedStandardId(standardId)
    if (standardId !== 'custom') {
      const standard = frameStandards.find(s => s.id === standardId)
      if (standard) {
        setWidth(standard.width_mm)
        setHeight(standard.height_mm)
      }
    }
  }

  // Calculate cell count
  const calculation = useMemo(() => {
    if (width <= 0 || height <= 0 || cellSize <= 0) {
      return { hexagonArea: 0, totalArea: 0, cellCount: 0 }
    }

    // Hexagon area formula: (3 * sqrt(3) / 2) * side^2 ≈ 0.866 * diameter^2
    // Using cell diameter (flat-to-flat measurement)
    const hexagonArea = 0.866 * cellSize * cellSize

    // Total comb area in mm²
    const totalArea = width * height

    // Cell count (both sides if applicable)
    const cellCount = Math.round((totalArea / hexagonArea) * sides)

    return { hexagonArea, totalArea, cellCount }
  }, [width, height, cellSize, sides])

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
        <Grid3X3 size={24} className="text-forest-600 dark:text-forest-400" />
        Frame Cell Counter
      </h3>

      <p className="text-sm text-text-secondary">
        Calculate the approximate number of cells on a frame based on dimensions and cell size.
      </p>

      {/* Frame Standard Selection */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Frame Standard
        </label>
        <select
          value={selectedStandardId}
          onChange={(e) => handleStandardChange(e.target.value)}
          className="w-full px-4 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-forest-500 dark:focus:ring-emerald-500"
        >
          <option value="custom">Custom</option>
          {frameStandards.map((standard) => (
            <option key={standard.id} value={standard.id}>
              {standard.label} ({standard.width_mm}mm x {standard.height_mm}mm)
            </option>
          ))}
        </select>
      </div>

      {/* Frame Dimensions */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Comb Width (mm)
          </label>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full px-4 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-forest-500"
            min="0"
            step="1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Comb Height (mm)
          </label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full px-4 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-forest-500"
            min="0"
            step="1"
          />
        </div>
      </div>

      {/* Cell Size */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Cell Size (mm)
        </label>
        <div className="flex items-center gap-4">
          <input
            type="number"
            value={cellSize}
            onChange={(e) => setCellSize(Math.max(0.1, parseFloat(e.target.value) || 5.4))}
            className="w-32 px-4 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-forest-500"
            min="0.1"
            step="0.1"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setCellSize(5.4)}
              className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                cellSize === 5.4
                  ? 'bg-forest-600 text-white border-forest-600'
                  : 'border-border text-text-secondary hover:bg-muted'
              }`}
            >
              5.4mm (Standard)
            </button>
            <button
              onClick={() => setCellSize(4.9)}
              className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                cellSize === 4.9
                  ? 'bg-forest-600 text-white border-forest-600'
                  : 'border-border text-text-secondary hover:bg-muted'
              }`}
            >
              4.9mm (Small Cell)
            </button>
          </div>
        </div>
        <p className="text-xs text-text-tertiary mt-1">
          Standard worker cells are ~5.4mm, small cell foundation is ~4.9mm, drone cells are ~6.9mm
        </p>
      </div>

      {/* Sides Selection */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Count Sides
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setSides(1)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              sides === 1
                ? 'bg-forest-600 text-white border-forest-600'
                : 'border-border text-text-secondary hover:bg-muted'
            }`}
          >
            One Side
          </button>
          <button
            onClick={() => setSides(2)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              sides === 2
                ? 'bg-forest-600 text-white border-forest-600'
                : 'border-border text-text-secondary hover:bg-muted'
            }`}
          >
            Both Sides
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
        <div className="text-center">
          <p className="text-sm text-amber-800 dark:text-amber-300 mb-2">
            Approximate Total Cells
          </p>
          <p className="text-5xl font-bold text-amber-700 dark:text-amber-400">
            {calculation.cellCount.toLocaleString()}
          </p>
          <p className="text-sm text-amber-600 dark:text-amber-500 mt-2">
            {width}mm x {height}mm = {(calculation.totalArea / 100).toLocaleString()} cm²
            {sides === 2 ? ' (both sides)' : ' (one side)'}
          </p>
        </div>
      </div>

      {/* Reference Info */}
      <div className="bg-muted/50 dark:bg-muted/20 rounded-lg p-4 text-sm text-text-secondary">
        <p className="font-medium text-foreground mb-2">Typical Cell Counts:</p>
        <ul className="space-y-1 text-xs">
          <li>British National Deep: ~5,000-6,000 cells (both sides)</li>
          <li>Langstroth Deep: ~7,000-8,000 cells (both sides)</li>
          <li>Dadant Modified Deep: ~9,000-10,000 cells (both sides)</li>
        </ul>
        <p className="mt-2 text-xs text-text-tertiary">
          Note: Actual cell counts vary based on wax-drawn cell size and may differ from foundation specifications.
        </p>
      </div>
    </div>
  )
}
