/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Button } from '../ui/button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table'
import {
  Search,
  Plus,
  Trash2,
  Tag,
  AlertTriangle,
  AlertCircle,
  Package,
  Boxes,
  ShoppingBag,
  X,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  Archive,
} from 'lucide-react'
import { getMainProductImage } from '../../lib/productImageUtils'
import { useAuth } from '../../context/AuthContext'
import { notifyOpsUpdated } from '../../lib/inquiryStatusUtils'
import CategoryModal from './CategoryModal'
import RecordSaleModal from './RecordSaleModal'
import AdminProductCard from './AdminProductCard'
import ProductTableRow from './ProductTableRow'
import ProductInspectorDrawer, {
  EDIT_FIELDS,
  EDIT_FIELD_GROUPS,
  getChangedFields,
} from './ProductInspectorDrawer'
import ImagesScreen from './ImagesScreen'
import ViewModeToggle from './ViewModeToggle'
import { fetchCategoriesWithCounts, DEFAULT_CATEGORIES } from '../../lib/categories'
import {
  getStockQuantity,
  SORT_OPTIONS,
  isProductArchived,
} from '../../lib/inventoryUtils'
import {
  inventoryOperations,
  createDebouncedStockQueue,
} from '../../lib/inventoryOperations'
import useModalBehavior from '../../hooks/useModalBehavior'
import useIsMobile from '../../hooks/useIsMobile'
import useCatalogQueryAndSelection from '../../hooks/useCatalogQueryAndSelection'

export { EDIT_FIELDS, EDIT_FIELD_GROUPS, getChangedFields }

