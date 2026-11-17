import { useState, useMemo, useCallback } from 'react'
import {
  deriveCatalogView,
  computeSelectionSummary,
  toggleSelection,
  toggleSelectAllVisible,
  clearHiddenSelections,
} from '../lib/catalogSelection'

/**
 * Memoized query + cross-filter selection hook for ProductsScreen.
 * Keeps callbacks stable so memoized table rows and product cards only
 * re-render when their own props or selection state change.
 */
export default function useCatalogQueryAndSelection(
  products,
  { activeSection, search, typeFilter, powerFilter, stockFilter, sortOrder }
) {
  const [selectedIds, setSelectedIds] = useState(() => new Set())

  const view = useMemo(
    () =>
      deriveCatalogView(products, {
        activeSection,
        search,
        typeFilter,
        powerFilter,
        stockFilter,
        sortOrder,
      }),
    [products, activeSection, search, typeFilter, powerFilter, stockFilter, sortOrder]
  )

  const selectionSummary = useMemo(
    () => computeSelectionSummary(selectedIds, view.visibleIds),
    [selectedIds, view.visibleIds]
  )

  const handleToggleSelect = useCallback((id) => {
    setSelectedIds((prev) => toggleSelection(prev, id))
  }, [])

  const handleToggleSelectAllVisible = useCallback(() => {
    setSelectedIds((prev) => toggleSelectAllVisible(prev, view.visibleIds))
  }, [view.visibleIds])

  const handleClearHidden = useCallback(() => {
    setSelectedIds((prev) => clearHiddenSelections(prev, view.visibleIds))
  }, [view.visibleIds])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  return {
    ...view,
    selectedIds,
    setSelectedIds,
    ...selectionSummary,
    handleToggleSelect,
    handleToggleSelectAllVisible,
    handleClearHidden,
    clearSelection,
  }
}
