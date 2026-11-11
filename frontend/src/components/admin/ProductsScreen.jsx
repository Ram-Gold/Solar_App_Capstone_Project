/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState, useRef, useCallback } from 'react'
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
  X,
  RotateCcw,
  ShoppingBag,
  ArrowRight,
  Save,
  List,
  LayoutGrid,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import CategoryModal from './CategoryModal'
import RecordSaleModal from './RecordSaleModal'
import AdminProductCard from './AdminProductCard'
import { fetchCategoriesWithCounts, DEFAULT_CATEGORIES } from '../../lib/categories'
import {
  getStockQuantity,
  getStockTier,
  sortProductsByStockPriority,
  getStockBadgeConfig,
  SORT_OPTIONS,
} from '../../lib/inventoryUtils'
import { sanitizeText, sanitizeNumber } from '../../lib/sanitize.js'
import useModalBehavior from '../../hooks/useModalBehavior'

export const EDIT_FIELDS = [
  { key: 'name', label: 'Product Name', type: 'text', group: 'general' },
  { key: 'type', label: 'Category Type', type: 'text', group: 'general' },
  { key: 'price_range', label: 'Price Range', type: 'text', group: 'general' },
  { key: 'recommended_usage', label: 'Recommended Usage', type: 'text', group: 'general' },
  { key: 'ideal_location', label: 'Ideal Location', type: 'text', group: 'general' },
  { key: 'place_of_use', label: 'Place of Use / Recommended Sites', type: 'text', group: 'general' },

  { key: 'watt', label: 'Power (Watts)', type: 'number', group: 'power' },
  { key: 'voltage', label: 'Operating Voltage', type: 'text', group: 'power' },
  { key: 'lumens', label: 'Luminous Flux (Lumens)', type: 'text', group: 'power' },
  { key: 'color_temperature', label: 'Color Temperature', type: 'text', group: 'power' },
  { key: 'beaming_angle', label: 'Beaming Angle', type: 'text', group: 'power' },
  { key: 'solar_panel', label: 'Solar Panel', type: 'text', group: 'power' },
  { key: 'battery', label: 'Battery Spec', type: 'text', group: 'power' },
  { key: 'charging_time', label: 'Charging Time', type: 'text', group: 'power' },
  { key: 'charging_type', label: 'Charging Type', type: 'text', group: 'power' },
  { key: 'smd_lamp_beads', label: 'SMD Lamp Beads', type: 'text', group: 'power' },
  { key: 'lighting_time', label: 'Lighting Time', type: 'text', group: 'power' },

  { key: 'size', label: 'Size / Dimensions', type: 'text', group: 'physical' },
  { key: 'material', label: 'Material', type: 'text', group: 'physical' },
  { key: 'lamp_body_color', label: 'Lamp Body Color', type: 'text', group: 'physical' },
  { key: 'waterproof_grade', label: 'Waterproof Grade', type: 'text', group: 'physical' },
  { key: 'method_control', label: 'Control Method', type: 'text', group: 'physical' },

  { key: 'stock_quantity', label: 'Stock Quantity (Units)', type: 'number', group: 'inventory' },
  { key: 'sales', label: 'Total Sales', type: 'number', group: 'inventory' },
  { key: 'warranty', label: 'Warranty Terms', type: 'text', group: 'inventory' },
  { key: 'default_warranty_months', label: 'Warranty (Months)', type: 'number', group: 'inventory' },
  { key: 'life_span', label: 'Expected Lifespan', type: 'text', group: 'inventory' },
]

export const EDIT_FIELD_GROUPS = [
  { id: 'all', label: 'All Specifications' },
  { id: 'general', label: 'General & Media' },
  { id: 'power', label: 'Power & Electrical' },
  { id: 'physical', label: 'Physical & Ingress' },
  { id: 'inventory', label: 'Inventory & Warranty' },
]

export const getChangedFields = (orig, curr) => {
  if (!orig || !curr) return []
  const changes = []

  EDIT_FIELDS.forEach((f) => {
    const rawOld = orig[f.key]
    const rawNew = curr[f.key]

    if (f.type === 'number') {
      const oldNum = rawOld === '' || rawOld === null || rawOld === undefined ? null : Number(rawOld)
      const newNum = rawNew === '' || rawNew === null || rawNew === undefined ? null : Number(rawNew)
      if (oldNum !== newNum) {
        changes.push({
          key: f.key,
          label: f.label,
          oldValue: oldNum === null ? 'None' : oldNum.toString(),
          newValue: newNum === null ? 'None' : newNum.toString(),
        })
      }
    } else {
      const oldStr = (rawOld ?? '').toString().trim()
      const newStr = (rawNew ?? '').toString().trim()
      if (oldStr !== newStr) {
        changes.push({
          key: f.key,
          label: f.label,
          oldValue: oldStr || 'None',
          newValue: newStr || 'None',
        })
      }
    }
  })

  // Check image_url
  const oldImg = (orig.image_url ?? '').toString().trim()
  const newImg = (curr.image_url ?? '').toString().trim()
  if (oldImg !== newImg) {
    changes.push({
      key: 'image_url',
      label: 'Product Image',
      oldValue: oldImg ? 'Previous Image' : 'None',
      newValue: newImg ? 'New Image' : 'None',
      isImage: true,
      oldImgUrl: oldImg,
      newImgUrl: newImg,
    })
  }

  // Check in_stock
  const oldStock = Boolean(orig.in_stock)
  const newStock = Boolean(curr.in_stock)
  if (oldStock !== newStock) {
    changes.push({
      key: 'in_stock',
      label: 'Stock Availability Status',
      oldValue: oldStock ? 'In Stock' : 'Out of Stock',
      newValue: newStock ? 'In Stock' : 'Out of Stock',
    })
  }

  return changes
}

