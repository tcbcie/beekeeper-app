'use client'

import { useEffect, useState, useCallback } from 'react'
import { Camera, Trash2, Calendar, Tag, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

interface DiagnosisImage {
  id: string
  image_url: string
  description: string
  diagnosis_type: string
  created_at: string
}

interface DiagnosisImagesTabProps {
  userId: string
}

const DIAGNOSIS_TYPE_LABELS: Record<string, string> = {
  disease: 'Disease',
  varroa_pest: 'Varroa/Pest',
  general: 'General Hive Issue',
  frame_comb: 'Frame/Comb Analysis'
}

export default function DiagnosisImagesTab({ userId }: DiagnosisImagesTabProps) {
  const [images, setImages] = useState<DiagnosisImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<DiagnosisImage | null>(null)

  const fetchImages = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('diagnosis_images')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Failed to fetch diagnosis images:', fetchError)
      setError('Failed to load images')
    } else {
      setImages(data || [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  const handleDelete = async (image: DiagnosisImage) => {
    if (!confirm('Are you sure you want to delete this image?')) return

    setDeleting(image.id)

    try {
      // Extract file path from URL for storage deletion
      const urlParts = image.image_url.split('/inspection-images/')
      if (urlParts[1]) {
        const filePath = urlParts[1]
        await supabase.storage.from('inspection-images').remove([filePath])
      }

      // Delete database record
      const { error: deleteError } = await supabase
        .from('diagnosis_images')
        .delete()
        .eq('id', image.id)

      if (deleteError) throw deleteError

      setImages(prev => prev.filter(img => img.id !== image.id))
      if (selectedImage?.id === image.id) setSelectedImage(null)
    } catch (err) {
      console.error('Failed to delete image:', err)
      setError('Failed to delete image')
    } finally {
      setDeleting(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="bg-surface rounded-lg shadow border border-border p-8 text-center">
        <RefreshCw size={32} className="mx-auto text-text-tertiary animate-spin mb-2" />
        <p className="text-text-secondary">Loading diagnosis images...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Camera size={24} className="text-forest-600 dark:text-forest-400" />
          Diagnosis Images
        </h2>
        <button
          onClick={fetchImages}
          className="p-2 text-text-secondary hover:text-foreground hover:bg-sage-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {images.length === 0 ? (
        <div className="bg-surface rounded-lg shadow border border-border p-8 text-center">
          <Camera size={48} className="mx-auto text-text-tertiary mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Diagnosis Images</h3>
          <p className="text-text-secondary">
            Upload images for diagnosis from the Tools section.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="bg-surface rounded-lg shadow border border-border overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Image */}
              <div
                className="relative aspect-video cursor-pointer"
                onClick={() => setSelectedImage(image)}
              >
                <Image
                  src={image.image_url}
                  alt={image.description}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>

              {/* Details */}
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <Tag size={14} />
                  <span className="font-medium">{DIAGNOSIS_TYPE_LABELS[image.diagnosis_type] || image.diagnosis_type}</span>
                </div>

                <p className="text-sm text-foreground line-clamp-2">{image.description}</p>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-1 text-xs text-text-tertiary">
                    <Calendar size={12} />
                    {formatDate(image.created_at)}
                  </div>

                  <button
                    onClick={() => handleDelete(image)}
                    disabled={deleting === image.id}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors disabled:opacity-50"
                    title="Delete image"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-surface rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video">
              <Image
                src={selectedImage.image_url}
                alt={selectedImage.description}
                fill
                className="object-contain bg-black"
                sizes="(max-width: 768px) 100vw, 896px"
              />
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Tag size={16} className="text-forest-600 dark:text-forest-400" />
                <span className="font-medium text-foreground">
                  {DIAGNOSIS_TYPE_LABELS[selectedImage.diagnosis_type] || selectedImage.diagnosis_type}
                </span>
                <span className="text-text-tertiary">•</span>
                <span className="text-text-secondary">{formatDate(selectedImage.created_at)}</span>
              </div>
              <p className="text-foreground">{selectedImage.description}</p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => handleDelete(selectedImage)}
                  disabled={deleting === selectedImage.id}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="px-4 py-2 bg-sage-100 dark:bg-slate-800 text-foreground rounded-lg hover:bg-sage-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
