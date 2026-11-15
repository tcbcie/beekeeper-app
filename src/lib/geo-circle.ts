// A circle of a given radius around a point, as a GeoJSON polygon for Mapbox layers.
// Shared by the location picker, the community map and the trace page map.

/** `center` is [longitude, latitude]. 64 points is smooth at every zoom the maps use. */
export function createCircleGeoJSON(center: [number, number], radiusKm: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const points = 64
  const coords: [number, number][] = []
  const earthRadiusKm = 6371

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI
    const latOffset = (radiusKm / earthRadiusKm) * (180 / Math.PI) * Math.cos(angle)
    const lngOffset = (radiusKm / earthRadiusKm) * (180 / Math.PI) * Math.sin(angle) / Math.cos(center[1] * Math.PI / 180)
    coords.push([center[0] + lngOffset, center[1] + latOffset])
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    }
  }
}