export default function ProductsScreen({ onNavigate }) {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState('cards') // 'table' | 'cards'

  // Filters & Sorting
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [powerFilter, setPowerFilter] = useState('All Power')
  const [stockFilter, setStockFilter] = useState('All Stock')
  const [sortOrder, setSortOrder] = useState('stock_priority')

  // Edit Product State
  const [editingProduct, setEditingProduct] = useState(null)
  const [originalProduct, setOriginalProduct] = useState(null)
  const [activeEditTab, setActiveEditTab] = useState('all')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingChanges, setPendingChanges] = useState([])
  const [savingProduct, setSavingProduct] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [editingImageUploading, setEditingImageUploading] = useState(false)
  const editFileInputRef = useRef(null)

  // Stock Adjustment State
  const [quickRestockItem, setQuickRestockItem] = useState(null)
  const [quickQuantity, setQuickQuantity] = useState(0)
  const [updatingStock, setUpdatingStock] = useState(false)

  // Sale Modal State
  const [saleModalProduct, setSaleModalProduct] = useState(null)

  // Direct Adjustment Confirmation State
  const [directConfirmAction, setDirectConfirmAction] = useState(null)
  const [directConfirmLoading, setDirectConfirmLoading] = useState(false)

  // Delete Confirmation State
  const [productToDelete, setProductToDelete] = useState(null)
  const [deletingProduct, setDeletingProduct] = useState(false)

  const anyProductModalOpen = Boolean(
    editingProduct ||
    quickRestockItem ||
    directConfirmAction ||
    productToDelete
  )

  useModalBehavior({
    isOpen: anyProductModalOpen,
    onClose: () => {
      if (productToDelete && !deletingProduct) setProductToDelete(null)
      else if (directConfirmAction && !directConfirmLoading) setDirectConfirmAction(null)
      else if (quickRestockItem && !updatingStock) setQuickRestockItem(null)
      else if (editingProduct && !savingProduct) handleCloseEdit()
    },
  })

  // Toast Notification State
  const [toast, setToast] = useState(null)
  const toastTimeoutRef = useRef(null)

  const { role } = useAuth()

  const showToast = useCallback((title, message, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToast({ id: Date.now(), title, message, type })
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null)
    }, 3800)
  }, [])

  // Modals & Reset Handlers declared before useEffect hooks
  const handleCloseEdit = useCallback(() => {
    setEditingProduct(null)
    setOriginalProduct(null)
    setShowConfirmModal(false)
    setPendingChanges([])
    setValidationErrors({})
  }, [])

  const loadCategories = useCallback(async () => {
    const { data } = await fetchCategoriesWithCounts()
    if (data && data.length > 0) {
      setCategories(data.map((c) => c.name))
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('id')
      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      console.warn('Failed to load products:', err)
      showToast('Data Error', 'Unable to fetch product catalog.', 'error')
    }
  }, [showToast])

  useEffect(() => {
    let ignore = false
    async function initializeCatalog() {
      try {
        const [prodRes, catRes] = await Promise.all([
          supabase.from('products').select('*').order('id'),
          fetchCategoriesWithCounts(),
        ])
        if (!ignore) {
          if (prodRes.data) setProducts(prodRes.data)
          if (catRes.data && catRes.data.length > 0) {
            setCategories(catRes.data.map((c) => c.name))
          }
        }
      } catch (err) {
        console.warn('Catalog initialization error:', err)
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    initializeCatalog()
    return () => {
      ignore = true
    }
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([fetchProducts(), loadCategories()])
      showToast('Catalog Synchronized', 'Latest inventory and sales figures retrieved.', 'info')
    } finally {
      setRefreshing(false)
    }
  }

  // Delete Handlers with Confirmation Dialog
  const handleInitiateDelete = (product) => {
    setProductToDelete(product)
  }

  const handleConfirmDelete = async () => {
    if (!productToDelete) return
    setDeletingProduct(true)
    try {
      const { error } = await supabase.from('products').delete().eq('id', productToDelete.id)
      if (error) throw error
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id))
      showToast('Product Removed', `${productToDelete.name} was permanently removed from the catalog.`, 'info')
      setProductToDelete(null)
    } catch (err) {
      console.error('Failed to delete product:', err)
      showToast('Deletion Failed', err.message || 'Failed to delete product.', 'error')
    } finally {
      setDeletingProduct(false)
    }
  }

  // Edit Handlers with Review & Confirmation Diff
  const handleOpenEditProduct = (product) => {
    const prepared = {
      ...product,
      stock_quantity: getStockQuantity(product),
    }
    setEditingProduct(prepared)
    setOriginalProduct(prepared)
    setActiveEditTab('all')
    setShowConfirmModal(false)
    setPendingChanges([])
    setValidationErrors({})
  }

  const handleInitiateSave = () => {
    if (!editingProduct) return

    // Validate watt
    const wattVal = editingProduct.watt
    if (
      wattVal === '' ||
      wattVal === null ||
      wattVal === undefined ||
      isNaN(Number(wattVal)) ||
      Number(wattVal) <= 0
    ) {
      setValidationErrors((prev) => ({ ...prev, watt: 'Power must be a positive number' }))
      setActiveEditTab('power')
      return
    }

    const changes = getChangedFields(originalProduct, editingProduct)
    if (changes.length === 0) {
      showToast('No Modifications', 'No specifications were changed for this product.', 'info')
      return
    }

    setPendingChanges(changes)
    setShowConfirmModal(true)
  }

  const handleEditSave = async () => {
    if (!editingProduct) return

    setSavingProduct(true)
    try {
      const { id, ...rest } = editingProduct
      delete rest.embedding

      // Sanitize product text fields
      if (rest.name) rest.name = sanitizeText(rest.name, { maxLength: 200 })
      if (rest.type) rest.type = sanitizeText(rest.type, { maxLength: 100 })
      if (rest.description) rest.description = sanitizeText(rest.description, { maxLength: 2000, allowMultiline: true })

      // Synchronize stock_quantity and in_stock
      const parsedQty =
        rest.stock_quantity !== undefined && rest.stock_quantity !== ''
          ? sanitizeNumber(rest.stock_quantity, { min: 0, integer: true, fallback: 0 })
          : rest.in_stock
            ? 10
            : 0

      rest.stock_quantity = parsedQty
      rest.in_stock = parsedQty > 0
      if (rest.sales !== undefined) {
        rest.sales = sanitizeNumber(rest.sales, { min: 0, integer: true, fallback: 0 })
      }

      const { data, error } = await supabase
        .from('products')
        .update(rest)
        .eq('id', id)
        .select()

      if (error) throw error

      const updated =
        data && data.length > 0
          ? data[0]
          : { ...editingProduct, stock_quantity: parsedQty, in_stock: parsedQty > 0 }

      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)))
      showToast('Product Updated', `Modifications saved for ${editingProduct.name || `Product #${id}`}.`, 'success')
      handleCloseEdit()
    } catch (err) {
      console.error('Failed to save product:', err)
      showToast('Save Error', err.message || 'Failed to save product modifications.', 'error')
    } finally {
      setSavingProduct(false)
    }
  }

  const handleFieldChange = (key, value, type) => {
    let finalVal = value
    if (type === 'number') {
      finalVal = value === '' ? '' : Number(value)
    }

    setEditingProduct((prev) => {
      const updated = { ...prev, [key]: finalVal }
      if (key === 'stock_quantity') {
        const num = finalVal === '' ? 0 : Number(finalVal)
        updated.in_stock = num > 0
      }
      return updated
    })

    if (key === 'watt') {
      if (value === '' || isNaN(Number(value)) || Number(value) <= 0) {
        setValidationErrors((prev) => ({ ...prev, watt: 'Power must be a positive number' }))
      } else {
        setValidationErrors((prev) => {
          const next = { ...prev }
          delete next.watt
          return next
        })
      }
    }
  }

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
        setEditingProduct((prev) => ({ ...prev, image_url: publicUrlData.publicUrl }))
        showToast('Image Uploaded', 'New product preview uploaded successfully.', 'info')
      }
    } catch (err) {
      console.error('Failed to upload image:', err)
      showToast('Upload Failed', err.message || 'Could not upload image.', 'error')
    } finally {
      setEditingImageUploading(false)
      if (editFileInputRef.current) editFileInputRef.current.value = ''
    }
  }

  // Quick Stock Adjustment Handlers
  const handleOpenStockStepper = (product, delta = 0) => {
    const currentQty = getStockQuantity(product)
    const targetQty = Math.max(0, currentQty + delta)
    setQuickRestockItem(product)
    setQuickQuantity(targetQty)
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

      const updated =
        data && data.length > 0
          ? data[0]
          : { ...quickRestockItem, stock_quantity: newQty, in_stock: newInStock }

      setProducts((prev) =>
        prev.map((p) =>
          p.id === quickRestockItem.id
            ? { ...p, ...updated, stock_quantity: newQty, in_stock: newInStock }
            : p
        )
      )
      showToast(
        'Inventory Updated',
        `${quickRestockItem.name} stock level confirmed at ${newQty} unit${newQty === 1 ? '' : 's'}.`,
        'success'
      )
      setQuickRestockItem(null)
    } catch (err) {
      console.error('Quick restock failed:', err)
      showToast('Stock Update Failed', err.message || 'Failed to update stock quantity.', 'error')
    } finally {
      setUpdatingStock(false)
    }
  }

  // Direct Button Handlers with Confirmation Modal
  const handleRequestDirectStockChange = (product, delta) => {
    const currentStock = getStockQuantity(product)
    const currentSales = Number(product.sales || 0)
    const targetStock = Math.max(0, currentStock + delta)

    if (delta < 0 && currentStock <= 0) return

    setDirectConfirmAction({
      product,
      type: 'stock',
      delta,
      currentStock,
      targetStock,
      currentSales,
      targetSales: currentSales,
      title: delta > 0 ? 'Confirm Stock Increase' : 'Confirm Stock Decrease',
      description: `Are you sure you want to ${delta > 0 ? 'increase' : 'decrease'} available stock of ${product.name} to ${targetStock} unit${targetStock === 1 ? '' : 's'}?`,
    })
  }

  const handleRequestDirectSaleChange = (product, delta) => {
    const currentStock = getStockQuantity(product)
    const currentSales = Number(product.sales || 0)
    const targetSales = Math.max(0, currentSales + delta)
    const targetStock = delta > 0 ? Math.max(0, currentStock - 1) : currentStock + 1

    if (delta > 0 && currentStock <= 0) return
    if (delta < 0 && currentSales <= 0) return

    setDirectConfirmAction({
      product,
      type: 'sale',
      delta,
      currentStock,
      targetStock,
      currentSales,
      targetSales,
      title: delta > 0 ? 'Confirm Record Sale' : 'Confirm Reverse Sale',
      description: delta > 0
        ? `Are you sure you want to record 1 sale for ${product.name}? This will decrease stock to ${targetStock} unit${targetStock === 1 ? '' : 's'}.`
        : `Are you sure you want to reverse 1 sale for ${product.name}? This will restore stock to ${targetStock} unit${targetStock === 1 ? '' : 's'}.`,
    })
  }

  const handleExecuteDirectConfirm = async () => {
    if (!directConfirmAction) return
    setDirectConfirmLoading(true)
    const { product, targetStock, targetSales } = directConfirmAction
    const targetInStock = targetStock > 0

    try {
      const { data, error } = await supabase
        .from('products')
        .update({
          stock_quantity: targetStock,
          sales: targetSales,
          in_stock: targetInStock,
        })
        .eq('id', product.id)
        .select()

      if (error) throw error

      const updated =
        data && data.length > 0
          ? data[0]
          : {
            ...product,
            stock_quantity: targetStock,
            sales: targetSales,
            in_stock: targetInStock,
          }

      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, ...updated } : p))
      )

      showToast(
        'Adjustment Confirmed',
        `${product.name} updated: Stock is ${targetStock}, Sales is ${targetSales}.`,
        'success'
      )
      setDirectConfirmAction(null)
    } catch (err) {
      console.error('Direct adjustment failed:', err)
      showToast('Adjustment Failed', err.message || 'Failed to update database.', 'error')
    } finally {
      setDirectConfirmLoading(false)
    }
  }

  // Calculated Metrics
  const totalProducts = products.length
  const outOfStockProducts = products.filter((p) => getStockTier(p) === 'out')
  const lowStockProducts = products.filter((p) => getStockTier(p) === 'low')
  const optimalStockProducts = products.filter((p) => getStockTier(p) === 'optimal')
  const totalWarehouseUnits = products.reduce((acc, p) => acc + getStockQuantity(p), 0)

  const types = ['All Types', ...new Set([...categories, ...products.map((p) => p.type).filter(Boolean)])]

  const filtered = products.filter((p) => {
    const s =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.type || '').toLowerCase().includes(search.toLowerCase()) ||
      String(p.watt || '').includes(search.trim())

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

  const isAnyFilterActive =
    search.trim() !== '' ||
    typeFilter !== 'All Types' ||
    powerFilter !== 'All Power' ||
    stockFilter !== 'All Stock' ||
    sortOrder !== 'stock_priority'

  const resetAllFilters = () => {
    setSearch('')
    setTypeFilter('All Types')
    setPowerFilter('All Power')
    setStockFilter('All Stock')
    setSortOrder('stock_priority')
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-jds-on-surface-variant font-inter">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-jds-primary border-t-transparent" />
          <p className="text-body-md font-medium">Loading inventory catalog...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 space-y-6">
      {/* Toast Notification Container */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-md max-w-md animate-in slide-in-from-bottom-5 duration-300 ${toast.type === 'error'
            ? 'border-jds-error/40 bg-jds-surface text-jds-error shadow-jds-error/10'
            : toast.type === 'info'
              ? 'border-jds-secondary/40 bg-jds-surface text-jds-on-surface shadow-jds-secondary/10'
              : 'border-emerald-500/40 bg-jds-surface text-jds-on-surface shadow-emerald-500/10'
            }`}
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === 'error' ? (
              <AlertTriangle className="h-5 w-5 text-jds-error" />
            ) : toast.type === 'info' ? (
              <AlertCircle className="h-5 w-5 text-jds-secondary" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <div className="flex-1 space-y-0.5">
            <p className="text-body-sm font-bold text-jds-on-surface">{toast.title}</p>
            <p className="text-label-sm text-jds-on-surface-variant leading-relaxed">{toast.message}</p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="p-1 rounded-lg text-jds-on-surface-variant hover:bg-jds-surface-container-high transition-colors shrink-0"
            title="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-headline-md font-bold text-jds-on-surface">Solar Inventory Catalog</h1>
            <span className="rounded-full bg-jds-surface-container-high px-3 py-1 font-mono text-label-sm font-bold text-jds-on-surface-variant border border-jds-outline-variant/30">
              {products.length} models
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-jds-outline-variant/40 bg-jds-surface text-jds-on-surface hover:bg-jds-surface-container-low h-10 px-3.5 gap-2 rounded-xl"
            title="Synchronize database records"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-jds-primary' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsCategoryModalOpen(true)}
            className="border-jds-outline-variant/40 bg-jds-surface text-jds-on-surface hover:bg-jds-surface-container-low hover:border-jds-primary hover:text-jds-primary rounded-xl px-4 gap-2 h-10 font-semibold shadow-sm transition-all"
          >
            <Tag className="h-4 w-4" />
            <span>Categories</span>
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-jds-primary/10 text-jds-primary text-[11px] font-bold">
              {categories.length}
            </span>
          </Button>

          <Button
            onClick={() => onNavigate('add-product')}
            className="bg-jds-primary text-jds-on-primary hover:opacity-90 rounded-xl px-5 h-10 gap-2 font-bold shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Equipment</span>
          </Button>
        </div>
      </div>

      {/* Interactive Inventory Health KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Products */}
        <button
          type="button"
          onClick={() => setStockFilter('All Stock')}
          className={`flex flex-col justify-between p-4 rounded-2xl border text-left transition-all ${stockFilter === 'All Stock'
            ? 'border-jds-primary bg-jds-primary/5 ring-2 ring-jds-primary/20 shadow-sm'
            : 'border-jds-outline-variant/30 bg-jds-surface-container-lowest hover:border-jds-outline-variant/60'
            }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-label-sm font-bold uppercase tracking-wider text-jds-on-surface-variant/70">
              Total Catalog
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-jds-surface-container text-jds-on-surface">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 space-y-0.5">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-jds-on-surface">
              {totalProducts}
            </div>
            <div className="text-label-sm text-jds-on-surface-variant font-medium">
              {totalWarehouseUnits} total warehouse units
            </div>
          </div>
        </button>

        {/* Optimal Stock */}
        <button
          type="button"
          onClick={() =>
            setStockFilter(stockFilter === 'In Stock (> 5 units)' ? 'All Stock' : 'In Stock (> 5 units)')
          }
          className={`flex flex-col justify-between p-4 rounded-2xl border text-left transition-all ${stockFilter === 'In Stock (> 5 units)'
            ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20 shadow-sm'
            : 'border-jds-outline-variant/30 bg-jds-surface-container-lowest hover:border-emerald-500/40'
            }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-label-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Optimal Stock
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 space-y-0.5">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-700 dark:text-emerald-400">
              {optimalStockProducts.length}
            </div>
            <div className="text-label-sm text-jds-on-surface-variant font-medium">
              &gt; 5 units available
            </div>
          </div>
        </button>

        {/* Low Stock Warning */}
        <button
          type="button"
          onClick={() =>
            setStockFilter(stockFilter === 'Low Stock (1-5 units)' ? 'All Stock' : 'Low Stock (1-5 units)')
          }
          className={`flex flex-col justify-between p-4 rounded-2xl border text-left transition-all ${stockFilter === 'Low Stock (1-5 units)'
            ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20 shadow-sm'
            : 'border-amber-500/30 bg-jds-surface-container-lowest hover:border-amber-500/60'
            }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-label-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Low Stock
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 space-y-0.5">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-700 dark:text-amber-400">
              {lowStockProducts.length}
            </div>
            <div className="text-label-sm text-jds-on-surface-variant font-medium">
              1 to 5 units remaining
            </div>
          </div>
        </button>

        {/* Out of Stock Critical */}
        <button
          type="button"
          onClick={() =>
            setStockFilter(stockFilter === 'Out of Stock (0 units)' ? 'All Stock' : 'Out of Stock (0 units)')
          }
          className={`flex flex-col justify-between p-4 rounded-2xl border text-left transition-all ${stockFilter === 'Out of Stock (0 units)'
            ? 'border-jds-error bg-jds-error/10 ring-2 ring-jds-error/20 shadow-sm'
            : 'border-jds-error/30 bg-jds-surface-container-lowest hover:border-jds-error/60'
            }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-label-sm font-bold uppercase tracking-wider text-jds-error">
              Out of Stock
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-jds-error-container/20 text-jds-error">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 space-y-0.5">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-jds-error">
              {outOfStockProducts.length}
            </div>
            <div className="text-label-sm text-jds-on-surface-variant font-medium">
              0 units available (Depleted)
            </div>
          </div>
        </button>
      </div>

      {/* Operational Control & Filtering Bar */}
      <div className="rounded-2xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest p-4 sm:p-5 shadow-sm space-y-4">
        {/* Top Controls: Search, Selects, and View Mode */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-jds-on-surface-variant/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, category, or watt..."
              className="h-11 w-full rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/20 pl-10 pr-9 text-body-md text-jds-on-surface outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-jds-on-surface-variant/50 hover:text-jds-on-surface transition-colors"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-11 w-full rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-3.5 text-body-md text-jds-on-surface outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Level Filter */}
          <div className="md:col-span-3">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="h-11 w-full rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-3.5 text-body-md text-jds-on-surface outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
            >
              <option value="All Stock">All Stock Levels ({totalProducts})</option>
              <option value="Attention Needed (Low & Out)">
                Attention Needed ({outOfStockProducts.length + lowStockProducts.length})
              </option>
              <option value="Out of Stock (0 units)">Out of Stock ({outOfStockProducts.length})</option>
              <option value="Low Stock (1-5 units)">Low Stock ({lowStockProducts.length})</option>
              <option value="In Stock (> 5 units)">Optimal Stock ({optimalStockProducts.length})</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="md:col-span-2 flex items-center justify-end gap-2">
            <div className="flex items-center rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/30 p-1 w-full justify-center sm:w-auto">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-sm font-bold transition-all ${viewMode === 'table'
                  ? 'bg-jds-surface text-jds-primary shadow-sm border border-jds-outline-variant/30'
                  : 'text-jds-on-surface-variant hover:text-jds-on-surface'
                  }`}
                title="Data Table View"
              >
                <List className="h-4 w-4" />
                <span className="text-xs">Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-sm font-bold transition-all ${viewMode === 'cards'
                  ? 'bg-jds-surface text-jds-primary shadow-sm border border-jds-outline-variant/30'
                  : 'text-jds-on-surface-variant hover:text-jds-on-surface'
                  }`}
                title="Visual Card Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="text-xs">Cards</span>
              </button>
            </div>
          </div>
        </div>

        {/* Second Row: Power Segmented Pills & Sort Order */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-jds-outline-variant/20">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-label-sm font-bold uppercase tracking-wider text-jds-on-surface-variant/70 mr-1">
              Power Output:
            </span>
            {[
              { label: 'All Power', value: 'All Power' },
              { label: '< 200W', value: 'Under 200W' },
              { label: '200W - 400W', value: '200W - 400W' },
              { label: '> 400W', value: 'Above 400W' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPowerFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-label-sm font-semibold transition-all ${powerFilter === opt.value
                  ? 'bg-jds-primary text-jds-on-primary shadow-sm'
                  : 'border border-jds-outline-variant/30 bg-jds-surface-container-low/20 text-jds-on-surface-variant hover:bg-jds-surface-container-high'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 self-end lg:self-auto">
            <div className="flex items-center gap-2">
              <label
                htmlFor="sortOrderSelect"
                className="text-label-sm font-bold uppercase tracking-wider text-jds-on-surface-variant/70 whitespace-nowrap"
              >
                Sort:
              </label>
              <select
                id="sortOrderSelect"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="h-9 rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-3 text-label-sm font-semibold text-jds-on-surface outline-none focus:border-jds-secondary transition-all"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {isAnyFilterActive && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="h-9 px-3 rounded-lg border border-jds-outline-variant/30 text-jds-on-surface-variant hover:text-jds-primary hover:border-jds-primary text-label-sm font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                title="Reset all search queries and active filters"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Header Status */}
      <div className="flex items-center justify-between text-label-md text-jds-on-surface-variant px-1">
        <div>
          Showing <span className="font-bold text-jds-on-surface">{prioritizedFiltered.length}</span> of{' '}
          <span className="font-bold text-jds-on-surface">{products.length}</span> catalog items
          {prioritizedFiltered.length !== products.length && (
            <span className="text-xs text-jds-on-surface-variant/70 ml-1.5 font-normal">
              (Filtered results)
            </span>
          )}
        </div>
        <div className="text-xs text-jds-on-surface-variant/80 font-medium">
          Priority: <span className="font-bold text-jds-primary">{SORT_OPTIONS.find((s) => s.id === sortOrder)?.label || sortOrder}</span>
        </div>
      </div>

      {/* Main View: Table View */}
      {viewMode === 'table' ? (
        <div className="rounded-2xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-jds-surface-container-low/30 border-b border-jds-outline-variant/20">
                <TableRow>
                  <TableHead className="w-16 text-jds-on-surface-variant font-bold text-xs uppercase tracking-wider">
                    Thumb
                  </TableHead>
                  <TableHead className="min-w-[220px] text-jds-on-surface-variant font-bold text-xs uppercase tracking-wider">
                    Equipment Details
                  </TableHead>
                  <TableHead className="text-jds-on-surface-variant font-bold text-xs uppercase tracking-wider">
                    Category
                  </TableHead>
                  <TableHead className="text-jds-on-surface-variant font-bold text-xs uppercase tracking-wider">
                    Power
                  </TableHead>
                  <TableHead className="min-w-[130px] text-jds-on-surface-variant font-bold text-xs uppercase tracking-wider">
                    Sales
                  </TableHead>
                  <TableHead className="min-w-[210px] text-jds-on-surface-variant font-bold text-xs uppercase tracking-wider">
                    Stock Quantity
                  </TableHead>
                  <TableHead className="text-jds-on-surface-variant font-bold text-xs uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="text-right text-jds-on-surface-variant font-bold text-xs uppercase tracking-wider pr-6">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prioritizedFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-20 text-body-md text-jds-on-surface-variant">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-jds-surface-container text-jds-on-surface-variant">
                          <Package className="h-6 w-6" />
                        </div>
                        <p className="font-bold text-jds-on-surface">No products match your current filters</p>
                        <p className="text-label-sm text-jds-on-surface-variant max-w-sm text-center">
                          Try adjusting your search criteria, category filters, or power ratings to view equipment.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetAllFilters}
                          className="mt-2 text-xs font-semibold border-jds-outline-variant"
                        >
                          Clear All Filters
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  prioritizedFiltered.map((p) => {
                    const badge = getStockBadgeConfig(p)
                    const stockQty = badge.quantity
                    return (
                      <TableRow
                        key={p.id}
                        className={`hover:bg-jds-surface-container-low/20 transition-colors ${badge.rowBorderClass} ${badge.rowBgClass}`}
                      >
                        {/* Thumbnail */}
                        <TableCell className="w-16 py-3">
                          <button
                            type="button"
                            onClick={() => handleOpenEditProduct(p)}
                            title="Click to edit equipment details"
                            className="group/img block rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-jds-primary/40 transition-transform active:scale-95"
                          >
                            <img
                              src={p.image_url || 'https://placehold.co/80x80?text=None'}
                              alt={p.name}
                              className="h-12 w-12 rounded-xl object-contain bg-black/5 border border-jds-outline-variant/30 p-1 group-hover/img:border-jds-primary transition-colors"
                              onError={(e) => {
                                e.target.onerror = null
                                e.target.src = 'https://placehold.co/80x80?text=None'
                              }}
                            />
                          </button>
                        </TableCell>

                        {/* Title and ID */}
                        <TableCell className="max-w-[260px] py-3">
                          <div className="space-y-0.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditProduct(p)}
                              title="Click to view and edit product"
                              className="text-left font-bold text-jds-on-surface hover:text-jds-primary transition-colors focus:outline-none group/title flex items-center gap-1.5 w-full cursor-pointer"
                            >
                              <span className="truncate">{p.name}</span>
                              <Pencil className="h-3 w-3 opacity-0 group-hover/title:opacity-80 text-jds-primary shrink-0 transition-opacity" />
                            </button>
                            <div className="flex items-center gap-2 text-xs text-jds-on-surface-variant font-mono">
                              <span>ID: {p.id}</span>
                              {p.price_range && (
                                <>
                                  <span>&bull;</span>
                                  <span className="text-jds-primary font-semibold">{p.price_range}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Category */}
                        <TableCell className="py-3 text-jds-on-surface-variant text-label-sm font-medium">
                          {p.type || 'Standard'}
                        </TableCell>

                        {/* Power */}
                        <TableCell className="py-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-jds-surface-container font-mono text-xs font-bold text-jds-on-surface border border-jds-outline-variant/20">
                            {p.watt}W
                          </span>
                        </TableCell>

                        {/* Sales + Direct Stepper */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={(p.sales || 0) <= 0}
                              onClick={() => handleRequestDirectSaleChange(p, -1)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-jds-outline-variant/40 bg-jds-surface-container-low/40 text-jds-on-surface hover:bg-jds-surface-container-high hover:border-jds-primary active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
                              title="Decrease sales by 1 (restores 1 stock)"
                              aria-label="Decrease sales"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setSaleModalProduct(p)}
                              className="px-2.5 py-1.5 rounded-lg border border-jds-outline-variant/40 bg-jds-surface hover:border-jds-primary transition-all font-mono text-xs font-bold text-jds-on-surface group/sale"
                              title="Click number to open Record Sale modal"
                            >
                              <span className="group-hover/sale:text-jds-primary transition-colors">
                                {p.sales || 0}
                              </span>
                            </button>

                            <button
                              type="button"
                              disabled={stockQty <= 0}
                              onClick={() => handleRequestDirectSaleChange(p, +1)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
                              title="Increase sales by 1 (deducts 1 stock)"
                              aria-label="Increase sales"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>

                        {/* Stock Units + Direct Stepper */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleRequestDirectStockChange(p, -1)}
                              disabled={stockQty <= 0}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-jds-outline-variant/40 bg-jds-surface-container-low/40 text-jds-on-surface hover:bg-jds-surface-container-high hover:border-jds-primary active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
                              title="Decrease stock by 1 unit"
                              aria-label="Decrease stock"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenStockStepper(p, 0)}
                              className="px-3 py-1.5 rounded-lg border border-jds-outline-variant/40 bg-jds-surface hover:border-jds-primary transition-all font-mono text-xs font-bold text-jds-on-surface group/qty"
                              title="Click number to open stock adjustment modal"
                            >
                              <span className="group-hover/qty:text-jds-primary transition-colors">
                                {stockQty} unit{stockQty === 1 ? '' : 's'}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRequestDirectStockChange(p, +1)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-jds-outline-variant/40 bg-jds-surface-container-low/40 text-jds-on-surface hover:bg-jds-surface-container-high hover:border-jds-primary active:scale-95 transition-all"
                              title="Increase stock by 1 unit"
                              aria-label="Increase stock"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>

                        {/* Status Badge */}
                        <TableCell className="py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold ${badge.badgeClass}`}
                          >
                            {badge.shortLabel}
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-3 text-right pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              title={
                                stockQty === 0
                                  ? 'Out of Stock - Cannot record sale'
                                  : 'Record Customer Sale (-Stock, +Sales)'
                              }
                              disabled={stockQty === 0}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSaleModalProduct(p)
                              }}
                              className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 disabled:opacity-30 disabled:pointer-events-none rounded-lg"
                            >
                              <ShoppingBag className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              title="Adjust Inventory Stock"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenStockStepper(p, 0)
                              }}
                              className="h-8 w-8 text-jds-primary hover:bg-jds-primary/10 rounded-lg"
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
                              className="h-8 w-8 text-jds-secondary hover:bg-jds-secondary-container/10 rounded-lg"
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
                                  handleInitiateDelete(p)
                                }}
                                className="h-8 w-8 text-jds-error hover:bg-jds-error-container/20 rounded-lg"
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
      ) : (
        /* Main View: Responsive Card Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {prioritizedFiltered.length === 0 ? (
            <div className="col-span-full py-16 text-center rounded-2xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest p-8 space-y-3">
              <Package className="h-10 w-10 mx-auto text-jds-on-surface-variant/50" />
              <p className="font-bold text-jds-on-surface">No products match your current filters</p>
              <Button variant="outline" size="sm" onClick={resetAllFilters} className="text-xs">
                Clear Filters
              </Button>
            </div>
          ) : (
            prioritizedFiltered.map((p) => (
              <AdminProductCard
                key={p.id}
                product={p}
                onOpenEdit={handleOpenEditProduct}
                onOpenStockStepper={handleOpenStockStepper}
                onOpenRecordSale={setSaleModalProduct}
                onRequestDirectStockChange={handleRequestDirectStockChange}
                onRequestDirectSaleChange={handleRequestDirectSaleChange}
                onInitiateDelete={handleInitiateDelete}
                showDelete={role === 'admin'}
              />
            ))
          )}
        </div>
      )}

      {/* QUICK STOCK ADJUSTMENT CONFIRMATION MODAL */}
      {quickRestockItem && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !updatingStock) {
              setQuickRestockItem(null)
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-jds-outline-variant/30 bg-jds-surface p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-jds-outline-variant/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-jds-primary/10 text-jds-primary">
                  <Boxes className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-body-lg font-bold text-jds-on-surface">Confirm Stock Adjustment</h3>
                  <p className="text-label-sm text-jds-on-surface-variant font-medium line-clamp-1">
                    {quickRestockItem.name} ({quickRestockItem.watt}W)
                  </p>
                </div>
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

            {/* Comparison Visualizer */}
            {(() => {
              const origQty = getStockQuantity(quickRestockItem)
              const newQty = Math.max(0, Number(quickQuantity) || 0)
              const delta = newQty - origQty
              const oldBadge = getStockBadgeConfig(quickRestockItem)
              const newBadge = getStockBadgeConfig({ ...quickRestockItem, stock_quantity: newQty })

              return (
                <div className="space-y-4">
                  <div className="rounded-xl border border-jds-outline-variant/25 bg-jds-surface-container-low/40 p-3.5 space-y-2.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-jds-on-surface-variant/70">
                      Inventory Level Shift
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-xs text-jds-on-surface-variant font-medium">Previous</span>
                        <div className="font-mono text-lg font-bold text-jds-on-surface">
                          {origQty} unit{origQty === 1 ? '' : 's'}
                        </div>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${oldBadge.badgeClass}`}>
                          {oldBadge.shortLabel}
                        </span>
                      </div>

                      <div className="flex flex-col items-center justify-center px-3">
                        <ArrowRight className="h-5 w-5 text-jds-on-surface-variant/40" />
                        <span
                          className={`font-mono text-xs font-bold mt-1 ${delta > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : delta < 0
                              ? 'text-jds-error'
                              : 'text-jds-on-surface-variant'
                            }`}
                        >
                          {delta > 0 ? `+${delta}` : delta === 0 ? 'No change' : `${delta}`}
                        </span>
                      </div>

                      <div className="space-y-1 text-right">
                        <span className="text-xs text-jds-on-surface-variant font-medium">Adjusted</span>
                        <div className="font-mono text-lg font-bold text-jds-primary">
                          {newQty} unit{newQty === 1 ? '' : 's'}
                        </div>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${newBadge.badgeClass}`}>
                          {newBadge.shortLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Stepper Input */}
                  <div className="space-y-2">
                    <label className="text-label-sm font-bold uppercase tracking-wider text-jds-on-surface-variant/80">
                      Target Available Inventory
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQuickQuantity((prev) => Math.max(0, Number(prev || 0) - 1))}
                        className="flex h-12 w-12 items-center justify-center rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/30 text-jds-on-surface hover:bg-jds-surface-container-high active:scale-95 transition-all"
                        title="Deduct 1 unit"
                      >
                        <Minus className="h-5 w-5" />
                      </button>

                      <input
                        type="number"
                        min="0"
                        value={quickQuantity}
                        onChange={(e) =>
                          setQuickQuantity(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))
                        }
                        className="h-12 flex-1 rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-center font-mono text-headline-sm font-bold text-jds-on-surface outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
                      />

                      <button
                        type="button"
                        onClick={() => setQuickQuantity((prev) => Number(prev || 0) + 1)}
                        className="flex h-12 w-12 items-center justify-center rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/30 text-jds-on-surface hover:bg-jds-surface-container-high active:scale-95 transition-all"
                        title="Add 1 unit"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Delta Presets */}
                  <div className="space-y-1.5">
                    <label className="text-label-sm font-medium text-jds-on-surface-variant/70">
                      Quick Adjustment Presets
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setQuickQuantity(0)}
                        className="rounded-lg border border-jds-error/30 bg-jds-error-container/10 py-1.5 text-xs font-bold text-jds-error hover:bg-jds-error-container/20 transition-all"
                      >
                        Set 0
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickQuantity((prev) => Math.max(0, Number(prev || 0) - 5))}
                        className="rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/30 py-1.5 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container-high transition-all"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickQuantity((prev) => Number(prev || 0) + 1)}
                        className="rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/30 py-1.5 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container-high transition-all"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickQuantity((prev) => Number(prev || 0) + 5)}
                        className="rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/30 py-1.5 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container-high transition-all"
                      >
                        +5
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickQuantity((prev) => Number(prev || 0) + 10)}
                        className="rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/30 py-1.5 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container-high transition-all"
                      >
                        +10
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-jds-outline-variant/20">
              <Button
                type="button"
                variant="outline"
                disabled={updatingStock}
                onClick={() => setQuickRestockItem(null)}
                className="flex-1 border-jds-outline-variant text-jds-on-surface-variant h-11 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={updatingStock}
                onClick={handleQuickRestockSave}
                className="flex-1 bg-jds-primary text-jds-on-primary font-bold h-11 rounded-xl"
              >
                {updatingStock ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span>Updating...</span>
                  </div>
                ) : (
                  'Confirm Stock Adjustment'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DIRECT BUTTON ADJUSTMENT CONFIRMATION MODAL */}
      {directConfirmAction && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !directConfirmLoading) {
              setDirectConfirmAction(null)
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-jds-outline-variant/30 bg-jds-surface p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-start justify-between border-b border-jds-outline-variant/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-jds-primary/10 text-jds-primary">
                  {directConfirmAction.type === 'stock' ? (
                    <Boxes className="h-4 w-4" />
                  ) : (
                    <ShoppingBag className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <h3 className="text-body-md font-bold text-jds-on-surface">
                    {directConfirmAction.title}
                  </h3>
                  <p className="text-xs text-jds-on-surface-variant line-clamp-1">
                    {directConfirmAction.product.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={directConfirmLoading}
                onClick={() => setDirectConfirmAction(null)}
                className="rounded-lg p-1 text-jds-on-surface-variant/60 hover:bg-jds-surface-container-high hover:text-jds-on-surface transition-colors disabled:opacity-50"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-jds-on-surface-variant leading-relaxed">
              {directConfirmAction.description}
            </p>

            <div className="rounded-xl border border-jds-outline-variant/20 bg-jds-surface-container-low/30 p-3 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-jds-on-surface-variant">Target Stock:</span>
                <span className="font-bold text-jds-on-surface">{directConfirmAction.targetStock} unit{directConfirmAction.targetStock === 1 ? '' : 's'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-jds-on-surface-variant">Target Sales:</span>
                <span className="font-bold text-jds-on-surface">{directConfirmAction.targetSales} unit{directConfirmAction.targetSales === 1 ? '' : 's'}</span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={directConfirmLoading}
                onClick={() => setDirectConfirmAction(null)}
                className="flex-1 border-jds-outline-variant text-jds-on-surface-variant h-10 rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={directConfirmLoading}
                onClick={handleExecuteDirectConfirm}
                className="flex-1 bg-jds-primary text-jds-on-primary font-bold h-10 rounded-xl text-xs"
              >
                {directConfirmLoading ? (
                  <div className="flex items-center gap-1.5">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span>Confirming...</span>
                  </div>
                ) : (
                  'Confirm'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {productToDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deletingProduct) {
              setProductToDelete(null)
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-jds-error/30 bg-jds-surface p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-jds-outline-variant/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-jds-error-container/30 text-jds-error">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-body-lg font-bold text-jds-on-surface">Delete Equipment</h3>
                  <p className="text-label-sm text-jds-error font-medium">Permanent Catalog Removal</p>
                </div>
              </div>
              <button
                type="button"
                disabled={deletingProduct}
                onClick={() => setProductToDelete(null)}
                className="rounded-lg p-1 text-jds-on-surface-variant/60 hover:bg-jds-surface-container-high hover:text-jds-on-surface transition-colors disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Product Summary Box */}
            <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/30 p-3.5 flex items-center gap-3">
              <img
                src={productToDelete.image_url || 'https://placehold.co/80x80?text=None'}
                alt={productToDelete.name}
                className="h-12 w-12 rounded-lg object-contain bg-black/5 border border-jds-outline-variant/20 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h5 className="font-bold text-jds-on-surface text-body-sm truncate">{productToDelete.name}</h5>
                <div className="flex items-center gap-2 text-xs text-jds-on-surface-variant font-mono">
                  <span>{productToDelete.type}</span>
                  <span>&bull;</span>
                  <span>{productToDelete.watt}W</span>
                  <span>&bull;</span>
                  <span>{getStockQuantity(productToDelete)} units</span>
                </div>
              </div>
            </div>

            {/* Warning Message */}
            <div className="rounded-xl border border-jds-error/30 bg-jds-error-container/10 p-3.5 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-jds-error shrink-0 mt-0.5" />
              <p className="text-xs text-jds-on-surface-variant leading-relaxed">
                This action is irreversible. The equipment record and catalog references will be permanently removed from the system.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-jds-outline-variant/20">
              <Button
                type="button"
                variant="outline"
                disabled={deletingProduct}
                onClick={() => setProductToDelete(null)}
                className="flex-1 border-jds-outline-variant text-jds-on-surface-variant h-11 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={deletingProduct}
                onClick={handleConfirmDelete}
                className="flex-1 bg-jds-error hover:bg-jds-error/90 text-jds-on-error font-bold h-11 rounded-xl gap-2"
              >
                {deletingProduct ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span>Deleting...</span>
                  </div>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT SPECIFICATIONS MODAL */}
      {editingProduct && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingProduct && !showConfirmModal) {
              handleCloseEdit()
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border border-jds-outline-variant/30 bg-jds-surface shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
          >
            {/* Inline Confirmation Diff Modal */}
            {showConfirmModal && (
              <div
                className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-150"
                onClick={(e) => {
                  if (e.target === e.currentTarget && !savingProduct) {
                    setShowConfirmModal(false)
                  }
                }}
              >
                <div className="w-full max-w-lg rounded-2xl border border-jds-outline-variant/30 bg-jds-surface shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
                  {/* Header */}
                  <div className="border-b border-jds-outline-variant/20 px-6 py-4 bg-jds-surface-container-low/40 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-jds-primary/10 text-jds-primary">
                        <Save className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-body-lg font-bold text-jds-on-surface">Confirm Equipment Modifications</h4>
                        <p className="text-label-sm text-jds-on-surface-variant font-medium">
                          {editingProduct.name || `Product #${editingProduct.id}`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={savingProduct}
                      onClick={() => setShowConfirmModal(false)}
                      className="rounded-lg p-1.5 text-jds-on-surface-variant/60 hover:bg-jds-surface-container-high hover:text-jds-on-surface transition-colors disabled:opacity-50"
                      title="Return to editing"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="p-6 overflow-y-auto space-y-4 flex-1">
                    {pendingChanges.length > 0 ? (
                      <>
                        <div className="rounded-xl bg-jds-surface-container-low/50 border border-jds-outline-variant/20 p-3.5 flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-jds-primary shrink-0 mt-0.5" />
                          <div className="text-body-sm text-jds-on-surface-variant">
                            <span className="font-semibold text-jds-on-surface">
                              {pendingChanges.length} specification{pendingChanges.length > 1 ? 's' : ''} modified.
                            </span>{' '}
                            Please review and confirm these changes before updating the catalog.
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-jds-on-surface-variant/70">
                            Summary of Modifications
                          </p>
                          <div className="divide-y divide-jds-outline-variant/15 rounded-xl border border-jds-outline-variant/25 bg-jds-surface-container-lowest overflow-hidden max-h-60 overflow-y-auto">
                            {pendingChanges.map((change) => (
                              <div key={change.key} className="p-3 space-y-1.5 text-xs">
                                <div className="font-bold text-jds-on-surface">{change.label}</div>
                                {change.isImage ? (
                                  <div className="flex items-center gap-3">
                                    <div className="text-center">
                                      <p className="text-[10px] text-jds-on-surface-variant mb-1">Previous</p>
                                      <img
                                        src={change.oldImgUrl || 'https://placehold.co/60x60?text=None'}
                                        alt="Old preview"
                                        className="h-10 w-10 object-contain rounded border border-jds-outline-variant/30"
                                      />
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-jds-on-surface-variant/50 shrink-0" />
                                    <div className="text-center">
                                      <p className="text-[10px] text-emerald-600 font-bold mb-1">New</p>
                                      <img
                                        src={change.newImgUrl || 'https://placehold.co/60x60?text=None'}
                                        alt="New preview"
                                        className="h-10 w-10 object-contain rounded border border-emerald-500/40"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="rounded bg-jds-surface-container px-2 py-0.5 font-mono text-jds-on-surface-variant line-through truncate max-w-[170px]">
                                      {change.oldValue}
                                    </span>
                                    <ArrowRight className="h-3.5 w-3.5 text-jds-on-surface-variant/50 shrink-0" />
                                    <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 font-mono font-semibold text-emerald-700 dark:text-emerald-400 truncate max-w-[190px]">
                                      {change.newValue}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="py-6 text-center space-y-2">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-jds-surface-container text-jds-on-surface-variant">
                          <RotateCcw className="h-6 w-6" />
                        </div>
                        <h5 className="text-body-md font-bold text-jds-on-surface">No Changes Detected</h5>
                        <p className="text-body-sm text-jds-on-surface-variant max-w-xs mx-auto">
                          No product specifications were modified. You can continue editing or close this dialog.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="border-t border-jds-outline-variant/20 px-6 py-4 bg-jds-surface-container-low/20 flex items-center justify-end gap-3 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={savingProduct}
                      onClick={() => setShowConfirmModal(false)}
                      className="border-jds-outline-variant text-jds-on-surface-variant hover:bg-jds-surface-container-high h-11 px-5 rounded-xl"
                    >
                      Back to Editing
                    </Button>
                    <Button
                      type="button"
                      disabled={savingProduct || pendingChanges.length === 0}
                      onClick={handleEditSave}
                      className="bg-jds-primary text-jds-on-primary font-bold px-6 h-11 rounded-xl"
                    >
                      {savingProduct ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          <span>Saving Changes...</span>
                        </div>
                      ) : (
                        'Confirm & Save Changes'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-jds-outline-variant/20 px-6 py-4 bg-jds-surface-container-low/30 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-jds-primary/10 text-jds-primary">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-body-lg font-bold text-jds-on-surface">Edit Product Specifications</h3>
                  <p className="text-label-sm text-jds-on-surface-variant font-medium">
                    Equipment ID: <span className="font-mono font-bold text-jds-on-surface">{editingProduct.id}</span>
                    {editingProduct.name && ` — ${editingProduct.name}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={savingProduct}
                onClick={handleCloseEdit}
                className="rounded-lg p-1.5 text-jds-on-surface-variant/60 hover:bg-jds-surface-container-high hover:text-jds-on-surface transition-colors disabled:opacity-50"
                title="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Section Tab Bar */}
            <div className="border-b border-jds-outline-variant/20 px-6 py-2 bg-jds-surface-container-low/10 flex items-center gap-2 overflow-x-auto shrink-0">
              {EDIT_FIELD_GROUPS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveEditTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-label-sm font-semibold whitespace-nowrap transition-all ${activeEditTab === tab.id
                    ? 'bg-jds-primary text-jds-on-primary shadow-sm'
                    : 'text-jds-on-surface-variant hover:bg-jds-surface-container-high hover:text-jds-on-surface'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto p-6 space-y-6 flex-1 max-h-[calc(92vh-190px)]">
              {/* Product Media & Image Row (Shown in 'all' and 'general') */}
              {(activeEditTab === 'all' || activeEditTab === 'general') && (
                <div className="rounded-2xl border border-jds-outline-variant/30 bg-jds-surface-container-low/20 p-4 space-y-3">
                  <span className="text-label-sm font-bold uppercase tracking-wider text-jds-on-surface-variant/80">
                    Product Image & Catalog Media
                  </span>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {editingProduct.image_url ? (
                      <img
                        src={editingProduct.image_url}
                        alt="Product preview"
                        className="h-16 w-16 rounded-xl object-contain bg-black/5 border border-jds-outline-variant/30 shrink-0"
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src = 'https://placehold.co/100x100?text=None'
                        }}
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-xl bg-jds-surface-container border border-jds-outline-variant/30 flex items-center justify-center text-jds-on-surface-variant/40 shrink-0">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                    <div className="flex-1 w-full space-y-2">
                      <input
                        type="text"
                        value={editingProduct.image_url ?? ''}
                        onChange={(e) => handleFieldChange('image_url', e.target.value, 'text')}
                        placeholder="Paste image public URL..."
                        className="h-10 w-full rounded-xl border border-jds-outline-variant/30 bg-jds-surface px-3.5 text-xs font-mono outline-none focus:border-jds-secondary transition-all"
                      />
                      <div className="flex items-center gap-2">
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
                          className="h-8 text-xs gap-1.5 border-jds-outline-variant"
                        >
                          {editingImageUploading ? (
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <Upload className="h-3 w-3" />
                          )}
                          <span>Upload From Storage</span>
                        </Button>
                        <span className="text-[11px] text-jds-on-surface-variant/60">
                          PNG, JPG, WebP supported
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Field Grid */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {EDIT_FIELDS.filter((f) => activeEditTab === 'all' || f.group === activeEditTab).map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-label-sm font-bold text-jds-on-surface-variant/80">
                        {f.label}
                      </label>
                      {f.key === 'type' && (
                        <span className="text-[11px] text-jds-on-surface-variant/60 font-medium">Add via +</span>
                      )}
                    </div>

                    {f.key === 'type' ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editingProduct.type ?? ''}
                          onChange={(e) => handleFieldChange('type', e.target.value, 'text')}
                          className="h-11 flex-1 rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-3 text-body-md outline-none focus:bg-jds-surface-container-lowest focus:border-jds-secondary transition-all"
                        >
                          <option value="">Select Category</option>
                          {categories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setIsCategoryModalOpen(true)}
                          className="h-11 w-11 flex items-center justify-center rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/20 hover:bg-jds-primary/10 hover:border-jds-primary hover:text-jds-primary text-jds-on-surface-variant transition-all shrink-0"
                          title="Manage Categories"
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <input
                        type={f.type}
                        value={editingProduct[f.key] ?? ''}
                        onChange={(e) => handleFieldChange(f.key, e.target.value, f.type)}
                        className={`h-11 w-full rounded-xl border bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:bg-jds-surface-container-lowest transition-all ${validationErrors[f.key]
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

                {/* Stock Status Availability (In Stock boolean) */}
                {(activeEditTab === 'all' || activeEditTab === 'inventory') && (
                  <div className="space-y-1.5">
                    <label className="text-label-sm font-bold text-jds-on-surface-variant/80">
                      Catalog In-Stock Status
                    </label>
                    <select
                      value={editingProduct.in_stock ? 'true' : 'false'}
                      onChange={(e) => {
                        const isInStock = e.target.value === 'true'
                        setEditingProduct((prev) => {
                          const currentQty = Number(prev.stock_quantity) || 0
                          return {
                            ...prev,
                            in_stock: isInStock,
                            stock_quantity: !isInStock ? 0 : currentQty > 0 ? currentQty : 10,
                          }
                        })
                      }}
                      className="h-11 w-full rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
                    >
                      <option value="true">Active & In Stock</option>
                      <option value="false">Out of Stock (Zero Units)</option>
                    </select>
                  </div>
                )}
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
                  onClick={handleCloseEdit}
                  className="border-jds-outline-variant text-jds-on-surface-variant hover:bg-jds-surface-container-high h-11 px-5 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleInitiateSave}
                  disabled={savingProduct}
                  className="bg-jds-primary text-jds-on-primary font-bold px-7 h-11 rounded-xl"
                >
                  Review & Confirm Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY MANAGEMENT MODAL */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoryAdded={(newCat) => {
          setCategories((prev) => Array.from(new Set([...prev, newCat])))
          if (editingProduct) {
            handleFieldChange('type', newCat, 'text')
          }
          showToast('Category Added', `Category "${newCat}" is now available.`, 'success')
        }}
        onCategoriesChanged={(names) => {
          if (names && names.length > 0) {
            setCategories(names)
          }
          fetchProducts()
        }}
      />

      {/* RECORD SALE MODAL */}
      <RecordSaleModal
        product={saleModalProduct}
        onClose={() => setSaleModalProduct(null)}
        onSaleSuccess={(updated) => {
          setProducts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)))
          showToast(
            'Customer Sale Recorded',
            `Sale logged for ${updated.name}. Stock is now ${updated.stock_quantity} units.`,
            'success'
          )
        }}
      />
    </div>
  )
}
