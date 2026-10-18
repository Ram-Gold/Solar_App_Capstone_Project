import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
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
  Image as ImageIcon,
  CheckCircle2,
  LayoutGrid,
  List,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table'
import RecordSaleModal from './RecordSaleModal'
import CategoryModal from './CategoryModal'
import AdminProductCard from './AdminProductCard'
import { fetchCategoriesWithCounts, DEFAULT_CATEGORIES } from '../../lib/categories'
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
  SORT_OPTIONS,
} from '../../lib/inventoryUtils'

export default function DashboardScreen({ onNavigate }) {
  const [products, setProducts] = useState([])
  const [quoteStats, setQuoteStats] = useState({ total: 0, visits: 0, pending: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState('all') // 'all' | 'out' | 'low' | 'in_stock'
  const [sortOrder, setSortOrder] = useState('stock_priority')
  const [viewMode, setViewMode] = useState('cards') // 'cards' | 'table'

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
  const editFileInputRef = useRef(null)

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

  // Quick Restock Stepper Handlers
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
      showToast('Adjustment Failed', err.message || 'Could not update product.', 'error')
    } finally {
      setDirectConfirmLoading(false)
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

  const handleCloseEdit = () => {
    setEditingProduct(null)
    setOriginalProduct(null)
    setShowConfirmModal(false)
    setPendingChanges([])
    setValidationErrors({})
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
  const outOfStockProducts = products.filter((p) => getStockTier(p) === 'out')
  const lowStockProducts = products.filter((p) => getStockTier(p) === 'low')
  const inStockProducts = products.filter((p) => getStockTier(p) !== 'out')
  const criticalAttentionCount = outOfStockProducts.length + lowStockProducts.length

  const filteredProducts = filterAndSortProducts(products, {
    search,
    stockFilter,
    sortOrder,
  })

  const cards = [
    {
      label: 'Total Products',
      value: totalProducts,
      icon: Package,
      color: 'text-jds-secondary',
      bg: 'bg-jds-secondary-container/20',
      action: () => setStockFilter('all'),
      sub: stockFilter === 'all' ? 'Filtering all products' : 'Show all products',
      active: stockFilter === 'all',
    },
    {
      label: 'Quote & Visit Tickets',
      value: quoteStats.total,
      icon: Ticket,
      color: 'text-jds-primary',
      bg: 'bg-jds-primary-container/20',
      action: () => onNavigate && onNavigate('quotes'),
      sub: `${quoteStats.visits} Visits (${quoteStats.pending} Pending)`,
    },
    {
      label: 'Low Stock Alert',
      value: lowStockProducts.length,
      icon: AlertCircle,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/20',
      action: () => setStockFilter('low'),
      sub: lowStockProducts.length > 0 ? (stockFilter === 'low' ? 'Filtered on table' : 'Filter low stock') : 'Levels normal',
      highlight: lowStockProducts.length > 0 ? 'border-amber-500/40' : '',
      active: stockFilter === 'low',
    },
    {
      label: 'Out of Stock',
      value: outOfStockProducts.length,
      icon: AlertTriangle,
      color: 'text-jds-error',
      bg: 'bg-jds-error-container/20',
      action: () => setStockFilter('out'),
      sub: outOfStockProducts.length > 0 ? (stockFilter === 'out' ? 'Filtered on table' : 'Filter out of stock') : 'Zero items depleted',
      highlight: outOfStockProducts.length > 0 ? 'border-jds-error/40' : '',
      active: stockFilter === 'out',
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
    <div className="max-w-[1200px] mx-auto space-y-8 font-inter">
      {/* Toast Alert Banner */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-md max-w-sm ${
              toast.type === 'error'
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

      <div className="space-y-1">
        <h1 className="text-headline-md font-bold text-jds-on-surface">Inventory Dashboard</h1>
        <p className="text-body-md text-jds-on-surface-variant">Strategic overview of solar product inventory and performance.</p>
      </div>

      {/* Critical Stock Alert Banner */}
      {criticalAttentionCount > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-body-md font-bold text-jds-on-surface">Inventory Replenishment Required</h3>
                <p className="text-body-sm text-jds-on-surface-variant mt-0.5">
                  {outOfStockProducts.length > 0 && (
                    <span className="font-semibold text-jds-error">
                      {outOfStockProducts.length} product{outOfStockProducts.length === 1 ? '' : 's'} completely depleted
                    </span>
                  )}
                  {outOfStockProducts.length > 0 && lowStockProducts.length > 0 && ' and '}
                  {lowStockProducts.length > 0 && (
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      {lowStockProducts.length} product{lowStockProducts.length === 1 ? '' : 's'} running low (&le; 5 units)
                    </span>
                  )}
                  . Low and depleted items are prioritized at the top of the table below for rapid review.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setStockFilter(outOfStockProducts.length > 0 ? 'out' : 'low')}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-white/60 dark:bg-black/20 px-3.5 py-2 text-label-sm font-semibold text-amber-800 dark:text-amber-300 hover:bg-white dark:hover:bg-black/40 transition-colors cursor-pointer"
              >
                <span>Filter Critical on Table</span>
              </button>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('products')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-label-sm font-semibold text-white shadow-sm hover:bg-amber-600 transition-colors shrink-0 cursor-pointer"
                >
                  <span>Manage in Products</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              onClick={card.action}
              className={`rounded-xl border bg-jds-surface-container-lowest p-6 shadow-sm hover:shadow-md transition-all ${
                card.active
                  ? 'ring-2 ring-jds-primary border-jds-primary'
                  : card.highlight || 'border-jds-outline-variant/30'
              } ${card.action ? 'cursor-pointer hover:border-jds-primary/60 hover:scale-[1.01]' : ''}`}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-label-sm font-bold uppercase tracking-wider text-jds-on-surface-variant/70">{card.label}</p>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
              <p className="text-headline-md font-bold text-jds-on-surface">{card.value}</p>
              {card.sub && (
                <div className="mt-2 flex items-center justify-between text-xs text-jds-on-surface-variant font-medium">
                  <span>{card.sub}</span>
                  {card.action && <ArrowRight className="h-3.5 w-3.5 text-jds-primary" />}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Product Overview Table with Filters & Direct Adjustments */}
      <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest overflow-hidden shadow-sm">
        <div className="border-b border-jds-outline-variant/30 px-6 py-5 bg-jds-surface-container-low/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-body-lg font-bold text-jds-on-surface">Product Inventory Overview</h2>
            <p className="text-label-md text-jds-on-surface-variant">
              Strategic inventory monitoring with lowest stock prioritization, sales tracking, and direct adjustments.
            </p>
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
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? pill.alert
                          ? 'bg-jds-error text-white shadow-xs'
                          : pill.warn
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-jds-primary text-white shadow-xs'
                        : pill.alert && pill.count > 0
                        ? 'bg-jds-error/10 text-jds-error border border-jds-error/30 hover:bg-jds-error/20'
                        : 'bg-jds-surface-container-lowest border border-jds-outline-variant/30 text-jds-on-surface-variant hover:text-jds-on-surface hover:border-jds-outline-variant'
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span
                      className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
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
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-label-sm font-bold transition-all cursor-pointer ${
                  viewMode === 'cards'
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
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-label-sm font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
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
          /* Table View */
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-jds-surface-container-low/10">
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
                      className={`hover:bg-jds-surface-container-low/20 transition-colors ${badge.rowBorderClass} ${badge.rowBgClass}`}
                    >
                      <TableCell className="font-bold text-jds-on-surface max-w-[220px]">
                        <span className="line-clamp-1" title={p.name}>{p.name}</span>
                        {p.price_range && (
                          <span className="text-[11px] font-semibold text-jds-primary block mt-0.5">
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
                            className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 disabled:opacity-30 disabled:pointer-events-none rounded-lg cursor-pointer"
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
                            className="h-8 w-8 text-jds-primary hover:bg-jds-primary/10 rounded-lg cursor-pointer"
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
                            className="h-8 w-8 text-jds-secondary hover:bg-jds-secondary-container/10 rounded-lg cursor-pointer"
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

      {/* QUICK RESTOCK / STEPPER MODAL */}
      {quickRestockItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !updatingStock) {
              setQuickRestockItem(null)
            }
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-jds-outline-variant/30 bg-jds-surface p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-jds-outline-variant/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-jds-primary/10 text-jds-primary">
                  <Boxes className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-body-md font-bold text-jds-on-surface">Adjust Inventory Stock</h3>
                  <p className="text-xs text-jds-on-surface-variant line-clamp-1">{quickRestockItem.name}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={updatingStock}
                onClick={() => setQuickRestockItem(null)}
                className="rounded-lg p-1 text-jds-on-surface-variant/60 hover:bg-jds-surface-container-high hover:text-jds-on-surface transition-colors disabled:opacity-50 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {(() => {
              const currentQty = getStockQuantity(quickRestockItem)
              const newQty = Math.max(0, Number(quickQuantity) || 0)

              return (
                <div className="space-y-4">
                  {/* Current vs Target Status Comparison */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono rounded-xl border border-jds-outline-variant/20 bg-jds-surface-container-low/30 p-3">
                    <div>
                      <span className="text-jds-on-surface-variant block text-[10px] uppercase">Current Level</span>
                      <span className="font-bold text-jds-on-surface text-body-sm">{currentQty} units</span>
                    </div>
                    <div>
                      <span className="text-jds-on-surface-variant block text-[10px] uppercase">New Level</span>
                      <span className="font-bold text-jds-primary text-body-sm">{newQty} units</span>
                    </div>
                  </div>

                  {/* Quantity Stepper Input */}
                  <div className="space-y-2">
                    <label className="text-label-sm font-bold text-jds-on-surface">Target Units in Stock</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={newQty <= 0}
                        onClick={() => setQuickQuantity((prev) => Math.max(0, Number(prev || 0) - 1))}
                        className="h-11 w-11 rounded-xl border border-jds-outline-variant/40 bg-jds-surface-container-low/40 flex items-center justify-center hover:bg-jds-surface-container-high transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={quickQuantity}
                        onChange={(e) => setQuickQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="h-11 flex-1 text-center font-mono font-bold text-body-lg rounded-xl border border-jds-outline-variant/40 bg-jds-surface outline-none focus:border-jds-primary transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setQuickQuantity((prev) => Number(prev || 0) + 1)}
                        className="h-11 w-11 rounded-xl border border-jds-outline-variant/40 bg-jds-surface-container-low/40 flex items-center justify-center hover:bg-jds-surface-container-high transition-all cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="grid grid-cols-5 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setQuickQuantity(0)}
                        className="rounded-lg border border-jds-error/30 bg-jds-error-container/10 py-1.5 text-xs font-bold text-jds-error hover:bg-jds-error-container/20 transition-all cursor-pointer"
                      >
                        Set 0
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickQuantity((prev) => Math.max(0, Number(prev || 0) - 5))}
                        className="rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/30 py-1.5 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container-high transition-all cursor-pointer"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickQuantity((prev) => Number(prev || 0) + 1)}
                        className="rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/30 py-1.5 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container-high transition-all cursor-pointer"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickQuantity((prev) => Number(prev || 0) + 5)}
                        className="rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/30 py-1.5 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container-high transition-all cursor-pointer"
                      >
                        +5
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickQuantity((prev) => Number(prev || 0) + 10)}
                        className="rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/30 py-1.5 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container-high transition-all cursor-pointer"
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
                className="flex-1 border-jds-outline-variant text-jds-on-surface-variant h-11 rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={updatingStock}
                onClick={handleQuickRestockSave}
                className="flex-1 bg-jds-primary text-jds-on-primary font-bold h-11 rounded-xl cursor-pointer"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !directConfirmLoading) {
              setDirectConfirmAction(null)
            }
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-jds-outline-variant/30 bg-jds-surface p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
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

      {/* FULL PRODUCT EDIT MODAL */}
      {editingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingProduct) {
              handleCloseEdit()
            }
          }}
        >
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-jds-outline-variant/30 bg-jds-surface shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
            {/* Diff Confirmation Dialog Overlay */}
            {showConfirmModal && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-6">
                <div className="w-full max-w-lg rounded-2xl border border-jds-primary/40 bg-jds-surface p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-3 border-b border-jds-outline-variant/20 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-jds-primary/10 text-jds-primary shrink-0">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-body-lg font-bold text-jds-on-surface">Review & Confirm Updates</h4>
                      <p className="text-label-sm text-jds-on-surface-variant font-medium">
                        {pendingChanges.length} specification{pendingChanges.length === 1 ? '' : 's'} modified for {editingProduct.name}
                      </p>
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
                    {pendingChanges.map((chg) => (
                      <div
                        key={chg.key}
                        className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/30 p-3 text-xs space-y-1.5"
                      >
                        <div className="font-bold text-jds-on-surface flex items-center justify-between">
                          <span>{chg.label}</span>
                          <span className="font-mono text-[11px] text-jds-on-surface-variant/70">{chg.key}</span>
                        </div>
                        {chg.isImage ? (
                          <div className="flex items-center gap-3 pt-1">
                            {chg.oldImgUrl && (
                              <img
                                src={chg.oldImgUrl}
                                alt="Old"
                                className="h-10 w-10 rounded-lg object-contain border border-jds-outline-variant/30 bg-black/5"
                              />
                            )}
                            <ArrowRight className="h-4 w-4 text-jds-primary shrink-0" />
                            {chg.newImgUrl && (
                              <img
                                src={chg.newImgUrl}
                                alt="New"
                                className="h-10 w-10 rounded-lg object-contain border border-jds-primary/50 bg-black/5"
                              />
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 font-mono text-[11px]">
                            <span className="line-through text-jds-error/80 bg-jds-error-container/20 px-2 py-0.5 rounded">
                              {chg.oldValue}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 text-jds-primary shrink-0" />
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                              {chg.newValue}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-jds-outline-variant/20">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={savingProduct}
                      onClick={() => setShowConfirmModal(false)}
                      className="border-jds-outline-variant text-jds-on-surface-variant h-11 px-5 rounded-xl cursor-pointer"
                    >
                      Back to Editing
                    </Button>
                    <Button
                      type="button"
                      onClick={handleEditSave}
                      disabled={savingProduct}
                      className="bg-jds-primary text-jds-on-primary font-bold px-6 h-11 rounded-xl cursor-pointer"
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
                className="rounded-lg p-1.5 text-jds-on-surface-variant/60 hover:bg-jds-surface-container-high hover:text-jds-on-surface transition-colors disabled:opacity-50 cursor-pointer"
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
                  className={`px-3 py-1.5 rounded-lg text-label-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeEditTab === tab.id
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
                          className="h-8 text-xs gap-1.5 border-jds-outline-variant cursor-pointer"
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
                          className="h-11 flex-1 rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-3 text-body-md outline-none focus:bg-jds-surface-container-lowest focus:border-jds-secondary transition-all cursor-pointer"
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
                          className="h-11 w-11 flex items-center justify-center rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/20 hover:bg-jds-primary/10 hover:border-jds-primary hover:text-jds-primary text-jds-on-surface-variant transition-all shrink-0 cursor-pointer"
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
                        className={`h-11 w-full rounded-xl border bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:bg-jds-surface-container-lowest transition-all ${
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
                      className="h-11 w-full rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all cursor-pointer"
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
                  className="border-jds-outline-variant text-jds-on-surface-variant hover:bg-jds-surface-container-high h-11 px-5 rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleInitiateSave}
                  disabled={savingProduct}
                  className="bg-jds-primary text-jds-on-primary font-bold px-7 h-11 rounded-xl cursor-pointer"
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
