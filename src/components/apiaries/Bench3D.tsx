'use client'
import { benchLengthUnits, BENCH_DEPTH_UNITS, BENCH_TOP_UNITS } from '@/lib/yard-geometry'
import type { YardBench } from '@/hooks/useApiaryMap'

const TOP_H = 0.06
const LEG_W = 0.08

interface Bench3DProps {
  bench: YardBench
  // Ground position in scene units [x, z].
  position: [number, number]
}

/** A bench (hive stand): a wooden top slab on four legs. */
export default function Bench3D({ bench, position }: Bench3DProps) {
  // numeric columns can arrive as strings; coerce before doing arithmetic.
  const yaw = (Number(bench.rotation_deg ?? 0) * Math.PI) / 180
  const length = benchLengthUnits(bench.capacity)
  const legH = BENCH_TOP_UNITS - TOP_H
  const lx = length / 2 - 0.12
  const lz = BENCH_DEPTH_UNITS / 2 - 0.12

  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, -yaw, 0]}>
      <mesh position={[0, BENCH_TOP_UNITS - TOP_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, TOP_H, BENCH_DEPTH_UNITS]} />
        <meshStandardMaterial color="#8b5e34" />
      </mesh>
      {[[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].map(([x, z]) => (
        <mesh key={`leg-${x}-${z}`} position={[x, legH / 2, z]} castShadow>
          <boxGeometry args={[LEG_W, legH, LEG_W]} />
          <meshStandardMaterial color="#6b4423" />
        </mesh>
      ))}
    </group>
  )
}
