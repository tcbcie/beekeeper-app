'use client'
import { useMemo } from 'react'
import { Html, Edges } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { queenLineageParts, type MapHive } from '@/hooks/useApiaryMap'

// Relative box dimensions (1 unit ≈ one hive footprint). Heights mirror the
// 2D card's sense of scale: supers/half boxes shallower than full brood.
const FEET_H = 0.06
const FLOOR_H = 0.06
const FULL_H = 0.26
const HALF_H = 0.16
const SUPER_H = 0.16
const EXCLUDER_H = 0.03
const FEEDER_TOP_H = 0.12
const ROOF_H = 0.09

// Colours match the 2D HiveListCard stack so the two views read the same.
const COL_FLOOR_CLOSED = '#b45309' // amber-700 (solid floor)
const COL_FLOOR_OPEN = '#9ca3af'   // grey (varroa mesh)
const COL_FULL = '#fde68a'         // amber-200
const COL_HALF = '#fcd34d'         // amber-300
const COL_EXCLUDER = '#9ca3af'     // gray-400
const COL_SUPER = '#facc15'        // yellow-400 (one step richer than the 2D
                                   // card so supers read against pale brood)
const COL_ROOF = '#57534e'         // stone-600
const COL_FEEDER = '#93c5fd'       // blue-300
const COL_FEET = '#78350f'         // amber-900
const COL_FRAME_LINE = '#92400e'   // amber-800

interface Layer {
  key: string
  height: number
  colour: string
  /** Optional per-layer footprint override (roof overhangs the body). */
  w?: number
  d?: number
  /** Honey-super fullness 0-100 from the last inspection (super layers only). */
  fullness?: number
}

// Darker honey fill drawn on a super's front face to show how full it is.
const COL_SUPER_FILL = '#b45309' // amber-700

// Build the box stack bottom→top from the hive's configuration, mirroring the
// fixed order used by the 2D card: floor → full brood → half brood → excluder
// → supers → top feeder → roof.
function buildStack(hive: MapHive, width: number, depth: number): Layer[] {
  const c = hive.configuration ?? {}
  const fullCount = Math.max(0, Math.min(4, c.brood_boxes_full ?? c.brood_boxes ?? 1))
  const halfCount = Math.max(0, Math.min(4, c.brood_boxes_half ?? 0))
  const superCount = Math.max(0, Math.min(4, c.honey_supers ?? 0))
  const floorOpen = c.varroa_mesh_floor === 'open'

  const layers: Layer[] = [
    { key: 'floor', height: FLOOR_H, colour: floorOpen ? COL_FLOOR_OPEN : COL_FLOOR_CLOSED },
  ]
  for (let i = 0; i < fullCount; i++) layers.push({ key: `full-${i}`, height: FULL_H, colour: COL_FULL })
  for (let i = 0; i < halfCount; i++) layers.push({ key: `half-${i}`, height: HALF_H, colour: COL_HALF })
  if (c.queen_excluder) layers.push({ key: 'excluder', height: EXCLUDER_H, colour: COL_EXCLUDER })
  for (let i = 0; i < superCount; i++) {
    const raw = hive.last_super_fullness?.[i]
    const fullness = typeof raw === 'number' && Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : undefined
    layers.push({ key: `super-${i}`, height: SUPER_H, colour: COL_SUPER, fullness })
  }
  if (c.feeder && c.feeder_type === 'top') {
    layers.push({ key: 'feeder-top', height: FEEDER_TOP_H, colour: COL_FEEDER })
  }
  layers.push({ key: 'roof', height: ROOF_H, colour: COL_ROOF, w: width + 0.08, d: depth + 0.08 })
  return layers
}

interface Hive3DProps {
  hive: MapHive
  // Ground position in scene units [x, z].
  position: [number, number]
  /** Standing height (e.g. a bench top); defaults to ground level. */
  elevation?: number
  selected: boolean
  onSelect: (hiveId: string) => void
}