export default function ProductsScreen({ onNavigate, initialTab = 'catalog' }) {
  const [activeSection, setActiveSection] = useState(initialTab) // 'catalog' | 'archived' | 'media'
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

  // Bulk Selection & Mass Actions State
  const [bulkActionModal, setBulkActionModal] = useState(null) // { mode: 'archive' | 'restore' | 'delete', ids: number[], blockedIds?: number[] }
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const selectAllRef = useRef(null)

  // Sale Modal State
  const [saleModalProduct, setSaleModalProduct] = useState(null)

  // Direct Adjustment Confirmation State (for Sales + / -)
  const [directConfirmAction, setDirectConfirmAction] = useState(null)
  const [directConfirmLoading, setDirectConfirmLoading] = useState(false)

  // Inspector Drawer State
  const [inspectorState, setInspectorState] = useState(null) // { product, tab: 'inspect' | 'audit' | 'edit' }

  // Delete Confirmation State
  const [productToDelete, setProductToDelete] = useState(null)
  const [deletingProduct, setDeletingProduct] = useState(false)

  const isMobile = useIsMobile()

  const {
    activeProducts,
    archivedProducts,
    sectionProducts,
    outOfStockProducts,
    lowStockProducts,
    optimalStockProducts,
    filteredProducts: prioritizedFiltered,
    visibleIds,
    selectedIds,
    setSelectedIds,
    selectedCount,
    selectedHiddenCount,
    allVisibleSelected,
    someVisibleSelected,
    handleToggleSelect: toggleSelectProduct,
    handleToggleSelectAllVisible,
    handleClearHidden,
    clearSelection,
  } = useCatalogQueryAndSelection(products, {
    activeSection,
    search,
    typeFilter,
    powerFilter,
    stockFilter,
    sortOrder,
  })

  const handleCloseEdit = useCallback(() => {
    setInspectorState(null)
  }, [])

  const anyProductModalOpen = Boolean(
    directConfirmAction ||
    productToDelete ||
    bulkActionModal
  )

  useModalBehavior({
    isOpen: anyProductModalOpen,
    onClose: () => {
      if (bulkActionModal && !bulkActionLoading) setBulkActionModal(null)
      else if (productToDelete && !deletingProduct) setProductToDelete(null)
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
  const handleInitiateDelete = useCallback((product) => {
    setProductToDelete(product)
  }, [])

  const handleConfirmDelete = async () => {
    if (!productToDelete) return
    setDeletingProduct(true)
    try {
      const { deletedIds, blockedIds } = await inventoryOperations.bulkDeleteSafe([productToDelete.id])
      if (blockedIds.length > 0 && deletedIds.length === 0) {
        setProductToDelete(null)
        setBulkActionModal({ mode: 'delete-blocked', ids: [], blockedIds })
        showToast(
          'Cannot Permanently Delete',
          `${productToDelete.name} has recorded customer purchases. Archive it instead to preserve warranty records.`,
          'info'
        )
        return
      }
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(productToDelete.id)
        return next
      })
      notifyOpsUpdated('inventory')
      showToast('Product Removed', `${productToDelete.name} was permanently removed from the catalog.`, 'info')
      setProductToDelete(null)
    } catch (err) {
      console.error('Failed to delete product:', err)
      showToast('Deletion Failed', err.message || 'Failed to delete product.', 'error')
    } finally {
      setDeletingProduct(false)
    }
  }

  // Single-item archive / restore toggle
  const handleArchiveToggle = useCallback(async (product) => {
    const nextArchived = !isProductArchived(product)
    try {
      await inventoryOperations.bulkArchive([product.id], nextArchived)
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? { ...p, is_archived: nextArchived, archived_at: nextArchived ? new Date().toISOString() : null }
            : p
        )
      )
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(product.id)
        return next
      })
      notifyOpsUpdated('inventory')
      showToast(
        nextArchived ? 'Product Archived' : 'Product Restored',
        nextArchived
          ? `${product.name} moved to Archived Products.`
          : `${product.name} restored to Active Catalog.`,
        'info'
      )
    } catch (err) {
      showToast('Update Failed', err.message || 'Could not update archive status.', 'error')
    }
  }, [setSelectedIds, showToast])

  const handleConfirmBulkAction = async () => {
    if (!bulkActionModal) return
    setBulkActionLoading(true)
    try {
      if (bulkActionModal.mode === 'archive' || bulkActionModal.mode === 'restore') {
        const archive = bulkActionModal.mode === 'archive'
        const { updatedIds } = await inventoryOperations.bulkArchive(bulkActionModal.ids, archive)
        const updatedSet = new Set(updatedIds)
        const nowIso = new Date().toISOString()
        setProducts((prev) =>
          prev.map((p) =>
            updatedSet.has(p.id) ? { ...p, is_archived: archive, archived_at: archive ? nowIso : null } : p
          )
        )
        clearSelection()
        setBulkActionModal(null)
        notifyOpsUpdated('inventory')
        showToast(
          archive ? 'Products Archived' : 'Products Restored',
          `${updatedIds.length} product${updatedIds.length === 1 ? '' : 's'} ${archive ? 'moved to Archived Products' : 'restored to Active Catalog'}.`,
          'success'
        )
      } else if (bulkActionModal.mode === 'delete') {
        const { deletedIds, blockedIds } = await inventoryOperations.bulkDeleteSafe(bulkActionModal.ids)
        if (deletedIds.length > 0) {
          const deletedSet = new Set(deletedIds)
          setProducts((prev) => prev.filter((p) => !deletedSet.has(p.id)))
        }
        clearSelection()
        notifyOpsUpdated('inventory')

        if (blockedIds.length > 0) {
          setBulkActionModal({ mode: 'delete-blocked', ids: deletedIds, blockedIds })
          showToast(
            deletedIds.length > 0 ? 'Partial Delete Completed' : 'Delete Blocked by Warranty Records',
            `${deletedIds.length} deleted; ${blockedIds.length} linked to customer purchases can be archived instead.`,
            'info'
          )
        } else {
          setBulkActionModal(null)
          showToast(
            'Products Deleted',
            `${deletedIds.length} product${deletedIds.length === 1 ? '' : 's'} permanently removed.`,
            'info'
          )
        }
      } else if (bulkActionModal.mode === 'delete-blocked') {
        const { updatedIds } = await inventoryOperations.bulkArchive(bulkActionModal.blockedIds, true)
        const updatedSet = new Set(updatedIds)
        const nowIso = new Date().toISOString()
        setProducts((prev) =>
          prev.map((p) =>
            updatedSet.has(p.id) ? { ...p, is_archived: true, archived_at: nowIso } : p
          )
        )
        setBulkActionModal(null)
        notifyOpsUpdated('inventory')
        showToast(
          'Linked Products Archived',
          `${updatedIds.length} product${updatedIds.length === 1 ? '' : 's'} moved to Archived Products safely.`,
          'success'
        )
      }
    } catch (err) {
      console.error('Bulk action failed:', err)
      showToast('Bulk Action Failed', err.message || 'Unable to complete batch action.', 'error')
    } finally {
      setBulkActionLoading(false)
    }
  }

  // Inspector Drawer openers
  const handleOpenInspector = useCallback((product, tab = 'inspect') => {
    setInspectorState({ product, tab })
  }, [])

  const handleOpenEditProduct = useCallback((product, tabOverride = 'edit') => {
    setInspectorState({ product, tab: tabOverride })
  }, [])

  const handleOpenStockStepper = useCallback((product) => {
    setInspectorState({ product, tab: 'audit' })
  }, [])

  // Optimistic + Debounced Direct Stock Queue (~400ms)
  const stockQueueRef = useRef(null)
  useEffect(() => {
    const queue = createDebouncedStockQueue({
      operations: inventoryOperations,
      delayMs: 400,
      onSnapshot: (updatedProduct) => {
        setProducts((prev) =>
          prev.map((p) => (p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p))
        )
      },
      onRollback: (productId, baseline) => {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, ...baseline } : p))
        )
      },
      onError: (err) => {
        showToast('Stock Update Failed', err?.message || 'Could not save stock change. Reverted.', 'error')
      },
    })
    stockQueueRef.current = queue
    return () => {
      queue.flushAll()
      stockQueueRef.current = null
    }
  }, [showToast])

  const handleRequestDirectStockChange = useCallback((product, delta) => {
    const currentStock = getStockQuantity(product)
    if (delta < 0 && currentStock <= 0) return
    stockQueueRef.current?.queueDelta(product, delta)
  }, [])

  // Direct Sale Adjustment Handlers (with Confirmation Modal)
  const handleRequestDirectSaleChange = useCallback((product, delta) => {
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
  }, [])

  const handleExecuteDirectConfirm = async () => {
    if (!directConfirmAction) return
    setDirectConfirmLoading(true)
    const { product, delta, targetStock, targetSales } = directConfirmAction

    try {
      if (delta > 0) {
        const res = await inventoryOperations.recordSale(product, { unitsSold: 1, branch: 'Quiapo' })
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id
              ? {
                  ...p,
                  stock_quantity: res.newStock,
                  sales: res.newSales,
                  in_stock: res.newInStock,
                  ...(res.stock_quiapo !== undefined ? { stock_quiapo: res.stock_quiapo } : {}),
                  ...(res.stock_cavite !== undefined ? { stock_cavite: res.stock_cavite } : {}),
                }
              : p
          )
        )
      } else {
        const updatedStock = await inventoryOperations.setStockLevel(product, targetStock)
        const { data, error } = await supabase
          .from('products')
          .update({ sales: targetSales })
          .eq('id', product.id)
          .select()
        if (error) throw error
        const updated = data && data.length > 0 ? { ...updatedStock, ...data[0] } : { ...updatedStock, sales: targetSales }
        setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, ...updated } : p)))
      }
      notifyOpsUpdated('inventory')
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

  const totalProducts = sectionProducts.length
  const types = ['All Types', ...new Set([...categories, ...sectionProducts.map((p) => p.type).filter(Boolean)])]

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

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected
    }
  }, [someVisibleSelected])

  const handleSectionChange = (nextSection) => {
    setActiveSection(nextSection)
    clearSelection()
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
    <div className="max-w-[1440px] mx-auto space-y-4">
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

      {/* Simplified Header Section with Mode Dropdown */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-lg sm:text-xl font-bold text-jds-on-surface">Products</h1>
          <select
            aria-label="Products section"
            value={activeSection}
            onChange={(e) => handleSectionChange(e.target.value)}
            className="jds-control px-3 font-bold cursor-pointer"
          >
            <option value="catalog">Active Catalog ({activeProducts.length})</option>
            <option value="archived">Archived ({archivedProducts.length})</option>
            <option value="media">Media Library</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-jds-outline-variant bg-jds-surface-container-lowest text-jds-on-surface hover:bg-jds-surface-container-low h-9 px-3 gap-1.5 rounded-lg text-xs font-semibold"
            title="Synchronize database records"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-jds-primary' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCategoryModalOpen(true)}
            className="border-jds-outline-variant bg-jds-surface-container-lowest text-jds-on-surface hover:bg-jds-surface-container-low hover:border-jds-primary hover:text-jds-primary rounded-lg px-3 gap-1.5 h-9 text-xs font-semibold transition-colors"
          >
            <Tag className="h-3.5 w-3.5" />
            <span>Categories ({categories.length})</span>
          </Button>

          <Button
            onClick={() => onNavigate('add-product')}
            className="bg-jds-primary text-jds-on-primary hover:opacity-90 rounded-lg px-4 h-9 gap-1.5 text-xs font-bold cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Equipment</span>
          </Button>
        </div>
      </div>

      {activeSection === 'media' ? (
        <ImagesScreen embedded />
      ) : (
        <>

      {/* Simplified Single Filter & View Toolbar */}
      <div className="jds-panel p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-jds-on-surface-variant/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, category, or watt..."
              className="jds-control w-full pl-9 pr-8"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-jds-on-surface-variant/50 hover:text-jds-on-surface transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <select
            aria-label="Filter by category"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="jds-control px-3 font-semibold cursor-pointer"
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Stock Level Dropdown */}
          <select
            aria-label="Filter by stock level"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="jds-control px-3 font-semibold cursor-pointer"
          >
            <option value="All Stock">All Stock ({totalProducts})</option>
            <option value="Attention Needed (Low & Out)">
              Attention Needed ({outOfStockProducts.length + lowStockProducts.length})
            </option>
            <option value="Out of Stock (0 units)">Out of Stock ({outOfStockProducts.length})</option>
            <option value="Low Stock (1-5 units)">Low Stock ({lowStockProducts.length})</option>
            <option value="In Stock (> 5 units)">Optimal Stock ({optimalStockProducts.length})</option>
          </select>

          {/* Power Output Dropdown */}
          <select
            aria-label="Filter by power output"
            value={powerFilter}
            onChange={(e) => setPowerFilter(e.target.value)}
            className="jds-control px-3 font-semibold cursor-pointer"
          >
            <option value="All Power">All Power</option>
            <option value="Under 200W">&lt; 200W</option>
            <option value="200W - 400W">200W - 400W</option>
            <option value="Above 400W">&gt; 400W</option>
          </select>

          {/* Sort Dropdown */}
          <select
            id="sortOrderSelect"
            aria-label="Sort products"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="jds-control px-3 font-semibold cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>

          {isAnyFilterActive && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="jds-control px-3 font-semibold text-jds-on-surface-variant hover:text-jds-primary hover:border-jds-primary flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Reset all search queries and active filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}

          <div className="ml-auto">
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>
        </div>
      </div>

      {/* Floating Minimal Bottom-Center Bulk Action Bar (opaque elevated surface, no backdrop-blur repaint) */}
      {selectedCount > 0 && (
        <div
          role="region"
          aria-label="Bulk product actions"
          className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-1.5rem)] inline-flex items-center gap-1.5 rounded-full border border-jds-outline-variant bg-jds-surface-container-lowest px-2.5 py-1.5 shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-150"
        >
          <span className="inline-flex items-center rounded-full bg-jds-primary/10 px-2.5 py-1 text-xs font-bold text-jds-primary tabular-nums whitespace-nowrap">
            {selectedCount} selected{selectedHiddenCount > 0 ? ` (${selectedHiddenCount} hidden)` : ''}
          </span>

          {selectedHiddenCount > 0 && (
            <button
              type="button"
              onClick={handleClearHidden}
              className="inline-flex items-center h-7 px-2.5 rounded-full border border-jds-outline-variant/60 bg-jds-surface text-jds-on-surface-variant hover:text-jds-on-surface text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              Clear hidden
            </button>
          )}

          <span className="h-4 w-px bg-jds-outline-variant/50 shrink-0" aria-hidden="true" />

          {activeSection === 'archived' ? (
            <button
              type="button"
              aria-label="Restore Selected"
              onClick={() => setBulkActionModal({ mode: 'restore', ids: Array.from(selectedIds) })}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-jds-primary/40 bg-jds-surface text-jds-primary hover:bg-jds-primary hover:text-jds-on-primary text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
              <span>Restore</span>
            </button>
          ) : (
            <button
              type="button"
              aria-label="Archive Selected"
              onClick={() => setBulkActionModal({ mode: 'archive', ids: Array.from(selectedIds) })}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-jds-outline-variant/60 bg-jds-surface text-jds-on-surface hover:border-jds-primary hover:text-jds-primary text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
            >
              <Archive className="h-3.5 w-3.5 shrink-0" />
              <span>Archive</span>
            </button>
          )}

          {role === 'admin' && (
            <button
              type="button"
              aria-label="Delete Selected"
              onClick={() => setBulkActionModal({ mode: 'delete', ids: Array.from(selectedIds) })}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-jds-error text-jds-on-error hover:bg-jds-error/90 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              <span>Delete</span>
            </button>
          )}

          <button
            type="button"
            onClick={clearSelection}
            aria-label="Clear selection"
            title="Clear selection"
            className="inline-flex items-center justify-center h-7 w-7 rounded-full text-jds-on-surface-variant hover:bg-jds-surface-container hover:text-jds-on-surface transition-colors shrink-0 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Results Header Status */}
      <div className="flex items-center justify-between text-xs text-jds-on-surface-variant px-1">
        <div>
          Showing <span className="font-bold text-jds-on-surface">{prioritizedFiltered.length}</span> of{' '}
          <span className="font-bold text-jds-on-surface">{sectionProducts.length}</span>{' '}
          {activeSection === 'archived' ? 'archived' : 'active'} products
        </div>
        <div className="hidden sm:block text-jds-on-surface-variant/80 font-medium">
          Click any row or card to inspect &middot; Check items for bulk actions
        </div>
      </div>

      {/* Main View: Viewport-gated Table (>= md) vs Card Grid (< md or cards mode) */}
      {!isMobile && viewMode === 'table' ? (
        <div className="jds-panel overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pl-4">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={handleToggleSelectAllVisible}
                      aria-label="Select all visible products"
                      className="h-4 w-4 accent-[#b45309] rounded cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="w-16">Thumb</TableHead>
                  <TableHead className="min-w-[220px]">Equipment Details</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Power</TableHead>
                  <TableHead className="min-w-[130px]">Sales</TableHead>
                  <TableHead className="min-w-[210px]">Stock Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-5">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prioritizedFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-20 text-body-md text-jds-on-surface-variant">
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
                  prioritizedFiltered.map((p) => (
                    <ProductTableRow
                      key={p.id}
                      product={p}
                      isSelected={selectedIds.has(p.id)}
                      isStaff={isStaff}
                      isAdmin={role === 'admin'}
                      onToggleSelect={toggleSelectProduct}
                      onInspect={handleOpenInspector}
                      onAdjustStock={handleRequestDirectStockChange}
                      onAdjustSale={handleRequestDirectSaleChange}
                      onOpenStockAudit={handleOpenStockStepper}
                      onOpenRecordSale={setSaleModalProduct}
                      onEdit={handleOpenEditProduct}
                      onArchiveToggle={handleArchiveToggle}
                      onDelete={handleInitiateDelete}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        /* Main View: Responsive Card Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {prioritizedFiltered.length === 0 ? (
            <div className="col-span-full py-16 text-center jds-panel p-8 space-y-3">
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
                onArchiveToggle={handleArchiveToggle}
                showDelete={role === 'admin'}
                selectable
                selected={selectedIds.has(p.id)}
                onToggleSelect={toggleSelectProduct}
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

      {/* BULK ARCHIVE / RESTORE / DELETE CONFIRMATION MODAL */}
      {bulkActionModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !bulkActionLoading) {
              setBulkActionModal(null)
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-2xl border bg-jds-surface p-5 sm:p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 ${
              bulkActionModal.mode === 'delete'
                ? 'border-jds-error/30'
                : 'border-jds-outline-variant/40'
            }`}
          >
            <div className="flex items-start justify-between border-b border-jds-outline-variant/20 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    bulkActionModal.mode === 'delete'
                      ? 'bg-jds-error-container/30 text-jds-error'
                      : 'bg-jds-primary/10 text-jds-primary'
                  }`}
                >
                  {bulkActionModal.mode === 'delete' ? (
                    <Trash2 className="h-5 w-5" />
                  ) : bulkActionModal.mode === 'restore' ? (
                    <RotateCcw className="h-5 w-5" />
                  ) : (
                    <Archive className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-body-lg font-bold text-jds-on-surface">
                    {bulkActionModal.mode === 'archive' && `Archive ${bulkActionModal.ids.length} Product${bulkActionModal.ids.length === 1 ? '' : 's'}`}
                    {bulkActionModal.mode === 'restore' && `Restore ${bulkActionModal.ids.length} Product${bulkActionModal.ids.length === 1 ? '' : 's'}`}
                    {bulkActionModal.mode === 'delete' && `Delete ${bulkActionModal.ids.length} Product${bulkActionModal.ids.length === 1 ? '' : 's'}`}
                    {bulkActionModal.mode === 'delete-blocked' && 'Products Linked to Customer Purchases'}
                  </h3>
                  <p className="text-label-sm text-jds-on-surface-variant font-medium">
                    {bulkActionModal.mode === 'delete'
                      ? 'Permanent catalog removal'
                      : bulkActionModal.mode === 'delete-blocked'
                        ? 'Warranty history prevents permanent deletion'
                        : 'Reversible catalog update'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={bulkActionLoading}
                onClick={() => setBulkActionModal(null)}
                className="rounded-lg p-1 text-jds-on-surface-variant/60 hover:bg-jds-surface-container-high hover:text-jds-on-surface transition-colors disabled:opacity-50"
                aria-label="Close bulk confirmation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {(() => {
              const targetIds = bulkActionModal.mode === 'delete-blocked'
                ? bulkActionModal.blockedIds || []
                : bulkActionModal.ids || []
              const visibleSet = new Set(visibleIds)
              const targetItems = products.filter((p) => targetIds.includes(p.id))
              return (
                <div className="max-h-44 overflow-y-auto rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/40 divide-y divide-jds-outline-variant/20">
                  {targetItems.map((item) => {
                    const isHiddenByFilter = bulkActionModal.mode !== 'delete-blocked' && !visibleSet.has(item.id)
                    return (
                      <div key={item.id} className="px-3.5 py-2 flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-jds-on-surface truncate">
                          {item.name}
                          {isHiddenByFilter && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              Hidden by filter
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-jds-on-surface-variant shrink-0">{item.watt}W</span>
                      </div>
                    )
                  })}
                </div>
              )
            })()}

            <div
              className={`rounded-xl border p-3.5 flex items-start gap-3 ${
                bulkActionModal.mode === 'delete'
                  ? 'border-jds-error/30 bg-jds-error-container/10'
                  : 'border-jds-outline-variant/30 bg-jds-surface-container-low/40'
              }`}
            >
              <AlertTriangle
                className={`h-5 w-5 shrink-0 mt-0.5 ${
                  bulkActionModal.mode === 'delete' ? 'text-jds-error' : 'text-jds-primary'
                }`}
              />
              <p className="text-xs text-jds-on-surface-variant leading-relaxed">
                {bulkActionModal.mode === 'archive' &&
                  'Archived products are hidden from active catalogs, Browse, and Sales dropdowns while keeping customer warranty history intact. You can restore them anytime.'}
                {bulkActionModal.mode === 'restore' &&
                  'Restored products will immediately return to the Active Catalog.'}
                {bulkActionModal.mode === 'delete' &&
                  'This action is irreversible. Any selected products linked to customer purchase records will be skipped so warranty records remain intact.'}
                {bulkActionModal.mode === 'delete-blocked' &&
                  'These SKUs have recorded customer purchases and cannot be permanently deleted. Archive them instead to hide them from active catalogs while preserving warranty history.'}
              </p>
            </div>

            <div className="flex gap-3 pt-2 border-t border-jds-outline-variant/20">
              <Button
                type="button"
                variant="outline"
                disabled={bulkActionLoading}
                onClick={() => setBulkActionModal(null)}
                className="flex-1 border-jds-outline-variant text-jds-on-surface-variant h-11 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={bulkActionLoading}
                onClick={handleConfirmBulkAction}
                className={`flex-1 font-bold h-11 rounded-xl gap-2 ${
                  bulkActionModal.mode === 'delete'
                    ? 'bg-jds-error hover:bg-jds-error/90 text-jds-on-error'
                    : 'bg-jds-primary hover:bg-jds-primary/90 text-jds-on-primary'
                }`}
              >
                {bulkActionLoading ? (
                  <span>Processing...</span>
                ) : bulkActionModal.mode === 'delete' ? (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Confirm Delete</span>
                  </>
                ) : bulkActionModal.mode === 'restore' ? (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    <span>Confirm Restore</span>
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4" />
                    <span>{bulkActionModal.mode === 'delete-blocked' ? 'Archive Linked Products' : 'Confirm Archive'}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SLIDE-OVER RIGHT INSPECTOR DRAWER (Inspect | Audit Stock | Edit Specs) */}
      <ProductInspectorDrawer
        product={inspectorState?.product || null}
        initialTab={inspectorState?.tab || 'inspect'}
        isStaff={isStaff}
        categories={categories}
        inventoryOps={inventoryOperations}
        onProductUpdated={(updated) => {
          setProducts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)))
        }}
        onRequestDelete={role === 'admin' ? handleInitiateDelete : undefined}
        onOpenCategories={() => setIsCategoryModalOpen(true)}
        onOpenRecordSale={(prod) => setSaleModalProduct(prod)}
        onClose={handleCloseEdit}
        onToast={showToast}
      />

      {/* CATEGORY MANAGEMENT MODAL */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoryAdded={(newCat) => {
          setCategories((prev) => Array.from(new Set([...prev, newCat])))
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
          notifyOpsUpdated('inventory')
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
