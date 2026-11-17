import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  computeNextStockState,
  createInventoryOperations,
  createDebouncedStockQueue,
} from '../inventoryOperations'

function createInMemoryInventoryAdapter(initialProducts = [], { failOnUpdate = false } = {}) {
  const products = new Map(initialProducts.map((p) => [p.id, { ...p }]))
  const calls = []

  return {
    calls,
    products,
    async updateProduct(id, payload) {
      calls.push({ op: 'updateProduct', id, payload })
      if (failOnUpdate) {
        throw new Error('Simulated network failure')
      }
      const existing = products.get(id)
      if (!existing) throw new Error('Product not found')
      const updated = { ...existing, ...payload }
      products.set(id, updated)
      return updated
    },
    async fulfillSale({ product, unitsSold, branch, ticketId }) {
      calls.push({ op: 'fulfillSale', productId: product.id, unitsSold, branch, ticketId })
      const existing = products.get(product.id)
      const isCavite = String(branch || '').toLowerCase().includes('cavite')
      const nextStock = Math.max(0, existing.stock_quantity - unitsSold)
      const nextQuiapo = isCavite ? existing.stock_quiapo : Math.max(0, existing.stock_quiapo - unitsSold)
      const nextCavite = isCavite ? Math.max(0, existing.stock_cavite - unitsSold) : existing.stock_cavite
      const nextSales = (existing.sales || 0) + unitsSold
      const updated = {
        ...existing,
        stock_quantity: nextStock,
        stock_quiapo: nextQuiapo,
        stock_cavite: nextCavite,
        sales: nextSales,
        in_stock: nextStock > 0,
      }
      products.set(product.id, updated)
      return {
        id: product.id,
        newStock: nextStock,
        newSales: nextSales,
        newInStock: nextStock > 0,
        stock_quiapo: nextQuiapo,
        stock_cavite: nextCavite,
      }
    },
    async bulkArchive(ids, archive) {
      calls.push({ op: 'bulkArchive', ids, archive })
      for (const id of ids) {
        const p = products.get(id)
        if (p) products.set(id, { ...p, is_archived: archive })
      }
      return { updatedIds: [...ids] }
    },
    async bulkDeleteSafe(ids) {
      calls.push({ op: 'bulkDeleteSafe', ids })
      for (const id of ids) products.delete(id)
      return { deletedIds: [...ids], blockedItems: [] }
    },
  }
}

describe('inventoryOperations', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('computeNextStockState defaults additions to Quiapo and overflows decrements into Cavite', () => {
    const product = { id: 1, stock_quantity: 5, stock_quiapo: 2, stock_cavite: 3 }

    // Adding 4 goes to Quiapo
    expect(computeNextStockState(product, 9)).toEqual({
      stock_quantity: 9,
      stock_quiapo: 6,
      stock_cavite: 3,
      in_stock: true,
    })

    // Decreasing to 1 (reduction of 4): drains Quiapo (2) and overflows 2 into Cavite (3 -> 1)
    expect(computeNextStockState(product, 1)).toEqual({
      stock_quantity: 1,
      stock_quiapo: 0,
      stock_cavite: 1,
      in_stock: true,
    })

    // Decreasing to 0 sets in_stock = false
    expect(computeNextStockState(product, 0)).toEqual({
      stock_quantity: 0,
      stock_quiapo: 0,
      stock_cavite: 0,
      in_stock: false,
    })
  })

  it('recordSale enforces stock_quantity >= unitsSold and updates branch stock', async () => {
    const adapter = createInMemoryInventoryAdapter([
      { id: 10, stock_quantity: 4, stock_quiapo: 3, stock_cavite: 1, sales: 2, in_stock: true },
    ])
    const ops = createInventoryOperations(adapter)

    await expect(
      ops.recordSale(adapter.products.get(10), { unitsSold: 5, branch: 'Quiapo' })
    ).rejects.toThrow('Insufficient available inventory')

    const res = await ops.recordSale(adapter.products.get(10), { unitsSold: 2, branch: 'Quiapo' })
    expect(res).toEqual({
      id: 10,
      newStock: 2,
      newSales: 4,
      newInStock: true,
      stock_quiapo: 1,
      stock_cavite: 1,
    })
  })

  it('createDebouncedStockQueue batches 5 rapid +1 clicks into 1 backend update after 400ms', async () => {
    const initial = { id: 7, stock_quantity: 10, stock_quiapo: 10, stock_cavite: 0, in_stock: true }
    const adapter = createInMemoryInventoryAdapter([initial])
    const ops = createInventoryOperations(adapter)
    const snapshots = []

    const queue = createDebouncedStockQueue({
      operations: ops,
      onSnapshot: (p) => snapshots.push(p),
      delayMs: 400,
    })

    for (let i = 0; i < 5; i += 1) {
      queue.queueDelta(initial, 1)
    }

    // Immediate optimistic snapshots: 11, 12, 13, 14, 15
    expect(snapshots.map((s) => s.stock_quantity)).toEqual([11, 12, 13, 14, 15])
    // Zero backend calls before 400ms
    expect(adapter.calls).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(400)

    expect(adapter.calls).toHaveLength(1)
    expect(adapter.calls[0]).toEqual({
      op: 'updateProduct',
      id: 7,
      payload: {
        stock_quantity: 15,
        stock_quiapo: 15,
        stock_cavite: 0,
        in_stock: true,
      },
    })
  })

  it('createDebouncedStockQueue flushes immediately on flushAll and rolls back to baseline on error', async () => {
    const initial = { id: 8, stock_quantity: 6, stock_quiapo: 6, stock_cavite: 0, in_stock: true }
    const adapter = createInMemoryInventoryAdapter([initial], { failOnUpdate: true })
    const ops = createInventoryOperations(adapter)
    const rollbacks = []
    const errors = []

    const queue = createDebouncedStockQueue({
      operations: ops,
      onSnapshot: () => {},
      onRollback: (id, baseline) => rollbacks.push({ id, baseline }),
      onError: (err) => errors.push(err),
      delayMs: 400,
    })

    queue.queueDelta(initial, 1)
    queue.queueDelta(initial, 1)
    await queue.flushAll()

    expect(adapter.calls).toHaveLength(1)
    expect(rollbacks).toEqual([{ id: 8, baseline: initial }])
    expect(errors).toHaveLength(1)
  })
})
