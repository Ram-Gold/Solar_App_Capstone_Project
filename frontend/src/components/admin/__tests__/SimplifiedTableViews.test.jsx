import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import WarrantyClaimsScreen from '../WarrantyClaimsScreen'
import CustomersScreen from '../CustomersScreen'
import OrdersScreen from '../OrdersScreen'
import UsersScreen from '../UsersScreen'
import ImagesScreen from '../ImagesScreen'
import ProductsScreen from '../ProductsScreen'

const { mockState } = vi.hoisted(() => ({
  mockState: {
    products: [
      { id: 1, name: 'Deye 8kW Inverter', type: 'Hybrid Inverters', watt: 8000, stock_quantity: 8, sales: 4, in_stock: true, is_archived: false },
      { id: 2, name: 'Legacy 100W Floodlight', type: 'Floodlights', watt: 100, stock_quantity: 2, sales: 1, in_stock: true, is_archived: false },
    ],
    orders: [
      { id: 11, customer_name: 'Juan Dela Cruz', address: 'Manila', product_name: 'Deye 8kW Inverter', quantity: 1, price: 78000, status: 'Pending' },
    ],
    staff: [
      { id: 's-1', full_name: 'Marco Reyes', email: 'marco@jdsolar.ph', phone: '09171112222', position: 'Technician', created_at: '2026-10-01T00:00:00Z' },
    ],
    admins: [
      { id: 'a-1', full_name: 'Elena Cruz', email: 'elena@jdsolar.ph', phone: '09173334444', position: 'Administrator', created_at: '2026-09-01T00:00:00Z' },
    ],
    claims: [
      {
        id: 'claim-12345678',
        status: 'in_review',
        issue_category: 'Battery Drain',
        description: 'Voltage drops at night',
        created_at: '2026-11-10T00:00:00Z',
        customer_purchases: {
          serial_number: 'SN-1001',
          branch_location: 'Cavite',
          warranty_expires_at: '2027-11-10',
          customers: { full_name: 'Carlos Mendoza', phone_number: '09175556666' },
          products: { name: 'Deye 8kW Inverter' },
        },
      },
    ],
    customers: [
      {
        id: 'c-1',
        full_name: 'Ana Bautista',
        phone_number: '09178889999',
        email: 'ana@example.com',
        email_confirmed_at: '2026-11-01T00:00:00Z',
        access_token: 'tok-abc-123',
        created_at: '2026-11-01T00:00:00Z',
        purchases: [{ id: 'p-1', branch_location: 'Quiapo', is_warranty_active: true, is_voided: false }],
        total_purchases: 1,
        active_warranties_count: 1,
      },
    ],
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'a-1', email: 'elena@jdsolar.ph' },
    role: 'admin',
    signOut: vi.fn(),
  }),
}))

vi.mock('../../../lib/customerService', () => ({
  fetchAllWarrantyClaims: vi.fn(async () => ({ claims: mockState.claims, error: null })),
  updateClaimStatus: vi.fn(async () => ({ error: null })),
  archiveWarrantyClaim: vi.fn(async () => ({ error: null })),
  restoreWarrantyClaim: vi.fn(async () => ({ error: null })),
  deleteWarrantyClaim: vi.fn(async () => ({ error: null })),
  fetchAllCustomers: vi.fn(async () => ({ customers: mockState.customers, error: null })),
  updateCustomerProfile: vi.fn(async () => ({ customer: mockState.customers[0], error: null })),
  addCustomerProductPurchase: vi.fn(async () => ({ purchase: null, error: null })),
  voidCustomerWarranty: vi.fn(async () => ({ error: null })),
  unvoidCustomerWarranty: vi.fn(async () => ({ error: null })),
  extendCustomerWarranty: vi.fn(async () => ({ error: null })),
  removeCustomerPurchase: vi.fn(async () => ({ error: null })),
  deleteCustomerAccount: vi.fn(async () => ({ error: null })),
  queueAndSendCustomerConfirmationEmail: vi.fn(async () => ({ ok: true })),
  deletePlatformUser: vi.fn(async () => ({ error: null })),
  adminSetUserPassword: vi.fn(async () => ({ error: null })),
}))