export default function Hive3D({ hive, position, elevation = 0, selected, onSelect }: Hive3DProps) {
  const config = hive.configuration ?? {}
  const isNuc = config.hive_size === 'nuc'
  const width = isNuc ? 0.45 : 0.9
  const depth = 0.9

  const layers = useMemo(() => buildStack(hive, width, depth), [hive, width, depth])

  // numeric columns can arrive as strings; coerce before doing arithmetic.
  const yaw = (Number(hive.rotation_deg ?? 0) * Math.PI) / 180

  const queen = hive.queens?.[0]
  const lineageParts = queenLineageParts(queen)

  // Precompute each layer's vertical centre; the stack sits on the feet.
  let cursor = FEET_H
  let bottomBroodCentre: number | null = null
  const placed = layers.map(l => {
    const centre = cursor + l.height / 2
    cursor += l.height
    if (l.key === 'full-0') bottomBroodCentre = centre
    return { ...l, centre }
  })
  const totalHeight = cursor

  // Entrance notch: full width normally, pinched by an entrance reducer.
  const notchWidth = width * (config.entrance_reducer ? 0.16 : 0.4)
  // Entrance/Boardman feeders sit as a small block in front of the entrance.
  const hasEntranceFeeder = !!config.feeder && (config.feeder_type === 'entrance' || config.feeder_type === 'boardman')
  // Frame orientation lines on the front face of the bottom full brood box —
  // warm = frames parallel to the entrance (horizontal lines on the face),
  // cold = perpendicular (vertical lines), matching the 2D card.
  const frameOrientation = config.frame_orientation === 'warm' || config.frame_orientation === 'cold'
    ? config.frame_orientation
    : null

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
      position={[position[0], elevation, position[1]]}
      rotation={[0, -yaw, 0]}
      onClick={handleClick}
      onPointerOver={setPointer(true)}
      onPointerOut={setPointer(false)}
    >
      {/* Stand feet lift the floor off the ground (visible gap on mesh floors). */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => (
        <mesh key={`foot-${sx}-${sz}`} position={[sx * (width / 2 - 0.08), FEET_H / 2, sz * (depth / 2 - 0.08)]}>
          <boxGeometry args={[0.1, FEET_H, 0.1]} />
          <meshStandardMaterial color={COL_FEET} />
        </mesh>
      ))}

      {placed.map(l => (
        <mesh key={l.key} position={[0, l.centre, 0]} castShadow receiveShadow>
          <boxGeometry args={[l.w ?? width, l.height, l.d ?? depth]} />
          <meshStandardMaterial color={l.colour} emissive={emissive} emissiveIntensity={emissiveIntensity} />
          {/* Outline every box so adjacent same-colour boxes (e.g. two honey
              supers) read as separate boxes rather than one merged slab. */}
          <Edges color="#a16207" threshold={15} />
        </mesh>
      ))}

      {/* Honey fill on each super's front (−Z) face, rising from the box's
          bottom in proportion to the last inspection's recorded fullness. */}
      {placed.map(l =>
        l.key.startsWith('super-') && typeof l.fullness === 'number' && l.fullness > 0 ? (
          (() => {
            const fillH = (l.fullness / 100) * SUPER_H
            const bottom = l.centre - SUPER_H / 2
            return (
              <mesh key={`fill-${l.key}`} position={[0, bottom + fillH / 2, -(depth / 2 + 0.006)]}>
                <boxGeometry args={[width * 0.82, fillH, 0.012]} />
                <meshStandardMaterial color={COL_SUPER_FILL} />
              </mesh>
            )
          })()
        ) : null,
      )}

      {/* Entrance notch on the front (−Z) face at floor level — −Z maps to
          canvas-up, matching the 2D triangle at rotation 0. Always drawn,
          since the front is defined by rotation_deg. */}
      <mesh position={[0, FEET_H + FLOOR_H, -(depth / 2 + 0.03)]}>
        <boxGeometry args={[notchWidth, FLOOR_H, 0.08]} />
        <meshStandardMaterial color="#374151" />
      </mesh>

      {/* Entrance/Boardman feeder block in front of the entrance. */}
      {hasEntranceFeeder && (
        <mesh position={[0, FEET_H + 0.05, -(depth / 2 + 0.16)]} castShadow>
          <boxGeometry args={[width * 0.28, 0.1, 0.18]} />
          <meshStandardMaterial color={COL_FEEDER} />
        </mesh>
      )}

      {/* Frame-orientation lines on the bottom brood box's front face. */}
      {frameOrientation && bottomBroodCentre != null && (
        <group position={[0, bottomBroodCentre, -(depth / 2 + 0.005)]}>
          {[-0.24, -0.08, 0.08, 0.24].map(off =>
            frameOrientation === 'warm' ? (
              <mesh key={`fl-${off}`} position={[0, off * (FULL_H / 0.8), 0]}>
                <boxGeometry args={[width * 0.7, 0.015, 0.012]} />
                <meshStandardMaterial color={COL_FRAME_LINE} />
              </mesh>
            ) : (
              <mesh key={`fl-${off}`} position={[off * width, 0, 0]}>
                <boxGeometry args={[0.015, FULL_H * 0.7, 0.012]} />
                <meshStandardMaterial color={COL_FRAME_LINE} />
              </mesh>
            ),
          )}
        </group>
      )}

      {/* Invisible taller hit area so small/short stacks are still easy to tap. */}
      <mesh position={[0, totalHeight / 2, 0]} visible={false}>
        <boxGeometry args={[width + 0.1, Math.max(totalHeight, 0.4), depth + 0.1]} />
        <meshStandardMaterial transparent opacity={0} />
      </mesh>

      {/* Camera-facing label: compact by default (hive + queen number); the
          selected hive's label expands with the queen lineage line. */}
      <Html
        position={[0, totalHeight + 0.2, 0]}
        center
        distanceFactor={9}
        style={{ pointerEvents: 'none' }}
        zIndexRange={[10, 0]}
      >
        <span
          className={`inline-block rounded-md border px-2 py-0.5 shadow-sm bg-white/95 text-gray-900 text-center ${
            selected
              ? 'border-forest-600 ring-2 ring-forest-500'
              : hive.is_queenless
                ? 'border-red-500 ring-1 ring-red-400'
                : 'border-gray-300'
          }`}
        >
          <span className="block text-sm font-bold whitespace-nowrap leading-tight">
            {hive.hive_number}
            {queen && <span className="font-medium text-gray-700"> · Q{queen.queen_number}</span>}
          </span>
          {/* Lineage stacks as short lines (capped width, wrapping) so a long
              mating-station name can't run across neighbouring labels. */}
          {selected && lineageParts.map(part => (
            <span key={part} className="block text-sm font-medium text-gray-700 whitespace-normal leading-tight max-w-[220px]">
              {part}
            </span>
          ))}
        </span>
      </Html>
    </group>
  )
}
