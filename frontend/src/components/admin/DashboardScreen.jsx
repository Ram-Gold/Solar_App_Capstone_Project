import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  Package,
  Zap,
  AlertTriangle,
  AlertCircle,
  Ticket,
  ArrowRight,
  ArrowUpRight,
  Search,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table'
import RecordSaleModal from './RecordSaleModal'
import {
  getStockQuantity,
  getStockTier,
  sortProductsByStockPriority,
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
  const [saleModalProduct, setSaleModalProduct] = useState(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // First attempt querying with stock_quantity; fallback if column does not exist yet
      let prodData = null
      const { data: q1, error: err1 } = await supabase
        .from('products')
        .select('id, name, type, watt, waterproof_grade, material, battery, in_stock, sales, stock_quantity')
        .order('id')

      if (!err1 && q1) {
        prodData = q1
      } else {
        const { data: q2 } = await supabase
          .from('products')
          .select('id, name, type, watt, waterproof_grade, material, battery, in_stock, sales')
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
    <div className="max-w-[1200px] mx-auto space-y-8">
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
                  . Low and depleted items are pinned to the top of the table below for rapid review.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setStockFilter(outOfStockProducts.length > 0 ? 'out' : 'low')}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-white/60 dark:bg-black/20 px-3.5 py-2 text-label-sm font-semibold text-amber-800 dark:text-amber-300 hover:bg-white dark:hover:bg-black/40 transition-colors"
              >
                <span>Filter Critical on Table</span>
              </button>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('products')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-label-sm font-semibold text-white shadow-sm hover:bg-amber-600 transition-colors shrink-0"
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

      {/* Product Overview Table with Filters */}
      <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest overflow-hidden shadow-sm">
        <div className="border-b border-jds-outline-variant/30 px-6 py-5 bg-jds-surface-container-low/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-body-lg font-bold text-jds-on-surface">Product Inventory Overview</h2>
            <p className="text-label-md text-jds-on-surface-variant">
              Strategic inventory monitoring with stock status and recently added sorting.
            </p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('products')}
              className="inline-flex items-center gap-1.5 text-label-md font-bold text-jds-primary hover:underline self-start sm:self-auto"
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
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-sm font-semibold transition-all whitespace-nowrap ${
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

          {/* Sort Selector & Reset */}
          <div className="flex items-center gap-2.5 shrink-0 justify-between sm:justify-end">
            <div className="flex items-center gap-2">
              <label htmlFor="dashboardSortOrder" className="text-label-sm font-bold text-jds-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                Sort:
              </label>
              <select
                id="dashboardSortOrder"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="h-10 rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-lowest px-3 py-1.5 text-body-sm font-medium text-jds-on-surface outline-none focus:border-jds-primary transition-all"
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
                className="h-10 px-3 rounded-lg border border-jds-outline-variant/30 text-jds-on-surface-variant hover:text-jds-primary hover:border-jds-primary text-label-sm font-semibold flex items-center gap-1.5 transition-colors"
                title="Reset filters and sorting"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="px-6 py-12 text-center text-body-md text-jds-on-surface-variant space-y-3">
            <p>No products match your selected filter criteria.</p>
            <button
              onClick={() => {
                setSearch('')
                setStockFilter('all')
                setSortOrder('stock_priority')
              }}
              className="text-label-md font-semibold text-jds-primary hover:underline"
            >
              Clear filters and view all products
            </button>
          </div>
        ) : (
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
                  <TableHead className="text-jds-on-surface-variant font-bold text-right">Quick Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.slice(0, 10).map((p) => {
                  const badge = getStockBadgeConfig(p)
                  return (
                    <TableRow
                      key={p.id}
                      className={`hover:bg-jds-surface-container-low/20 transition-colors ${badge.rowBorderClass} ${badge.rowBgClass}`}
                    >
                      <TableCell className="font-bold text-jds-on-surface">{p.name}</TableCell>
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
                        <button
                          type="button"
                          disabled={badge.quantity === 0}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSaleModalProduct(p)
                          }}
                          title={badge.quantity === 0 ? "Out of Stock - Cannot record sale" : "Record Customer Sale (-Stock, +Sales)"}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-sm font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                          <span>Record Sale</span>
                        </button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Table Footer with Count and View All Link */}
        <div className="border-t border-jds-outline-variant/20 px-6 py-4 bg-jds-surface-container-low/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-label-md text-jds-on-surface-variant">
          <div>
            Showing <span className="font-bold text-jds-on-surface">{Math.min(filteredProducts.length, 10)}</span> of{' '}
            <span className="font-bold text-jds-on-surface">{filteredProducts.length}</span> matching products
            {filteredProducts.length !== totalProducts && (
              <span className="text-xs text-jds-on-surface-variant/70 ml-1.5">
                (filtered from {totalProducts} total)
              </span>
            )}
          </div>
          {onNavigate && filteredProducts.length > 10 && (
            <button
              onClick={() => onNavigate('products')}
              className="inline-flex items-center gap-1.5 text-label-sm font-bold text-jds-primary hover:underline"
            >
              <span>View all {filteredProducts.length} in Products Screen</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

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
