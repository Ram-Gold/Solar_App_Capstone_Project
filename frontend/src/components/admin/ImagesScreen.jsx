import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Button } from '../ui/button'
import { 
  Upload, 
  Image as ImageIcon, 
  Copy, 
  Check, 
  Trash2, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  X, 
  Eye, 
  HardDrive,
  FileImage,
  ArrowUpDown
} from 'lucide-react'

const BUCKET_NAME = 'product-images'

export default function ImagesScreen() {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest') // 'newest' | 'oldest' | 'name' | 'size'
  const [copiedName, setCopiedName] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [uploadFeedback, setUploadFeedback] = useState(null) // { type: 'success' | 'error', message: '' }
  const [dragOver, setDragOver] = useState(false)
  
  // Pending files selected for upload
  const [pendingFiles, setPendingFiles] = useState([])
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchImages()
  }, [])

  const fetchImages = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.storage.from(BUCKET_NAME).list('', {
        limit: 200,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })

      if (error) {
        console.error('Error fetching images:', error)
        setUploadFeedback({ type: 'error', message: `Failed to load images: ${error.message}` })
      } else {
        // Filter out empty folder placeholders
        const validImages = (data || []).filter(item => item.name && item.name !== '.emptyFolderPlaceholder')
        setImages(validImages)
      }
    } catch (err) {
      console.error('Exception listing images:', err)
    } finally {
      setLoading(false)
    }
  }

  const getImageUrl = (name) => {
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(name)
    return data?.publicUrl || ''
  }

  const copyToClipboard = (name) => {
    const url = getImageUrl(name)
    if (!url) return
    navigator.clipboard.writeText(url).then(() => {
      setCopiedName(name)
      setTimeout(() => setCopiedName(null), 2500)
    })
  }

  const handleFilesSelected = (files) => {
    const fileList = Array.from(files).filter(file => file.type.startsWith('image/'))
    if (fileList.length === 0) {
      setUploadFeedback({ type: 'error', message: 'Please select valid image files (.png, .jpg, .jpeg, .webp, .svg)' })
      return
    }
    setPendingFiles(prev => [...prev, ...fileList])
    setUploadFeedback(null)
  }

  const removePendingFile = (index) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUploadSubmit = async () => {
    if (pendingFiles.length === 0) return
    setUploading(true)
    setUploadFeedback(null)

    let successCount = 0
    let failedCount = 0

    for (const file of pendingFiles) {
      // Clean and sanitize file name
      const sanitizedName = file.name
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '_')
      
      // Ensure file doesn't accidentally overwrite unless intended, append timestamp
      const fileExt = sanitizedName.substring(sanitizedName.lastIndexOf('.'))
      const baseName = sanitizedName.substring(0, sanitizedName.lastIndexOf('.'))
      const uniqueFileName = `${baseName}_${Date.now()}${fileExt}`

      const { error } = await supabase.storage.from(BUCKET_NAME).upload(uniqueFileName, file, {
        cacheControl: '3600',
        upsert: false
      })

      if (error) {
        console.error('Failed to upload file:', file.name, error)
        failedCount++
      } else {
        successCount++
      }
    }

    setUploading(false)
    setPendingFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ''

    if (failedCount === 0) {
      setUploadFeedback({ type: 'success', message: `Successfully uploaded ${successCount} image(s)!` })
    } else {
      setUploadFeedback({ 
        type: 'error', 
        message: `Uploaded ${successCount} image(s), but ${failedCount} failed.` 
      })
    }

    // Refresh gallery
    fetchImages()
  }

  const handleDeleteImage = async (name) => {
    if (!confirm(`Are you sure you want to delete "${name}" from storage? This cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase.storage.from(BUCKET_NAME).remove([name])
      if (error) {
        setUploadFeedback({ type: 'error', message: `Could not delete image: ${error.message}` })
      } else {
        setImages(prev => prev.filter(img => img.name !== name))
        setUploadFeedback({ type: 'success', message: `Image "${name}" was deleted.` })
        if (selectedImage?.name === name) setSelectedImage(null)
      }
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  // Filter and sort
  const filteredImages = images.filter(img => 
    img.name.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at || 0) - new Date(a.created_at || 0)
    }
    if (sortBy === 'oldest') {
      return new Date(a.created_at || 0) - new Date(b.created_at || 0)
    }
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name)
    }
    if (sortBy === 'size') {
      return (b.metadata?.size || 0) - (a.metadata?.size || 0)
    }
    return 0
  })

  return (
    <div className="max-w-[1300px] mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-headline-md font-bold text-jds-on-surface">Image Storage & Assets</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-jds-primary/10 text-jds-primary border border-jds-primary/20">
              <HardDrive className="h-3 w-3" />
              {BUCKET_NAME}
            </span>
          </div>
          <p className="text-body-md text-jds-on-surface-variant">
            Upload solar product photos to Supabase Storage and easily copy links to attach them to your catalog.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={fetchImages} 
            disabled={loading}
            className="border-jds-outline-variant text-jds-on-surface-variant hover:bg-jds-surface-container gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="bg-jds-primary text-jds-on-primary hover:opacity-90 gap-2 shadow-sm font-semibold"
          >
            <Upload className="h-4 w-4" />
            Select Images
          </Button>
        </div>
      </div>

      {/* Upload Alerts */}
      {uploadFeedback && (
        <div 
          className={`p-4 rounded-xl border flex items-center justify-between animate-in fade-in ${
            uploadFeedback.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
              : 'bg-jds-error-container/20 border-jds-error/30 text-jds-error'
          }`}
        >
          <span className="text-body-sm font-medium">{uploadFeedback.message}</span>
          <button onClick={() => setUploadFeedback(null)} className="opacity-60 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files)
        }}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          dragOver 
            ? 'border-jds-primary bg-jds-primary/5 scale-[1.005]' 
            : 'border-jds-outline-variant/50 bg-jds-surface-container-lowest hover:border-jds-primary/40'
        }`}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          multiple 
          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml" 
          onChange={(e) => {
            if (e.target.files) handleFilesSelected(e.target.files)
          }}
          className="hidden" 
        />

        <div className="max-w-md mx-auto flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-jds-primary/10 text-jds-primary flex items-center justify-center shadow-inner">
            <FileImage className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-body-lg font-bold text-jds-on-surface">
              Drag & Drop product images here, or{' '}
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="text-jds-primary hover:underline font-semibold"
              >
                browse computer
              </button>
            </h3>
            <p className="text-body-sm text-jds-on-surface-variant">
              Supports PNG, JPG, JPEG, WEBP, or SVG files.
            </p>
          </div>
        </div>

        {/* Selected pending files preview */}
        {pendingFiles.length > 0 && (
          <div className="mt-6 pt-6 border-t border-jds-outline-variant/20 text-left">
            <div className="flex items-center justify-between mb-4">
              <span className="text-label-md font-bold text-jds-on-surface">
                Files Ready to Upload ({pendingFiles.length})
              </span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setPendingFiles([])}
                  className="text-xs text-jds-on-surface-variant hover:text-jds-error"
                >
                  Clear All
                </Button>
                <Button 
                  onClick={handleUploadSubmit}
                  disabled={uploading}
                  className="bg-jds-primary text-jds-on-primary hover:opacity-90 gap-2 h-9 px-4 text-xs font-bold shadow-sm"
                >
                  {uploading ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Uploading to Storage...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Upload {pendingFiles.length} Image{pendingFiles.length > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {pendingFiles.map((file, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt={file.name} 
                      className="h-10 w-10 rounded-lg object-cover bg-black/5 shrink-0" 
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-jds-on-surface truncate">{file.name}</p>
                      <p className="text-[11px] text-jds-on-surface-variant">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => removePendingFile(idx)}
                    className="p-1 rounded-lg text-jds-on-surface-variant hover:text-jds-error hover:bg-jds-surface-container-high transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-jds-on-surface-variant/60" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search images by filename..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-jds-outline-variant/40 bg-jds-surface-container-lowest text-body-md text-jds-on-surface placeholder:text-jds-on-surface-variant/50 focus:border-jds-primary outline-none transition-all shadow-sm"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-jds-on-surface-variant hover:text-jds-on-surface"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-jds-on-surface-variant">
            <ArrowUpDown className="h-4 w-4 opacity-60" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-jds-surface-container-lowest border border-jds-outline-variant/40 rounded-xl px-3 py-2 text-body-sm text-jds-on-surface outline-none focus:border-jds-primary cursor-pointer shadow-sm"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name (A–Z)</option>
              <option value="size">File Size (Largest)</option>
            </select>
          </div>
          <span className="text-body-sm font-medium text-jds-on-surface-variant/80">
            {filteredImages.length} image{filteredImages.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-jds-on-surface-variant">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-jds-primary border-t-transparent" />
          <p className="mt-4 text-body-md font-medium">Loading storage images...</p>
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="rounded-2xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-jds-surface-container-low flex items-center justify-center mx-auto text-jds-on-surface-variant/60">
            <ImageIcon className="h-6 w-6" />
          </div>
          <h3 className="text-body-lg font-bold text-jds-on-surface">No images found</h3>
          <p className="text-body-sm text-jds-on-surface-variant max-w-sm mx-auto">
            {search ? `No images matching "${search}". Try another search keyword.` : 'No images have been uploaded to the product-images bucket yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredImages.map((img) => {
            const url = getImageUrl(img.name)
            const isCopied = copiedName === img.name

            return (
              <div
                key={img.name}
                className="group relative rounded-2xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
              >
                {/* Image Preview Container */}
                <div className="relative aspect-square w-full bg-jds-surface-container-low/30 overflow-hidden flex items-center justify-center">
                  <img
                    src={url}
                    alt={img.name}
                    loading="lazy"
                    className="h-full w-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.onerror = null
                      e.target.src = 'https://placehold.co/400x400/e2e8f0/64748b?text=Image+Unavailable'
                    }}
                  />

                  {/* Overlay Action Buttons on Hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                    <button
                      onClick={() => setSelectedImage({ name: img.name, url, metadata: img.metadata, created_at: img.created_at })}
                      title="Enlarge Image"
                      className="h-9 w-9 rounded-full bg-white/90 text-slate-800 flex items-center justify-center hover:bg-white hover:scale-110 transition-transform shadow-md"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open full URL in new tab"
                      className="h-9 w-9 rounded-full bg-white/90 text-slate-800 flex items-center justify-center hover:bg-white hover:scale-110 transition-transform shadow-md"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => handleDeleteImage(img.name)}
                      title="Delete from Storage"
                      className="h-9 w-9 rounded-full bg-red-600/90 text-white flex items-center justify-center hover:bg-red-600 hover:scale-110 transition-transform shadow-md"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Details Footer */}
                <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                  <div>
                    <p 
                      className="text-xs font-bold text-jds-on-surface truncate" 
                      title={img.name}
                    >
                      {img.name}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-jds-on-surface-variant/70">
                      <span>{formatFileSize(img.metadata?.size)}</span>
                      <span>{formatDate(img.created_at)}</span>
                    </div>
                  </div>

                  {/* 1-Click Copy Link Button */}
                  <Button
                    size="sm"
                    variant={isCopied ? "default" : "outline"}
                    onClick={() => copyToClipboard(img.name)}
                    className={`w-full h-8 text-xs font-semibold gap-1.5 rounded-lg transition-all ${
                      isCopied 
                        ? 'bg-emerald-600 text-white hover:bg-emerald-600 border-emerald-600' 
                        : 'border-jds-outline-variant/60 text-jds-on-surface hover:bg-jds-primary/10 hover:text-jds-primary hover:border-jds-primary/40'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copied Link!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy Link
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Enlarged Image Preview Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="bg-jds-surface-container-lowest rounded-2xl max-w-2xl w-full border border-jds-outline-variant/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-jds-outline-variant/20">
              <div className="min-w-0 pr-4">
                <h3 className="text-body-md font-bold text-jds-on-surface truncate">
                  {selectedImage.name}
                </h3>
                <p className="text-xs text-jds-on-surface-variant">
                  {formatFileSize(selectedImage.metadata?.size)} • Uploaded {formatDate(selectedImage.created_at)}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSelectedImage(null)}
                className="h-8 w-8 rounded-lg text-jds-on-surface-variant hover:bg-jds-surface-container"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Modal Image Body */}
            <div className="flex-1 bg-black/5 dark:bg-black/40 p-6 flex items-center justify-center overflow-auto min-h-[300px]">
              <img 
                src={selectedImage.url} 
                alt={selectedImage.name} 
                className="max-h-[55vh] max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>

            {/* Modal URL & Action Footer */}
            <div className="p-4 border-t border-jds-outline-variant/20 bg-jds-surface space-y-3">
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={selectedImage.url}
                  className="flex-1 h-9 px-3 rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/50 text-xs text-jds-on-surface select-all outline-none font-mono"
                />
                <Button 
                  size="sm"
                  onClick={() => copyToClipboard(selectedImage.name)}
                  className="bg-jds-primary text-jds-on-primary hover:opacity-90 text-xs font-bold gap-1.5 h-9 px-4 shrink-0"
                >
                  {copiedName === selectedImage.name ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy URL
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
