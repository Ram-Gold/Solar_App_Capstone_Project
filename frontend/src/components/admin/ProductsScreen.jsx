import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Button } from '../ui/button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Image as ImageIcon,
  Tag,
  AlertTriangle,
  AlertCircle,
  Package,
  Boxes,
  Minus,
  Check,
  X,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import CategoryModal from './CategoryModal'
import RecordSaleModal from './RecordSaleModal'
import { fetchCategoriesWithCounts, DEFAULT_CATEGORIES } from '../../lib/categories'
import {
  getStockQuantity,
  getStockTier,
  sortProductsByStockPriority,
  getStockBadgeConfig,
  SORT_OPTIONS,
} from '../../lib/inventoryUtils'

const EDIT_FIELDS = [
  { key: 'name', label: 'Product Name', type: 'text' },
  { key: 'type', label: 'Category Type', type: 'text' },
  { key: 'price_range', label: 'Price Range', type: 'text' },
  { key: 'stock_quantity', label: 'Stock Quantity (Units)', type: 'number' },
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
  { key: 'default_warranty_months', label: 'Warranty (Months)', type: 'number' },
  { key: 'recommended_usage', label: 'Recommended Usage', type: 'text' },
  { key: 'ideal_location', label: 'Ideal Location', type: 'text' },
]

