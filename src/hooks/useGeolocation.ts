'use client'
import { useState, useEffect, useRef } from 'react'

interface GeoPosition {
  latitude: number
  longitude: number
}

/**
 * Requests the device's GPS position once on mount.
 * Returns null while loading or if permission is denied / unavailable.
 */
export function useGeolocation(): GeoPosition | null {
  const [position, setPosition] = useState<GeoPosition | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mountedRef.current) return
        setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
      },
      () => {
        // Denied or unavailable — keep null (fallback to default order)
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 }
    )

    return () => { mountedRef.current = false }
  }, [])

  return position
}

/** Haversine distance in km between two lat/lng points */
export function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  if (!Number.isFinite(lat1) || !Number.isFinite(lon1) ||
      !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
    return Infinity
  }

  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
