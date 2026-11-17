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
import {
  parseProductImages,
  getMainProductImage,
  serializeProductImages,
  fetchDynamicProductImages
} from '../../lib/productImageUtils'
import { useAuth } from '../../context/AuthContext'
import { notifyOpsUpdated } from '../../lib/inquiryStatusUtils'
import CategoryModal from './CategoryModal'
import RecordSaleModal from './RecordSaleModal'
import AdminProductCard from './AdminProductCard'
import ImagesScreen from './ImagesScreen'
import InspectorDrawer from './InspectorDrawer'
import { fetchCategoriesWithCounts, DEFAULT_CATEGORIES } from '../../lib/categories'
import {
  getStockQuantity,
  getStockTier,
  sortProductsByStockPriority,
  getStockBadgeConfig,
  getBranchBreakdown,
  SORT_OPTIONS,
} from '../../lib/inventoryUtils'
import { sanitizeText, sanitizeNumber } from '../../lib/sanitize.js'
import { parseProductPrice } from '../../lib/multiCriteriaMatcher'
import useModalBehavior from '../../hooks/useModalBehavior'
import AnimatedConfirmation from '../ui/AnimatedConfirmation'

export const EDIT_FIELDS = [
  { key: 'name', label: 'Product Name', type: 'text', group: 'general' },
  { key: 'type', label: 'Category Type', type: 'text', group: 'general' },
  { key: 'min_price', label: 'Min Price (₱)', type: 'number', group: 'general' },
  { key: 'max_price', label: 'Max Price (₱)', type: 'number', group: 'general' },
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

  { key: 'stock_quantity', label: 'Total Physical Stock (Combined)', type: 'number', group: 'inventory' },
  { key: 'stock_quiapo', label: 'Stock · Quiapo Showroom', type: 'number', group: 'inventory' },
  { key: 'stock_cavite', label: 'Stock · Cavite Hub', type: 'number', group: 'inventory' },
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

export default function ProductsScreen({ onNavigate, initialTab = 'catalog' }) {
  const [activeSection, setActiveSection] = useState(initialTab) // 'catalog' | 'media'
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState('table') // 'table' | 'cards'

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
  const [editSuccessMessage, setEditSuccessMessage] = useState(null)
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

  // Inspector Drawer State
  const [inspectedProduct, setInspectedProduct] = useState(null)
  const [inspectorTab, setInspectorTab] = useState('inspect') // 'inspect' | 'audit' | 'edit'

  // Delete Confirmation State
  const [productToDelete, setProductToDelete] = useState(null)
  const [deletingProduct, setDeletingProduct] = useState(false)

  const handleCloseEdit = useCallback(() => {
    setInspectedProduct(null)
    setQuickRestockItem(null)
    setEditingProduct(null)
    setOriginalProduct(null)
    setShowConfirmModal(false)
    setPendingChanges([])
    setValidationErrors({})
    setEditSuccessMessage(null)
  }, [])

  const anyProductModalOpen = Boolean(
    directConfirmAction ||
    productToDelete
  )

  useModalBehavior({
    isOpen: anyProductModalOpen,
    onClose: () => {
      if (productToDelete && !deletingProduct) setProductToDelete(null)
      else if (directConfirmAction && !directConfirmLoading) setDirectConfirmAction(null)
    },
  })

  // Toast Notification State
  const [toast, setToast] = useState(null)
  const toastTimeoutRef = useRef(null)

  const { role } = useAuth()
  const isStaff = role === 'staff'

  const showToast = useCallback((title, message, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToast({ id: Date.now(), title, message, type })
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null)
    }, 3800)
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
      notifyOpsUpdated()
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
  const handleOpenEditProduct = async (product, tabOverride = 'edit') => {
    let minPrice = product.min_price !== undefined && product.min_price !== null ? product.min_price : ''
    let maxPrice = product.max_price !== undefined && product.max_price !== null ? product.max_price : ''

    // If numeric columns are empty but price_range has a string, populate defaults
    if ((minPrice === '' || maxPrice === '') && product.price_range) {
      const parsed = parseProductPrice(product)
      if (parsed.hasPrice) {
        if (minPrice === '' && parsed.min !== null) minPrice = parsed.min
        if (maxPrice === '' && parsed.max !== null) maxPrice = parsed.max
      }
    }

    const prepared = {
      ...product,
      min_price: minPrice,
      max_price: maxPrice,
      stock_quantity: getStockQuantity(product),
    }
    setInspectedProduct(prepared)
    setInspectorTab(tabOverride || 'edit')
    setQuickRestockItem(prepared)
    setQuickQuantity(getStockQuantity(prepared))
    setEditingProduct(prepared)
    setOriginalProduct(prepared)
    setActiveEditTab('all')
    setShowConfirmModal(false)
    setPendingChanges([])
    setValidationErrors({})

    // Dynamically check storage for any additional pictures (e.g. BGZ048_500_(2).png)
    try {
      const dynamicImages = await fetchDynamicProductImages(product, supabase)
      if (dynamicImages.length > 1) {
        const serialized = serializeProductImages(dynamicImages)
        setEditingProduct((prev) => (prev && prev.id === product.id ? { ...prev, image_url: serialized } : prev))
        setInspectedProduct((prev) => (prev && prev.id === product.id ? { ...prev, image_url: serialized } : prev))
      }
    } catch (err) {
      console.warn('Could not fetch extra product pictures:', err)
    }
  }

  const handleOpenInspector = (product, tab = 'inspect') => {
    handleOpenEditProduct(product, tab)
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

      // Synchronize stock_quantity, branch stocks (stock_quiapo + stock_cavite), and in_stock
      let parsedQty =
        rest.stock_quantity !== undefined && rest.stock_quantity !== ''
          ? sanitizeNumber(rest.stock_quantity, { min: 0, integer: true, fallback: 0 })
          : rest.in_stock
            ? 10
            : 0

      if (rest.stock_quiapo !== undefined || rest.stock_cavite !== undefined) {
        const qStock = sanitizeNumber(rest.stock_quiapo ?? 0, { min: 0, integer: true, fallback: 0 })
        const cStock = sanitizeNumber(rest.stock_cavite ?? 0, { min: 0, integer: true, fallback: 0 })
        const branchChanged =
          originalProduct &&
          (qStock !== Number(originalProduct.stock_quiapo || 0) ||
            cStock !== Number(originalProduct.stock_cavite || 0))
        if (branchChanged) {
          parsedQty = qStock + cStock
          rest.stock_quiapo = qStock
          rest.stock_cavite = cStock
        } else {
          rest.stock_quiapo = Math.max(0, parsedQty - cStock)
          rest.stock_cavite = cStock
        }
      }

      rest.stock_quantity = parsedQty
      rest.in_stock = parsedQty > 0
      if (rest.sales !== undefined) {
        rest.sales = sanitizeNumber(rest.sales, { min: 0, integer: true, fallback: 0 })
      }

      // Synchronize min_price, max_price, and price_range
      const minP = rest.min_price !== undefined && rest.min_price !== '' && rest.min_price !== null
        ? sanitizeNumber(rest.min_price, { min: 0, fallback: null })
        : null
      const maxP = rest.max_price !== undefined && rest.max_price !== '' && rest.max_price !== null
        ? sanitizeNumber(rest.max_price, { min: 0, fallback: null })
        : null

      rest.min_price = minP
      rest.max_price = maxP

      if (minP !== null && maxP !== null) {
        rest.price_range = minP === maxP ? String(minP) : `${minP}-${maxP}`
      } else if (minP !== null) {
        rest.price_range = `${minP}+`
      } else if (maxP !== null) {
        rest.price_range = `Up to ${maxP}`
      } else {
        rest.price_range = null // if there's no price then keep it that way
      }

      let { data, error } = await supabase
        .from('products')
        .update(rest)
        .eq('id', id)
        .select()

      if (error && (error.message?.includes('min_price') || error.message?.includes('max_price'))) {
        const { min_price, max_price, ...legacyRest } = rest
        const retry = await supabase
          .from('products')
          .update(legacyRest)
          .eq('id', id)
          .select()
        data = retry.data
        error = retry.error
      }

      if (error) throw error

      const updated =
        data && data.length > 0
          ? data[0]
          : { ...editingProduct, stock_quantity: parsedQty, in_stock: parsedQty > 0 }

      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)))
      setShowConfirmModal(false)
      setEditSuccessMessage(`Modifications saved for ${editingProduct.name || `Product #${id}`}.`)
      notifyOpsUpdated()
      showToast('Product Updated', `Modifications saved for ${editingProduct.name || `Product #${id}`}.`, 'success')
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
        const currentImages = parseProductImages(editingProduct?.image_url)
        const updatedImages = [...currentImages, publicUrlData.publicUrl]
        setEditingProduct((prev) => ({ ...prev, image_url: serializeProductImages(updatedImages) }))
        showToast('Picture Added', 'New product picture uploaded and attached successfully.', 'info')
      }
    } catch (err) {
      console.error('Failed to upload image:', err)
      showToast('Upload Failed', err.message || 'Could not upload image.', 'error')
    } finally {
      setEditingImageUploading(false)
      if (editFileInputRef.current) editFileInputRef.current.value = ''
    }
  }

  const [newImageUrlInput, setNewImageUrlInput] = useState('')

  const handleRemoveProductImage = (indexToRemove) => {
    const list = parseProductImages(editingProduct?.image_url)
    const updated = list.filter((_, i) => i !== indexToRemove)
    handleFieldChange('image_url', serializeProductImages(updated), 'text')
  }

  const handleSetPrimaryProductImage = (indexToPrimary) => {
    const list = parseProductImages(editingProduct?.image_url)
    if (indexToPrimary <= 0 || indexToPrimary >= list.length) return
    const target = list[indexToPrimary]
    const remaining = list.filter((_, i) => i !== indexToPrimary)
    const updated = [target, ...remaining]
    handleFieldChange('image_url', serializeProductImages(updated), 'text')
  }

  const handleAddNewImageUrl = () => {
    const trimmed = newImageUrlInput.trim()
    if (!trimmed) return
    const currentList = parseProductImages(editingProduct?.image_url)
    const updated = [...currentList, trimmed]
    handleFieldChange('image_url', serializeProductImages(updated), 'text')
    setNewImageUrlInput('')
  }

  // Quick Stock Adjustment Handlers
  const handleOpenStockStepper = (product, delta = 0) => {
    const currentQty = getStockQuantity(product)
    const targetQty = Math.max(0, currentQty + delta)
    handleOpenInspector(product, 'audit')
    setQuickQuantity(targetQty)
  }

  const handleQuickRestockSave = async () => {
    if (!quickRestockItem) return
    setUpdatingStock(true)
    try {
      const newQty = Math.max(0, Number(quickQuantity) || 0)
      const newInStock = newQty > 0
      const caviteQty = Math.max(0, Number(quickRestockItem.stock_cavite) || 0)
      const newQuiapoQty = Math.max(0, newQty - caviteQty)

      const { data, error } = await supabase
        .from('products')
        .update({ stock_quantity: newQty, stock_quiapo: newQuiapoQty, in_stock: newInStock })
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
      notifyOpsUpdated()
      showToast(
        'Inventory Updated',
        `${quickRestockItem.name} stock level confirmed at ${newQty} unit${newQty === 1 ? '' : 's'}.`,
        'success'
      )
      handleCloseEdit()
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
      notifyOpsUpdated()
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
            <h1 className="text-lg sm:text-headline-md font-bold text-jds-on-surface">Solar Inventory Catalog</h1>
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
            className="jds-btn-motion bg-jds-primary text-jds-on-primary hover:opacity-90 rounded-xl px-5 h-10 gap-2 font-bold shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Equipment</span>
          </Button>
        </div>
      </div>

      {/* Catalog / Media Library Section Tabs */}
      <div className="flex items-center gap-1.5 rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low p-1 w-fit" role="tablist" aria-label="Products workspace sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'catalog'}
          onClick={() => setActiveSection('catalog')}
          className={`jds-focus-ring min-h-[36px] flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeSection === 'catalog'
              ? 'bg-jds-surface-container-lowest text-jds-primary shadow-2xs border border-jds-outline-variant/30'
              : 'text-jds-on-surface-variant hover:text-jds-on-surface'
          }`}
        >
          <Package className="h-3.5 w-3.5" />
          <span>Catalog SKUs ({products.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'media'}
          onClick={() => setActiveSection('media')}
          className={`jds-focus-ring min-h-[36px] flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeSection === 'media'
              ? 'bg-jds-surface-container-lowest text-jds-primary shadow-2xs border border-jds-outline-variant/30'
              : 'text-jds-on-surface-variant hover:text-jds-on-surface'
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          <span>Images &amp; Media Library</span>
        </button>
      </div>

      {activeSection === 'media' ? (
        <ImagesScreen embedded />
      ) : (
        <>

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

      {/* Main View: Table View (stacked cards on < md, table on md+) */}
      {viewMode === 'table' ? (
        <div className="rounded-2xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest overflow-hidden shadow-sm">
          <div className="md:hidden grid grid-cols-1 gap-4 p-3">
            {prioritizedFiltered.length === 0 ? (
              <div className="text-center py-12 px-4 text-body-md text-jds-on-surface-variant">
                No products match your current filters.
              </div>
            ) : (
              prioritizedFiltered.map((p) => (
                <AdminProductCard
                  key={p.id}
                  product={p}
                  onOpenEdit={handleOpenEditProduct}
                  onInitiateDelete={handleInitiateDelete}
                  onOpenStockStepper={handleOpenStockStepper}
                  onOpenRecordSale={setSaleModalProduct}
                  onRequestDirectStockChange={handleRequestDirectStockChange}
                  onRequestDirectSaleChange={handleRequestDirectSaleChange}
                  showDelete={role === 'admin'}
                />
              ))
            )}
          </div>
          <div className="hidden md:block overflow-x-auto">
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
                        onClick={() => handleOpenInspector(p, 'inspect')}
                        className={`cursor-pointer hover:bg-jds-surface-container-low/40 transition-colors ${badge.rowBorderClass} ${badge.rowBgClass}`}
                      >
                        {/* Thumbnail */}
                        <TableCell className="w-16 py-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenInspector(p, 'inspect')
                            }}
                            title="Inspect equipment details"
                            className="group/img block rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-jds-primary/40 transition-transform active:scale-95"
                          >
                            <img
                              src={getMainProductImage(p.image_url) || 'https://placehold.co/80x80?text=None'}
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
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenInspector(p, 'inspect')
                              }}
                              title="Click to inspect and edit product"
                              className="text-left font-bold text-jds-on-surface hover:text-jds-primary transition-colors focus:outline-none group/title flex items-center gap-1.5 w-full cursor-pointer"
                            >
                              <span className="truncate">{p.name}</span>
                              <Pencil className="h-3 w-3 opacity-0 group-hover/title:opacity-80 text-jds-primary shrink-0 transition-opacity" />
                            </button>
                            <div className="flex items-center gap-2 text-xs text-jds-on-surface-variant font-mono tabular-nums">
                              <span>ID: {p.id}</span>
                              {!isStaff && (p.min_price || p.price_range) && (
                                <>
                                  <span>&bull;</span>
                                  <span className="text-jds-primary font-semibold">
                                    {p.min_price && p.max_price
                                      ? `₱${Number(p.min_price).toLocaleString()} - ₱${Number(p.max_price).toLocaleString()}`
                                      : p.min_price
                                        ? `₱${Number(p.min_price).toLocaleString()}+`
                                        : `₱${p.price_range}`}
                                  </span>
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
                              className="text-jds-on-surface-variant hover:bg-jds-surface-container hover:text-jds-primary disabled:opacity-30 disabled:pointer-events-none rounded-lg"
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
                              className="text-jds-on-surface-variant hover:bg-jds-surface-container hover:text-jds-primary rounded-lg"
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
                              className="text-jds-on-surface-variant hover:bg-jds-surface-container hover:text-jds-primary rounded-lg"
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
            className="w-full max-w-sm max-h-[92dvh] overflow-y-auto rounded-2xl border border-jds-outline-variant/30 bg-jds-surface p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
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
            className="w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-2xl border border-jds-error/30 bg-jds-surface p-5 sm:p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
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
                src={getMainProductImage(productToDelete.image_url) || 'https://placehold.co/80x80?text=None'}
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

      {/* SLIDE-OVER RIGHT INSPECTOR DRAWER (Inspect | Audit Stock | Edit Specs) */}
      <InspectorDrawer
        isOpen={Boolean(inspectedProduct)}
        onClose={handleCloseEdit}
        disableClose={updatingStock || savingProduct}
        widthClass="max-w-[520px]"
        subtitle={`Equipment #${inspectedProduct?.id ?? ''} · ${inspectedProduct?.type || 'Solar Hardware'}`}
        title={inspectedProduct?.name}
        tabs={
          editSuccessMessage
            ? []
            : [
                { id: 'inspect', label: 'Inspect' },
                { id: 'audit', label: 'Audit Stock' },
                { id: 'edit', label: 'Edit Specs' },
              ]
        }
        activeTab={inspectorTab}
        onTabChange={(nextTab) => {
          setInspectorTab(nextTab)
          setShowConfirmModal(false)
        }}
        footer={
          editSuccessMessage ? null : inspectorTab === 'inspect' ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={getStockQuantity(inspectedProduct) === 0}
                onClick={() => setSaleModalProduct(inspectedProduct)}
                className="jds-btn-motion border-jds-outline-variant text-jds-on-surface h-10 px-4 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
                Record Sale
              </Button>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInspectorTab('audit')}
                  className="jds-btn-motion border-jds-outline-variant text-jds-on-surface h-10 px-3.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Audit Stock
                </Button>
                <Button
                  type="button"
                  onClick={() => setInspectorTab('edit')}
                  className="jds-btn-motion bg-jds-primary text-jds-on-primary h-10 px-4 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Edit Specs
                </Button>
              </div>
            </>
          ) : inspectorTab === 'audit' ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={updatingStock}
                onClick={handleCloseEdit}
                className="jds-btn-motion border-jds-outline-variant text-jds-on-surface-variant h-10 px-4 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={updatingStock}
                onClick={handleQuickRestockSave}
                className="jds-btn-motion bg-jds-primary text-jds-on-primary h-10 px-5 rounded-lg text-xs font-bold cursor-pointer ml-auto"
              >
                {updatingStock ? 'Saving Stock...' : 'Save Stock Adjustment'}
              </Button>
            </>
          ) : showConfirmModal ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={savingProduct}
                onClick={() => setShowConfirmModal(false)}
                className="jds-btn-motion border-jds-outline-variant text-jds-on-surface-variant h-10 px-4 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Back to Edit
              </Button>
              <Button
                type="button"
                disabled={savingProduct}
                onClick={handleEditSave}
                className="jds-btn-motion bg-jds-primary text-jds-on-primary h-10 px-5 rounded-lg text-xs font-bold cursor-pointer ml-auto"
              >
                {savingProduct ? 'Saving Changes...' : 'Confirm & Save'}
              </Button>
            </>
          ) : (
            <>
              {!isStaff && inspectedProduct && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const target = inspectedProduct
                    handleCloseEdit()
                    handleInitiateDelete(target)
                  }}
                  className="jds-btn-motion border-jds-error/30 text-jds-error hover:bg-jds-error/10 h-10 px-3.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  disabled={savingProduct}
                  onClick={handleCloseEdit}
                  className="jds-btn-motion border-jds-outline-variant text-jds-on-surface-variant h-10 px-4 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Discard
                </Button>
                <Button
                  type="button"
                  disabled={savingProduct}
                  onClick={handleInitiateSave}
                  className="jds-btn-motion bg-jds-primary text-jds-on-primary h-10 px-5 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Review &amp; Save
                </Button>
              </div>
            </>
          )
        }
      >
        {editSuccessMessage ? (
          <div className="py-12 flex items-center justify-center">
            <AnimatedConfirmation
              title="Product Specifications Saved"
              description={editSuccessMessage}
              duration={1800}
              onComplete={() => handleCloseEdit()}
            />
          </div>
        ) : inspectedProduct && inspectorTab === 'inspect' ? (() => {
          const badge = getStockBadgeConfig(inspectedProduct)
          const branch = getBranchBreakdown(inspectedProduct)
          const mainImg = getMainProductImage(inspectedProduct.image_url)
          return (
            <div className="space-y-5">
              <div className="grid grid-cols-[1fr_96px] gap-4 items-start">
                <dl className="space-y-2 text-xs">
                  <div className="grid grid-cols-[96px_1fr] gap-2">
                    <dt className="text-jds-on-surface-variant">Category</dt>
                    <dd className="font-semibold text-jds-on-surface">{inspectedProduct.type || 'Solar Hardware'}</dd>
                  </div>
                  <div className="grid grid-cols-[96px_1fr] gap-2">
                    <dt className="text-jds-on-surface-variant">Power</dt>
                    <dd className="font-semibold text-jds-on-surface tabular-nums">{inspectedProduct.watt}W</dd>
                  </div>
                  {!isStaff && (
                    <div className="grid grid-cols-[96px_1fr] gap-2">
                      <dt className="text-jds-on-surface-variant">Price</dt>
                      <dd className="font-semibold text-jds-on-surface tabular-nums">
                        {inspectedProduct.min_price && inspectedProduct.max_price
                          ? `₱${Number(inspectedProduct.min_price).toLocaleString()} - ₱${Number(inspectedProduct.max_price).toLocaleString()}`
                          : inspectedProduct.price_range || (inspectedProduct.min_price ? `₱${Number(inspectedProduct.min_price).toLocaleString()}` : 'Not set')}
                      </dd>
                    </div>
                  )}
                  <div className="grid grid-cols-[96px_1fr] gap-2">
                    <dt className="text-jds-on-surface-variant">On Hand</dt>
                    <dd className="font-bold text-jds-on-surface tabular-nums">{badge.quantity} units</dd>
                  </div>
                  <div className="grid grid-cols-[96px_1fr] gap-2">
                    <dt className="text-jds-on-surface-variant">Total Sales</dt>
                    <dd className="font-semibold text-jds-on-surface tabular-nums">{Number(inspectedProduct.sales || 0)} sold</dd>
                  </div>
                  <div className="grid grid-cols-[96px_1fr] gap-2">
                    <dt className="text-jds-on-surface-variant">Status</dt>
                    <dd>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badge.badgeClass}`}>
                        {badge.shortLabel}
                      </span>
                    </dd>
                  </div>
                </dl>

                <div className="h-24 w-24 rounded-xl border border-jds-outline-variant/40 bg-jds-surface-container flex items-center justify-center overflow-hidden p-1.5">
                  {mainImg ? (
                    <img src={mainImg} alt={inspectedProduct.name} className="h-full w-full object-contain" />
                  ) : (
                    <Package className="h-7 w-7 text-jds-on-surface-variant/50" />
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low p-3.5 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-jds-on-surface-variant">
                  Branch Stock Breakdown
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-jds-surface-container-lowest p-2.5 border border-jds-outline-variant/25">
                    <span className="text-jds-on-surface-variant block text-[11px]">Quiapo Showroom</span>
                    <span className="font-bold text-sm text-jds-on-surface tabular-nums">{branch.quiapo.stock} units</span>
                    <span className="text-[11px] text-jds-on-surface-variant block tabular-nums">{branch.quiapo.available} available</span>
                  </div>
                  <div className="rounded-lg bg-jds-surface-container-lowest p-2.5 border border-jds-outline-variant/25">
                    <span className="text-jds-on-surface-variant block text-[11px]">Cavite Hub</span>
                    <span className="font-bold text-sm text-jds-on-surface tabular-nums">{branch.cavite.stock} units</span>
                    <span className="text-[11px] text-jds-on-surface-variant block tabular-nums">{branch.cavite.available} available</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })() : quickRestockItem && inspectorTab === 'audit' ? (() => {
          const origQty = getStockQuantity(quickRestockItem)
          const newQty = Math.max(0, Number(quickQuantity) || 0)
          const delta = newQty - origQty
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-xs rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low p-3.5">
                <div>
                  <span className="text-jds-on-surface-variant block text-[10px] uppercase">Previous</span>
                  <span className="font-bold text-jds-on-surface text-base tabular-nums">{origQty}</span>
                </div>
                <div>
                  <span className="text-jds-on-surface-variant block text-[10px] uppercase">Shift</span>
                  <span className={`font-bold text-base tabular-nums ${delta > 0 ? 'text-emerald-700' : delta < 0 ? 'text-jds-error' : 'text-jds-on-surface-variant'}`}>
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-jds-on-surface-variant block text-[10px] uppercase">Adjusted</span>
                  <span className="font-bold text-jds-primary text-base tabular-nums">{newQty}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="prod-drawer-stock-target" className="text-xs font-bold text-jds-on-surface block">
                  Target units in stock
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={newQty <= 0}
                    onClick={() => setQuickQuantity((prev) => Math.max(0, Number(prev || 0) - 1))}
                    aria-label="Decrease stock quantity"
                    className="h-11 w-11 rounded-lg border border-jds-outline-variant bg-jds-surface-container-low flex items-center justify-center hover:bg-jds-surface-container disabled:opacity-30 cursor-pointer"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    id="prod-drawer-stock-target"
                    type="number"
                    min="0"
                    value={quickQuantity}
                    onChange={(e) => setQuickQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="h-11 flex-1 text-center font-mono font-bold text-lg rounded-lg border border-jds-outline-variant bg-jds-surface-container-lowest outline-none focus:border-jds-primary tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setQuickQuantity((prev) => Number(prev || 0) + 1)}
                    aria-label="Increase stock quantity"
                    className="h-11 w-11 rounded-lg border border-jds-outline-variant bg-jds-surface-container-low flex items-center justify-center hover:bg-jds-surface-container cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setQuickQuantity(0)}
                    className="min-h-[36px] rounded-lg border border-jds-error/30 bg-jds-error-container/15 text-xs font-bold text-jds-error hover:bg-jds-error-container/25 cursor-pointer"
                  >
                    Set 0
                  </button>
                  {[-5, 1, 5, 10].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setQuickQuantity((prev) => Math.max(0, Number(prev || 0) + step))}
                      className="min-h-[36px] rounded-lg border border-jds-outline-variant/40 bg-jds-surface-container-low text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container cursor-pointer tabular-nums"
                    >
                      {step > 0 ? `+${step}` : step}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })() : editingProduct && inspectorTab === 'edit' ? (
          showConfirmModal ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-jds-primary/30 bg-jds-surface-container-low p-3.5">
                <h3 className="text-sm font-bold text-jds-on-surface">Review &amp; Confirm Updates</h3>
                <p className="text-xs text-jds-on-surface-variant mt-0.5">
                  {pendingChanges.length} specification{pendingChanges.length === 1 ? '' : 's'} modified.
                </p>
              </div>
              <div className="space-y-2">
                {pendingChanges.map((chg) => (
                  <div
                    key={chg.key}
                    className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/50 p-3 text-xs space-y-1"
                  >
                    <div className="font-bold text-jds-on-surface flex items-center justify-between">
                      <span>{chg.label}</span>
                      <span className="font-mono text-[11px] text-jds-on-surface-variant">{chg.key}</span>
                    </div>
                    {!chg.isImage && (
                      <div className="flex items-center gap-2 font-mono text-[11px] flex-wrap">
                        <span className="line-through text-jds-error bg-jds-error-container/20 px-2 py-0.5 rounded">
                          {chg.oldValue}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-jds-primary shrink-0" />
                        <span className="font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded">
                          {chg.newValue}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {EDIT_FIELD_GROUPS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveEditTab(tab.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                      activeEditTab === tab.id
                        ? 'bg-jds-primary text-jds-on-primary'
                        : 'bg-jds-surface-container text-jds-on-surface-variant hover:text-jds-on-surface'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {(activeEditTab === 'all' || activeEditTab === 'general') && (
                <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/60 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-jds-on-surface-variant">
                      Catalog Media
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-jds-on-surface-variant">
                      {parseProductImages(editingProduct.image_url).length} picture(s)
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {parseProductImages(editingProduct.image_url).map((url, idx) => (
                      <div key={`${url}-${idx}`} className="relative rounded-lg border border-jds-outline-variant/40 bg-white p-1">
                        <img
                          src={url}
                          alt={`Product media ${idx + 1}`}
                          className="h-16 w-full object-contain rounded"
                        />
                        <div className="mt-1 flex items-center justify-between text-[10px]">
                          {idx > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryProductImage(idx)}
                              className="text-jds-primary font-semibold hover:underline cursor-pointer"
                            >
                              Primary
                            </button>
                          ) : (
                            <span className="text-jds-on-surface-variant">#1</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveProductImage(idx)}
                            aria-label="Remove picture"
                            className="text-jds-error p-0.5 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="border-2 border-dashed border-jds-outline-variant/50 rounded-lg min-h-[82px] flex flex-col items-center justify-center p-2 text-center cursor-pointer hover:border-jds-primary"
                    >
                      <input
                        ref={editFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                        onChange={handleEditImageUpload}
                        className="hidden"
                      />
                      <Upload className="h-4 w-4 text-jds-primary mb-1" />
                      <span className="text-[11px] font-semibold text-jds-on-surface">
                        {editingImageUploading ? 'Uploading...' : 'Upload'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {EDIT_FIELDS.filter(
                  (f) =>
                    (activeEditTab === 'all' || f.group === activeEditTab) &&
                    (!isStaff || (f.key !== 'min_price' && f.key !== 'max_price'))
                ).map((f) => (
                  <div key={f.key} className="space-y-1">
                    <label htmlFor={`prod-drawer-field-${f.key}`} className="text-xs font-semibold text-jds-on-surface-variant block">
                      {f.label}
                    </label>
                    {f.key === 'type' ? (
                      <div className="flex items-center gap-2">
                        <select
                          id={`prod-drawer-field-${f.key}`}
                          value={editingProduct.type ?? ''}
                          onChange={(e) => handleFieldChange('type', e.target.value, 'text')}
                          className="h-10 flex-1 rounded-lg border border-jds-outline-variant/40 bg-jds-surface-container-lowest px-3 text-sm outline-none focus:border-jds-primary"
                        >
                          <option value="">Select Category</option>
                          {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setIsCategoryModalOpen(true)}
                          aria-label="Manage Categories"
                          className="h-10 w-10 flex items-center justify-center rounded-lg border border-jds-outline-variant/40 bg-jds-surface-container-low hover:text-jds-primary cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <input
                        id={`prod-drawer-field-${f.key}`}
                        type={f.type}
                        value={editingProduct[f.key] ?? ''}
                        onChange={(e) => handleFieldChange(f.key, e.target.value, f.type)}
                        className={`h-10 w-full rounded-lg border bg-jds-surface-container-lowest px-3 text-sm outline-none ${
                          validationErrors[f.key] ? 'border-jds-error' : 'border-jds-outline-variant/40 focus:border-jds-primary'
                        }`}
                      />
                    )}
                    {validationErrors[f.key] && (
                      <p className="text-xs text-jds-error font-medium">{validationErrors[f.key]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        ) : null}
      </InspectorDrawer>

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
        </>
      )}
    </div>
  )
}