vi.mock('../../../lib/supabaseClient', () => {
  const buildChain = (table) => {
    let op = 'select'
    let updatePayload = null
    let inVals = null
    const resolve = () => {
      if (table === 'products') {
        if (op === 'update' && inVals) {
          mockState.products = mockState.products.map((p) =>
            inVals.includes(p.id) ? { ...p, ...updatePayload } : p
          )
          return { data: mockState.products, error: null }
        }
        return { data: mockState.products, error: null }
      }
      if (table === 'orders') return { data: mockState.orders, error: null }
      if (table === 'staff') return { data: mockState.staff, error: null }
      if (table === 'admins') return { data: mockState.admins, error: null }
      if (table === 'customer_purchases') return { data: [], error: null }
      return { data: [], error: null }
    }

    const chain = {
      select: vi.fn(() => chain),
      order: vi.fn(() => Promise.resolve(resolve())),
      eq: vi.fn(() => chain),
      in: vi.fn((_col, vals) => {
        inVals = vals
        return chain
      }),
      update: vi.fn((payload) => {
        op = 'update'
        updatePayload = payload
        return chain
      }),
      delete: vi.fn(() => {
        op = 'delete'
        return chain
      }),
      then: (cb) => Promise.resolve(resolve()).then(cb),
    }
    return chain
  }

  return {
    supabase: {
      from: vi.fn(buildChain),
      storage: {
        from: vi.fn(() => ({
          list: vi.fn().mockResolvedValue({
            data: [{ name: 'inverter-1.webp', created_at: '2026-11-10T00:00:00Z', metadata: { size: 20480 } }],
            error: null,
          }),
          getPublicUrl: vi.fn((name) => ({ data: { publicUrl: `https://example.com/${name}` } })),
        })),
      },
    },
  }
})

