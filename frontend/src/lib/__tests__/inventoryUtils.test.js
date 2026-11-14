import { describe, it, expect, vi } from 'vitest'
import {
  LOW_STOCK_THRESHOLD,
  getStockQuantity,
  getReservedQuantity,
  getAvailableQuantity,
  getBranchStock,
  getBranchBreakdown,
  getStockTier,
  filterAndSortProducts,
  getStockBadgeConfig,
  executeManualSale,
} from '../inventoryUtils'

describe('inventoryUtils', () => {
  describe('stock, reserved, and available quantity helpers', () => {
    it('returns 0 safely for null/undefined product', () => {
      expect(getStockQuantity(null)).toBe(0)
      expect(getReservedQuantity(undefined)).toBe(0)
      expect(getAvailableQuantity(null)).toBe(0)
    })

    it('falls back to in_stock boolean when stock_quantity is missing', () => {
      expect(getStockQuantity({ in_stock: true })).toBe(10)
      expect(getStockQuantity({ in_stock: false })).toBe(0)
    })

    it('clamps negative stock/reserved values to 0 and computes available units', () => {
      const product = { stock_quantity: 12, reserved_quantity: 4 }
      expect(getStockQuantity(product)).toBe(12)
      expect(getReservedQuantity(product)).toBe(4)
      expect(getAvailableQuantity(product)).toBe(8)

      expect(getAvailableQuantity({ stock_quantity: 3, reserved_quantity: 5 })).toBe(0)
      expect(getStockQuantity({ stock_quantity: -5 })).toBe(0)
    })
  })

  describe('branch stock calculations', () => {
    it('computes Quiapo and Cavite branch stock separately', () => {
      const product = {
        stock_quantity: 20,
        reserved_quantity: 5,
        stock_quiapo: 14,
        reserved_quiapo: 3,
        stock_cavite: 6,
        reserved_cavite: 2,
      }

      const quiapo = getBranchStock(product, 'Quiapo')
      expect(quiapo).toEqual({
        branch: 'Quiapo Showroom',
        stock: 14,
        reserved: 3,
        available: 11,
      })

      const cavite = getBranchStock(product, 'Cavite Hub')
      expect(cavite).toEqual({
        branch: 'Cavite Hub',
        stock: 6,
        reserved: 2,
        available: 4,
      })

      const breakdown = getBranchBreakdown(product)
      expect(breakdown.totalAvailable).toBe(15)
      expect(breakdown.hasCaviteStock).toBe(true)
    })
  })

  describe('tiers, badges, and filtering/sorting', () => {
    it('classifies out, low, and optimal stock tiers using available units', () => {
      expect(getStockTier({ stock_quantity: 4, reserved_quantity: 4 })).toBe('out')
      expect(getStockTier({ stock_quantity: LOW_STOCK_THRESHOLD, reserved_quantity: 0 })).toBe('low')
      expect(getStockTier({ stock_quantity: LOW_STOCK_THRESHOLD + 1, reserved_quantity: 0 })).toBe('optimal')
    })

    it('builds badge config reflecting reserved counts', () => {
      const badge = getStockBadgeConfig({ stock_quantity: 3, reserved_quantity: 3 })
      expect(badge.tier).toBe('out')
      expect(badge.shortLabel).toBe('Fully Reserved')
      expect(badge.label).toContain('3 Reserved')
    })

    it('filters by search, typeFilter, and stockFilter and sorts by watt_asc', () => {
      const products = [
        { id: 1, name: 'Floodlight 300W', type: 'Floodlight', watt: 300, stock_quantity: 10 },
        { id: 2, name: 'Street Light 200W', type: 'Street Light', watt: 200, stock_quantity: 2 },
        { id: 3, name: 'Street Light 500W', type: 'Street Light', watt: 500, stock_quantity: 0 },
      ]

      const filtered = filterAndSortProducts(products, {
        search: 'street',
        typeFilter: 'Street Light',
        stockFilter: 'in_stock',
        sortOrder: 'watt_asc',
      })
      expect(filtered.map((p) => p.id)).toEqual([2])
    })
  })

  describe('executeManualSale', () => {
    it('rejects invalid products or insufficient unreserved inventory', async () => {
      await expect(executeManualSale({}, null, 1)).rejects.toThrow('Valid product is required.')
      await expect(
        executeManualSale({}, { id: 1, stock_quantity: 3, reserved_quantity: 3 }, 1)
      ).rejects.toThrow('Insufficient available inventory')
    })

    it('updates stock, sales, and branch stock via supabaseClient', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: 10, stock_quantity: 7, sales: 5, in_stock: true }],
        error: null,
      })
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      const supabaseMock = { from: vi.fn().mockReturnValue({ update: mockUpdate }) }

      const result = await executeManualSale(
        supabaseMock,
        { id: 10, stock_quantity: 10, reserved_quantity: 0, sales: 2, stock_quiapo: 8, stock_cavite: 2 },
        3,
        'Quiapo'
      )

      expect(mockUpdate).toHaveBeenCalledWith({
        stock_quantity: 7,
        sales: 5,
        in_stock: true,
        stock_quiapo: 5,
      })
      expect(result).toEqual({ id: 10, newStock: 7, newSales: 5, newInStock: true })
    })
  })
})
