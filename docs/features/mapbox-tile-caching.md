# Mapbox Tile Caching

## Overview
The service worker caches Mapbox map tiles, styles, fonts, and sprites for offline use. This enables the community map (and other map views) to render without an internet connection after the tiles have been loaded once.

## How It Works
- A separate cache (`hivecraic-mapbox-tiles`) stores all requests to `api.mapbox.com` and `tiles.mapbox.com`.
- Uses a **cache-first** strategy: serves from cache if available, otherwise fetches from network and caches the response.
- The tile cache **persists across app version updates** — it is not cleared when the main app cache is rotated.

## Use Case
Primarily for running offline demos with a local Supabase instance. Load the community map once with internet connectivity, then the map renders fully offline with data served from local Supabase.

## Files
- `public/service-worker.js` — cache-first fetch handler for Mapbox URLs

## Notes
- Only tiles/styles that have been viewed are cached (zoom levels, map areas visited).
- To cache a specific area, simply pan and zoom over it while online.
- No cache size limit is enforced; for demo purposes this is acceptable.
