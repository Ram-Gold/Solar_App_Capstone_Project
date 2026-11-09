import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Button } from '../ui/button'
import { ArrowLeft, Upload, Image as ImageIcon, X, Link2, Check, Plus } from 'lucide-react'
import CategoryModal from './CategoryModal'
import { fetchCategoriesWithCounts, DEFAULT_CATEGORIES } from '../../lib/categories'
import { sanitizeText, sanitizeNumber } from '../../lib/sanitize.js'


export default function AddProductScreen({ onNavigate }) {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    type: DEFAULT_CATEGORIES[0] || 'Solar Streetlight',
    watt: '',
    waterproof_grade: 'IP65',
    method_control: '',
    material: '',
    solar_panel: '',
    battery: '',
    charging_time: '',
    charging_type: 'Solar Charging',
    smd_lamp_beads: '',
    lighting_time: '',
    price_range: '',
    size: '',
    stock_quantity: 15,
    in_stock: true,
    sales: 0,
    image_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [imageUploadError, setImageUploadError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await fetchCategoriesWithCounts()
      if (data && data.length > 0) {
        const names = data.map(c => c.name)
        setCategories(names)
        setForm(prev => {
          if (!prev.type || !names.includes(prev.type)) {
            return { ...prev, type: names[0] }
          }
          return prev
        })
      }
    }
    loadCategories()
  }, [])

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setImageUploadError('Please select a valid image file.')
      return
    }

    setImageUploading(true)
    setImageUploadError('')

    try {
      const sanitizedName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, '_')
      const fileExt = sanitizedName.substring(sanitizedName.lastIndexOf('.'))
      const baseName = sanitizedName.substring(0, sanitizedName.lastIndexOf('.'))
      const uniqueFileName = `${baseName}_${Date.now()}${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(uniqueFileName, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        throw uploadError
      }

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(uniqueFileName)

      if (publicUrlData?.publicUrl) {
        handleChange('image_url', publicUrlData.publicUrl)
      }
    } catch (err) {
      console.error('Image upload failed:', err)
      setImageUploadError(err.message || 'Image upload failed')
    } finally {
      setImageUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const cleanName = sanitizeText(form.name, { maxLength: 200 })
    if (!cleanName) {
      setError('Product name is required.')
      setSaving(false)
      return
    }

    const stockQty = form.stock_quantity !== '' && form.stock_quantity !== null && form.stock_quantity !== undefined
      ? sanitizeNumber(form.stock_quantity, { min: 0, integer: true, fallback: 0 })
      : (form.in_stock ? 15 : 0)
    const inStock = stockQty > 0

    const payload = {
      name: cleanName,
      type: sanitizeText(form.type, { maxLength: 100 }),
      watt: form.watt ? sanitizeNumber(form.watt, { min: 0, fallback: null }) : null,
      waterproof_grade: form.waterproof_grade ? sanitizeText(form.waterproof_grade, { maxLength: 50 }) : null,
      method_control: form.method_control ? sanitizeText(form.method_control, { maxLength: 100 }) : null,
      material: form.material ? sanitizeText(form.material, { maxLength: 100 }) : null,
      solar_panel: form.solar_panel ? sanitizeText(form.solar_panel, { maxLength: 200 }) : null,
      battery: form.battery ? sanitizeText(form.battery, { maxLength: 200 }) : null,
      charging_time: form.charging_time ? sanitizeText(form.charging_time, { maxLength: 100 }) : null,
      charging_type: form.charging_type ? sanitizeText(form.charging_type, { maxLength: 100 }) : null,
      smd_lamp_beads: form.smd_lamp_beads ? sanitizeText(form.smd_lamp_beads, { maxLength: 100 }) : null,
      lighting_time: form.lighting_time ? sanitizeText(form.lighting_time, { maxLength: 100 }) : null,
      price_range: form.price_range ? sanitizeText(form.price_range, { maxLength: 100 }) : null,
      size: form.size ? sanitizeText(form.size, { maxLength: 100 }) : null,
      stock_quantity: stockQty,
      in_stock: inStock,
      sales: sanitizeNumber(form.sales, { min: 0, integer: true, fallback: 0 }),
      image_url: form.image_url ? form.image_url.trim() : null,
    }

    let { error: insertError } = await supabase.from('products').insert([payload])
    if (insertError && insertError.message && insertError.message.includes('stock_quantity')) {
      const { stock_quantity, ...fallbackPayload } = payload
      const retry = await supabase.from('products').insert([fallbackPayload])
      insertError = retry.error
    }

    if (insertError) {
      setError(insertError.message)
    } else {
      onNavigate('products')
    }
    setSaving(false)
  }

  const inputClass = "h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"

  return (
    <div className="max-w-[1200px] mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => onNavigate('products')} className="h-10 w-10 text-jds-on-surface-variant hover:bg-jds-surface-container-low">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-headline-md font-bold text-jds-on-surface">Add New Product</h1>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-jds-error-container/10 border border-jds-error/20 p-4 text-body-sm text-jds-error">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest p-8 shadow-sm space-y-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Product Name</label>
            <input required value={form.name} onChange={(e) => handleChange('name', e.target.value)} className={inputClass} placeholder="e.g. Aviation Aluminum Solar Street Light 200W" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Type / Category</label>
              <span className="text-[11px] text-jds-on-surface-variant/60 font-medium">Add via + icon</span>
            </div>
            <div className="flex items-center gap-2">
              <select 
                value={form.type} 
                onChange={(e) => handleChange('type', e.target.value)} 
                className={`${inputClass} flex-1`}
              >
                {categories.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="h-11 w-11 flex items-center justify-center rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 hover:bg-jds-primary/10 hover:border-jds-primary hover:text-jds-primary text-jds-on-surface-variant transition-all shrink-0 shadow-sm"
                title="Add or Manage Categories"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Wattage (W)</label>
            <input type="number" required value={form.watt} onChange={(e) => handleChange('watt', e.target.value)} className={inputClass} placeholder="200" />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Waterproof Grade</label>
            <select value={form.waterproof_grade} onChange={(e) => handleChange('waterproof_grade', e.target.value)} className={inputClass}>
              <option>IP65</option>
              <option>IP67</option>
              <option>IP68</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Control Method</label>
            <input value={form.method_control} onChange={(e) => handleChange('method_control', e.target.value)} className={inputClass} placeholder="Light Control + Remote Control + Radar Sensor" />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Material</label>
            <input value={form.material} onChange={(e) => handleChange('material', e.target.value)} className={inputClass} placeholder="Aviation Aluminum + Optical Lens" />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Solar Panel</label>
            <input value={form.solar_panel} onChange={(e) => handleChange('solar_panel', e.target.value)} className={inputClass} placeholder="Monocrystalline (5v/25w)" />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Battery</label>
            <input value={form.battery} onChange={(e) => handleChange('battery', e.target.value)} className={inputClass} placeholder="26000mAh Lithium Iron Phosphate Battery" />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Charging Time</label>
            <input value={form.charging_time} onChange={(e) => handleChange('charging_time', e.target.value)} className={inputClass} placeholder="4~6 hours" />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Charging Type</label>
            <input value={form.charging_type} onChange={(e) => handleChange('charging_type', e.target.value)} className={inputClass} placeholder="Solar Charging" />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">SMD Lamp Beads</label>
            <input value={form.smd_lamp_beads} onChange={(e) => handleChange('smd_lamp_beads', e.target.value)} className={inputClass} placeholder="Sanan chip 360 pcs 5054 LED" />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Lighting Time</label>
            <input value={form.lighting_time} onChange={(e) => handleChange('lighting_time', e.target.value)} className={inputClass} placeholder="12~16 hours" />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Price Range</label>
            <input value={form.price_range} onChange={(e) => handleChange('price_range', e.target.value)} className={inputClass} placeholder="e.g. 5,000 - 8,000" />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Size / Dimensions</label>
            <input value={form.size} onChange={(e) => handleChange('size', e.target.value)} className={inputClass} placeholder="750mm x 237mm x 82mm (L/W/H)" />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Initial Sales</label>
            <input type="number" value={form.sales} onChange={(e) => handleChange('sales', e.target.value)} className={inputClass} placeholder="0" />
          </div>
        </div>

        {/* Product Image Section */}
        <div className="space-y-3 pt-2">
          <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider block">
            Product Image
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
            onChange={handleImageFileChange}
            className="hidden"
          />

          {imageUploadError && (
            <div className="p-3 rounded-lg bg-jds-error-container/20 border border-jds-error/30 text-jds-error text-xs">
              {imageUploadError}
            </div>
          )}

          {form.image_url ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/40">
              <img
                src={form.image_url}
                alt="Product Preview"
                className="h-20 w-20 rounded-lg object-contain bg-black/5 border border-jds-outline-variant/30 shrink-0"
                onError={(e) => {
                  e.target.onerror = null
                  e.target.src = 'https://placehold.co/100x100?text=Preview'
                }}
              />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" />
                    Image Attached
                  </span>
                </div>
                <p className="text-xs text-jds-on-surface-variant font-mono truncate max-w-md">
                  {form.image_url}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading}
                  className="text-xs gap-1.5 border-jds-outline-variant"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Replace File
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleChange('image_url', '')}
                  className="text-xs text-jds-on-surface-variant hover:text-jds-error"
                >
                  <X className="h-4 w-4" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-4 p-6 rounded-xl border-2 border-dashed border-jds-outline-variant/50 bg-jds-surface-container-lowest text-center sm:text-left">
                <div className="h-12 w-12 rounded-xl bg-jds-primary/10 text-jds-primary flex items-center justify-center shrink-0">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-body-sm font-bold text-jds-on-surface">Upload photo directly to Supabase Storage</p>
                  <p className="text-xs text-jds-on-surface-variant">PNG, JPG, JPEG, WEBP or SVG up to 10MB</p>
                </div>
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading}
                  className="bg-jds-primary text-jds-on-primary hover:opacity-90 gap-2 shrink-0 font-semibold text-xs h-10 px-5 shadow-sm"
                >
                  {imageUploading ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Select & Upload
                    </>
                  )}
                </Button>
              </div>

              {/* Alternative Paste URL */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-jds-on-surface-variant/50" />
                  <input
                    value={form.image_url}
                    onChange={(e) => handleChange('image_url', e.target.value)}
                    className={`${inputClass} pl-10 text-xs font-mono`}
                    placeholder="Or paste an existing image link (e.g. from Storage library or external URL)..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-1.5">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80">Stock Quantity (Units)</label>
            <input
              type="number"
              min="0"
              value={form.stock_quantity ?? 15}
              onChange={(e) => {
                const val = e.target.value === '' ? '' : Number(e.target.value)
                setForm(prev => ({
                  ...prev,
                  stock_quantity: val,
                  in_stock: val === '' ? prev.in_stock : val > 0
                }))
              }}
              className={inputClass}
              placeholder="e.g. 15"
            />
            <p className="text-xs text-jds-on-surface-variant/60 font-medium">0 units marks item as Out of Stock, 1–5 units triggers Low Stock alert.</p>
          </div>

          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="in-stock"
              checked={form.in_stock}
              onChange={(e) => {
                const checked = e.target.checked
                setForm(prev => ({
                  ...prev,
                  in_stock: checked,
                  stock_quantity: checked ? (prev.stock_quantity > 0 ? prev.stock_quantity : 15) : 0
                }))
              }}
              className="h-5 w-5 rounded border-jds-outline-variant/30 accent-jds-primary cursor-pointer"
            />
            <label htmlFor="in-stock" className="text-body-md font-medium text-jds-on-surface cursor-pointer">In Stock</label>
          </div>
        </div>


        <div className="flex gap-4 pt-6 border-t border-jds-outline-variant/20">
          <Button type="submit" disabled={saving} className="bg-jds-primary text-jds-on-primary hover:opacity-90 px-10 h-12 text-body-md font-bold rounded-lg">
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving Product...
              </div>
            ) : 'Publish Product'}
          </Button>
          <Button type="button" variant="outline" onClick={() => onNavigate('products')} className="border-jds-outline-variant text-jds-on-surface-variant px-8 h-12 text-body-md rounded-lg">
            Cancel
          </Button>
        </div>
      </form>

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoryAdded={(newCat) => {
          setCategories(prev => Array.from(new Set([...prev, newCat])))
          setForm(prev => ({ ...prev, type: newCat }))
        }}
        onCategoriesChanged={(names) => {
          if (names && names.length > 0) {
            setCategories(names)
          }
        }}
      />
    </div>
  )
}
