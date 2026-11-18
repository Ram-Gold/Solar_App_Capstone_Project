import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { useState } from 'react'
import { useStagedInventoryChanges } from '../useStagedInventoryChanges'
import StagedInventoryBar from '../../components/admin/StagedInventoryBar'

function Harness({ initialProducts, inventoryOperations, onToast }) {
  const [products, setProducts] = useState(initialProducts)
  const staged = useStagedInventoryChanges({
    setProducts,
    inventoryOperations,
    supabase: {
      from: () => ({
        update: () => ({
          eq: () => ({
            select: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    },
    onToast,
    notifyOpsUpdated: vi.fn(),
  })

  return (
    <div>
      {products.map((p) => {
        const s = staged.getStagedProduct(p)
        return (
          <div key={p.id} data-testid={`row-${p.id}`}>
            <span data-testid={`stock-${p.id}`}>{s.stock}</span>
            <span data-testid={`sales-${p.id}`}>{s.sales}</span>
            <button type="button" onClick={() => staged.stageStockDelta(p, +1)}>
              +Stock-{p.id}
            </button>
            <button type="button" onClick={() => staged.stageSaleDelta(p, +1)}>
              +Sale-{p.id}
            </button>
          </div>
        )
      })}
      <StagedInventoryBar
        pendingList={staged.pendingList}
        pendingCount={staged.pendingCount}
        confirmOpen={staged.confirmOpen}
        setConfirmOpen={staged.setConfirmOpen}
        saving={staged.saving}
        onDiscard={staged.discardChanges}
        onRequestSave={staged.requestSave}
        onConfirmSave={staged.commitChanges}
      />
    </div>
  )
}

describe('useStagedInventoryChanges and StagedInventoryBar', () => {
  afterEach(() => {
    cleanup()
  })

  it('stages stock & sale deltas, opens confirmation modal on Save Changes, and commits on confirm', async () => {
    const inventoryOperations = {
      recordSale: vi.fn(async (product, { unitsSold }) => ({
        newStock: product.stock_quantity - unitsSold,
        newSales: product.sales + unitsSold,
        newInStock: true,
      })),
      setStockLevel: vi.fn(async (product, targetStock) => ({
        ...product,
        stock_quantity: targetStock,
        in_stock: targetStock > 0,
      })),
    }
    const onToast = vi.fn()

    render(
      <Harness
        initialProducts={[
          { id: 1, name: 'Deye 8kW Inverter', stock_quantity: 5, sales: 2 },
          { id: 2, name: 'Out of Stock Light', stock_quantity: 0, sales: 1 },
        ]}
        inventoryOperations={inventoryOperations}
        onToast={onToast}
      />
    )

    // Stage +1 Stock on product 1
    fireEvent.click(screen.getByText('+Stock-1'))
    expect(screen.getByTestId('stock-1').textContent).toBe('6')
    expect(inventoryOperations.setStockLevel).not.toHaveBeenCalled()

    // Stage +1 Sale on product 1 -> previews Stock 5 and Sales 3
    fireEvent.click(screen.getByText('+Sale-1'))
    expect(screen.getByTestId('stock-1').textContent).toBe('5')
    expect(screen.getByTestId('sales-1').textContent).toBe('3')
    expect(inventoryOperations.recordSale).not.toHaveBeenCalled()

    // +1 Sale on out-of-stock product 2 is blocked
    fireEvent.click(screen.getByText('+Sale-2'))
    expect(screen.getByTestId('sales-2').textContent).toBe('1')

    // Sticky bar shows edited product name & delta without pulsing
    const bar = screen.getByRole('region', { name: /Pending inventory changes/i })
    expect(bar.innerHTML).not.toContain('animate-pulse')
    expect(bar.textContent).toContain('Deye 8kW Inverter')
    expect(bar.textContent).toContain('Sales +1')

    // Click Save Changes -> opens Confirmation Modal
    fireEvent.click(screen.getByRole('button', { name: /Save Changes \(1\)/i }))
    expect(screen.getByText(/Confirm Stock & Sales Changes/i)).toBeTruthy()
    expect(screen.getAllByText('Deye 8kW Inverter').length).toBeGreaterThanOrEqual(2)

    // Confirm & Save -> commits via inventoryOperations and triggers toast
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Save/i }))
    await waitFor(() => {
      expect(inventoryOperations.recordSale).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1 }),
        { unitsSold: 1, branch: 'Quiapo' }
      )
      expect(inventoryOperations.setStockLevel).toHaveBeenCalled()
      expect(onToast).toHaveBeenCalledWith(
        'Changes Saved',
        '1 product updated successfully.',
        'success'
      )
    })
  })

  it('discards all staged edits when Discard is clicked', () => {
    const inventoryOperations = {
      recordSale: vi.fn(),
      setStockLevel: vi.fn(),
    }
    render(
      <Harness
        initialProducts={[{ id: 1, name: 'Deye 8kW Inverter', stock_quantity: 5, sales: 2 }]}
        inventoryOperations={inventoryOperations}
        onToast={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText('+Stock-1'))
    expect(screen.getByTestId('stock-1').textContent).toBe('6')

    fireEvent.click(screen.getByRole('button', { name: /Discard/i }))
    expect(screen.getByTestId('stock-1').textContent).toBe('5')
    expect(screen.queryByRole('button', { name: /Save Changes/i })).toBeNull()
  })
})