describe('Simplified Table-Default & Card-Toggle Admin Views', () => {
  beforeEach(() => {
    localStorage.clear()
    mockState.products = [
      { id: 1, name: 'Deye 8kW Inverter', type: 'Hybrid Inverters', watt: 8000, stock_quantity: 8, sales: 4, in_stock: true, is_archived: false },
      { id: 2, name: 'Legacy 100W Floodlight', type: 'Floodlights', watt: 100, stock_quantity: 2, sales: 1, in_stock: true, is_archived: false },
    ]
  })

  afterEach(() => {
    cleanup()
  })

  it('WarrantyClaimsScreen defaults to Table view and toggles to Cards & Board', async () => {
    render(<WarrantyClaimsScreen />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Claims' })).toBeTruthy()
      expect(screen.getByRole('table')).toBeTruthy()
      expect(screen.getByText('Carlos Mendoza')).toBeTruthy()
    })

    const tableStatusSelect = screen.getByLabelText(/Claim claim-12 status/i)
    expect(tableStatusSelect.className).toContain('bg-amber-500/10')

    fireEvent.click(screen.getByRole('button', { name: /Cards view/i }))
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText('Carlos Mendoza')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Board view/i }))
    expect(screen.getByRole('heading', { name: 'Diagnostic Intake' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'For Verification / Checking' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Approved for Repair / Replacement' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Ready for Release / Pickup' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Handover Complete' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Declined' })).toBeTruthy()

    expect(screen.queryByLabelText(/Move claim claim-12 status/i)).toBeNull()
    const cardTitle = screen.getByText('Deye 8kW Inverter')
    expect(cardTitle.closest('[draggable="true"]').className).toContain('border-l-amber-500')

    const helpBtn = screen.getByRole('button', { name: /Next action for Diagnostic Intake/i })
    fireEvent.click(helpBtn)
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.textContent).toContain('Next Action Required')
    expect(tooltip.className).toContain('fixed')
    expect(tooltip.className).toContain('bg-neutral-800')

    // Stage a claim status change via Table view -> Save Changes -> Confirmation Modal
    fireEvent.click(screen.getByRole('button', { name: /Table view/i }))
    fireEvent.change(screen.getByLabelText(/Claim claim-12 status/i), {
      target: { value: 'checking' },
    })
    const pendingBar = screen.getByRole('region', { name: /Pending claim stage changes/i })
    expect(pendingBar.textContent).toContain('CLAIM-CLAIM-12')
    expect(pendingBar.textContent).toContain('For Verification / Checking')
    fireEvent.click(screen.getByRole('button', { name: /Save Changes \(1\)/i }))
    expect(screen.getByText(/Confirm Claim Stage Changes/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Save/i }))
    await waitFor(() => {
      expect(screen.queryByRole('region', { name: /Pending claim stage changes/i })).toBeNull()
    })

    // Visible button to view Archived Claims
    fireEvent.click(screen.getByRole('button', { name: /Archived Claims \(0\)/i }))
    expect(screen.getByText(/No archived claims found/i)).toBeTruthy()
  })

  it('CustomersScreen defaults to Table view and toggles to Cards', async () => {
    render(<CustomersScreen onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Customers' })).toBeTruthy()
      expect(screen.getByRole('table')).toBeTruthy()
      expect(screen.getByText('Ana Bautista')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /Cards view/i }))
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText('Ana Bautista')).toBeTruthy()
  })

  it('OrdersScreen defaults to Table view and toggles to Cards', async () => {
    render(<OrdersScreen />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Orders' })).toBeTruthy()
      expect(screen.getByRole('table')).toBeTruthy()
      expect(screen.getAllByText('Juan Dela Cruz').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: /Cards view/i }))
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText('Juan Dela Cruz')).toBeTruthy()
  })

  it('UsersScreen unifies Staff and Admins in Table default and filters via Role dropdown', async () => {
    render(<UsersScreen />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Users' })).toBeTruthy()
      expect(screen.getByRole('table')).toBeTruthy()
      expect(screen.getByText('Marco Reyes')).toBeTruthy()
      expect(screen.getByText('Elena Cruz')).toBeTruthy()
    })

    fireEvent.change(screen.getByRole('combobox', { name: /Filter by role/i }), {
      target: { value: 'staff' },
    })
    expect(screen.getByText('Marco Reyes')).toBeTruthy()
    expect(screen.queryByText('Elena Cruz')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Cards view/i }))
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText('Marco Reyes')).toBeTruthy()
  })

  it('ImagesScreen defaults to Table view and toggles to Cards', async () => {
    render(<ImagesScreen />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Media Library' })).toBeTruthy()
      expect(screen.getByRole('table')).toBeTruthy()
      expect(screen.getByText('inverter-1.webp')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /Cards view/i }))
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText('inverter-1.webp')).toBeTruthy()
  })

  it('ProductsScreen supports Mass Archive via checkboxes and restores from Archived dropdown', async () => {
    render(<ProductsScreen onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeTruthy()
    })

    const table = screen.getByRole('table')
    fireEvent.click(within(table).getByRole('checkbox', { name: /Select Legacy 100W Floodlight/i }))
    fireEvent.click(screen.getByRole('button', { name: /Archive Selected/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Confirm Archive/i })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /Confirm Archive/i }))

    await waitFor(() => {
      expect(screen.queryByText('Legacy 100W Floodlight')).toBeNull()
    })

    // Switch section dropdown to Archived Products
    fireEvent.change(screen.getByRole('combobox', { name: /Products section/i }), {
      target: { value: 'archived' },
    })

    await waitFor(() => {
      expect(within(screen.getByRole('table')).getByText('Legacy 100W Floodlight')).toBeTruthy()
    })
  })
})
