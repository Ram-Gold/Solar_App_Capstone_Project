/**
 * JD Solar Platform - Inventory & Stock Calculation Utilities
 * Strictly text and icon-driven (no emojis), industrial tone.
 */

export const LOW_STOCK_THRESHOLD = 5

/**
 * Returns normalized stock quantity for a product.
 * Falls back safely to in_stock boolean if column is not yet migrated in database.
 */
export function getStockQuantity(product) {
  if (!product) return 0
  if (product.stock_quantity !== undefined && product.stock_quantity !== null && !isNaN(product.stock_quantity)) {
    return Math.max(0, Number(product.stock_quantity))
  }
  // Safe fallback if database column does not exist yet or legacy mock data
  return product.in_stock !== false ? 10 : 0
}

/**
 * Returns reserved quantity for a product (units temporarily held by active reservations).
 * Falls back to 0 if the reserved_quantity column hasn't been migrated yet.
 */
export function getReservedQuantity(product) {
  if (!product) return 0
  if (product.reserved_quantity !== undefined && product.reserved_quantity !== null && !isNaN(product.reserved_quantity)) {
    return Math.max(0, Number(product.reserved_quantity))
  }
  return 0
}

/**
 * Returns the available (unreserved) stock count.
 * available = stock_quantity - reserved_quantity
 */
export function getAvailableQuantity(product) {
  return Math.max(0, getStockQuantity(product) - getReservedQuantity(product))
}

/**
 * Returns branch-specific stock, reserved, and available counts.
 * Supported branches: 'Quiapo' (default) and 'Cavite'.
 */
export function getBranchStock(product, branch = 'Quiapo') {
  if (!product) return { stock: 0, reserved: 0, available: 0 }

  const branchStr = String(branch || '').toLowerCase()
  const isCavite = branchStr.includes('cavite')

  if (isCavite) {
    const stock = product.stock_cavite !== undefined && product.stock_cavite !== null && !isNaN(product.stock_cavite)
      ? Math.max(0, Number(product.stock_cavite))
      : 0
    const reserved = product.reserved_cavite !== undefined && product.reserved_cavite !== null && !isNaN(product.reserved_cavite)
      ? Math.max(0, Number(product.reserved_cavite))
      : 0
    return {
      branch: 'Cavite Hub',
      stock,
      reserved,
      available: Math.max(0, stock - reserved),
    }
  }

  // Quiapo (Main retail showroom)
  const stock = product.stock_quiapo !== undefined && product.stock_quiapo !== null && !isNaN(product.stock_quiapo)
    ? Math.max(0, Number(product.stock_quiapo))
    : getStockQuantity(product)
  const reserved = product.reserved_quiapo !== undefined && product.reserved_quiapo !== null && !isNaN(product.reserved_quiapo)
    ? Math.max(0, Number(product.reserved_quiapo))
    : getReservedQuantity(product)

  return {
    branch: 'Quiapo Showroom',
    stock,
    reserved,
    available: Math.max(0, stock - reserved),
  }
}

/**
 * Returns comprehensive breakdown across Quiapo and Cavite branches.
 */
export function getBranchBreakdown(product) {
  const quiapo = getBranchStock(product, 'Quiapo')
  const cavite = getBranchStock(product, 'Cavite')
  const totalStock = getStockQuantity(product)
  const totalReserved = getReservedQuantity(product)
  const totalAvailable = getAvailableQuantity(product)

  return {
    quiapo,
    cavite,
    totalStock,
    totalReserved,
    totalAvailable,
    hasCaviteStock: cavite.stock > 0 || cavite.available > 0,
  }
}

/**
 * Returns the stock tier based on AVAILABLE (unreserved) units:
 * 'out' (0), 'low' (1-5), or 'optimal' (>5)
 */
export function getStockTier(product) {
  const available = getAvailableQuantity(product)
  if (available <= 0 || product.in_stock === false) {
    return 'out'
  }
  if (available <= LOW_STOCK_THRESHOLD) {
    return 'low'
  }
  return 'optimal'
}

/**
 * Priority sort comparator:
 * The lower the stock, the higher the item is on the list (0, 1, 2, 3...)
 * Secondary sort: Newest first (highest id descending)
 */
export function sortProductsByStockPriority(products) {
  return [...products].sort((a, b) => {
    const qtyA = getStockQuantity(a)
    const qtyB = getStockQuantity(b)

    // Strictly sort lower stock quantities first
    if (qtyA !== qtyB) {
      return qtyA - qtyB
    }

    // Secondary sort: Newest first (ID descending)
    return (Number(b.id) || 0) - (Number(a.id) || 0)
  })
}

export const SORT_OPTIONS = [
  { id: 'stock_priority', label: 'Lowest Stock First' },
  { id: 'newest', label: 'Recently Added / Newest' },
  { id: 'sales', label: 'Highest Sales' },
  { id: 'watt_desc', label: 'Power Output (High to Low)' },
  { id: 'watt_asc', label: 'Power Output (Low to High)' },
]

/**
 * Filters and sorts product arrays based on stock, search, and category criteria
 */
