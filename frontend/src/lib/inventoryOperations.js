/**
 * JD Solar Platform - Deep Inventory Operations Module
 * Unifies direct stock adjustments, branch-sum invariants (stock_quantity === stock_quiapo + stock_cavite),
 * debounced optimistic batching, sale execution, and bulk archive/delete behind an adapter seam.
 */

import { supabase } from './supabaseClient'
import {
  getStockQuantity,
  executeManualSale,
  bulkArchiveProducts,
  bulkDeleteProductsSafe,
} from './inventoryUtils'

function parseBranchCount(value, fallback = 0) {
  if (value !== undefined && value !== null && !Number.isNaN(Number(value))) {
    return Math.max(0, Math.floor(Number(value)))
  }
  return Math.max(0, Math.floor(Number(fallback) || 0))
}

/**
 * Computes the next unified stock state for a product while preserving
 * stock_quantity === stock_quiapo + stock_cavite and in_stock === (stock_quantity > 0).
 * Additions default to Quiapo unless branch === 'Cavite'.
 * Decrements drain the primary branch first and overflow into the other branch.
 */
export function computeNextStockState(product, targetQty, { branch = 'Quiapo' } = {}) {
  const nextTotal = Math.max(0, Math.floor(Number(targetQty) || 0))
  const totalFromProduct = getStockQuantity(product)
  const hasExplicitQuiapo = product?.stock_quiapo !== undefined && product?.stock_quiapo !== null && !Number.isNaN(Number(product?.stock_quiapo))
  const hasExplicitCavite = product?.stock_cavite !== undefined && product?.stock_cavite !== null && !Number.isNaN(Number(product?.stock_cavite))

  let quiapo = hasExplicitQuiapo ? parseBranchCount(product.stock_quiapo) : totalFromProduct
  let cavite = hasExplicitCavite ? parseBranchCount(product.stock_cavite) : 0

  const branchSum = quiapo + cavite
  const currentTotal = (hasExplicitQuiapo || hasExplicitCavite) ? branchSum : totalFromProduct
  const delta = nextTotal - currentTotal
  const isCavite = String(branch || '').toLowerCase().includes('cavite')

  if (delta > 0) {
    if (isCavite) {
      cavite += delta
    } else {
      quiapo += delta
    }
  } else if (delta < 0) {
    const reduction = -delta
    if (isCavite) {
      const fromCavite = Math.min(cavite, reduction)
      cavite -= fromCavite
      quiapo = Math.max(0, quiapo - (reduction - fromCavite))
    } else {
      const fromQuiapo = Math.min(quiapo, reduction)
      quiapo -= fromQuiapo
      cavite = Math.max(0, cavite - (reduction - fromQuiapo))
    }
  }

  const stock_quantity = quiapo + cavite
  return {
    stock_quantity,
    stock_quiapo: quiapo,
    stock_cavite: cavite,
    in_stock: stock_quantity > 0,
  }
}

/**
 * Creates the Inventory Operations service bound to a storage adapter.
 */
export function createInventoryOperations(adapter) {
  if (!adapter) {
    throw new Error('Inventory adapter is required.')
  }

  return {
    async setStockLevel(product, targetQty, options = {}) {
      if (!product?.id) {
        throw new Error('Valid product is required.')
      }
      const nextState = computeNextStockState(product, targetQty, options)
      await adapter.updateProduct(product.id, nextState)
      return { ...product, ...nextState }
    },

    async adjustStock(product, delta, options = {}) {
      if (!product?.id) {
        throw new Error('Valid product is required.')
      }
      const targetQty = Math.max(0, getStockQuantity(product) + Number(delta || 0))
      return this.setStockLevel(product, targetQty, options)
    },

    async recordSale(product, { unitsSold = 1, branch = 'Quiapo', ticketId = null } = {}) {
      if (!product?.id) {
        throw new Error('Valid product is required.')
      }
      const qty = Math.max(1, Math.floor(Number(unitsSold) || 1))
      const available = getStockQuantity(product)
      if (available < qty) {
        throw new Error(`Insufficient available inventory (${available} units available).`)
      }
      return adapter.fulfillSale({ product, unitsSold: qty, branch, ticketId })
    },

    async bulkArchive(productIds, archive = true) {
      return adapter.bulkArchive(productIds, archive)
    },

    async bulkDeleteSafe(productIds) {
      return adapter.bulkDeleteSafe(productIds)
    },
  }
}

/**
 * Creates a debounced optimistic queue for inline + / - stock adjustments.
 * Batches rapid clicks per product into one backend write and flushes on unmount/screen switch.
 */
