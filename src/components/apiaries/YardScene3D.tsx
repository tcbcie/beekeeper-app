'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { useApiaryMap } from '@/hooks/useApiaryMap'
import Hive3D from './Hive3D'
import HiveInspectorPanel from './HiveInspectorPanel'

// Yard ground-plane size in scene units, matching the 2D map's 3:2 aspect.
const YARD_W = 10
const YARD_D = YARD_W * (2 / 3)

// Map a hive's 0–100 % position onto the ground plane, centred on the origin.
function toScene(mapX: number, mapY: number): [number, number] {
  return [(mapX / 100 - 0.5) * YARD_W, (mapY / 100 - 0.5) * YARD_D]
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
  const { hives, loading } = useApiaryMap(apiaryId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [webgl, setWebgl] = useState<boolean | null>(null)

  useEffect(() => { setWebgl(webglAvailable()) }, [])

  const placedHives = useMemo(
    () => hives.filter(h => h.map_x != null && h.map_y != null),
    [hives],
  )
  const unplacedCount = hives.length - placedHives.length
  const selectedHive = selectedId ? hives.find(h => h.id === selectedId) ?? null : null

  if (loading) {
    return <p className="text-text-secondary py-8 text-center">Loading 3D yard…</p>
  }

  // Graceful fallback when the device/browser cannot run WebGL.
  if (webgl === false) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-center">
        <p className="text-text-secondary mb-3">
          This device can&apos;t display the 3D view. You can still use the flat yard map.
        </p>
        <Link
          href={`/dashboard/apiaries/${apiaryId}/map`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-border rounded-full hover:border-forest-500 text-forest-700 dark:text-forest-300"
        >
          Open 2D yard map
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {placedHives.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-6 text-center text-sm text-text-secondary">
          No hives are placed on this yard yet. Place them on the{' '}
          <Link href={`/dashboard/apiaries/${apiaryId}/map`} className="text-forest-700 dark:text-forest-300 underline">
            2D yard map
          </Link>{' '}
          first, then return here.
        </p>
      ) : (
        <div className="w-full aspect-[3/2] rounded-xl border-2 border-forest-700 overflow-hidden bg-sky-100 dark:bg-slate-800">
          <Canvas
            frameloop="demand"
            camera={{ position: [0, 6, 9], fov: 45 }}
            onPointerMissed={() => setSelectedId(null)}
          >
            <ambientLight intensity={0.85} />
            <directionalLight position={[6, 12, 8]} intensity={1} />

            {/* Grass ground plane + reference grid */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
              <planeGeometry args={[YARD_W, YARD_D]} />
              <meshStandardMaterial color="#86b049" />
            </mesh>
            <Grid
              args={[YARD_W, YARD_D]}
              cellSize={0.5}
              cellColor="#6f9a3c"
              sectionColor="#5c8233"
              position={[0, 0.01, 0]}
              infiniteGrid={false}
            />

            {placedHives.map(hive => (
              <Hive3D
                key={hive.id}
                hive={hive}
                position={toScene(hive.map_x as number, hive.map_y as number)}
                selected={selectedId === hive.id}
                onSelect={setSelectedId}
              />
            ))}

            <OrbitControls
              enablePan={false}
              minDistance={4}
              maxDistance={20}
              maxPolarAngle={Math.PI / 2 - 0.05}
              makeDefault
            />
          </Canvas>
        </div>
      )}

      <p className="text-sm text-text-secondary">
        Drag to spin the yard · pinch or scroll to zoom · tap a hive for its details.
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
    </div>
  )
}
