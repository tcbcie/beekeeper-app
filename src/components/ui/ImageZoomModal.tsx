'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react'
import { normaliseStoragePublicUrl } from '@/lib/storage-url'

interface ImageZoomModalProps {
  isOpen: boolean
  /** Single-image callers (apiaries, varroa checks, diagnosis images) keep using this. */
  imageUrl?: string | null
  /** Gallery callers pass the whole set instead; takes precedence over imageUrl. */
  images?: string[]
  /** Which of `images` to open on. Clamped, so a stale index cannot blank the viewer. */
  startIndex?: number
  onClose: () => void
}

export default function ImageZoomModal({ isOpen, imageUrl, images, startIndex = 0, onClose }: ImageZoomModalProps) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [index, setIndex] = useState(startIndex)

  // One internal shape for both call styles, so everything below is gallery-aware
  // without the single-image callers having to change.
  // Memoised because panning re-renders on every mousemove, and this parses a URL
  // per photo per render otherwise.
  const gallery = useMemo(
    () => (images && images.length > 0 ? images : [imageUrl])
      .map(normaliseStoragePublicUrl)
      .filter((url): url is string => Boolean(url)),
    [images, imageUrl]
  )

  const safeIndex = gallery.length === 0 ? 0 : Math.min(Math.max(index, 0), gallery.length - 1)
  const normalisedImageUrl = gallery[safeIndex] ?? null
  const hasMultiple = gallery.length > 1

  // The length guards are not decoration: `% 0` is NaN, which would strand the
  // viewer on a blank frame if these were ever called with an empty gallery.
  const showPrevious = useCallback(() => {
    if (gallery.length < 2) return
    setScale(1)
    setPosition({ x: 0, y: 0 })
    setIndex(prev => (prev - 1 + gallery.length) % gallery.length)
  }, [gallery.length])

  const showNext = useCallback(() => {
    if (gallery.length < 2) return
    setScale(1)
    setPosition({ x: 0, y: 0 })
    setIndex(prev => (prev + 1) % gallery.length)
  }, [gallery.length])

  // Locking scroll is conditional on there actually being something to show. The
  // component renders nothing when the gallery resolves empty, and locking anyway
  // would leave the page unscrollable with no visible viewer to dismiss.
  const hasSomethingToShow = gallery.length > 0

  useEffect(() => {
    if (isOpen && hasSomethingToShow) {
      document.body.style.overflow = 'hidden'
      setScale(1)
      setPosition({ x: 0, y: 0 })
      setIndex(startIndex)
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, startIndex, hasSomethingToShow])

  // Arrow keys are how a desktop user expects to page a gallery. Bound only while
  // open and only when there is more than one photo, so single-image callers are
  // behaviourally identical to before.
  useEffect(() => {
    if (!isOpen || !hasMultiple) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); showPrevious() }
      if (e.key === 'ArrowRight') { e.preventDefault(); showNext() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, hasMultiple, showPrevious, showNext])

  if (!isOpen || !normalisedImageUrl) return null

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setScale(prev => Math.min(prev + 0.5, 4))
  }

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setScale(prev => {
        const newScale = Math.max(prev - 0.5, 1)
        if (newScale === 1) setPosition({ x: 0, y: 0 })
        return newScale
    })
  }

  const toggleZoom = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (scale === 1) {
          setScale(2.5)
      } else {
          setScale(1)
          setPosition({ x: 0, y: 0 })
      }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      e.preventDefault()
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      e.preventDefault()
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Prevent closing when clicking controls or image area
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div
      className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] overflow-hidden backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Controls */}
      <div 
        className="absolute top-4 right-4 flex items-center gap-2 z-[110]"
        onClick={handleContentClick}
      >
        <button
          type="button"
          onClick={handleZoomIn}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center p-2 bg-black/70 text-white rounded-full hover:bg-black/85 transition-colors border border-white/20"
          aria-label="Zoom in"
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center p-2 bg-black/70 text-white rounded-full hover:bg-black/85 transition-colors border border-white/20"
          aria-label="Zoom out"
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center p-2 bg-black/70 text-white rounded-full hover:bg-red-900/80 hover:text-red-100 transition-colors border border-white/20 ml-2"
          aria-label="Close image viewer"
          title="Close"
        >
          <X size={20} />
        </button>
      </div>

      <div className="absolute top-4 left-4 z-[110] flex items-center gap-2 pointer-events-none">
        <span className="px-4 py-2 bg-black/60 rounded-full text-white text-sm font-medium border border-white/20">
          {Math.round(scale * 100)}%
        </span>
        {hasMultiple && (
          <span className="px-4 py-2 bg-black/60 rounded-full text-white text-sm font-medium border border-white/20">
            {safeIndex + 1} of {gallery.length}
          </span>
        )}
      </div>

      {/* Previous / next. 44px targets, matching the zoom controls. */}
      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); showPrevious() }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-[110] flex min-h-[44px] min-w-[44px] items-center justify-center p-2 bg-black/70 text-white rounded-full hover:bg-black/85 transition-colors border border-white/20"
            aria-label="Previous photo"
            title="Previous photo"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); showNext() }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-[110] flex min-h-[44px] min-w-[44px] items-center justify-center p-2 bg-black/70 text-white rounded-full hover:bg-black/85 transition-colors border border-white/20"
            aria-label="Next photo"
            title="Next photo"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Image Container */}
      <div
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleContentClick}
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <div
            style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transition: isDragging ? 'none' : 'transform 0.2s ease-out'
            }}
            className="relative flex items-center justify-center"
        >
           {/* eslint-disable-next-line @next/next/no-img-element */}
           <img
            src={normalisedImageUrl}
            alt={hasMultiple ? `Enlarged view, photo ${safeIndex + 1} of ${gallery.length}` : 'Enlarged view'}
            className="max-w-[90vw] max-h-[90vh] object-contain select-none"
            draggable={false}
            onDoubleClick={toggleZoom}
          />
        </div>
      </div>
      
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-white/70 text-sm pointer-events-none bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
         {scale === 1 ? 'Double-click to zoom' : 'Drag to pan - Double-click to reset'}
      </div>
    </div>
  )
}
