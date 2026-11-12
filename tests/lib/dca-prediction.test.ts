import { describe, it, expect, vi, beforeEach } from 'vitest'
import { predictDCAs, ElevationUnavailableError } from '@/lib/dca-prediction'
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