export function createDebouncedStockQueue({
  operations,
  onSnapshot,
  onRollback,
  onError,
  delayMs = 400,
}) {
  const pending = new Map()

  const flushOne = async (productId) => {
    const entry = pending.get(productId)
    if (!entry) return
    if (entry.timerId) {
      clearTimeout(entry.timerId)
    }
    pending.delete(productId)

    try {
      const targetQty = getStockQuantity(entry.latestProduct)
      await operations.setStockLevel(entry.baseline, targetQty, entry.options)
    } catch (err) {
      onRollback?.(productId, entry.baseline)
      onError?.(err)
    }
  }

  return {
    queueDelta(product, delta, options = {}) {
      if (!product?.id) return
      const existing = pending.get(product.id)
      const baseline = existing ? existing.baseline : { ...product }
      const base = existing ? existing.latestProduct : product

      if (existing?.timerId) {
        clearTimeout(existing.timerId)
      }

      const targetQty = Math.max(0, getStockQuantity(base) + Number(delta || 0))
      const nextState = computeNextStockState(base, targetQty, options)
      const latestProduct = { ...base, ...nextState }

      onSnapshot?.(latestProduct)

      const timerId = setTimeout(() => {
        flushOne(product.id)
      }, delayMs)

      pending.set(product.id, { baseline, latestProduct, options, timerId })
    },

    async flushAll() {
      const ids = Array.from(pending.keys())
      await Promise.allSettled(ids.map((id) => flushOne(id)))
    },

    cancelAll() {
      for (const entry of pending.values()) {
        if (entry.timerId) clearTimeout(entry.timerId)
      }
      pending.clear()
    },
  }
}

/**
 * Production Supabase adapter for Inventory Operations.
 */
export function createSupabaseInventoryAdapter(supabaseClient = supabase) {
  return {
    async updateProduct(id, payload) {
      const { data, error } = await supabaseClient
        .from('products')
        .update(payload)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) {
        const msg = String(error.message || '').toLowerCase()
        if (msg.includes('stock_quiapo') || msg.includes('stock_cavite')) {
          const fallbackPayload = {
            stock_quantity: payload.stock_quantity,
            in_stock: payload.in_stock,
          }
          const { data: fbData, error: fbError } = await supabaseClient
            .from('products')
            .update(fallbackPayload)
            .eq('id', id)
            .select()
            .maybeSingle()
          if (fbError) throw fbError
          return fbData || fallbackPayload
        }
        throw error
      }
      return data || payload
    },

    async fulfillSale({ product, unitsSold, branch, ticketId = null }) {
      const isCavite = String(branch || '').toLowerCase().includes('cavite')
      const resolvedBranch = isCavite ? 'Cavite' : 'Quiapo'

      if (typeof supabaseClient.rpc === 'function') {
        const { data: rpcRes, error: rpcErr } = await supabaseClient.rpc('fulfill_reservation_sale', {
          p_ticket_id: ticketId || null,
          p_product_id: product.id,
          p_quantity: unitsSold,
          p_branch: resolvedBranch,
        })

        if (!rpcErr && rpcRes?.success) {
          const nextStock = Number(rpcRes.new_stock ?? Math.max(0, getStockQuantity(product) - unitsSold))
          const nextSales = Number(rpcRes.new_sales ?? (Number(product.sales) || 0) + unitsSold)
          return {
            id: product.id,
            newStock: nextStock,
            newSales: nextSales,
            newInStock: nextStock > 0,
            stock_quiapo: isCavite
              ? product.stock_quiapo
              : Math.max(0, parseBranchCount(product.stock_quiapo, getStockQuantity(product)) - unitsSold),
            stock_cavite: isCavite
              ? Math.max(0, parseBranchCount(product.stock_cavite, 0) - unitsSold)
              : product.stock_cavite,
          }
        }
      }

      const fallback = await executeManualSale(supabaseClient, product, unitsSold, resolvedBranch)
      return {
        ...fallback,
        stock_quiapo: isCavite
          ? product.stock_quiapo
          : Math.max(0, parseBranchCount(product.stock_quiapo, getStockQuantity(product)) - unitsSold),
        stock_cavite: isCavite
          ? Math.max(0, parseBranchCount(product.stock_cavite, 0) - unitsSold)
          : product.stock_cavite,
      }
    },

    async bulkArchive(productIds, archive) {
      return bulkArchiveProducts(supabaseClient, productIds, archive)
    },

    async bulkDeleteSafe(productIds) {
      return bulkDeleteProductsSafe(supabaseClient, productIds)
    },
  }
}

export const inventoryOperations = createInventoryOperations(createSupabaseInventoryAdapter(supabase))
