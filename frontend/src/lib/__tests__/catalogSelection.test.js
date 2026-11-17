import { describe, it, expect } from 'vitest'
import {
  deriveCatalogView,
  computeSelectionSummary,
  toggleSelection,
  toggleSelectAllVisible,
  clearHiddenSelections,
} from '../catalogSelection'

describe('catalogSelection', () => {
  const sampleProducts = [
    { id: 1, name: 'Deye 5kW Inverter', type: 'Inverter', watt: 5000, stock_quantity: 10, is_archived: false },
    { id: 2, name: 'Floodlight 200W', type: 'Floodlight', watt: 200, stock_quantity: 2, is_archived: false },
    { id: 3, name: 'Street Light 100W', type: 'Street Light', watt: 100, stock_quantity: 0, is_archived: false },
    { id: 4, name: 'Legacy Panel 300W', type: 'Solar Panel', watt: 300, stock_quantity: 4, is_archived: true },
  ]

  it('deriveCatalogView partitions active vs archived, computes tier counts, and filters/sorts', () => {
    const view = deriveCatalogView(sampleProducts, {
      activeSection: 'active',
      search: 'light',
      sortOrder: 'priority',
    })

    expect(view.activeProducts.map((p) => p.id)).toEqual([1, 2, 3])
    expect(view.archivedProducts.map((p) => p.id)).toEqual([4])
    expect(view.outOfStockProducts).toHaveLength(1)
    expect(view.lowStockProducts).toHaveLength(1)
    expect(view.optimalStockProducts).toHaveLength(1)
    // Priority sort: 0 stock (#3) before 2 stock (#2)
    expect(view.visibleIds).toEqual([3, 2])
  })

  it('computeSelectionSummary tracks visible vs hidden selections across filter changes', () => {
    const selected = new Set([1, 2, 3])
    const summary = computeSelectionSummary(selected, [2, 4])

    expect(summary).toEqual({
      selectedCount: 3,
      selectedVisibleCount: 1,
      selectedHiddenCount: 2,
      allVisibleSelected: false,
      someVisibleSelected: true,
    })

    const allVisible = computeSelectionSummary(new Set([2, 4]), [2, 4])
    expect(allVisible.allVisibleSelected).toBe(true)
    expect(allVisible.someVisibleSelected).toBe(false)
    expect(allVisible.selectedHiddenCount).toBe(0)
  })

  it('toggleSelectAllVisible adds/removes only visible IDs while preserving hidden selections', () => {
    // Hidden item #1 is already selected; visible items are [2, 3]
    const initial = new Set([1, 2])
    const afterSelectAll = toggleSelectAllVisible(initial, [2, 3])
    expect([...afterSelectAll].sort()).toEqual([1, 2, 3])

    const afterDeselectVisible = toggleSelectAllVisible(afterSelectAll, [2, 3])
    expect([...afterDeselectVisible]).toEqual([1])
  })

  it('toggleSelection and clearHiddenSelections return updated Sets cleanly', () => {
    const toggled = toggleSelection(new Set([1]), 2)
    expect([...toggled].sort()).toEqual([1, 2])
    const untoggled = toggleSelection(toggled, 1)
    expect([...untoggled]).toEqual([2])

    const onlyVisible = clearHiddenSelections(new Set([1, 2, 3]), [2, 4])
    expect([...onlyVisible]).toEqual([2])
  })
})
