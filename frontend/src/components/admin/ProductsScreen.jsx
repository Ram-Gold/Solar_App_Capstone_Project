import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Button } from '../ui/button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table'
import { Search, Plus, Pencil, Trash2, Upload, Image as ImageIcon, Tag } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import CategoryModal from './CategoryModal'
import { fetchCategoriesWithCounts, DEFAULT_CATEGORIES } from '../../lib/categories'


const EDIT_FIELDS = [
  { key: 'name', label: 'Product Name', type: 'text' },
  { key: 'price_range', label: 'Price Range', type: 'text' },
  { key: 'type', label: 'Category Type', type: 'text' },
  { key: 'watt', label: 'Power (Watts)', type: 'number' },
  { key: 'waterproof_grade', label: 'Waterproof Grade', type: 'text' },
  { key: 'method_control', label: 'Control Method', type: 'text' },
  { key: 'material', label: 'Material', type: 'text' },
  { key: 'solar_panel', label: 'Solar Panel', type: 'text' },
  { key: 'battery', label: 'Battery', type: 'text' },
  { key: 'charging_time', label: 'Charging Time', type: 'text' },
  { key: 'charging_type', label: 'Charging Type', type: 'text' },
  { key: 'smd_lamp_beads', label: 'SMD Lamp Beads', type: 'text' },
  { key: 'lighting_time', label: 'Lighting Time', type: 'text' },
  { key: 'size', label: 'Size / Dimensions', type: 'text' },
  { key: 'sales', label: 'Total Sales', type: 'number' },
]

const SELECT_COLS = 'id,name,type,watt,waterproof_grade,method_control,material,solar_panel,battery,charging_time,charging_type,smd_lamp_beads,lighting_time,size,image_url,in_stock,sales,price_range'

