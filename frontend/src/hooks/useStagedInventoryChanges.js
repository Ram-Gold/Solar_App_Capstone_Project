import { useCallback, useMemo, useState } from 'react'
import { getStockQuantity } from '../lib/inventoryUtils'

/**
 * Manages staged inline Stock and Sale stepper edits before explicit Save + Confirmation.
 */
export function useStagedInventoryChanges({
  setProducts,
  inventoryOperations,
  supabase,
  onToast,
  notifyOpsUpdated,
}) {
  const [pendingMap, setPendingMap] = useState({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const pendingList = useMemo(() => Object.values(pendingMap), [pendingMap])
  const pendingCount = pendingList.length

  const updateEntry = useCallback((product, computeNext) => {
    setPendingMap((prev) => {
      const existing = prev[product.id]
      const baseStock = existing ? existing.baseStock : getStockQuantity(product)
      const baseSales = existing ? existing.baseSales : Number(product.sales || 0)
      const currStock = existing ? existing.targetStock : baseStock
      const currSales = existing ? existing.targetSales : baseSales

      const next = computeNext({ baseStock, baseSales, currStock, currSales })
      if (!next) return prev

      const { targetStock, targetSales } = next
      if (targetStock === baseStock && targetSales === baseSales) {
        if (!existing) return prev
        const copy = { ...prev }
        delete copy[product.id]
        return copy
      }

      return {
        ...prev,
        [product.id]: {
          product: existing ? existing.product : product,
          baseStock,
          baseSales,
          targetStock,
          targetSales,
        },
      }
    })
  }, [])

  const stageStockDelta = useCallback(
    (product, delta) => {
      updateEntry(product, ({ currStock, currSales }) => {
        const targetStock = currStock + delta
        if (targetStock < 0) return null
        return { targetStock, targetSales: currSales }
      })
    },
    [updateEntry]
  )

  const stageSaleDelta = useCallback(
    (product, delta) => {
      updateEntry(product, ({ currStock, currSales }) => {
        if (delta > 0 && currStock <= 0) return null
        if (delta < 0 && currSales <= 0) return null
        const targetSales = Math.max(0, currSales + delta)
        const targetStock = delta > 0 ? Math.max(0, currStock - 1) : currStock + 1
        return { targetStock, targetSales }
      })
    },
    [updateEntry]
  )

  const getStagedProduct = useCallback(
    (product) => {
      const entry = pendingMap[product.id]
      if (!entry) {
        return {
          stock: getStockQuantity(product),
          sales: Number(product.sales || 0),
          isPending: false,
          stockDelta: 0,
          salesDelta: 0,
        }
      }
      return {
        stock: entry.targetStock,
        sales: entry.targetSales,
        isPending: true,
        stockDelta: entry.targetStock - entry.baseStock,
        salesDelta: entry.targetSales - entry.baseSales,
      }
    },
    [pendingMap]
  )

  const discardChanges = useCallback(() => {
    setPendingMap({})
    setConfirmOpen(false)
  }, [])

  const requestSave = useCallback(() => {
    if (pendingList.length === 0) return
    setConfirmOpen(true)
  }, [pendingList.length])

  const commitChanges = useCallback(async () => {
    if (pendingList.length === 0) return
    setSaving(true)
    const updatesById = new Map()

    try {
      for (const entry of pendingList) {
        const { product, baseStock, baseSales, targetStock, targetSales } = entry
        const salesDelta = targetSales - baseSales

        if (salesDelta > 0) {
          const res = await inventoryOperations.recordSale(product, {
            unitsSold: salesDelta,
            branch: 'Quiapo',
          })
          let merged = {
            ...product,
            stock_quantity: res.newStock,
            sales: res.newSales,
            in_stock: res.newInStock,
            ...(res.stock_quiapo !== undefined ? { stock_quiapo: res.stock_quiapo } : {}),
            ...(res.stock_cavite !== undefined ? { stock_cavite: res.stock_cavite } : {}),
          }
          // If stock was also adjusted independently beyond the sale deduction, align stock level
          const expectedStockAfterSale = Math.max(0, baseStock - salesDelta)
          if (targetStock !== expectedStockAfterSale) {
            const stockUpdated = await inventoryOperations.setStockLevel(merged, targetStock)
            merged = { ...merged, ...stockUpdated }
          }
          updatesById.set(product.id, merged)
        } else {
          let merged = { ...product }
          if (targetStock !== baseStock) {
            const stockUpdated = await inventoryOperations.setStockLevel(product, targetStock)
            merged = { ...merged, ...stockUpdated }
          }
          if (salesDelta !== 0) {
            const { data, error } = await supabase
              .from('products')
              .update({ sales: targetSales })
              .eq('id', product.id)
              .select()
            if (error) throw error
            merged = data && data.length > 0 ? { ...merged, ...data[0] } : { ...merged, sales: targetSales }
          }
          updatesById.set(product.id, merged)
        }
      }

      setProducts((prev) =>
        prev.map((p) => (updatesById.has(p.id) ? { ...p, ...updatesById.get(p.id) } : p))
      )
      notifyOpsUpdated?.('inventory')
      setPendingMap({})
      setConfirmOpen(false)
      onToast?.(
        'Changes Saved',
        `${pendingList.length} product${pendingList.length === 1 ? '' : 's'} updated successfully.`,
        'success'
      )
    } catch (err) {
      console.error('Failed to save staged inventory changes:', err)
      onToast?.('Save Failed', err?.message || 'Could not save inventory changes.', 'error')
    } finally {
      setSaving(false)
    }
  }, [pendingList, inventoryOperations, supabase, setProducts, notifyOpsUpdated, onToast])

  return {
    pendingList,
    pendingCount,
    confirmOpen,
    setConfirmOpen,
    saving,
    stageStockDelta,
    stageSaleDelta,
    getStagedProduct,
    discardChanges,
    requestSave,
    commitChanges,
  }
}
