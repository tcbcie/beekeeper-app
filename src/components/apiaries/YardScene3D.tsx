'use client'
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import Link from 'next/link'
import { ArrowUp, Printer, RotateCcw } from 'lucide-react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { useApiaryMap, isHivePlaced, type MapHive, type YardBench } from '@/hooks/useApiaryMap'
import { BENCH_TOP_UNITS, slotOffsetUnits, rotatedOffset, type YardDims } from '@/lib/yard-geometry'
import { printImageDataUrl, downloadDataUrl, printedOnLabel, excludeNoPrint } from '@/lib/print-layout'
import { useToast } from '@/components/ui/Toast'
import Hive3D from './Hive3D'
import Bench3D from './Bench3D'
import HiveInspectorPanel from './HiveInspectorPanel'

// Map a 0–100 % position onto the ground plane, centred on the origin.
function toScene(mapX: number, mapY: number, dims: YardDims): [number, number] {
  return [(mapX / 100 - 0.5) * dims.widthUnits, (mapY / 100 - 0.5) * dims.depthUnits]
}

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

interface YardScene3DProps {
  apiaryId: string
}

const noop = () => {}

export default function YardScene3D({ apiaryId }: YardScene3DProps) {
  const { apiaryName, hives, benches, yard, yardDims, loading } = useApiaryMap(apiaryId)
  const toast = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [webgl, setWebgl] = useState<boolean | null>(null)
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)
  // The captured print area: WebGL canvas + floating labels + north badge.
  const sceneWrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => { setWebgl(webglAvailable()) }, [])

  const benchById = useMemo(() => new Map<string, YardBench>(benches.map(b => [b.id, b])), [benches])
  const placedHives = useMemo(
    () => hives.filter(h => isHivePlaced(h, benchById)),
    [hives, benchById],
  )
  const unplacedCount = hives.length - placedHives.length
  const selectedHive = selectedId ? hives.find(h => h.id === selectedId) ?? null : null
  const entrance = yard.yard_entrance_x != null && yard.yard_entrance_y != null
    ? toScene(Number(yard.yard_entrance_x), Number(yard.yard_entrance_y), yardDims)
    : null
  const northAngle = Number(yard.north_angle_deg ?? 0)
  // Frame the camera to the apiary's actual size.
  const maxDim = Math.max(yardDims.widthUnits, yardDims.depthUnits)

  // A hive on a bench stands on the bench top at its slot; otherwise on the
  // ground at its own map position.
  const hivePlacement = (hive: MapHive): { position: [number, number]; elevation: number } => {
    const bench = hive.bench_id != null ? benchById.get(hive.bench_id) : undefined
    if (bench && hive.bench_slot != null) {
      const [bx, bz] = toScene(Number(bench.map_x), Number(bench.map_y), yardDims)
      const off = rotatedOffset(slotOffsetUnits(hive.bench_slot, bench.capacity), Number(bench.rotation_deg))
      return { position: [bx + off.dx, bz + off.dy], elevation: BENCH_TOP_UNITS }
    }
    return { position: toScene(Number(hive.map_x), Number(hive.map_y), yardDims), elevation: 0 }
  }

  /** Snapshot the 3D view (as currently framed) and open the print dialogue. */
  const handlePrint = async () => {
    const node = sceneWrapRef.current
    if (!node) return
    // Clear selection so the highlight doesn't appear on the printout.
    setSelectedId(null)
    await new Promise(resolve => setTimeout(resolve, 80))
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(node, { pixelRatio: 2, filter: excludeNoPrint })
      const title = `${apiaryName ?? 'Apiary'} — 3D Apiary View`
      if (!printImageDataUrl(dataUrl, title, printedOnLabel())) {
        downloadDataUrl(dataUrl, `${title}.png`)
        toast.info('Pop-up blocked — the image was downloaded instead.')
      }
    } catch (error) {
      console.error('Error printing 3D apiary view:', error)
      toast.error('Could not create the printable view')
    }
  }

  if (loading) {
    return <p className="text-text-secondary py-8 text-center">Loading 3D apiary…</p>
  }

  // Graceful fallback when the device/browser cannot run WebGL.
  if (webgl === false) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-center">
        <p className="text-text-secondary mb-3">
          This device can&apos;t display the 3D view. You can still use the flat apiary map.
        </p>
        <Link
          href={`/dashboard/apiaries/${apiaryId}/map`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-border rounded-full hover:border-forest-500 text-forest-700 dark:text-forest-300"
        >
          Open 2D apiary map
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {placedHives.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-6 text-center text-sm text-text-secondary">
          No hives are placed on this map yet. Place them on the{' '}
          <Link href={`/dashboard/apiaries/${apiaryId}/map`} className="text-forest-700 dark:text-forest-300 underline">
            2D apiary map
          </Link>{' '}
          first, then return here.
        </p>
      ) : (
        <div ref={sceneWrapRef} className="relative w-full aspect-[3/2] rounded-xl border-2 border-forest-700 overflow-hidden bg-sky-100 dark:bg-slate-800">
          <div data-noprint className="absolute top-2 right-2 z-10 flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              aria-label="Print this view"
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg bg-white/90 dark:bg-slate-900/90 border border-border text-foreground shadow-sm hover:bg-white dark:hover:bg-slate-900"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              type="button"
              onClick={() => controlsRef.current?.reset()}
              aria-label="Reset the camera view"
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg bg-white/90 dark:bg-slate-900/90 border border-border text-foreground shadow-sm hover:bg-white dark:hover:bg-slate-900"
            >
              <RotateCcw className="w-4 h-4" /> Reset view
            </button>
          </div>
          {/* North indicator (matches the 2D map's user-set angle) */}
          <span className="pointer-events-none absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-1 rounded-lg bg-white/80 dark:bg-slate-900/80 text-sm font-semibold text-forest-800 dark:text-forest-200">
            <ArrowUp className="w-4 h-4" style={{ transform: `rotate(${northAngle}deg)` }} /> N
          </span>
          <Canvas
            frameloop="demand"
            // Keep the drawing buffer so the canvas can be captured for printing.
            gl={{ preserveDrawingBuffer: true }}
            camera={{ position: [0, maxDim * 0.6, maxDim * 0.9], fov: 45 }}
            onPointerMissed={() => setSelectedId(null)}
            aria-label="3D view of the apiary. A text list of hives is provided below as an accessible alternative."
          >
            <ambientLight intensity={0.85} />
            <directionalLight position={[6, 12, 8]} intensity={1} />

            {/* Grass ground plane + reference grid */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
              <planeGeometry args={[yardDims.widthUnits, yardDims.depthUnits]} />
              <meshStandardMaterial color="#86b049" />
            </mesh>
            <Grid
              args={[yardDims.widthUnits, yardDims.depthUnits]}
              cellSize={0.5}
              cellColor="#6f9a3c"
              sectionColor="#5c8233"
              position={[0, 0.01, 0]}
              infiniteGrid={false}
            />

            {/* Yard entrance: a low farm gate — end posts, three rails and a
                diagonal brace — well below hive height. */}
            {entrance && (
              <group position={[entrance[0], 0, entrance[1]]}>
                {[-0.6, 0.6].map(x => (
                  <mesh key={`gatepost-${x}`} position={[x, 0.21, 0]} castShadow>
                    <boxGeometry args={[0.09, 0.42, 0.09]} />
                    <meshStandardMaterial color="#6b4423" />
                  </mesh>
                ))}
                {[0.1, 0.22, 0.34].map(y => (
                  <mesh key={`gaterail-${y}`} position={[0, y, 0]} castShadow>
                    <boxGeometry args={[1.2, 0.045, 0.035]} />
                    <meshStandardMaterial color="#8b5e34" />
                  </mesh>
                ))}
                {/* Diagonal brace from bottom-left to top-right rail. */}
                <mesh position={[0, 0.22, 0.01]} rotation={[0, 0, 0.2]} castShadow>
                  <boxGeometry args={[1.18, 0.045, 0.03]} />
                  <meshStandardMaterial color="#8b5e34" />
                </mesh>
              </group>
            )}

            {benches.map(bench => (
              <Bench3D
                key={bench.id}
                bench={bench}
                position={toScene(Number(bench.map_x), Number(bench.map_y), yardDims)}
              />
            ))}

            {placedHives.map(hive => {
              const { position, elevation } = hivePlacement(hive)
              return (
                <Hive3D
                  key={hive.id}
                  hive={hive}
                  position={position}
                  elevation={elevation}
                  selected={selectedId === hive.id}
                  onSelect={setSelectedId}
                />
              )
            })}

            <OrbitControls
              ref={controlsRef}
              enablePan={false}
              minDistance={4}
              maxDistance={Math.max(20, maxDim * 2)}
              maxPolarAngle={Math.PI / 2 - 0.05}
              makeDefault
            />
          </Canvas>
        </div>
      )}

      <p className="text-sm text-text-secondary">
        Drag to spin the apiary · pinch or scroll to zoom · tap a hive for its details.
        {unplacedCount > 0 && ` (${unplacedCount} unplaced ${unplacedCount === 1 ? 'hive is' : 'hives are'} hidden.)`}
      </p>

      {selectedHive && (
        <HiveInspectorPanel
          hive={selectedHive}
          isReadOnly
          onRotate={noop}
          onRemove={noop}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* Accessible, keyboard-navigable alternative to the 3D canvas. */}
      {placedHives.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-3">
          <h2 className="text-sm font-semibold text-text-secondary mb-2">Hives in this apiary</h2>
          <ul className="flex flex-wrap gap-2">
            {placedHives.map(hive => (
              <li key={hive.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(hive.id)}
                  aria-pressed={selectedId === hive.id}
                  className={`inline-flex items-center min-h-[44px] px-3 py-1.5 rounded-lg border text-sm font-medium text-foreground hover:border-forest-500 ${
                    selectedId === hive.id ? 'border-forest-600 ring-2 ring-forest-500' : 'border-border'
                  }`}
                >
                  Hive {hive.hive_number}
                  {hive.queens?.[0] && <span className="ml-1.5 text-text-secondary">Q{hive.queens[0].queen_number}</span>}
                  {hive.is_queenless && <span className="ml-1.5 text-red-600 dark:text-red-400">(queenless)</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
