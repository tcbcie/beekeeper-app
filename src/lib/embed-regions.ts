// Regions served by the public research embed (/embed/research/<region>) and its weather route.
// Shared so the route only ever fetches weather for a listed region, never arbitrary coordinates.

export interface EmbedRegion {
  viewName: string
  label: string
  latitude: number
  longitude: number
}

// Add new regions here as the corresponding public_<region>_gdd view is created.
export const EMBED_REGIONS: Record<string, EmbedRegion> = {
  galway: {
    viewName: 'public_galway_gdd',
    label: 'Galway',
    latitude: 53.2707,
    longitude: -9.0568,
  },
}

/** The first year the embed's archive route serves. */
export const EMBED_FIRST_YEAR = 2000
