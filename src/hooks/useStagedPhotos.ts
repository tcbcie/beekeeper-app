'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface StagedPhoto {
  /** Stable key for React lists and for removal - a File is not a reliable identity. */
  id: string
  file: File
  /** Object URL for the thumbnail. Revoked when the photo is dropped or the form unmounts. */
  preview: string
}

/**
 * Holds photographs picked but not yet uploaded.
 *
 * Deliberately separate from useImageUpload: that hook is a single-file preview +
 * upload pair used by nine other forms, and widening it would have put every one
 * of them at risk. This holds only the staging half, for many files, and leaves
 * uploading to the caller (which uses @/lib/upload-image).
 *
 * Previews use object URLs rather than FileReader data URLs: no async read, and
 * six 10MB photographs held as base64 would be a meaningful memory cost on a
 * phone. The trade-off is that they must be revoked, which this hook owns.
 *
 * The ref - not the state - is the authoritative list. Two reasons, both real:
 *
 *  1. Creating and revoking object URLs are side effects, and React may call a
 *     `setState(prev => ...)` updater more than once (always in StrictMode, and
 *     whenever a concurrent render is discarded and replayed). Doing that work
 *     inside an updater leaks a blob URL per replay, or revokes one belonging to
 *     state that survives. Every side effect here therefore happens outside the
 *     updater, and state is handed a finished array.
 *  2. The caller validates each file asynchronously before staging it, so two
 *     picks can be in flight at once. Both would read the same stale count from
 *     a render closure and both append, quietly breaching the cap. A ref updated
 *     synchronously is correct for callers that have not re-rendered yet.
 */
export function useStagedPhotos() {
  const [staged, setStaged] = useState<StagedPhoto[]>([])
  const stagedRef = useRef<StagedPhoto[]>([])

  // Revoke whatever is still staged when the form goes away.
  useEffect(() => {
    return () => {
      stagedRef.current.forEach(photo => URL.revokeObjectURL(photo.preview))
      stagedRef.current = []
    }
  }, [])

  const commit = useCallback((next: StagedPhoto[]) => {
    stagedRef.current = next
    setStaged(next)
  }, [])

  /**
   * Stages files up to `maxTotal`, counting `reservedCount` photographs that are
   * already saved on the record. Returns how many were turned away for space.
   */
  const addFiles = useCallback((files: File[], maxTotal: number, reservedCount: number): number => {
    const slots = Math.max(0, maxTotal - reservedCount - stagedRef.current.length)
    const accepted = files.slice(0, slots)

    if (accepted.length > 0) {
      const created = accepted.map(file => ({
        id: `${Math.random().toString(36).substring(2)}_${Date.now()}`,
        file,
        preview: URL.createObjectURL(file)
      }))
      commit([...stagedRef.current, ...created])
    }

    return files.length - accepted.length
  }, [commit])

  const removeFile = useCallback((id: string) => {
    const target = stagedRef.current.find(photo => photo.id === id)
    if (!target) return
    URL.revokeObjectURL(target.preview)
    commit(stagedRef.current.filter(photo => photo.id !== id))
  }, [commit])

  const reset = useCallback(() => {
    if (stagedRef.current.length === 0) return
    stagedRef.current.forEach(photo => URL.revokeObjectURL(photo.preview))
    commit([])
  }, [commit])

  return { staged, addFiles, removeFile, reset }
}
