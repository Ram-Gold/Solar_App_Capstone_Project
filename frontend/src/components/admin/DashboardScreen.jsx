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
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table'
import RecordSaleModal from './RecordSaleModal'
import CategoryModal from './CategoryModal'
import AdminProductCard from './AdminProductCard'
import ProductInspectorDrawer from './ProductInspectorDrawer'
import ViewModeToggle from './ViewModeToggle'
import { fetchCategoriesWithCounts, DEFAULT_CATEGORIES } from '../../lib/categories'
import { notifyOpsUpdated } from '../../lib/inquiryStatusUtils'
import {
  getStockQuantity,
  getStockTier,
  getStockBadgeConfig,
  filterAndSortProducts,
  SORT_OPTIONS,
} from '../../lib/inventoryUtils'
import {
  inventoryOperations,
  createDebouncedStockQueue,
} from '../../lib/inventoryOperations'
import useModalBehavior from '../../hooks/useModalBehavior'

export default function DashboardScreen({ onNavigate }) {
  const auth = useAuth() || {}
  const isStaff = auth.role === 'staff'
  const [products, setProducts] = useState([])
  const [quoteStats, setQuoteStats] = useState({ total: 0, visits: 0, pending: 0 })
  const [openClaimsCount, setOpenClaimsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [stockFilter, setStockFilter] = useState('all') // 'all' | 'out' | 'low' | 'in_stock'
  const [sortOrder, setSortOrder] = useState('stock_priority')
  const [viewMode, setViewMode] = useState('table') // 'table' | 'cards'
  const [inspectorState, setInspectorState] = useState(null) // { product, tab: 'inspect' | 'audit' | 'edit' }

  // Toast feedback
  const [toast, setToast] = useState(null)
  const showToast = useCallback((title, message, type = 'info') => {
    setToast({ title, message, type })
    setTimeout(() => {
      setToast((curr) => (curr?.title === title ? null : curr))
    }, 4500)
  }, [])

  // Categories
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)

  // Modals state
  const [saleModalProduct, setSaleModalProduct] = useState(null)

  // Direct Button Handlers Confirmation State (for Sales + / -)
  const [directConfirmAction, setDirectConfirmAction] = useState(null)
  const [directConfirmLoading, setDirectConfirmLoading] = useState(false)

  const handleCloseEdit = useCallback(() => {
    setInspectorState(null)
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

      if (prodData) setProducts(prodData.filter((p) => !p.is_archived))

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
  const handleOpenInspector = useCallback((product, tab = 'inspect') => {
    if (!product) return
    setInspectorState({ product, tab })
  }, [])

  const handleOpenStockStepper = useCallback((product) => {
    handleOpenInspector(product, 'audit')
  }, [handleOpenInspector])

  const handleOpenEditProduct = useCallback((product) => {
    handleOpenInspector(product, 'edit')
  }, [handleOpenInspector])

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
      showToast('Adjustment Failed', err.message || 'Could not update product.', 'error')
    } finally {
      setDirectConfirmLoading(false)
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
    typeFilter,
    sortOrder,
  })

  const dashboardTypes = ['All Types', ...new Set(products.map((p) => p.type).filter(Boolean))]

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
    <div className="max-w-[1440px] mx-auto space-y-4 font-inter">
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
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-jds-on-surface">
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
              className="jds-btn-motion jds-focus-ring border-jds-outline-variant bg-jds-surface text-jds-on-surface hover:bg-jds-surface-container h-9 px-3.5 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <Boxes className="h-4 w-4 mr-1.5" />
              Audit Stock
            </Button>
          )}
          {onNavigate && (
            <Button
              type="button"
              onClick={() => onNavigate('register-sale')}
              className="jds-btn-motion jds-focus-ring bg-jds-primary text-jds-on-primary hover:bg-jds-primary/90 h-9 px-3.5 rounded-lg text-xs font-bold cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Register Sale
            </Button>
          )}
        </div>
      </div>

      {/* Critical Stock Alert Banner */}
      {criticalAttentionCount > 0 && (
        <div className="rounded-xl border border-jds-outline-variant border-l-4 border-l-jds-primary bg-jds-surface-container-lowest p-3.5 sm:p-4">
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
              className={`jds-card-motion jds-focus-ring text-left rounded-xl border bg-jds-surface-container-lowest p-4 sm:p-5 transition-colors ${card.active
                ? 'ring-2 ring-jds-primary border-jds-primary'
                : card.highlight || 'border-jds-outline-variant'
                } ${card.action ? 'cursor-pointer hover:bg-jds-surface-container-low hover:border-jds-primary/45' : ''}`}
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
      <div className="jds-panel overflow-hidden">
        <div className="border-b border-jds-outline-variant/60 px-5 py-4 bg-jds-surface-container-low/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
        <div className="p-3 sm:p-4 border-b border-jds-outline-variant/60 bg-jds-surface flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[190px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-jds-on-surface-variant/50 pointer-events-none" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="jds-control w-full pl-9 pr-3"
            />
          </div>

          {/* Category Filter Dropdown */}
          <select
            aria-label="Filter by category"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="jds-control font-semibold cursor-pointer"
          >
            {dashboardTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Stock Level Dropdown */}
          <select
            aria-label="Filter by stock status"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="jds-control font-semibold cursor-pointer"
          >
            <option value="all">All Stock ({totalProducts})</option>
            <option value="out">Out of Stock ({outOfStockProducts.length})</option>
            <option value="low">Low Stock ({lowStockProducts.length})</option>
            <option value="in_stock">In Stock ({inStockProducts.length})</option>
          </select>

          {/* Sort Dropdown */}
          <select
            id="dashboardSortOrder"
            aria-label="Sort inventory"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="jds-control font-semibold cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>

          {(search || typeFilter !== 'All Types' || stockFilter !== 'all' || sortOrder !== 'stock_priority') && (
            <button
              onClick={() => {
                setSearch('')
                setTypeFilter('All Types')
                setStockFilter('all')
                setSortOrder('stock_priority')
              }}
              className="jds-control font-semibold text-jds-on-surface-variant hover:text-jds-primary hover:border-jds-primary flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Reset filters and sorting"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}

          <div className="ml-auto">
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="px-6 py-16 text-center text-body-md text-jds-on-surface-variant space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-jds-surface-container text-jds-on-surface-variant mx-auto">
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
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Power</TableHead>
                    <TableHead>Sales</TableHead>
                    <TableHead>Stock Units</TableHead>
                    <TableHead>Inventory Status</TableHead>
                    <TableHead className="text-right pr-6">Quick Actions</TableHead>
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
                        className={`cursor-pointer ${badge.rowBorderClass} ${badge.rowBgClass}`}
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
        <div className="border-t border-jds-outline-variant/60 px-5 py-3.5 bg-jds-surface-container-low/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-label-md text-jds-on-surface-variant">
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
      <ProductInspectorDrawer
        product={inspectorState?.product || null}
        initialTab={inspectorState?.tab || 'inspect'}
        isStaff={isStaff}
        categories={categories}
        inventoryOps={inventoryOperations}
        onProductUpdated={(updated) => {
          setProducts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)))
        }}
        onOpenCategories={() => setIsCategoryModalOpen(true)}
        onOpenRecordSale={(prod) => setSaleModalProduct(prod)}
        onClose={handleCloseEdit}
        onToast={showToast}
      />

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
          notifyOpsUpdated('inventory')
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