export default function ProductsScreen({ onNavigate }) {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [powerFilter, setPowerFilter] = useState('All Power')
  const [editingProduct, setEditingProduct] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})
  const [editingImageUploading, setEditingImageUploading] = useState(false)
  const editFileInputRef = useRef(null)
  const { role } = useAuth()

  const handleEditImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setEditingImageUploading(true)
    try {
      const sanitizedName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, '_')
      const fileExt = sanitizedName.substring(sanitizedName.lastIndexOf('.'))
      const baseName = sanitizedName.substring(0, sanitizedName.lastIndexOf('.'))
      const uniqueFileName = `${baseName}_${Date.now()}${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(uniqueFileName, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(uniqueFileName)

      if (publicUrlData?.publicUrl) {
        setEditingProduct(prev => ({ ...prev, image_url: publicUrlData.publicUrl }))
      }
    } catch (err) {
      console.error('Failed to upload image:', err)
      alert(`Image upload failed: ${err.message}`)
    } finally {
      setEditingImageUploading(false)
      if (editFileInputRef.current) editFileInputRef.current.value = ''
    }
  }

  useEffect(() => { 
    fetchProducts()
    loadCategories()
  }, [])

  const loadCategories = async () => {
    const { data } = await fetchCategoriesWithCounts()
    if (data && data.length > 0) {
      setCategories(data.map(c => c.name))
    }
  }

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select(SELECT_COLS).order('id')
    if (!error) setProducts(data || [])
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) setProducts(products.filter(p => p.id !== id))
  }

  const handleEditSave = async () => {
    if (!editingProduct) return
    
    // Validate watt
    const wattVal = editingProduct.watt
    if (wattVal === '' || wattVal === null || wattVal === undefined || isNaN(Number(wattVal)) || Number(wattVal) <= 0) {
      setValidationErrors(prev => ({ ...prev, watt: 'Power must be a positive number' }))
      return
    }

    const { id, ...rest } = editingProduct
    delete rest.embedding
    const { error } = await supabase.from('products').update(rest).eq('id', id)
    if (!error) {
      setProducts(products.map(p => p.id === id ? editingProduct : p))
      setEditingProduct(null)
      setValidationErrors({})
    }
  }

  const handleFieldChange = (key, value, type) => {
    let finalVal = value
    if (type === 'number') {
      finalVal = value === '' ? '' : Number(value)
    }
    
    setEditingProduct(prev => ({ ...prev, [key]: finalVal }))

    if (key === 'watt') {
      if (value === '' || isNaN(Number(value)) || Number(value) <= 0) {
        setValidationErrors(prev => ({ ...prev, watt: 'Power must be a positive number' }))
      } else {
        setValidationErrors(prev => {
          const next = { ...prev }
          delete next.watt
          return next
        })
      }
    }
  }

  const types = ['All Types', ...new Set([...categories, ...products.map(p => p.type).filter(Boolean)])]
  const filtered = products.filter(p => {
    const s = p.name.toLowerCase().includes(search.toLowerCase()) || (p.type || '').toLowerCase().includes(search.toLowerCase())
    
    let matchesPower = true
    if (powerFilter === 'Under 200W') {
      matchesPower = (p.watt || 0) < 200
    } else if (powerFilter === '200W - 400W') {
      matchesPower = (p.watt || 0) >= 200 && (p.watt || 0) <= 400
    } else if (powerFilter === 'Above 400W') {
      matchesPower = (p.watt || 0) > 400
    }

    return s && (typeFilter === 'All Types' || p.type === typeFilter) && matchesPower
  })

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading products...</div>

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-headline-md font-bold text-jds-on-surface">Solar Products</h1>
          <p className="text-body-md text-jds-on-surface-variant">Manage and curate the solar inventory catalog.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={() => setIsCategoryModalOpen(true)} 
            className="border-jds-outline-variant/40 bg-jds-surface text-jds-on-surface hover:bg-jds-surface-container-low hover:border-jds-primary hover:text-jds-primary rounded-lg px-4 gap-2 h-10 font-semibold shadow-sm transition-all"
          >
            <Tag className="h-4 w-4" />
            <span>Categories</span>
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-jds-primary/10 text-jds-primary text-[11px] font-bold">
              +
            </span>
          </Button>
          <Button onClick={() => onNavigate('add-product')} className="bg-jds-primary text-jds-on-primary hover:opacity-90 rounded-lg px-6 gap-2 w-full sm:w-auto justify-center">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 bg-jds-surface-container-low/20 p-4 rounded-xl border border-jds-outline-variant/20">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-jds-on-surface-variant/50" />
            <input className="h-10 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-lowest pl-10 pr-4 text-body-md outline-none focus:border-jds-secondary focus:ring-2 focus:ring-jds-secondary/10 transition-all" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/70 uppercase tracking-wider">Type:</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-10 w-full sm:w-auto rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-lowest px-4 text-body-md outline-none focus:border-jds-secondary transition-all">
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="h-10 w-10 flex items-center justify-center rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-lowest hover:bg-jds-primary/10 hover:border-jds-primary hover:text-jds-primary text-jds-on-surface-variant transition-all shrink-0"
              title="Add or Manage Categories"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
          <span className="text-label-sm font-bold text-jds-on-surface-variant/70 uppercase tracking-wider whitespace-nowrap">Power Output:</span>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: 'All Power', value: 'All Power' },
              { label: 'Under 200W', value: 'Under 200W' },
              { label: '200W - 400W', value: '200W - 400W' },
              { label: 'Above 400W', value: 'Above 400W' }
            ].map((opt) => (
              <label 
                key={opt.value} 
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-body-sm font-medium cursor-pointer transition-all ${
                  powerFilter === opt.value 
                    ? 'border-jds-primary bg-jds-primary/10 text-jds-primary' 
                    : 'border-jds-outline-variant/30 bg-jds-surface-container-lowest text-jds-on-surface-variant hover:bg-jds-surface-container-high'
                }`}
              >
                <input
                  type="radio"
                  name="powerFilterAdmin"
                  value={opt.value}
                  checked={powerFilter === opt.value}
                  onChange={() => setPowerFilter(opt.value)}
                  className="h-4 w-4 text-jds-primary accent-jds-primary cursor-pointer border-jds-outline-variant focus:ring-jds-primary"
                />
                <span className="text-body-md">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {editingProduct && (
        <div className="rounded-xl border border-jds-outline-variant/40 bg-jds-surface-container-lowest p-4 sm:p-8 space-y-6 shadow-lg animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-jds-outline-variant/20 pb-4">
            <h3 className="text-body-lg font-bold text-jds-on-surface">Edit Product Details</h3>
            <span className="text-label-sm text-jds-on-surface-variant/50">ID: {editingProduct.id}</span>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {EDIT_FIELDS.map(f => (
              <div key={f.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-label-sm font-bold text-jds-on-surface-variant/80">{f.label}</label>
                  {f.key === 'type' && (
                    <span className="text-[11px] text-jds-on-surface-variant/60 font-medium">Add via +</span>
                  )}
                </div>
                {f.key === 'type' ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={editingProduct.type ?? ''}
                      onChange={(e) => handleFieldChange('type', e.target.value, 'text')}
                      className="h-11 flex-1 rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-3 text-body-md outline-none focus:bg-jds-surface-container-lowest focus:border-jds-secondary transition-all"
                    >
                      <option value="">Select Category</option>
                      {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="h-11 w-11 flex items-center justify-center rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 hover:bg-jds-primary/10 hover:border-jds-primary hover:text-jds-primary text-jds-on-surface-variant transition-all shrink-0"
                      title="Add New Category"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <input
                    type={f.type}
                    value={editingProduct[f.key] ?? ''}
                    onChange={(e) => handleFieldChange(f.key, e.target.value, f.type)}
                    className={`h-11 w-full rounded-lg border bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:bg-jds-surface-container-lowest transition-all ${
                      validationErrors[f.key]
                        ? 'border-jds-error focus:border-jds-error focus:ring-1 focus:ring-jds-error/20'
                        : 'border-jds-outline-variant/30 focus:border-jds-secondary'
                    }`}
                  />
                )}
                {validationErrors[f.key] && (
                  <p className="text-label-sm text-jds-error font-medium">{validationErrors[f.key]}</p>
                )}
              </div>
            ))}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-label-sm font-bold text-jds-on-surface-variant/80">Product Image</label>
              <div className="flex items-center gap-3">
                {editingProduct.image_url ? (
                  <img
                    src={editingProduct.image_url}
                    alt="Product preview"
                    className="h-11 w-11 rounded-lg object-contain bg-black/5 border border-jds-outline-variant/30 shrink-0"
                    onError={(e) => {
                      e.target.onerror = null
                      e.target.src = 'https://placehold.co/100x100?text=None'
                    }}
                  />
                ) : (
                  <div className="h-11 w-11 rounded-lg bg-jds-surface-container-low/50 border border-jds-outline-variant/30 flex items-center justify-center text-jds-on-surface-variant/40 shrink-0">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                )}
                <input
                  type="text"
                  value={editingProduct.image_url ?? ''}
                  onChange={(e) => handleFieldChange('image_url', e.target.value, 'text')}
                  placeholder="Paste image link or upload new..."
                  className="h-11 flex-1 rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-xs font-mono outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
                />
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  onChange={handleEditImageUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={editingImageUploading}
                  onClick={() => editFileInputRef.current?.click()}
                  className="h-11 px-3 text-xs gap-1.5 shrink-0 border-jds-outline-variant"
                >
                  {editingImageUploading ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  Upload
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-label-sm font-bold text-jds-on-surface-variant/80">In Stock?</label>
              <select value={editingProduct.in_stock ? 'true' : 'false'} onChange={(e) => setEditingProduct({ ...editingProduct, in_stock: e.target.value === 'true' })} className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all">
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
          <div className="flex gap-4 pt-4 border-t border-jds-outline-variant/20">
            <Button onClick={handleEditSave} className="bg-jds-primary text-jds-on-primary px-8">Save Changes</Button>
            <Button variant="outline" onClick={() => setEditingProduct(null)} className="border-jds-outline-variant text-jds-on-surface-variant">Cancel</Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-jds-surface-container-low/10">
              <TableRow>
                <TableHead className="w-14 text-jds-on-surface-variant font-bold">Image</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Product</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Category</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Power</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Waterproof</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Material</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Battery</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Status</TableHead>
                <TableHead className="text-right text-jds-on-surface-variant font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-16 text-body-md text-jds-on-surface-variant/50">No matching products found.</TableCell></TableRow>
              ) : filtered.map((p) => (
                <TableRow key={p.id} className="hover:bg-jds-surface-container-low/5 transition-colors">
                  <TableCell className="w-14 py-2">
                    <img
                      src={p.image_url || 'https://placehold.co/80x80?text=None'}
                      alt={p.name}
                      className="h-10 w-10 rounded-lg object-contain bg-black/5 border border-jds-outline-variant/20 p-0.5"
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = 'https://placehold.co/80x80?text=None'
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-bold text-jds-on-surface max-w-[200px] truncate">{p.name}</TableCell>
                  <TableCell className="text-jds-on-surface-variant text-label-sm">{p.type}</TableCell>
                  <TableCell className="text-jds-on-surface font-medium">{p.watt}W</TableCell>
                  <TableCell className="text-jds-on-surface-variant">{p.waterproof_grade || '—'}</TableCell>
                  <TableCell className="text-jds-on-surface-variant text-label-sm max-w-[150px] truncate">{p.material || '—'}</TableCell>
                  <TableCell className="text-jds-on-surface-variant text-label-sm max-w-[150px] truncate">{p.battery || '—'}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-label-sm font-bold uppercase ${p.in_stock ? 'bg-jds-secondary-container/10 text-jds-secondary' : 'bg-jds-error-container/10 text-jds-error'}`}>
                      {p.in_stock ? 'In Stock' : 'Out'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingProduct({ ...p }); setValidationErrors({}); }} className="h-9 w-9 text-jds-secondary hover:bg-jds-secondary-container/10"><Pencil className="h-4 w-4" /></Button>
                      {role === 'admin' && <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="h-9 w-9 text-jds-error hover:bg-jds-error-container/10"><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoryAdded={(newCat) => {
          setCategories(prev => Array.from(new Set([...prev, newCat])))
          if (editingProduct) {
            handleFieldChange('type', newCat, 'text')
          }
        }}
        onCategoriesChanged={(names) => {
          if (names && names.length > 0) {
            setCategories(names)
          }
          fetchProducts()
        }}
      />
    </div>
  )
}