export function filterAndSortProducts(products, {
  search = '',
  stockFilter = 'all', // 'all' | 'out' | 'low' | 'in_stock'
  sortOrder = 'stock_priority',
  typeFilter = 'All Types',
  powerFilter = 'All Power',
} = {}) {
  const query = search.toLowerCase().trim()

  const filtered = products.filter((p) => {
    // Search match
    if (query) {
      const name = (p.name || '').toLowerCase()
      const type = (p.type || '').toLowerCase()
      const watt = String(p.watt || '')
      if (!name.includes(query) && !type.includes(query) && !watt.includes(query)) {
        return false
      }
    }

    // Stock filter
    const tier = getStockTier(p)
    if (stockFilter === 'out' && tier !== 'out') {
      return false
    }
    if (stockFilter === 'low' && tier !== 'low' && tier !== 'out') {
      return false
    }
    if (stockFilter === 'in_stock' && tier === 'out') {
      return false
    }

    // Type filter
    if (typeFilter && typeFilter !== 'All Types' && p.type !== typeFilter) {
      return false
    }

    // Power filter
    if (powerFilter && powerFilter !== 'All Power') {
      const w = Number(p.watt) || 0
      if (powerFilter === 'Under 200W' && w >= 200) return false
      if (powerFilter === '200W - 400W' && (w < 200 || w > 400)) return false
      if (powerFilter === 'Above 400W' && w <= 400) return false
    }

    return true
  })

  // Sort
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

  return filtered
}

/**
 * Returns badge and row styling for inventory display.
 * Uses available (unreserved) units for tier calculation.
 */
export function getStockBadgeConfig(product) {
  const tier = getStockTier(product)
  const available = getAvailableQuantity(product)
  const reserved = getReservedQuantity(product)
  const total = getStockQuantity(product)
  const breakdown = getBranchBreakdown(product)

  if (tier === 'out') {
    return {
      tier,
      quantity: available,
      total,
      reserved,
      breakdown,
      label: reserved > 0 ? `Out of Stock (${reserved} Reserved)` : 'Out of Stock',
      shortLabel: reserved > 0 ? 'Fully Reserved' : 'Out of Stock',
      subText: reserved > 0 ? `0 available · ${reserved} temporarily reserved` : '0 units available',
      badgeClass: 'bg-jds-error-container/20 text-jds-error border border-jds-error/30 font-semibold',
      rowBorderClass: 'border-l-4 border-l-jds-error',
      rowBgClass: 'bg-jds-error-container/[0.04]',
      cardBadgeClass: 'bg-jds-error text-white',
    }
  }

  if (tier === 'low') {
    return {
      tier,
      quantity: available,
      total,
      reserved,
      breakdown,
      label: `Low Stock (${available} available${reserved > 0 ? ` · ${reserved} reserved` : ''})`,
      shortLabel: 'Low Stock',
      subText: `${available} unit${available === 1 ? '' : 's'} available${reserved > 0 ? ` · ${reserved} temporarily reserved` : ''}`,
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-semibold',
      rowBorderClass: 'border-l-4 border-l-amber-500',
      rowBgClass: 'bg-amber-500/[0.04]',
      cardBadgeClass: 'bg-amber-500 text-white',
    }
  }

  return {
    tier,
    quantity: available,
    total,
    reserved,
    breakdown,
    label: `In Stock (${available} available${reserved > 0 ? ` · ${reserved} reserved` : ''})`,
    shortLabel: 'In Stock',
    subText: `${available} units available${reserved > 0 ? ` · ${reserved} temporarily reserved` : ''}`,
    badgeClass: 'bg-jds-secondary-container/20 text-jds-secondary border border-jds-secondary/30 font-medium',
    rowBorderClass: '',
    rowBgClass: '',
    cardBadgeClass: 'bg-jds-secondary text-white',
  }
}

/**
 * Executes a manual customer sale for a product:
 * Decrements stock_quantity, increments sales, and updates in_stock status.
 */
export async function executeManualSale(supabaseClient, product, unitsSold = 1, branch = 'Quiapo') {
  if (!product || !product.id) {
    throw new Error('Valid product is required.')
  }

  const currentAvailable = getAvailableQuantity(product)
  const currentStock = getStockQuantity(product)
  const currentSales = Number(product.sales || 0)
  const qtyToDeduct = Math.max(1, Number(unitsSold) || 1)

  if (currentAvailable < qtyToDeduct) {
    throw new Error(`Insufficient available inventory. Only ${currentAvailable} unreserved unit(s) available for walk-in sale (${getReservedQuantity(product)} reserved).`)
  }

  const newStock = Math.max(0, currentStock - qtyToDeduct)
  const newSales = currentSales + qtyToDeduct
  const newInStock = newStock > 0

  const updatePayload = {
    stock_quantity: newStock,
    sales: newSales,
    in_stock: newInStock,
  }

  const isCavite = String(branch || '').toLowerCase().includes('cavite')
  if (isCavite) {
    const caviteStock = product.stock_cavite !== undefined ? Math.max(0, Number(product.stock_cavite) - qtyToDeduct) : 0
    updatePayload.stock_cavite = caviteStock
  } else {
    const quiapoStock = product.stock_quiapo !== undefined ? Math.max(0, Number(product.stock_quiapo) - qtyToDeduct) : newStock
    updatePayload.stock_quiapo = quiapoStock
  }

  let { data, error } = await supabaseClient
    .from('products')
    .update(updatePayload)
    .eq('id', product.id)
    .select()

  if (error && error.message && (error.message.includes('stock_quiapo') || error.message.includes('stock_cavite'))) {
    // Fallback if branch columns are not yet in payload
    delete updatePayload.stock_quiapo
    delete updatePayload.stock_cavite
    const retry = await supabaseClient
      .from('products')
      .update(updatePayload)
      .eq('id', product.id)
      .select()
    error = retry.error
    data = retry.data
  }

  if (error) throw error

  if (!data || data.length === 0) {
    throw new Error('Database update returned 0 modified rows. Please ensure you are logged in with valid staff or admin credentials.')
  }

  const updatedRecord = data[0]

  return {
    id: product.id,
    newStock: updatedRecord.stock_quantity !== undefined ? updatedRecord.stock_quantity : newStock,
    newSales: updatedRecord.sales !== undefined ? updatedRecord.sales : newSales,
    newInStock: updatedRecord.in_stock !== undefined ? updatedRecord.in_stock : newInStock,
  }
}
