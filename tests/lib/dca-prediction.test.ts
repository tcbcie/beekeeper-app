import { describe, it, expect, vi, beforeEach } from 'vitest'
import { predictDCAs, scoreAspectAndWind, scoreDroneSupply, ElevationUnavailableError } from '@/lib/dca-prediction'
import { fetchElevationBatch } from '@/lib/elevation'

/**
 * The DCA engine works from terrain heights alone, so these tests swap the elevation service
 * for a made-up landscape and check what the engine does with it.
 */

vi.mock('@/lib/elevation', () => ({
  fetchElevationBatch: vi.fn(),
}))

type Point = { latitude: number; longitude: number }

const apiary = { id: 'apiary-1', name: 'Home apiary', latitude: 53.4, longitude: -8.2 }

const KM_PER_DEGREE_LATITUDE = 111.195

/** Every point gets the height the given landscape says it has. */
function useLandscape(heightAt: (point: Point) => number | null) {
  vi.mocked(fetchElevationBatch).mockImplementation(async (points: Point[]) => points.map(heightAt))
}

function distanceKm(a: Point, b: Point): number {
  const dLat = (a.latitude - b.latitude) * KM_PER_DEGREE_LATITUDE
  const dLng = (a.longitude - b.longitude) * KM_PER_DEGREE_LATITUDE * Math.cos((a.latitude * Math.PI) / 180)
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

const today = () => new Date().toISOString().slice(0, 10)

describe('predictDCAs', () => {
  beforeEach(() => {
    vi.mocked(fetchElevationBatch).mockReset()
  })

  it('returns nothing, without asking for heights, when no apiary has a valid position', async () => {
    const result = await predictDCAs([{ id: 'bad', name: 'No position', latitude: NaN, longitude: NaN }])

    expect(result).toEqual({ predictions: [], flyways: [] })
    expect(fetchElevationBatch).not.toHaveBeenCalled()
  })

  it('reports a failure when the elevation service returns nothing at all', async () => {
    useLandscape(() => null)

    await expect(predictDCAs([apiary])).rejects.toBeInstanceOf(ElevationUnavailableError)
  })

  it('never places a hotspot on open sea', async () => {
    // Flat land at 50 m to the west of the apiary, sea (0 m) everywhere to the east. The sea is
    // the "low horizon", so every candidate the engine projects lands on water.
    useLandscape(point => (point.longitude > apiary.longitude + 1e-6 ? 0 : 50))

    const result = await predictDCAs([apiary])

    expect(result.predictions).toEqual([])
    expect(result.flyways).toEqual([])
  })

  it('adds a recent sighting within flight range as a hotspot', async () => {
    useLandscape(() => 50)
    // 2 km due south, away from the directions the engine picks on flat ground
    const sighting = { latitude: apiary.latitude - 2 / KM_PER_DEGREE_LATITUDE, longitude: apiary.longitude }

    const result = await predictDCAs([apiary], [{ ...sighting, confirmed: true, observationDate: today() }])

    const atSighting = result.predictions.filter(prediction => distanceKm(prediction, sighting) < 0.1)
    expect(atSighting).toHaveLength(1)
    expect(atSighting[0].isFallback).toBe(false)
    expect(atSighting[0].reasonFlags).toContain('confirmation-supported')
  })

  it('ignores a sighting too far from every apiary to be reached by its drones', async () => {
    useLandscape(() => 50)
    const sighting = { latitude: apiary.latitude - 20 / KM_PER_DEGREE_LATITUDE, longitude: apiary.longitude }

    const result = await predictDCAs([apiary], [{ ...sighting, confirmed: true, observationDate: today() }])

    // Flat ground gives only the low-confidence best guess, close to the apiary
    expect(result.predictions).toHaveLength(1)
    expect(result.predictions[0].isFallback).toBe(true)
    expect(distanceKm(result.predictions[0], apiary)).toBeLessThanOrEqual(5)
    result.flyways.forEach(flyway => {
      expect(distanceKm({ latitude: flyway.toLatitude, longitude: flyway.toLongitude }, sighting)).toBeGreaterThan(5)
    })
  })
})

describe('scoreAspectAndWind', () => {
  // Heights around a candidate, in the order N, NE, E, SE, S, SW, W, NW

  it('scores level ground as neutral', () => {
    expect(scoreAspectAndWind(50, [50, 50, 50, 50, 50, 50, 50, 50])).toEqual({ aspectScore: 0, windScore: 0 })
  })

  it('favours south-facing ground and marks it down for facing the wind', () => {
    // Rises to the north: 60 m on the north side, 40 m on the south side, 50 m east and west.
    // Aspect: (60 - 40) / 20 = fully south-facing = +3.
    // Wind: upwind side (S, SW, W) averages (40 + 40 + 50) / 3 = 43.3 m, 6.7 m below the
    // candidate, so 6.7 / 15 of the way to fully exposed = -1.3, rounded to -1.
    expect(scoreAspectAndWind(50, [60, 60, 50, 40, 40, 40, 50, 60])).toEqual({ aspectScore: 3, windScore: -1 })
  })

  it('marks down north-facing ground', () => {
    expect(scoreAspectAndWind(50, [40, 40, 50, 60, 60, 60, 50, 40]).aspectScore).toBe(-3)
  })

  it('favours a spot with higher ground on the south-west side', () => {
    // S, SW and W at 65 m, everything else level with the candidate: 15 m of shelter = +3
    expect(scoreAspectAndWind(50, [50, 50, 50, 50, 65, 65, 65, 50]).windScore).toBe(3)
  })

  it('stays neutral when heights are missing', () => {
    expect(scoreAspectAndWind(null, [60, 60, 50, 40, 40, 40, 50, 60]).windScore).toBe(0)
    expect(scoreAspectAndWind(50, [null, 60, 50, 40, 40, 40, 50, 60]).aspectScore).toBe(0)
    expect(scoreAspectAndWind(50, [60, 60, 50, 40, 40, null, 50, 60])).toEqual({ aspectScore: 0, windScore: 0 })
  })
})

describe('scoreDroneSupply', () => {
  const spot = { latitude: 53.4, longitude: -8.2 }
  /** A neighbouring apiary the given distance due north of the spot. */
  const neighbourAt = (km: number, hiveCount: number) => ({
    latitude: spot.latitude + km / KM_PER_DEGREE_LATITUDE,
    longitude: spot.longitude,
    hiveCount,
  })

  it('scores nothing when there are no neighbours', () => {
    expect(scoreDroneSupply(spot.latitude, spot.longitude, [])).toBe(0)
  })

  it('gives the full score for many hives close by', () => {
    // 40 hives at 3 km count as 40 x (1 - 3/6) = 20, the amount that earns all 3 points
    expect(scoreDroneSupply(spot.latitude, spot.longitude, [neighbourAt(3, 40)])).toBe(3)
  })

  it('gives part of the score for a few hives', () => {
    // 10 hives at 3 km count as 5, a quarter of the way: 0.75, rounded to 1
    expect(scoreDroneSupply(spot.latitude, spot.longitude, [neighbourAt(3, 10)])).toBe(1)
  })

  it('ignores apiaries beyond 6 km, without hives, or without a real position', () => {
    expect(scoreDroneSupply(spot.latitude, spot.longitude, [
      neighbourAt(7, 100),
      neighbourAt(1, 0),
      { latitude: NaN, longitude: spot.longitude, hiveCount: 100 },
    ])).toBe(0)
  })
})
