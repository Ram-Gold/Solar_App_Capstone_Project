import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OperationsSidebar from '../OperationsSidebar'
import InspectorDrawer from '../InspectorDrawer'
import DashboardScreen from '../DashboardScreen'
import ProductsScreen from '../ProductsScreen'

const { mockProducts, mockRole } = vi.hoisted(() => ({
  mockProducts: [
    {
      id: 1,
      name: 'Deye 8kW Hybrid Solar Inverter',
      type: 'Hybrid Inverters',
      watt: 8000,
      min_price: 78900,
      price_range: '₱78,900',
      stock_quantity: 11,
      stock_quiapo: 6,
      stock_cavite: 5,
      sales: 14,
      in_stock: true,
    },
    {
      id: 2,
      name: 'LVTopsun 48V 100Ah LiFePO4 Battery',
      type: 'Batteries',
      watt: 5120,
      min_price: 54500,
      price_range: '₱54,500',
      stock_quantity: 2,
      stock_quiapo: 1,
      stock_cavite: 1,
      sales: 11,
      in_stock: true,
    },
  ],
  mockRole: { current: 'admin' },
}))

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u-1', email: 'ops@jdsolar.example' },
    role: mockRole.current,
    signOut: vi.fn(),
  }),
}))

vi.mock('../../../lib/supabaseClient', () => {
  const buildChain = (data = [], count = 0) => {
    const chain = {
      select: vi.fn(() => chain),
      order: vi.fn().mockResolvedValue({ data, error: null }),
      eq: vi.fn(() => chain),
      in: vi.fn(() => chain),
      ilike: vi.fn(() => chain),
      or: vi.fn(() => chain),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      then: (resolve) => resolve({ data, count, error: null }),
    }
    return chain
  }

  return {
    supabase: {
      from: vi.fn((table) => {
        if (table === 'products') return buildChain(mockProducts, mockProducts.length)
        if (table === 'quote_tickets') return buildChain([{ id: 1, status: 'Pending', will_visit: true }], 1)
        if (table === 'warranty_claims') return buildChain([{ id: 1, status: 'Pending' }], 1)
        return buildChain([], 0)
      }),
      storage: {
        from: vi.fn(() => ({
          list: vi.fn().mockResolvedValue({ data: [], error: null }),
          getPublicUrl: vi.fn(() => ({ data: { publicUrl: '' } })),
        })),
      },
    },
  }
})

describe('JD Solar Dashboard Redesign', () => {
  beforeEach(() => {
    localStorage.clear()
    mockRole.current = 'admin'
  })

  afterEach(() => {
    cleanup()
  })

  it('OperationsSidebar hides Users in staff mode, collapses to 64px icon rail, and folds Profile into footer', () => {
    const onNavigate = vi.fn()
    const { rerender } = render(
      <MemoryRouter>
        <OperationsSidebar
          roleVariant="admin"
          activeScreen="dashboard"
          onNavigate={onNavigate}
          isOpen={false}
          onClose={vi.fn()}
        />
      </MemoryRouter>
    )

    expect(screen.getByRole('button', { name: 'Users' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Images' })).toBeNull()

    // Collapse to 64px icon rail (lg:w-16)
    const collapseBtn = screen.getByRole('button', { name: /Collapse sidebar/i })
    fireEvent.click(collapseBtn)
    expect(localStorage.getItem('jds_ops_sidebar_collapsed')).toBe('true')

    // Click profile chip in footer
    fireEvent.click(screen.getByRole('button', { name: /Open account profile/i }))
    expect(onNavigate).toHaveBeenCalledWith('profile')

    // Staff hides Users
    rerender(
      <MemoryRouter>
        <OperationsSidebar
          roleVariant="staff"
          activeScreen="dashboard"
          onNavigate={onNavigate}
          isOpen={false}
          onClose={vi.fn()}
        />
      </MemoryRouter>
    )
    expect(screen.queryByRole('button', { name: 'Users' })).toBeNull()
  })

  it('InspectorDrawer anchors below Navbar, switches tabs, and closes on Escape', () => {
    const onClose = vi.fn()
    const onTabChange = vi.fn()

    render(
      <InspectorDrawer
        isOpen={true}
        onClose={onClose}
        title="Deye 8kW Hybrid Solar Inverter"
        subtitle="Equipment #1"
        tabs={[
          { id: 'inspect', label: 'Inspect' },
          { id: 'audit', label: 'Audit Stock' },
        ]}
        activeTab="inspect"
        onTabChange={onTabChange}
      >
        <div>Inspector body content</div>
      </InspectorDrawer>
    )

    expect(screen.getByText('Deye 8kW Hybrid Solar Inverter')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Audit Stock' }))
    expect(onTabChange).toHaveBeenCalledWith('audit')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('DashboardScreen defaults to table view, opens InspectorDrawer on row click, and gates valuation/prices for staff', async () => {
    const { rerender } = render(<DashboardScreen onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Operations Overview')).toBeTruthy()
      expect(screen.getByText('Inventory Valuation')).toBeTruthy()
      expect(screen.getByRole('table')).toBeTruthy()
    })

    // Clicking a product row opens the slide-over InspectorDrawer
    const desktopTable = screen.getByRole('table')
    fireEvent.click(within(desktopTable).getByText('Deye 8kW Hybrid Solar Inverter'))
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy()
      expect(screen.getByText('Branch Stock Breakdown')).toBeTruthy()
    })

    // Staff mode swaps Inventory Valuation for Open Warranty Claims & hides price_range
    mockRole.current = 'staff'
    rerender(<DashboardScreen onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.queryByText('Inventory Valuation')).toBeNull()
      expect(screen.getByText('Open Warranty Claims')).toBeTruthy()
      expect(within(screen.getByRole('table')).queryByText('₱78,900')).toBeNull()
    })
  })

  it('ProductsScreen defaults to table view and embeds Images & Media Library tab', async () => {
    render(<ProductsScreen onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Solar Inventory Catalog')).toBeTruthy()
      expect(screen.getByRole('tab', { name: /Catalog SKUs/i })).toBeTruthy()
      expect(screen.getByRole('tab', { name: /Images & Media Library/i })).toBeTruthy()
      expect(screen.getByRole('table')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('tab', { name: /Images & Media Library/i }))

    await waitFor(() => {
      expect(screen.getByText('Media Library Assets')).toBeTruthy()
    })
  })
})
