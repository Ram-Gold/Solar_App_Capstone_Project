/**
 * JD Solar Platform - Product Catalog Query & Selection Pure Helpers
 * Handles archive partitioning, tier counts, filtering/sorting, and cross-filter selection state.
 */

import {
  isProductArchived,
  getStockTier,
  filterAndSortProducts,
} from './inventoryUtils'

/**
 * Derives active/archived partitions, stock tier buckets, filtered list, and visible IDs.
 */
export function deriveCatalogView(
  products = [],
  {
    activeSection = 'active',
    search = '',
    typeFilter = 'All Types',
    powerFilter = 'All Power',
    stockFilter = 'all',
    sortOrder = 'stock_priority',
  } = {}
) {
  const activeProducts = products.filter((p) => !isProductArchived(p))
  const archivedProducts = products.filter((p) => isProductArchived(p))
  const sectionProducts = activeSection === 'archived' ? archivedProducts : activeProducts

  const outOfStockProducts = []
  const lowStockProducts = []
  const optimalStockProducts = []

  for (const product of sectionProducts) {
    const tier = getStockTier(product)
    if (tier === 'out') outOfStockProducts.push(product)
    else if (tier === 'low') lowStockProducts.push(product)
    else optimalStockProducts.push(product)
  }

  const filteredProducts = filterAndSortProducts(products, {
    search,
    typeFilter: typeFilter === 'All' ? 'All Types' : typeFilter,
    powerFilter: powerFilter === 'All' ? 'All Power' : powerFilter,
    stockFilter,
    archiveFilter: activeSection === 'archived' ? 'archived' : 'active',
    sortOrder: sortOrder === 'priority' ? 'stock_priority' : sortOrder,
  })

  const visibleIds = filteredProducts.map((p) => p.id)

  return {
    activeProducts,
    archivedProducts,
    sectionProducts,
    outOfStockProducts,
    lowStockProducts,
    optimalStockProducts,
    filteredProducts,
    visibleIds,
  }
}

/**
 * Computes visible vs hidden selection counts and indeterminate header state.
 */
export function computeSelectionSummary(selectedIds, visibleIds = []) {
  const selectedSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds || [])
  let selectedVisibleCount = 0

  for (const id of visibleIds) {
    if (selectedSet.has(id)) {
      selectedVisibleCount += 1
    }
  }

  const selectedCount = selectedSet.size
  const selectedHiddenCount = Math.max(0, selectedCount - selectedVisibleCount)
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected

  return {
    selectedCount,
    selectedVisibleCount,
    selectedHiddenCount,
    allVisibleSelected,
    someVisibleSelected,
  }
}

/**
 * Returns a new Set with `id` toggled.
 */
export function toggleSelection(selectedIds, id) {
  const next = new Set(selectedIds)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  return next
}

/**
 * Toggles all currently visible IDs while preserving selections hidden by active filters.
 */
export function toggleSelectAllVisible(selectedIds, visibleIds = []) {
  const next = new Set(selectedIds)
  if (visibleIds.length === 0) return next

  const allSelected = visibleIds.every((id) => next.has(id))
  if (allSelected) {
    for (const id of visibleIds) next.delete(id)
  } else {
    for (const id of visibleIds) next.add(id)
  }
  return next
}

/**
 * Drops any selected IDs that are not in `visibleIds`.
 */
export function clearHiddenSelections(selectedIds, visibleIds = []) {
  const visibleSet = new Set(visibleIds)
  const next = new Set()
  for (const id of selectedIds) {
    if (visibleSet.has(id)) next.add(id)
  }
  return next
}
