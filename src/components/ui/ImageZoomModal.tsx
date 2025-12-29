'use client'

import { useEffect, useState, useRef } from 'react'
import { X, ZoomIn, ZoomOut, Maximize, Minimize } from 'lucide-react'
import Image from 'next/image'

interface ImageZoomModalProps {
  isOpen: boolean
  imageUrl: string | null
  onClose: () => void
}

export default function ImageZoomModal({ isOpen, imageUrl, onClose }: ImageZoomModalProps) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setScale(1)
      setPosition({ x: 0, y: 0 })
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen || !imageUrl) return null

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
          onClick={handleZoomIn}
          className="p-2 bg-gray-800/80 text-white rounded-full hover:bg-gray-700 transition-colors border border-gray-600"
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-gray-800/80 text-white rounded-full hover:bg-gray-700 transition-colors border border-gray-600"
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
        <button
          onClick={onClose}
          className="p-2 bg-gray-800/80 text-white rounded-full hover:bg-red-900/80 hover:text-red-100 transition-colors border border-gray-600 ml-2"
          title="Close"
        >
          <X size={20} />
        </button>
      </div>

      <div className="absolute top-4 left-4 z-[110] px-4 py-2 bg-gray-800/60 rounded-full text-white text-sm font-medium border border-gray-600 pointer-events-none">
          {Math.round(scale * 100)}%
      </div>

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
            src={imageUrl}
            alt="Enlarged view"
            className="max-w-[90vw] max-h-[90vh] object-contain select-none"
            draggable={false}
            onDoubleClick={toggleZoom}
          />
        </div>
      </div>
      
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-white/70 text-sm pointer-events-none bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
         {scale === 1 ? 'Double-click to zoom' : 'Drag to pan • Double-click to reset'}
      </div>
    </div>
  )
}
