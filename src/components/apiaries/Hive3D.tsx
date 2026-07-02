'use client'
import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import type { MapHive, EntranceDirection } from '@/hooks/useApiaryMap'

// Compass heading → yaw in radians (N = away from camera baseline).
const DIRECTION_DEGREES: Record<EntranceDirection, number> = {
  N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
}

// Relative box dimensions (1 unit ≈ one hive footprint). Heights mirror the
// 2D card's sense of scale: supers/half boxes shallower than full brood.
const FLOOR_H = 0.06
const FULL_H = 0.26
const HALF_H = 0.16
const SUPER_H = 0.16
const EXCLUDER_H = 0.03

// Colours match the 2D HiveListCard stack so the two views read the same.
const COL_FLOOR = '#b45309'   // amber-700
const COL_FULL = '#fde68a'    // amber-200
const COL_HALF = '#fcd34d'    // amber-300
const COL_EXCLUDER = '#9ca3af'// gray-400
const COL_SUPER = '#fde047'   // yellow-300

interface Layer {
  key: string
  height: number
  colour: string
}

// Build the box stack bottom→top from the hive's configuration, mirroring the
// fixed order used by the 2D card (floor, full brood, half brood, excluder, supers).
function buildStack(hive: MapHive): Layer[] {
  const c = hive.configuration ?? {}
  const fullCount = Math.max(0, Math.min(4, c.brood_boxes_full ?? c.brood_boxes ?? 1))
  const halfCount = Math.max(0, Math.min(4, c.brood_boxes_half ?? 0))
  const superCount = Math.max(0, Math.min(4, c.honey_supers ?? 0))

  const layers: Layer[] = [{ key: 'floor', height: FLOOR_H, colour: COL_FLOOR }]
  for (let i = 0; i < fullCount; i++) layers.push({ key: `full-${i}`, height: FULL_H, colour: COL_FULL })
  for (let i = 0; i < halfCount; i++) layers.push({ key: `half-${i}`, height: HALF_H, colour: COL_HALF })
  if (c.queen_excluder) layers.push({ key: 'excluder', height: EXCLUDER_H, colour: COL_EXCLUDER })
  for (let i = 0; i < superCount; i++) layers.push({ key: `super-${i}`, height: SUPER_H, colour: COL_SUPER })
  return layers
}

interface Hive3DProps {
  hive: MapHive
  // Ground position in scene units [x, z].
  position: [number, number]
  selected: boolean
  onSelect: (hiveId: string) => void
}

export default function Hive3D({ hive, position, selected, onSelect }: Hive3DProps) {
  const layers = useMemo(() => buildStack(hive), [hive])

  const isNuc = hive.configuration?.hive_size === 'nuc'
  const width = isNuc ? 0.45 : 0.9
  const depth = 0.9
  const yaw = hive.entrance_direction ? (DIRECTION_DEGREES[hive.entrance_direction] * Math.PI) / 180 : 0

  // Precompute each layer's vertical centre.
  let cursor = 0
  const placed = layers.map(l => {
    const centre = cursor + l.height / 2
    cursor += l.height
    return { ...l, centre }
  })
  const totalHeight = cursor

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onSelect(hive.id)
  }
  const setPointer = (over: boolean) => () => {
    if (typeof document !== 'undefined') document.body.style.cursor = over ? 'pointer' : 'auto'
  }

  const emissive = selected ? '#22c55e' : '#000000'
  const emissiveIntensity = selected ? 0.4 : 0

  return (
    <group
      position={[position[0], 0, position[1]]}
      rotation={[0, -yaw, 0]}
      onClick={handleClick}
      onPointerOver={setPointer(true)}
      onPointerOut={setPointer(false)}
    >
      {placed.map(l => (
        <mesh key={l.key} position={[0, l.centre, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, l.height, depth]} />
          <meshStandardMaterial color={l.colour} emissive={emissive} emissiveIntensity={emissiveIntensity} />
        </mesh>
      ))}

      {/* Entrance notch on the front (+Z) face at floor level. */}
      {hive.entrance_direction && (
        <mesh position={[0, FLOOR_H, depth / 2 + 0.03]}>
          <boxGeometry args={[width * 0.4, FLOOR_H, 0.08]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
      )}

      {/* Invisible taller hit area so small/short stacks are still easy to tap. */}
      <mesh position={[0, totalHeight / 2, 0]} visible={false}>
        <boxGeometry args={[width + 0.1, Math.max(totalHeight, 0.4), depth + 0.1]} />
        <meshStandardMaterial transparent opacity={0} />
      </mesh>

      {/* Camera-facing hive-number label, high contrast for readability. */}
      <Html
        position={[0, totalHeight + 0.2, 0]}
        center
        distanceFactor={9}
        style={{ pointerEvents: 'none' }}
        zIndexRange={[10, 0]}
      >
        <span
          className={`inline-block rounded-md border px-2 py-0.5 text-sm font-bold whitespace-nowrap shadow-sm bg-white/95 text-gray-900 ${
            selected
              ? 'border-forest-600 ring-2 ring-forest-500'
              : hive.is_queenless
                ? 'border-red-500 ring-1 ring-red-400'
                : 'border-gray-300'
          }`}
        >
          {hive.hive_number}
        </span>
      </Html>
    </group>
  )
}