export default function ProductsScreen({ onNavigate }) {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [powerFilter, setPowerFilter] = useState('All Power')
  const [stockFilter, setStockFilter] = useState('All Stock')
  const [sortOrder, setSortOrder] = useState('stock_priority')
  const [editingProduct, setEditingProduct] = useState(null)
  const [savingProduct, setSavingProduct] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [editingImageUploading, setEditingImageUploading] = useState(false)
  const editFileInputRef = useRef(null)
  const { role } = useAuth()

  // Quick Restock State
  const [quickRestockItem, setQuickRestockItem] = useState(null)
  const [quickQuantity, setQuickQuantity] = useState(0)
  const [updatingStock, setUpdatingStock] = useState(false)

  // Manual Quick Sale State
  const [saleModalProduct, setSaleModalProduct] = useState(null)

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (editingProduct && !savingProduct) {
          setEditingProduct(null)
          setValidationErrors({})
        } else if (quickRestockItem && !updatingStock) {
          setQuickRestockItem(null)
        } else if (saleModalProduct) {
          setSaleModalProduct(null)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editingProduct, savingProduct, quickRestockItem, updatingStock, saleModalProduct])

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
    setLoading(true)
    try {
      const { data, error } = await supabase.from('products').select('*').order('id')
      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      console.warn('Failed to load products:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) setProducts(products.filter(p => p.id !== id))
  }

  const handleOpenEditProduct = (product) => {
    setEditingProduct({
      ...product,
      stock_quantity: getStockQuantity(product),
    })
    setValidationErrors({})
  }

  const handleEditSave = async () => {
    if (!editingProduct) return
    
    // Validate watt
    const wattVal = editingProduct.watt
    if (wattVal === '' || wattVal === null || wattVal === undefined || isNaN(Number(wattVal)) || Number(wattVal) <= 0) {
      setValidationErrors(prev => ({ ...prev, watt: 'Power must be a positive number' }))
      return
    }

    setSavingProduct(true)
    try {
      const { id, ...rest } = editingProduct
      delete rest.embedding

      // Synchronize stock_quantity and in_stock
      const parsedQty = rest.stock_quantity !== undefined && rest.stock_quantity !== ''
        ? Math.max(0, Number(rest.stock_quantity))
        : (rest.in_stock ? 10 : 0)

      rest.stock_quantity = parsedQty
      rest.in_stock = parsedQty > 0

      const { data, error } = await supabase
        .from('products')
        .update(rest)
        .eq('id', id)
        .select()

      if (error) throw error

      const updated = data && data.length > 0
        ? data[0]
        : { ...editingProduct, stock_quantity: parsedQty, in_stock: parsedQty > 0 }

      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p))
      setEditingProduct(null)
      setValidationErrors({})
    } catch (err) {
      console.error('Failed to save product:', err)
      alert(`Failed to save product: ${err.message}`)
    } finally {
      setSavingProduct(false)
    }
  }

  const handleFieldChange = (key, value, type) => {
    let finalVal = value
    if (type === 'number') {
      finalVal = value === '' ? '' : Number(value)
    }
    
    setEditingProduct(prev => {
      const updated = { ...prev, [key]: finalVal }
      if (key === 'stock_quantity') {
        const num = finalVal === '' ? 0 : Number(finalVal)
        updated.in_stock = num > 0
      }
      return updated
    })

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

  // Quick Restock Handler
  const handleOpenQuickRestock = (product) => {
    setQuickRestockItem(product)
    setQuickQuantity(getStockQuantity(product))
  }

  const handleQuickRestockSave = async () => {
    if (!quickRestockItem) return
    setUpdatingStock(true)
    try {
      const newQty = Math.max(0, Number(quickQuantity) || 0)
      const newInStock = newQty > 0

      const { data, error } = await supabase
        .from('products')
        .update({ stock_quantity: newQty, in_stock: newInStock })
        .eq('id', quickRestockItem.id)
        .select()

      if (error) throw error

      const updated = data && data.length > 0
        ? data[0]
        : { ...quickRestockItem, stock_quantity: newQty, in_stock: newInStock }

      setProducts(prev =>
        prev.map(p =>
          p.id === quickRestockItem.id
            ? { ...p, ...updated, stock_quantity: newQty, in_stock: newInStock }
            : p
        )
      )
      setQuickRestockItem(null)
    } catch (err) {
      console.error('Quick restock failed:', err)
      alert(`Failed to update stock quantity: ${err.message}`)
    } finally {
      setUpdatingStock(false)
    }
  }

  const types = ['All Types', ...new Set([...categories, ...products.map(p => p.type).filter(Boolean)])]

  const outOfStockCount = products.filter(p => getStockTier(p) === 'out').length
  const lowStockCount = products.filter(p => getStockTier(p) === 'low').length

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

    const tier = getStockTier(p)
    let matchesStock = true
    if (stockFilter === 'Attention Needed (Low & Out)' || stockFilter === 'attention') {
      matchesStock = tier === 'out' || tier === 'low'
    } else if (stockFilter === 'Out of Stock (0 units)' || stockFilter === 'out') {
      matchesStock = tier === 'out'
    } else if (stockFilter === 'Low Stock (1-5 units)' || stockFilter === 'low') {
      matchesStock = tier === 'low'
    } else if (stockFilter === 'In Stock (> 5 units)' || stockFilter === 'in_stock') {
      matchesStock = tier !== 'out'
    }

    return s && (typeFilter === 'All Types' || p.type === typeFilter) && matchesPower && matchesStock
  })

  // Sort based on sortOrder (defaults to 'stock_priority' - Out of Stock first with newest secondary)
  const prioritizedFiltered = (() => {
    if (sortOrder === 'stock_priority') {
      return sortProductsByStockPriority(filtered)
    }
    if (sortOrder === 'newest') {
      return [...filtered].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))
    }
    if (sortOrder === 'sales') {
      return [...filtered].sort((a, b) => (Number(b.sales) || 0) - (Number(a.sales) || 0))
    }
    if (sortOrder === 'watt_desc') {
      return [...filtered].sort((a, b) => (Number(b.watt) || 0) - (Number(a.watt) || 0))
    }
    if (sortOrder === 'watt_asc') {
      return [...filtered].sort((a, b) => (Number(a.watt) || 0) - (Number(b.watt) || 0))
    }
    return sortProductsByStockPriority(filtered)
  })()

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground font-inter">Loading products...</div>

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
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

      {/* Stock Attention Bar */}
      {(outOfStockCount > 0 || lowStockCount > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-body-sm font-bold text-jds-on-surface">Inventory Status Alert</p>
              <p className="text-label-sm text-jds-on-surface-variant">
                {outOfStockCount} out of stock and {lowStockCount} low stock item(s) are prioritized at the top of the list.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStockFilter(stockFilter === 'Attention Needed (Low & Out)' ? 'All Stock' : 'Attention Needed (Low & Out)')}
              className={`px-3 py-1.5 rounded-lg text-label-sm font-semibold transition-all ${
                stockFilter === 'Attention Needed (Low & Out)'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-jds-surface-container-lowest border border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10'
              }`}
            >
              {stockFilter === 'Attention Needed (Low & Out)' ? 'Clear Filter' : 'Filter Attention Items'}
            </button>
          </div>
        </div>
      )}

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

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor="productsStockFilter" className="text-label-sm font-bold text-jds-on-surface-variant/70 uppercase tracking-wider">Stock:</label>
            <select
              id="productsStockFilter"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="h-10 w-full sm:w-auto rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-lowest px-4 text-body-md outline-none focus:border-jds-secondary transition-all"
            >
              <option value="All Stock">All Stock Levels</option>
              <option value="Attention Needed (Low & Out)">Attention Needed (Low & Out)</option>
              <option value="Out of Stock (0 units)">Out of Stock (0)</option>
              {lowStockCount > 0 && <option value="Low Stock (1-5 units)">Low Stock (&le; 5 units)</option>}
              <option value="In Stock (> 5 units)">In Stock (&gt; 5 units)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor="productsSortOrder" className="text-label-sm font-bold text-jds-on-surface-variant/70 uppercase tracking-wider whitespace-nowrap">Sort:</label>
            <select
              id="productsSortOrder"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="h-10 w-full sm:w-auto rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-lowest px-3 py-1.5 text-body-sm font-medium text-jds-on-surface outline-none focus:border-jds-secondary transition-all"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {(search || typeFilter !== 'All Types' || powerFilter !== 'All Power' || stockFilter !== 'All Stock' || sortOrder !== 'stock_priority') && (
            <button
              onClick={() => {
                setSearch('')
                setTypeFilter('All Types')
                setPowerFilter('All Power')
                setStockFilter('All Stock')
                setSortOrder('stock_priority')
              }}
              className="h-10 px-3.5 rounded-lg border border-jds-outline-variant/30 text-jds-on-surface-variant hover:text-jds-primary hover:border-jds-primary text-label-sm font-semibold flex items-center gap-1.5 transition-colors shrink-0"
              title="Reset all filters and sorting"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
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


      {/* Products Catalog Table */}
      <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest overflow-hidden shadow-sm">
        <div className="border-b border-jds-outline-variant/20 px-6 py-3.5 bg-jds-surface-container-low/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-label-md text-jds-on-surface-variant">
          <div>
            Showing <span className="font-bold text-jds-on-surface">{prioritizedFiltered.length}</span> of{' '}
            <span className="font-bold text-jds-on-surface">{products.length}</span> products
            {prioritizedFiltered.length !== products.length && (
              <span className="text-xs text-jds-on-surface-variant/70 ml-1.5 font-normal">
                (filtered)
              </span>
            )}
          </div>
          <div className="text-xs text-jds-on-surface-variant/70 font-medium">
            Sorted by:{' '}
            <span className="font-semibold text-jds-primary">
              {SORT_OPTIONS.find((o) => o.id === sortOrder)?.label || sortOrder}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-jds-surface-container-low/10">
              <TableRow>
                <TableHead className="w-14 text-jds-on-surface-variant font-bold">Image</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Product</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Category</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Power</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Sales</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Stock Units</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Inventory Status</TableHead>
                <TableHead className="text-right text-jds-on-surface-variant font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prioritizedFiltered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16 text-body-md text-jds-on-surface-variant/50">
                    No matching products found.
                  </TableCell>
                </TableRow>
              ) : (
                prioritizedFiltered.map((p) => {
                  const badge = getStockBadgeConfig(p)
                  return (
                    <TableRow
                      key={p.id}
                      className={`hover:bg-jds-surface-container-low/10 transition-colors ${badge.rowBorderClass} ${badge.rowBgClass}`}
                    >
                      <TableCell className="w-14 py-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditProduct(p)}
                          title="Click to edit product details"
                          className="group/img block rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-jds-primary/40 transition-transform active:scale-95"
                        >
                          <img
                            src={p.image_url || 'https://placehold.co/80x80?text=None'}
                            alt={p.name}
                            className="h-10 w-10 rounded-lg object-contain bg-black/5 border border-jds-outline-variant/20 p-0.5 group-hover/img:border-jds-primary transition-colors"
                            onError={(e) => {
                              e.target.onerror = null
                              e.target.src = 'https://placehold.co/80x80?text=None'
                            }}
                          />
                        </button>
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <button
                          type="button"
                          onClick={() => handleOpenEditProduct(p)}
                          title="Click to edit product details"
                          className="text-left font-bold text-jds-on-surface truncate hover:text-jds-primary transition-colors focus:outline-none focus:underline group/title flex items-center gap-1.5 w-full cursor-pointer"
                        >
                          <span className="truncate">{p.name}</span>
                          <Pencil className="h-3.5 w-3.5 opacity-0 group-hover/title:opacity-80 text-jds-primary shrink-0 transition-opacity" />
                        </button>
                      </TableCell>
                      <TableCell className="text-jds-on-surface-variant text-label-sm">{p.type}</TableCell>
                      <TableCell className="text-jds-on-surface font-medium">{p.watt}W</TableCell>
                      <TableCell className="text-jds-on-surface-variant">{p.sales || 0}</TableCell>
                      <TableCell>
                        <span className="font-mono text-body-sm font-semibold text-jds-on-surface">
                          {badge.quantity} unit{badge.quantity === 1 ? '' : 's'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-label-sm uppercase tracking-wide ${badge.badgeClass}`}
                        >
                          {badge.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            title={badge.quantity === 0 ? "Out of Stock - Cannot record sale" : "Record Customer Sale (-Stock, +Sales)"}
                            disabled={badge.quantity === 0}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSaleModalProduct(p)
                            }}
                            className="h-9 w-9 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <ShoppingBag className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Quick Adjust Stock"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenQuickRestock(p)
                            }}
                            className="h-9 w-9 text-jds-primary hover:bg-jds-primary/10"
                          >
                            <Boxes className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit Product Details"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenEditProduct(p)
                            }}
                            className="h-9 w-9 text-jds-secondary hover:bg-jds-secondary-container/10"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {role === 'admin' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete Product"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(p.id)
                              }}
                              className="h-9 w-9 text-jds-error hover:bg-jds-error-container/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Product Details Modal Dialog */}
      {editingProduct && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingProduct) {
              setEditingProduct(null)
              setValidationErrors({})
            }
          }}
        >
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-jds-outline-variant/30 bg-jds-surface shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-jds-outline-variant/20 px-6 py-4 bg-jds-surface-container-low/30 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-jds-primary/10 text-jds-primary">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-body-lg font-bold text-jds-on-surface">Edit Product Details</h3>
                  <p className="text-label-sm text-jds-on-surface-variant font-medium">
                    ID: <span className="font-mono font-semibold text-jds-on-surface">{editingProduct.id}</span>
                    {editingProduct.name && ` — ${editingProduct.name}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={savingProduct}
                onClick={() => {
                  setEditingProduct(null)
                  setValidationErrors({})
                }}
                className="rounded-lg p-1.5 text-jds-on-surface-variant/60 hover:bg-jds-surface-container-high hover:text-jds-on-surface transition-colors disabled:opacity-50"
                title="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto p-6 space-y-6 flex-1 max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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

                {/* Product Image Section */}
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

                {/* In Stock Toggle */}
                <div className="space-y-1.5">
                  <label className="text-label-sm font-bold text-jds-on-surface-variant/80">In Stock?</label>
                  <select 
                    value={editingProduct.in_stock ? 'true' : 'false'} 
                    onChange={(e) => {
                      const isInStock = e.target.value === 'true'
                      setEditingProduct(prev => {
                        const currentQty = Number(prev.stock_quantity) || 0
                        return {
                          ...prev,
                          in_stock: isInStock,
                          stock_quantity: !isInStock ? 0 : (currentQty > 0 ? currentQty : 10)
                        }
                      })
                    }} 
                    className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-jds-outline-variant/20 px-6 py-4 bg-jds-surface-container-low/20 shrink-0">
              <div className="text-label-sm text-jds-on-surface-variant">
                {validationErrors.watt && (
                  <span className="text-jds-error font-medium flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    {validationErrors.watt}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  type="button"
                  variant="outline" 
                  disabled={savingProduct}
                  onClick={() => {
                    setEditingProduct(null)
                    setValidationErrors({})
                  }} 
                  className="border-jds-outline-variant text-jds-on-surface-variant hover:bg-jds-surface-container-high h-11 px-5"
                >
                  Cancel
                </Button>
                <Button 
                  type="button"
                  onClick={handleEditSave} 
                  disabled={savingProduct}
                  className="bg-jds-primary text-jds-on-primary font-bold px-7 h-11"
                >
                  {savingProduct ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      <span>Saving...</span>
                    </div>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Restock Modal Dialog */}
      {quickRestockItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !updatingStock) {
              setQuickRestockItem(null)
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-jds-outline-variant/30 bg-jds-surface p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-jds-outline-variant/20 pb-4">
              <div>
                <h3 className="text-body-lg font-bold text-jds-on-surface">Quick Stock Adjustment</h3>
                <p className="text-label-sm text-jds-on-surface-variant font-medium mt-0.5 line-clamp-1">{quickRestockItem.name}</p>
              </div>
              <button
                type="button"
                disabled={updatingStock}
                onClick={() => setQuickRestockItem(null)}
                className="rounded-lg p-1 text-jds-on-surface-variant/60 hover:bg-jds-surface-container-high hover:text-jds-on-surface transition-colors disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-jds-surface-container-low/40 p-3 border border-jds-outline-variant/20">
                <span className="text-label-sm font-semibold text-jds-on-surface-variant">Current Status</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-label-sm uppercase ${getStockBadgeConfig({ ...quickRestockItem, stock_quantity: quickQuantity }).badgeClass}`}>
                  {getStockBadgeConfig({ ...quickRestockItem, stock_quantity: quickQuantity }).label}
                </span>
              </div>

              {/* Quantity Stepper Input */}
              <div className="space-y-2">
                <label className="text-label-sm font-bold uppercase tracking-wider text-jds-on-surface-variant/80">
                  Units in Inventory
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuickQuantity((prev) => Math.max(0, Number(prev || 0) - 1))}
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/30 text-jds-on-surface hover:bg-jds-surface-container-high active:scale-95 transition-all"
                  >
                    <Minus className="h-5 w-5" />
                  </button>

                  <input
                    type="number"
                    min="0"
                    value={quickQuantity}
                    onChange={(e) => setQuickQuantity(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                    className="h-12 flex-1 rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-center font-mono text-headline-sm font-bold text-jds-on-surface outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
                  />

                  <button
                    type="button"
                    onClick={() => setQuickQuantity((prev) => Number(prev || 0) + 1)}
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/30 text-jds-on-surface hover:bg-jds-surface-container-high active:scale-95 transition-all"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <label className="text-label-sm font-medium text-jds-on-surface-variant/70">Quick Adjustment Presets</label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickQuantity(0)}
                    className="rounded-lg border border-jds-error/30 bg-jds-error-container/10 py-1.5 text-label-sm font-bold text-jds-error hover:bg-jds-error-container/20 transition-all"
                  >
                    Set 0
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickQuantity((prev) => Number(prev || 0) + 5)}
                    className="rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/30 py-1.5 text-label-sm font-semibold text-jds-on-surface hover:bg-jds-surface-container-high transition-all"
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickQuantity((prev) => Number(prev || 0) + 10)}
                    className="rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/30 py-1.5 text-label-sm font-semibold text-jds-on-surface hover:bg-jds-surface-container-high transition-all"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickQuantity((prev) => Number(prev || 0) + 25)}
                    className="rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/30 py-1.5 text-label-sm font-semibold text-jds-on-surface hover:bg-jds-surface-container-high transition-all"
                  >
                    +25
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-jds-outline-variant/20">
              <Button
                type="button"
                variant="outline"
                disabled={updatingStock}
                onClick={() => setQuickRestockItem(null)}
                className="flex-1 border-jds-outline-variant text-jds-on-surface-variant h-11"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={updatingStock}
                onClick={handleQuickRestockSave}
                className="flex-1 bg-jds-primary text-jds-on-primary font-bold h-11"
              >
                {updatingStock ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Updating...
                  </div>
                ) : (
                  'Save Stock'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

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

      <RecordSaleModal
        product={saleModalProduct}
        onClose={() => setSaleModalProduct(null)}
        onSaleSuccess={(updated) => {
          setProducts((prev) =>
            prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
          )
        }}
      />
    </div>
  )
}

