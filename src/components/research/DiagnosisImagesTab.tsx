'use client'

import { useEffect, useState, useCallback } from 'react'
import { Camera, Trash2, Calendar, Tag, RefreshCw, Download, MessageSquare, Send, User, Eye, LayoutGrid, List, X, ZoomIn, ZoomOut } from 'lucide-react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

interface DiagnosisImage {
  id: string
  image_url: string
  description: string
  diagnosis_type: string
  created_at: string
}

interface Comment {
  id: string
  diagnosis_image_id: string
  user_id: string
  comment: string
  created_at: string
  user_name?: string
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
  const [allComments, setAllComments] = useState<Record<string, Comment[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<DiagnosisImage | null>(null)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isZoomed, setIsZoomed] = useState(false)

  const fetchImages = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data: imagesData, error: fetchError } = await supabase
      .from('diagnosis_images')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Failed to fetch diagnosis images:', fetchError)
      setError('Failed to load images')
      setLoading(false)
      return
    }

    setImages(imagesData || [])

    // Fetch all comments for all images
    if (imagesData && imagesData.length > 0) {
      const imageIds = imagesData.map(img => img.id)
      const { data: commentsData } = await supabase
        .from('diagnosis_image_comments')
        .select('*')
        .in('diagnosis_image_id', imageIds)
        .order('created_at', { ascending: true })

      if (commentsData && commentsData.length > 0) {
        // Fetch user names for comments
        const userIds = [...new Set(commentsData.map(c => c.user_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds)

        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || [])

        // Group comments by image
        const commentsByImage: Record<string, Comment[]> = {}
        commentsData.forEach(c => {
          if (!commentsByImage[c.diagnosis_image_id]) {
            commentsByImage[c.diagnosis_image_id] = []
          }
          commentsByImage[c.diagnosis_image_id].push({
            ...c,
            user_name: profileMap.get(c.user_id) || 'Unknown User'
          })
        })
        setAllComments(commentsByImage)
      } else {
        setAllComments({})
      }
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
      const urlParts = image.image_url.split('/inspection-images/')
      if (urlParts[1]) {
        const filePath = urlParts[1]
        await supabase.storage.from('inspection-images').remove([filePath])
      }

      const { error: deleteError } = await supabase
        .from('diagnosis_images')
        .delete()
        .eq('id', image.id)

      if (deleteError) throw deleteError

      setImages(prev => prev.filter(img => img.id !== image.id))
      setAllComments(prev => {
        const updated = { ...prev }
        delete updated[image.id]
        return updated
      })
      if (selectedImage?.id === image.id) setSelectedImage(null)
    } catch (err) {
      console.error('Failed to delete image:', err)
      setError('Failed to delete image')
    } finally {
      setDeleting(null)
    }
  }

  const handleAddComment = async () => {
    if (!selectedImage || !newComment.trim()) return

    setSubmittingComment(true)

    try {
      const { data, error: insertError } = await supabase
        .from('diagnosis_image_comments')
        .insert({
          diagnosis_image_id: selectedImage.id,
          user_id: userId,
          comment: newComment.trim()
        })
        .select()
        .single()

      if (insertError) throw insertError

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single()

      const newCommentData: Comment = {
        ...data,
        user_name: profile?.full_name || 'You'
      }

      setAllComments(prev => ({
        ...prev,
        [selectedImage.id]: [...(prev[selectedImage.id] || []), newCommentData]
      }))
      setNewComment('')
    } catch (err) {
      console.error('Failed to add comment:', err)
      setError('Failed to add comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string, imageId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('diagnosis_image_comments')
        .delete()
        .eq('id', commentId)

      if (deleteError) throw deleteError

      setAllComments(prev => ({
        ...prev,
        [imageId]: (prev[imageId] || []).filter(c => c.id !== commentId)
      }))
    } catch (err) {
      console.error('Failed to delete comment:', err)
    }
  }

  const handleDownload = async (image: DiagnosisImage) => {
    try {
      const response = await fetch(image.image_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = image.image_url.split('.').pop() || 'jpg'
      a.download = `diagnosis_${image.diagnosis_type}_${formatDateForFile(image.created_at)}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download image:', err)
      setError('Failed to download image')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatDateForFile = (dateString: string) => {
    return new Date(dateString).toISOString().split('T')[0]
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getImageComments = (imageId: string) => allComments[imageId] || []

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
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-forest-600 text-white' : 'text-text-secondary hover:bg-sage-100 dark:hover:bg-slate-800'}`}
              title="Grid view"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-forest-600 text-white' : 'text-text-secondary hover:bg-sage-100 dark:hover:bg-slate-800'}`}
              title="List view"
            >
              <List size={18} />
            </button>
          </div>
          <button
            onClick={fetchImages}
            className="p-2 text-text-secondary hover:text-foreground hover:bg-sage-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={20} />
          </button>
        </div>
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
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image) => {
            const imageComments = getImageComments(image.id)
            return (
              <div
                key={image.id}
                className="bg-surface rounded-lg shadow border border-border overflow-hidden hover:shadow-md transition-shadow"
              >
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
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Tag size={14} />
                    <span className="font-medium">{DIAGNOSIS_TYPE_LABELS[image.diagnosis_type] || image.diagnosis_type}</span>
                  </div>
                  <p className="text-sm text-foreground line-clamp-2">{image.description}</p>

                  {/* Comments Preview */}
                  {imageComments.length > 0 && (
                    <div className="bg-sage-50 dark:bg-slate-800 rounded p-2 space-y-1">
                      <div className="flex items-center gap-1 text-xs text-text-secondary">
                        <MessageSquare size={12} />
                        <span>{imageComments.length} comment{imageComments.length !== 1 ? 's' : ''}</span>
                      </div>
                      {imageComments.slice(-2).map((comment) => (
                        <div key={comment.id} className="text-xs">
                          <span className="font-medium text-text-secondary">{comment.user_name}:</span>
                          <span className="text-foreground ml-1 line-clamp-1">{comment.comment}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-1 text-xs text-text-tertiary">
                      <Calendar size={12} />
                      {formatDate(image.created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedImage(image); }}
                        className="p-1.5 text-forest-600 dark:text-forest-400 hover:bg-forest-50 dark:hover:bg-forest-900/20 rounded transition-colors"
                        title="View image"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownload(image); }}
                        className="p-1.5 text-text-secondary hover:text-foreground hover:bg-sage-100 dark:hover:bg-slate-800 rounded transition-colors"
                        title="Download image"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(image); }}
                        disabled={deleting === image.id}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors disabled:opacity-50"
                        title="Delete image"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {images.map((image) => {
            const imageComments = getImageComments(image.id)
            return (
              <div
                key={image.id}
                className="bg-surface rounded-lg shadow border border-border overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="flex">
                  <div
                    className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 cursor-pointer"
                    onClick={() => setSelectedImage(image)}
                  >
                    <Image
                      src={image.image_url}
                      alt={image.description}
                      fill
                      className="object-cover"
                      sizes="128px"
                    />
                  </div>
                  <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <Tag size={14} />
                        <span className="font-medium">{DIAGNOSIS_TYPE_LABELS[image.diagnosis_type] || image.diagnosis_type}</span>
                        <span className="text-text-tertiary">•</span>
                        <Calendar size={12} />
                        <span>{formatDate(image.created_at)}</span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-1">{image.description}</p>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <button
                        onClick={() => setSelectedImage(image)}
                        className="p-1.5 text-forest-600 dark:text-forest-400 hover:bg-forest-50 dark:hover:bg-forest-900/20 rounded transition-colors"
                        title="View image"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleDownload(image)}
                        className="p-1.5 text-text-secondary hover:text-foreground hover:bg-sage-100 dark:hover:bg-slate-800 rounded transition-colors"
                        title="Download image"
                      >
                        <Download size={16} />
                      </button>
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
                {/* Comments shown below in list view */}
                {imageComments.length > 0 && (
                  <div className="border-t border-border px-3 py-2 bg-sage-50 dark:bg-slate-800">
                    <div className="flex items-center gap-1 text-xs text-text-secondary mb-1">
                      <MessageSquare size={12} />
                      <span>{imageComments.length} comment{imageComments.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="space-y-1">
                      {imageComments.map((comment) => (
                        <div key={comment.id} className="text-xs flex items-start gap-1">
                          <span className="font-medium text-text-secondary whitespace-nowrap">{comment.user_name}:</span>
                          <span className="text-foreground">{comment.comment}</span>
                          <span className="text-text-tertiary whitespace-nowrap ml-auto">({formatDate(comment.created_at)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Image Modal with Comments */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => { setSelectedImage(null); setIsZoomed(false); }}
        >
          <div
            className={`bg-surface rounded-lg shadow-xl flex flex-col ${isZoomed ? 'max-w-[95vw] max-h-[95vh]' : 'max-w-4xl w-full max-h-[90vh] m-4'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Close Button */}
            <div className="flex items-center justify-between p-3 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2 text-sm">
                <Tag size={16} className="text-forest-600 dark:text-forest-400" />
                <span className="font-medium text-foreground">
                  {DIAGNOSIS_TYPE_LABELS[selectedImage.diagnosis_type] || selectedImage.diagnosis_type}
                </span>
                <span className="text-text-tertiary">•</span>
                <span className="text-text-secondary">{formatDate(selectedImage.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="p-2 text-text-secondary hover:text-foreground hover:bg-sage-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title={isZoomed ? "Zoom out" : "Zoom in"}
                >
                  {isZoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
                </button>
                <button
                  onClick={() => handleDownload(selectedImage)}
                  className="p-2 text-text-secondary hover:text-foreground hover:bg-sage-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download size={20} />
                </button>
                <button
                  onClick={() => { setSelectedImage(null); setIsZoomed(false); }}
                  className="p-2 text-text-secondary hover:text-foreground hover:bg-sage-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Image */}
            <div
              className={`relative flex-shrink-0 bg-black ${isZoomed ? 'flex-1 min-h-0' : 'aspect-video'}`}
              onClick={() => setIsZoomed(!isZoomed)}
              style={{ cursor: isZoomed ? 'zoom-out' : 'zoom-in' }}
            >
              <Image
                src={selectedImage.image_url}
                alt={selectedImage.description}
                fill
                className={`${isZoomed ? 'object-contain' : 'object-contain'}`}
                sizes="(max-width: 768px) 100vw, 896px"
                priority
              />
            </div>

            {/* Content Area */}
            {!isZoomed && (
              <div className="p-4 space-y-3 overflow-y-auto flex-shrink-0 max-h-[40vh]">
                <p className="text-foreground">{selectedImage.description}</p>

                {/* Comments Section */}
                <div className="border-t border-border pt-3 space-y-3">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <MessageSquare size={16} />
                    Comments ({getImageComments(selectedImage.id).length})
                  </h4>

                  {/* Comments List */}
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {getImageComments(selectedImage.id).length === 0 ? (
                      <p className="text-sm text-text-tertiary">No comments yet.</p>
                    ) : (
                      getImageComments(selectedImage.id).map((comment) => (
                        <div key={comment.id} className="bg-sage-50 dark:bg-slate-800 rounded-lg p-2 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1 text-xs text-text-secondary">
                              <User size={12} />
                              <span className="font-medium">{comment.user_name}</span>
                              <span className="text-text-tertiary">•</span>
                              <span>{formatDateTime(comment.created_at)}</span>
                            </div>
                            {comment.user_id === userId && (
                              <button
                                onClick={() => handleDeleteComment(comment.id, selectedImage.id)}
                                className="text-red-500 hover:text-red-700 p-0.5"
                                title="Delete comment"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                          <p className="text-foreground">{comment.comment}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                      placeholder="Add a comment..."
                      className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground"
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={submittingComment || !newComment.trim()}
                      className="px-3 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>

                {/* Delete Button */}
                <div className="flex justify-end pt-2 border-t border-border">
                  <button
                    onClick={() => handleDelete(selectedImage)}
                    disabled={deleting === selectedImage.id}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Delete Image
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
