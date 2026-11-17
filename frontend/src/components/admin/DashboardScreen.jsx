import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import {
  Package,
  AlertTriangle,
  AlertCircle,
  Ticket,
  ArrowRight,
  ArrowUpRight,
  Search,
  RotateCcw,
  ShoppingBag,
  Pencil,
  Plus,
  Minus,
  Boxes,
  X,
  Upload,
  CheckCircle2,
  LayoutGrid,
  List,
  Trash2,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table'
import RecordSaleModal from './RecordSaleModal'
import CategoryModal from './CategoryModal'
import AdminProductCard from './AdminProductCard'
import InspectorDrawer from './InspectorDrawer'
import { fetchCategoriesWithCounts, DEFAULT_CATEGORIES } from '../../lib/categories'
import { notifyOpsUpdated } from '../../lib/inquiryStatusUtils'
import {
  EDIT_FIELDS,
  EDIT_FIELD_GROUPS,
  getChangedFields,
} from './ProductsScreen'
import {
  getStockQuantity,
  getStockTier,
  getStockBadgeConfig,
  filterAndSortProducts,
  getBranchBreakdown,
  SORT_OPTIONS,
} from '../../lib/inventoryUtils'
import {
  parseProductImages,
  getMainProductImage,
  serializeProductImages,
  fetchDynamicProductImages,
} from '../../lib/productImageUtils'
import useModalBehavior from '../../hooks/useModalBehavior'

export default function DashboardScreen({ onNavigate }) {
  const auth = useAuth() || {}
  const isStaff = auth.role === 'staff'
  const [products, setProducts] = useState([])
  const [quoteStats, setQuoteStats] = useState({ total: 0, visits: 0, pending: 0 })
  const [openClaimsCount, setOpenClaimsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState('all') // 'all' | 'out' | 'low' | 'in_stock'
  const [sortOrder, setSortOrder] = useState('stock_priority')
  const [viewMode, setViewMode] = useState('table') // 'cards' | 'table'
  const [inspectorTab, setInspectorTab] = useState('inspect') // 'inspect' | 'audit' | 'edit'
  const [inspectedProduct, setInspectedProduct] = useState(null)

  // Toast feedback
  const [toast, setToast] = useState(null)
  const showToast = (title, message, type = 'info') => {
    setToast({ title, message, type })
    setTimeout(() => {
      setToast((curr) => (curr?.title === title ? null : curr))
    }, 4500)
  }

  // Categories
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)

  // Modals state
  const [saleModalProduct, setSaleModalProduct] = useState(null)

  // Direct Button Handlers Confirmation State
  const [directConfirmAction, setDirectConfirmAction] = useState(null)
  const [directConfirmLoading, setDirectConfirmLoading] = useState(false)

  // Quick Restock Stepper State
  const [quickRestockItem, setQuickRestockItem] = useState(null)
  const [quickQuantity, setQuickQuantity] = useState(0)
  const [updatingStock, setUpdatingStock] = useState(false)

  // Full Edit Modal State
  const [editingProduct, setEditingProduct] = useState(null)
  const [originalProduct, setOriginalProduct] = useState(null)
  const [activeEditTab, setActiveEditTab] = useState('all')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingChanges, setPendingChanges] = useState([])
  const [validationErrors, setValidationErrors] = useState({})
  const [savingProduct, setSavingProduct] = useState(false)
  const [editingImageUploading, setEditingImageUploading] = useState(false)
  const [newImageUrlInput, setNewImageUrlInput] = useState('')
  const editFileInputRef = useRef(null)

  const handleCloseEdit = useCallback(() => {
    setInspectedProduct(null)
    setEditingProduct(null)
    setOriginalProduct(null)
    setQuickRestockItem(null)
    setShowConfirmModal(false)
    setPendingChanges([])
    setValidationErrors({})
  }, [])

  const anyDashboardModalOpen = Boolean(directConfirmAction)

  useModalBehavior({
    isOpen: anyDashboardModalOpen,
    onClose: () => {
      if (directConfirmAction && !directConfirmLoading) setDirectConfirmAction(null)
    },
  })

  const loadCategories = useCallback(async () => {
    try {
      const cats = await fetchCategoriesWithCounts()
      if (cats && cats.length > 0) {
        setCategories(cats.map((c) => c.name))
      }
    } catch (e) {
      console.warn('Failed to load categories:', e)
    }
  }, [])

  const fetchDashboardData = useCallback(async () => {
    try {
      let prodData = null
      const { data: q1, error: err1 } = await supabase
        .from('products')
        .select('*')
        .order('id')

      if (!err1 && q1) {
        prodData = q1
      } else {
        const { data: q2 } = await supabase
          .from('products')
          .select('id, name, type, watt, waterproof_grade, material, battery, in_stock, sales, stock_quantity')
          .order('id')
        if (q2) prodData = q2
      }

      if (prodData) setProducts(prodData)

      // Fetch quote tickets count
      let qList = []
      const { data: qData } = await supabase.from('quote_tickets').select('id, will_visit, status')
      if (qData) qList = qData

      // Also merge local quotes
      try {
        const local = JSON.parse(localStorage.getItem('jds_local_quotes') || '[]')
        const setIds = new Set(qList.map((q) => q.id || q.ticket_code))
        const extras = local.filter((l) => !setIds.has(l.id || l.ticket_code))
        qList = [...extras, ...qList]
      } catch (e) {
        console.error(e)
      }

      setQuoteStats({
        total: qList.length,
        visits: qList.filter((q) => q.will_visit).length,
        pending: qList.filter((q) => q.status === 'Pending').length,
      })

      try {
        const { count: cCount } = await supabase
          .from('warranty_claims')
          .select('id', { count: 'exact', head: true })
          .in('status', ['Pending', 'Under Review', 'Inspecting', 'pending', 'in_review'])
        if (typeof cCount === 'number') setOpenClaimsCount(cCount)
      } catch {
        // Non-blocking claims badge fetch
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false
    async function init() {
      if (!ignore) {
        await Promise.all([fetchDashboardData(), loadCategories()])
      }
    }
    init()
    return () => {
      ignore = true
    }
  }, [fetchDashboardData, loadCategories])

  // Slide-Over Inspector Drawer Handlers (Inspect | Audit Stock | Edit Specs)
  const handleOpenInspector = async (product, tab = 'inspect') => {
    if (!product) return
    const prepared = {
      ...product,
      stock_quantity: getStockQuantity(product),
    }
    setInspectedProduct(prepared)
    setInspectorTab(tab)
    setQuickRestockItem(prepared)
    setQuickQuantity(getStockQuantity(prepared))
    setEditingProduct(prepared)
    setOriginalProduct(prepared)
    setActiveEditTab('all')
    setShowConfirmModal(false)
    setPendingChanges([])
    setValidationErrors({})
    setNewImageUrlInput('')

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

  // Quick Restock Stepper Handlers (routed to Slide-Over Drawer Audit tab)
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
      showToast('Adjustment Failed', err.message || 'Could not update product.', 'error')
    } finally {
      setDirectConfirmLoading(false)
    }
  }

  // Edit Handlers with Review & Confirmation Diff (routed to Slide-Over Drawer Edit tab)
  const handleOpenEditProduct = async (product) => {
    await handleOpenInspector(product, 'edit')
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
    handleFieldChange('image_url', serializeProductImages([target, ...remaining]), 'text')
  }

  const handleAddNewImageUrl = () => {
    const trimmed = newImageUrlInput.trim()
    if (!trimmed) return
    const currentList = parseProductImages(editingProduct?.image_url)
    handleFieldChange('image_url', serializeProductImages([...currentList, trimmed]), 'text')
    setNewImageUrlInput('')
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

      // Synchronize stock_quantity and in_stock
      const parsedQty =
        rest.stock_quantity !== undefined && rest.stock_quantity !== ''
          ? Math.max(0, Number(rest.stock_quantity))
          : rest.in_stock
            ? 10
            : 0

      rest.stock_quantity = parsedQty
      rest.in_stock = parsedQty > 0

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
      notifyOpsUpdated()
      showToast('Product Updated', `Modifications saved for ${editingProduct.name || `Product #${id}`}.`, 'success')
      handleCloseEdit()
    } catch (err) {
      console.error('Failed to save product:', err)
      showToast('Save Error', err.message || 'Failed to save product modifications.', 'error')
    } finally {
      setSavingProduct(false)
    }
  }

  const totalProducts = products.length
  const totalWarehouseUnits = products.reduce((sum, p) => sum + getStockQuantity(p), 0)
  const outOfStockProducts = products.filter((p) => getStockTier(p) === 'out')
  const lowStockProducts = products.filter((p) => getStockTier(p) === 'low')
  const inStockProducts = products.filter((p) => getStockTier(p) !== 'out')
  const criticalAttentionCount = outOfStockProducts.length + lowStockProducts.length

  const estimatedValuation = products.reduce((sum, p) => {
    const qty = getStockQuantity(p)
    const price = Number(p.min_price) || 0
    return sum + qty * price
  }, 0)

  const filteredProducts = filterAndSortProducts(products, {
    search,
    stockFilter,
    sortOrder,
  })

  const cards = [
    {
      label: 'Catalog Stock Units',
      value: totalWarehouseUnits.toLocaleString(),
      icon: Package,
      color: 'text-jds-on-surface-variant',
      bg: 'bg-jds-surface-container-low border border-jds-outline-variant',
      action: () => setStockFilter('all'),
      sub: `${totalProducts} catalog SKUs`,
      active: stockFilter === 'all',
    },
    {
      label: 'Low / Out of Stock',
      value: criticalAttentionCount,
      icon: AlertTriangle,
      color: criticalAttentionCount > 0 ? 'text-jds-error' : 'text-emerald-700',
      bg: criticalAttentionCount > 0
        ? 'bg-jds-error-container border border-jds-error/25'
        : 'bg-emerald-500/15 border border-emerald-500/25',
      action: () => setStockFilter(outOfStockProducts.length > 0 ? 'out' : 'low'),
      sub: `${outOfStockProducts.length} depleted · ${lowStockProducts.length} low`,
      highlight: criticalAttentionCount > 0 ? 'border-jds-error/40' : '',
      active: stockFilter === 'out' || stockFilter === 'low',
    },
    {
      label: 'Pending Inquiries',
      value: quoteStats.pending,
      icon: Ticket,
      color: 'text-jds-on-surface-variant',
      bg: 'bg-jds-surface-container-low border border-jds-outline-variant',
      action: () => onNavigate && onNavigate('inquiries'),
      sub: `${quoteStats.visits} visits · ${quoteStats.total} total`,
    },
    isStaff
      ? {
          label: 'Open Warranty Claims',
          value: openClaimsCount,
          icon: ShieldCheck,
          color: 'text-jds-on-surface-variant',
          bg: 'bg-jds-surface-container-low border border-jds-outline-variant',
          action: () => onNavigate && onNavigate('claims'),
          sub: openClaimsCount > 0 ? 'Review active claims' : 'Queue clear',
        }
      : {
          label: 'Inventory Valuation',
          value: estimatedValuation > 0 ? `₱${estimatedValuation.toLocaleString()}` : `${totalProducts} SKUs`,
          icon: Boxes,
          color: 'text-jds-on-surface-variant',
          bg: 'bg-jds-surface-container-low border border-jds-outline-variant',
          action: () => onNavigate && onNavigate('products'),
          sub: 'Estimated stock value',
        },
  ]

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-20 text-jds-on-surface-variant font-inter">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-jds-primary border-t-transparent" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1280px] mx-auto space-y-6 font-inter">
      {/* Toast Alert Banner */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-md max-w-sm ${toast.type === 'error'
                ? 'border-jds-error/40 bg-jds-surface text-jds-error shadow-jds-error/10'
                : toast.type === 'success'
                  ? 'border-emerald-500/40 bg-jds-surface text-emerald-700 dark:text-emerald-400 shadow-emerald-500/10'
                  : 'border-jds-primary/40 bg-jds-surface text-jds-on-surface shadow-jds-primary/10'
              }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            ) : (
              <Package className="h-5 w-5 shrink-0 mt-0.5 text-jds-primary" />
            )}
            <div className="flex-1 text-xs">
              <p className="font-bold text-body-sm">{toast.title}</p>
              <p className="text-jds-on-surface-variant mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-jds-on-surface-variant/60 hover:text-jds-on-surface"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Operations Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-headline-md font-extrabold tracking-tight text-jds-on-surface">
            Operations Overview
          </h1>
          <p className="text-xs sm:text-body-sm text-jds-on-surface-variant mt-0.5">
            Branch stock levels, scheduled showroom pickups, and open warranty claims.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {products[0] && (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenInspector(filteredProducts[0] || products[0], 'audit')}
              className="jds-btn-motion jds-focus-ring border-jds-outline-variant bg-jds-surface-container-lowest text-jds-on-surface hover:bg-jds-surface-container h-10 px-4 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <Boxes className="h-4 w-4 mr-1.5" />
              Audit Stock
            </Button>
          )}
          {onNavigate && (
            <Button
              type="button"
              onClick={() => onNavigate('register-sale')}
              className="jds-btn-motion jds-focus-ring bg-jds-primary text-jds-on-primary hover:bg-jds-primary/90 h-10 px-4 rounded-lg text-xs font-bold cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Register Sale
            </Button>
          )}
        </div>
      </div>

      {/* Critical Stock Alert Banner */}
      {criticalAttentionCount > 0 && (
        <div className="rounded-xl border border-jds-outline-variant border-l-4 border-l-jds-primary bg-jds-surface-container-lowest p-3.5 sm:p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-2.5 sm:gap-3.5">
              <div className="mt-0.5 flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-jds-primary-fixed text-jds-primary">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <h2 className="text-xs sm:text-body-md font-bold text-jds-on-surface">Inventory Replenishment Required</h2>
                <p className="text-[11px] sm:text-body-sm text-jds-on-surface-variant mt-0.5 leading-relaxed">
                  {outOfStockProducts.length > 0 && (
                    <span className="font-semibold text-jds-error">
                      {outOfStockProducts.length} product{outOfStockProducts.length === 1 ? '' : 's'} completely depleted
                    </span>
                  )}
                  {outOfStockProducts.length > 0 && lowStockProducts.length > 0 && ' and '}
                  {lowStockProducts.length > 0 && (
                    <span className="font-semibold text-amber-800">
                      {lowStockProducts.length} product{lowStockProducts.length === 1 ? '' : 's'} running low (&le; 5 units)
                    </span>
                  )}
                  . Low and depleted items are prioritized at the top of the table below.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setStockFilter(outOfStockProducts.length > 0 ? 'out' : 'low')}
                className="jds-btn-motion jds-focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-jds-surface-container-lowest px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-jds-surface-container cursor-pointer"
              >
                <span>Filter Critical</span>
              </button>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('products')}
                  className="jds-btn-motion jds-focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg bg-jds-primary px-3 py-2 text-xs font-semibold text-jds-on-primary hover:bg-jds-primary/90 shrink-0 cursor-pointer"
                >
                  <span>Open Catalog</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4-Card Summary Strip */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <button
              type="button"
              key={card.label}
              onClick={card.action}
              className={`jds-card-motion jds-focus-ring text-left rounded-xl border bg-jds-surface-container-lowest p-4 sm:p-5 shadow-2xs ${card.active
                  ? 'ring-2 ring-jds-primary border-jds-primary'
                  : card.highlight || 'border-jds-outline-variant'
                } ${card.action ? 'cursor-pointer hover:bg-jds-surface-container-low hover:border-jds-outline' : ''}`}
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <p className="text-[11px] sm:text-xs font-semibold text-jds-on-surface-variant truncate">{card.label}</p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-jds-on-surface tabular-nums">{card.value}</p>
              {card.sub && (
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-jds-on-surface-variant font-medium">
                  <span className="truncate">{card.sub}</span>
                  {card.action && <ArrowRight className="h-3.5 w-3.5 text-jds-primary shrink-0" />}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Product Overview Table with Filters & Direct Adjustments */}
      <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest overflow-hidden shadow-sm">
        <div className="border-b border-jds-outline-variant/30 px-6 py-5 bg-jds-surface-container-low/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-body-lg font-bold text-jds-on-surface">Product Inventory Overview</h2>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('products')}
              className="inline-flex items-center gap-1.5 text-label-md font-bold text-jds-primary hover:underline self-start sm:self-auto cursor-pointer"
            >
              <span>View Full Products Catalog</span>
              <ArrowUpRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter and Sort Toolbar */}
        <div className="p-4 sm:p-5 border-b border-jds-outline-variant/20 bg-jds-surface-container-low/10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-jds-on-surface-variant/50 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-lowest pl-9 pr-4 text-body-sm outline-none focus:border-jds-primary transition-all text-jds-on-surface placeholder:text-jds-on-surface-variant/50"
              />
            </div>

            {/* Stock Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'All', count: totalProducts },
                { id: 'out', label: 'Out of Stock', count: outOfStockProducts.length, alert: outOfStockProducts.length > 0 },
                ...(lowStockProducts.length > 0 ? [{ id: 'low', label: 'Low Stock', count: lowStockProducts.length, warn: true }] : []),
                { id: 'in_stock', label: 'In Stock', count: inStockProducts.length },
              ].map((pill) => {
                const isActive = stockFilter === pill.id
                return (
                  <button
                    key={pill.id}
                    onClick={() => setStockFilter(pill.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${isActive
                        ? pill.alert
                          ? 'bg-jds-error text-white shadow-xs'
                          : 'bg-jds-primary text-white shadow-xs'
                        : pill.alert && pill.count > 0
                          ? 'bg-jds-error/10 text-jds-error border border-jds-error/30 hover:bg-jds-error/20'
                          : 'bg-jds-surface-container-lowest border border-jds-outline-variant/30 text-jds-on-surface-variant hover:text-jds-on-surface hover:border-jds-outline-variant'
                      }`}
                  >
                    <span>{pill.label}</span>
                    <span
                      className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-jds-surface-container text-jds-on-surface-variant'
                        }`}
                    >
                      {pill.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sort Selector, Reset & View Mode Toggle */}
          <div className="flex items-center gap-2.5 shrink-0 justify-between sm:justify-end flex-wrap">
            <div className="flex items-center gap-2">
              <label htmlFor="dashboardSortOrder" className="text-label-sm font-bold text-jds-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                Sort:
              </label>
              <select
                id="dashboardSortOrder"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="h-10 rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-lowest px-3 py-1.5 text-body-sm font-medium text-jds-on-surface outline-none focus:border-jds-primary transition-all cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {(search || stockFilter !== 'all' || sortOrder !== 'stock_priority') && (
              <button
                onClick={() => {
                  setSearch('')
                  setStockFilter('all')
                  setSortOrder('stock_priority')
                }}
                className="h-10 px-3 rounded-lg border border-jds-outline-variant/30 text-jds-on-surface-variant hover:text-jds-primary hover:border-jds-primary text-label-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Reset filters and sorting"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/30 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-label-sm font-bold transition-all cursor-pointer ${viewMode === 'cards'
                    ? 'bg-jds-surface text-jds-primary shadow-xs border border-jds-outline-variant/30'
                    : 'text-jds-on-surface-variant hover:text-jds-on-surface'
                  }`}
                title="Visual Card Grid View"
                aria-label="Cards view"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-label-sm font-bold transition-all cursor-pointer ${viewMode === 'table'
                    ? 'bg-jds-surface text-jds-primary shadow-xs border border-jds-outline-variant/30'
                    : 'text-jds-on-surface-variant hover:text-jds-on-surface'
                  }`}
                title="Data Table View"
                aria-label="Table view"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Table</span>
              </button>
            </div>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="px-6 py-16 text-center text-body-md text-jds-on-surface-variant space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-jds-surface-container text-jds-on-surface-variant mx-auto">
              <Package className="h-6 w-6" />
            </div>
            <p className="font-bold text-jds-on-surface">No products match your selected filter criteria.</p>
            <p className="text-label-sm text-jds-on-surface-variant max-w-sm mx-auto text-center">
              Try adjusting your search criteria, stock filters, or sorting order to view equipment.
            </p>
            <button
              onClick={() => {
                setSearch('')
                setStockFilter('all')
                setSortOrder('stock_priority')
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-jds-outline-variant text-label-sm font-semibold text-jds-primary hover:bg-jds-primary/10 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear filters and view all products</span>
            </button>
          </div>
        ) : viewMode === 'cards' ? (
          /* Responsive Card Grid View */
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.slice(0, 8).map((p) => (
              <AdminProductCard
                key={p.id}
                product={p}
                onOpenEdit={handleOpenEditProduct}
                onOpenStockStepper={handleOpenStockStepper}
                onOpenRecordSale={setSaleModalProduct}
                onRequestDirectStockChange={handleRequestDirectStockChange}
                onRequestDirectSaleChange={handleRequestDirectSaleChange}
                showDelete={false}
              />
            ))}
          </div>
        ) : (
          /* Table View (stacked cards on < md, table on md+) */
          <>
            <div className="md:hidden grid grid-cols-1 gap-4 p-3">
              {filteredProducts.slice(0, 8).map((p) => (
                <AdminProductCard
                  key={p.id}
                  product={p}
                  onOpenEdit={handleOpenEditProduct}
                  onOpenStockStepper={handleOpenStockStepper}
                  onOpenRecordSale={setSaleModalProduct}
                  onRequestDirectStockChange={handleRequestDirectStockChange}
                  onRequestDirectSaleChange={handleRequestDirectSaleChange}
                  showDelete={false}
                />
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-jds-surface-container-low/40">
                  <TableRow>
                    <TableHead className="text-jds-on-surface-variant font-bold">Product</TableHead>
                    <TableHead className="text-jds-on-surface-variant font-bold">Type</TableHead>
                    <TableHead className="text-jds-on-surface-variant font-bold">Power</TableHead>
                    <TableHead className="text-jds-on-surface-variant font-bold">Sales</TableHead>
                    <TableHead className="text-jds-on-surface-variant font-bold">Stock Units</TableHead>
                    <TableHead className="text-jds-on-surface-variant font-bold">Inventory Status</TableHead>
                    <TableHead className="text-jds-on-surface-variant font-bold text-right pr-6">Quick Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.slice(0, 8).map((p) => {
                    const badge = getStockBadgeConfig(p)
                    const stockQty = badge.quantity
                    const salesQty = Number(p.sales || 0)

                    return (
                      <TableRow
                        key={p.id}
                        onClick={() => handleOpenInspector(p, 'inspect')}
                        className={`cursor-pointer hover:bg-jds-surface-container-low/40 transition-colors ${badge.rowBorderClass} ${badge.rowBgClass}`}
                      >
                        <TableCell className="font-bold text-jds-on-surface max-w-[220px]">
                          <span className="line-clamp-1" title={p.name}>{p.name}</span>
                          {!isStaff && p.price_range && (
                            <span className="text-[11px] font-semibold text-jds-primary block mt-0.5 tabular-nums">
                              {p.price_range}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-jds-on-surface-variant text-label-sm">{p.type}</TableCell>
                        <TableCell className="text-jds-on-surface font-medium">{p.watt}W</TableCell>

                        {/* Sales Stepper Column */}
                        <TableCell>
                          <div className="inline-flex items-center gap-1.5 rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/30 px-1.5 py-1">
                            <button
                              type="button"
                              disabled={salesQty <= 0}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRequestDirectSaleChange(p, -1)
                              }}
                              className="h-6 w-6 rounded flex items-center justify-center border border-jds-outline-variant/40 bg-jds-surface hover:bg-jds-surface-container-high transition-all disabled:opacity-30 disabled:pointer-events-none text-xs cursor-pointer"
                              title="Reverse 1 sale (+1 stock)"
                              aria-label="Reverse sale"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="font-mono text-body-sm font-semibold text-jds-on-surface px-1 min-w-[24px] text-center">
                              {salesQty}
                            </span>
                            <button
                              type="button"
                              disabled={stockQty <= 0}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRequestDirectSaleChange(p, +1)
                              }}
                              className="h-6 w-6 rounded flex items-center justify-center border border-jds-outline-variant/40 bg-jds-surface hover:bg-jds-surface-container-high transition-all disabled:opacity-30 disabled:pointer-events-none text-xs cursor-pointer"
                              title="Record 1 sale (-1 stock)"
                              aria-label="Record sale"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </TableCell>

                        {/* Stock Stepper Column */}
                        <TableCell>
                          <div className="inline-flex items-center gap-1.5 rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/30 px-1.5 py-1">
                            <button
                              type="button"
                              disabled={stockQty <= 0}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRequestDirectStockChange(p, -1)
                              }}
                              className="h-6 w-6 rounded flex items-center justify-center border border-jds-outline-variant/40 bg-jds-surface hover:bg-jds-surface-container-high transition-all disabled:opacity-30 disabled:pointer-events-none text-xs cursor-pointer"
                              title="Decrease stock by 1"
                              aria-label="Decrease stock"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenStockStepper(p, 0)
                              }}
                              className="font-mono text-body-sm font-semibold text-jds-on-surface cursor-pointer px-1.5 py-0.5 rounded hover:bg-jds-surface-container hover:text-jds-primary transition-colors min-w-[32px] text-center"
                              title="Click to open restock adjustment modal"
                            >
                              {stockQty}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRequestDirectStockChange(p, +1)
                              }}
                              className="h-6 w-6 rounded flex items-center justify-center border border-jds-outline-variant/40 bg-jds-surface hover:bg-jds-surface-container-high transition-all text-xs cursor-pointer"
                              title="Increase stock by 1"
                              aria-label="Increase stock"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </TableCell>

                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-label-sm uppercase tracking-wide font-bold ${badge.badgeClass}`}
                          >
                            {badge.label}
                          </span>
                        </TableCell>

                        {/* Quick Actions Column */}
                        <TableCell className="text-right pr-6">
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
                              className="text-jds-on-surface-variant hover:bg-jds-surface-container hover:text-jds-primary disabled:opacity-30 disabled:pointer-events-none rounded-lg cursor-pointer"
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
                              className="text-jds-on-surface-variant hover:bg-jds-surface-container hover:text-jds-primary rounded-lg cursor-pointer"
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
                              className="text-jds-on-surface-variant hover:bg-jds-surface-container hover:text-jds-primary rounded-lg cursor-pointer"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Table/Card Footer with Count and View All Link */}
        <div className="border-t border-jds-outline-variant/20 px-6 py-4 bg-jds-surface-container-low/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-label-md text-jds-on-surface-variant">
          <div>
            Showing <span className="font-bold text-jds-on-surface">{Math.min(filteredProducts.length, 8)}</span> of{' '}
            <span className="font-bold text-jds-on-surface">{filteredProducts.length}</span> matching products
            {filteredProducts.length !== totalProducts && (
              <span className="text-xs text-jds-on-surface-variant/70 ml-1.5">
                (filtered from {totalProducts} total)
              </span>
            )}
          </div>
          {onNavigate && filteredProducts.length > 8 && (
            <button
              onClick={() => onNavigate('products')}
              className="inline-flex items-center gap-1.5 text-label-sm font-bold text-jds-primary hover:underline cursor-pointer"
            >
              <span>View all {filteredProducts.length} in Products Screen</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SLIDE-OVER RIGHT INSPECTOR DRAWER (Inspect | Audit Stock | Edit Specs) */}
      <InspectorDrawer
        isOpen={Boolean(inspectedProduct)}
        onClose={handleCloseEdit}
        disableClose={updatingStock || savingProduct}
        subtitle={`Equipment #${inspectedProduct?.id ?? ''} · ${inspectedProduct?.type || 'Solar Hardware'}`}
        title={inspectedProduct?.name}
        tabs={[
          { id: 'inspect', label: 'Inspect' },
          { id: 'audit', label: 'Audit Stock' },
          { id: 'edit', label: 'Edit Specs' },
        ]}
        activeTab={inspectorTab}
        onTabChange={(nextTab) => {
          setInspectorTab(nextTab)
          setShowConfirmModal(false)
        }}
        footer={
          inspectorTab === 'inspect' ? (
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
              <Button
                type="button"
                variant="outline"
                disabled={savingProduct}
                onClick={handleCloseEdit}
                className="jds-btn-motion border-jds-outline-variant text-jds-on-surface-variant h-10 px-4 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Discard Changes
              </Button>
              <Button
                type="button"
                disabled={savingProduct}
                onClick={handleInitiateSave}
                className="jds-btn-motion bg-jds-primary text-jds-on-primary h-10 px-5 rounded-lg text-xs font-bold cursor-pointer ml-auto"
              >
                Review &amp; Save
              </Button>
            </>
          )
        }
      >
        {inspectedProduct && inspectorTab === 'inspect' && (() => {
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
                        {inspectedProduct.price_range || (inspectedProduct.min_price ? `₱${Number(inspectedProduct.min_price).toLocaleString()}` : 'Not set')}
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
                        {badge.label}
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
                    <span className="font-bold text-sm text-jds-on-surface tabular-nums">
                      {branch.quiapo.stock} units
                    </span>
                    <span className="text-[11px] text-jds-on-surface-variant block tabular-nums">
                      {branch.quiapo.available} available
                    </span>
                  </div>
                  <div className="rounded-lg bg-jds-surface-container-lowest p-2.5 border border-jds-outline-variant/25">
                    <span className="text-jds-on-surface-variant block text-[11px]">Cavite Hub</span>
                    <span className="font-bold text-sm text-jds-on-surface tabular-nums">
                      {branch.cavite.stock} units
                    </span>
                    <span className="text-[11px] text-jds-on-surface-variant block tabular-nums">
                      {branch.cavite.available} available
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-jds-on-surface-variant mb-2.5">
                  Inventory Snapshot
                </h3>
                <div className="border-l-2 border-jds-outline-variant pl-3.5 ml-1.5 space-y-3 text-xs">
                  <div className="relative">
                    <span className="w-2 h-2 rounded-full bg-jds-primary absolute -left-[19px] top-1" />
                    <p className="font-semibold text-jds-on-surface">
                      Current stock: {badge.quantity} units ({Number(inspectedProduct.reserved_quantity || 0)} reserved)
                    </p>
                    <p className="text-jds-on-surface-variant">
                      Warranty: {inspectedProduct.warranty || `${inspectedProduct.default_warranty_months || 12} months`}
                    </p>
                  </div>
                  <div className="relative">
                    <span className="w-2 h-2 rounded-full bg-jds-outline absolute -left-[19px] top-1" />
                    <p className="font-semibold text-jds-on-surface">
                      Cumulative sales: {Number(inspectedProduct.sales || 0)} units issued
                    </p>
                    <p className="text-jds-on-surface-variant">
                      {inspectedProduct.recommended_usage || 'Consultative commercial & residential solar'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {quickRestockItem && inspectorTab === 'audit' && (() => {
          const currentQty = getStockQuantity(quickRestockItem)
          const newQty = Math.max(0, Number(quickQuantity) || 0)
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low p-3.5">
                <div>
                  <span className="text-jds-on-surface-variant block text-[11px] uppercase">Current Level</span>
                  <span className="font-bold text-jds-on-surface text-base tabular-nums">{currentQty} units</span>
                </div>
                <div>
                  <span className="text-jds-on-surface-variant block text-[11px] uppercase">New Level</span>
                  <span className="font-bold text-jds-primary text-base tabular-nums">{newQty} units</span>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="drawer-stock-target" className="text-xs font-bold text-jds-on-surface block">
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
                    id="drawer-stock-target"
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
        })()}

        {editingProduct && inspectorTab === 'edit' && (
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
              {/* Field Group Tabs */}
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
                  <div className="flex gap-2">
                    <label htmlFor="drawer-img-url" className="sr-only">Paste image URL</label>
                    <input
                      id="drawer-img-url"
                      type="text"
                      value={newImageUrlInput}
                      onChange={(e) => setNewImageUrlInput(e.target.value)}
                      placeholder="Paste Storage image URL..."
                      className="h-9 flex-1 rounded-lg border border-jds-outline-variant/40 bg-jds-surface-container-lowest px-2.5 text-xs font-mono outline-none focus:border-jds-primary"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddNewImageUrl}
                      disabled={!newImageUrlInput.trim()}
                      className="h-9 text-xs border-jds-outline-variant"
                    >
                      Add URL
                    </Button>
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
                    <label htmlFor={`drawer-field-${f.key}`} className="text-xs font-semibold text-jds-on-surface-variant block">
                      {f.label}
                    </label>
                    {f.key === 'type' ? (
                      <div className="flex items-center gap-2">
                        <select
                          id={`drawer-field-${f.key}`}
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
                        id={`drawer-field-${f.key}`}
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
        )}
      </InspectorDrawer>

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
                className="rounded-lg p-1 text-jds-on-surface-variant/60 hover:bg-jds-surface-container-high hover:text-jds-on-surface transition-colors disabled:opacity-50 cursor-pointer"
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
                className="flex-1 border-jds-outline-variant text-jds-on-surface-variant h-10 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={directConfirmLoading}
                onClick={handleExecuteDirectConfirm}
                className="flex-1 bg-jds-primary text-jds-on-primary font-bold h-10 rounded-xl text-xs cursor-pointer"
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
          fetchDashboardData()
        }}
      />

      {/* RECORD SALE MODAL */}
      <RecordSaleModal
        product={saleModalProduct}
        onClose={() => setSaleModalProduct(null)}
        onSaleSuccess={(updated) => {
          setProducts((prev) =>
            prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
          )
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
