import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RightSummaryRail from '../RightSummaryRail'
import InquiriesScreen from '../InquiriesScreen'
import RegisterSaleScreen from '../RegisterSaleScreen'
import { registerCustomerAndSale } from '../../../lib/customerService'
import { notifyOpsUpdated } from '../../../lib/inquiryStatusUtils'

const { mockDb, mockRpcCalls, mockCallLog } = vi.hoisted(() => ({
  mockDb: {
    quotes: [],
    products: [],
    claims: [],
    purchasesCount: 0,
    customers: [{ id: 'cust-1', phone_number: '09171234567', full_name: 'Ana Cruz', email: 'ana@example.com', email_confirmed_at: '2026-11-01T00:00:00Z', access_token: 'tok-1' }],
  },
  mockRpcCalls: [],
  mockCallLog: [],
}))

vi.mock('../../../lib/supabaseClient', () => {
  const buildFrom = (table) => {
    const state = {
      table,
      op: 'select',
      payload: null,
      eqFilters: {},
      inFilters: null,
    }

    const resolveQuery = () => {
      if (table === 'quote_tickets') {
        if (state.op === 'select') {
          let rows = [...mockDb.quotes]
          if (state.inFilters?.col === 'status') {
            rows = rows.filter((r) => state.inFilters.vals.includes(r.status))
          }
          if (state.eqFilters.id !== undefined) {
            rows = rows.filter((r) => String(r.id) === String(state.eqFilters.id))
          }
          return { data: rows, count: rows.length, error: null }
        }
        if (state.op === 'update') {
          mockCallLog.push({ op: 'update', table, payload: state.payload, eq: { ...state.eqFilters } })
          mockDb.quotes = mockDb.quotes.map((r) =>
            String(r.id) === String(state.eqFilters.id) ? { ...r, ...state.payload } : r
          )
          return { data: mockDb.quotes, error: null }
        }
        if (state.op === 'delete') {
          mockCallLog.push({ op: 'delete', table, eq: { ...state.eqFilters }, in: state.inFilters })
          if (state.eqFilters.id !== undefined) {
            mockDb.quotes = mockDb.quotes.filter((r) => String(r.id) !== String(state.eqFilters.id))
          } else if (state.inFilters?.col === 'id') {
            mockDb.quotes = mockDb.quotes.filter((r) => !state.inFilters.vals.includes(r.id))
          }
          return { data: [], error: null }
        }
      }

      if (table === 'products') {
        if (state.op === 'select') {
          let rows = [...mockDb.products]
          if (state.eqFilters.id !== undefined) {
            rows = rows.filter((r) => String(r.id) === String(state.eqFilters.id))
          }
          return { data: rows, count: rows.length, error: null }
        }
        if (state.op === 'update') {
          mockCallLog.push({ op: 'update', table, payload: state.payload, eq: { ...state.eqFilters } })
          return { data: [], error: null }
        }
      }

      if (table === 'warranty_claims') {
        return { data: mockDb.claims, count: mockDb.claims.length, error: null }
      }

      if (table === 'customer_purchases') {
        if (state.op === 'insert') {
          const inserted = Array.isArray(state.payload) ? state.payload : [state.payload]
          return { data: inserted.map((p, idx) => ({ ...p, id: `pur-${idx + 1}` })), error: null }
        }
        return { data: [], count: mockDb.purchasesCount, error: null }
      }

      if (table === 'customers') {
        if (state.op === 'select') {
          const phone = state.eqFilters.phone_number
          const found = mockDb.customers.find((c) => c.phone_number === phone) || null
          return { data: found, error: null }
        }
        if (state.op === 'update') {
          return { data: mockDb.customers[0], error: null }
        }
        if (state.op === 'insert') {
          return { data: mockDb.customers[0], error: null }
        }
      }

      return { data: [], count: 0, error: null }
    }

    const chain = {
      select: vi.fn(() => chain),
      order: vi.fn(() => Promise.resolve(resolveQuery())),
      eq: vi.fn((col, val) => {
        state.eqFilters[col] = val
        return chain
      }),
      in: vi.fn((col, vals) => {
        state.inFilters = { col, vals }
        return chain
      }),
      update: vi.fn((payload) => {
        state.op = 'update'
        state.payload = payload
        return chain
      }),
      delete: vi.fn(() => {
        state.op = 'delete'
        return chain
      }),
      insert: vi.fn((payload) => {
        state.op = 'insert'
        state.payload = payload
        return chain
      }),
      maybeSingle: vi.fn(() => Promise.resolve(resolveQuery())),
      single: vi.fn(() => Promise.resolve(resolveQuery())),
      then: (resolve) => Promise.resolve(resolveQuery()).then(resolve),
      catch: (reject) => Promise.resolve(resolveQuery()).catch(reject),
    }
    return chain
  }

  const mockRpc = vi.fn(async (fnName, params) => {
    mockRpcCalls.push({ fnName, params })
    mockCallLog.push({ op: 'rpc', fnName, params })
    if (fnName === 'reserve_product_stock') {
      return { data: { success: true, expires_at: '2026-11-22T00:00:00Z' }, error: null }
    }
    if (fnName === 'release_product_reservation') {
      return { data: { success: true, released: 1 }, error: null }
    }
    if (fnName === 'fulfill_reservation_sale') {
      return { data: { success: true, branch: params?.p_branch || 'Quiapo' }, error: null }
    }
    return { data: { success: true }, error: null }
  })

  return {
    supabase: {
      from: vi.fn(buildFrom),
      rpc: mockRpc,
    },
  }
})

describe('Inquiry Fulfillment, Stock Holds, and Counters', () => {
  beforeEach(() => {
    localStorage.clear()
    mockRpcCalls.length = 0
    mockCallLog.length = 0
    mockDb.claims = []
    mockDb.purchasesCount = 0
    mockDb.products = [
      {
        id: 10,
        name: 'Deye 8kW Hybrid Inverter',
        stock_quantity: 8,
        reserved_quantity: 1,
        stock_quiapo: 5,
        reserved_quiapo: 0,
        stock_cavite: 3,
        reserved_cavite: 1,
        sales: 4,
        default_warranty_months: 60,
        in_stock: true,
      },
    ]
    mockDb.quotes = []
  })

  afterEach(() => {
    cleanup()
  })

  it('RightSummaryRail shows 0% when empty, avoids double-counting pickups, and updates on jds:ops-updated', async () => {
    render(
      <MemoryRouter>
        <RightSummaryRail products={mockDb.products} />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('0%')).toBeTruthy()
      expect(screen.getByText('0 of 0 fulfilled (0 pending)')).toBeTruthy()
      expect(screen.getByText('0 pickups')).toBeTruthy()
      expect(screen.getByText('0 visits')).toBeTruthy()
      expect(screen.getByText('Showroom inquiries')).toBeTruthy()
    })

    // Add 1 active pickup (with will_visit=true!), 1 active consultation, 1 completed pickup, 1 cancelled ticket
    mockDb.quotes = [
      {
        id: 1,
        ticket_code: 'JDS-RES-2026-1001',
        status: 'Confirmed',
        will_visit: true,
        purpose_of_visitation: 'Store Pickup & Reservation',
        is_reservation: true,
      },
      {
        id: 2,
        ticket_code: 'JDS-INQ-2026-1002',
        status: 'Pending',
        will_visit: true,
        purpose_of_visitation: 'Showroom Consultation',
        is_reservation: false,
      },
      {
        id: 3,
        ticket_code: 'JDS-RES-2026-1003',
        status: 'Completed',
        will_visit: true,
        purpose_of_visitation: 'Store Pickup',
        is_reservation: false,
      },
      {
        id: 4,
        ticket_code: 'JDS-INQ-2026-1004',
        status: 'Cancelled',
        will_visit: true,
        purpose_of_visitation: 'Consultation',
        is_reservation: false,
      },
    ]

    notifyOpsUpdated()

    await waitFor(() => {
      // 1 completed / (1 Pending + 1 Confirmed + 1 Completed) = 33%, Cancelled excluded
      expect(screen.getByText('33%')).toBeTruthy()
      expect(screen.getByText('1 of 3 fulfilled (1 pending)')).toBeTruthy()
      expect(screen.getByText('1 pickups')).toBeTruthy()
      expect(screen.getByText('1 holding stock')).toBeTruthy()
      expect(screen.getByText('1 visits')).toBeTruthy()
    })
  })

  it('InquiriesScreen Store Pickups KPI counts only active pickups and updates branch before reserving', async () => {
    const today = new Date().toISOString().split('T')[0]
    mockDb.quotes = [
      {
        id: 21,
        ticket_code: 'JDS-RES-2026-2001',
        customer_name: 'Carlos Reyes',
        mobile_contact: '09171112233',
        email: 'carlos@example.com',
        product_id: 10,
        product_name: 'Deye 8kW Hybrid Inverter',
        quantity: 2,
        store_branch: 'Cavite Distribution Hub',
        status: 'Pending',
        visit_date: today,
        visit_time_slot: '10:00 AM - 11:00 AM',
        purpose_of_visitation: 'Store Pickup & Reservation',
        is_reservation: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 22,
        ticket_code: 'JDS-RES-2026-2002',
        customer_name: 'Done Pickup',
        mobile_contact: '09179998877',
        email: 'done@example.com',
        product_id: 10,
        product_name: 'Deye 8kW Hybrid Inverter',
        quantity: 1,
        store_branch: 'Quiapo Branch (Manila)',
        status: 'Completed',
        visit_date: today,
        visit_time_slot: '01:00 PM - 02:00 PM',
        purpose_of_visitation: 'Store Pickup',
        is_reservation: false,
        created_at: new Date().toISOString(),
      },
    ]

    const onNavigate = vi.fn()
    render(<InquiriesScreen initialViewMode="table" onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getAllByText('Carlos Reyes').length).toBeGreaterThan(0)
    })

    // Only 1 active Store Pickup (Carlos Reyes); Done Pickup (Completed) is excluded
    const pickupCard = screen.getByText(/0 holding stock/i).closest('div').parentElement
    expect(within(pickupCard).getByText('Store Pickups')).toBeTruthy()
    expect(within(pickupCard).getByText('1')).toBeTruthy()
    expect(within(pickupCard).getByText('0 holding stock')).toBeTruthy()

    // Open Carlos Reyes drawer via desktop TableRow (index 1), switch branch to Quiapo, enable Stock Hold, and Save
    fireEvent.click(screen.getAllByText('Carlos Reyes')[1])

    await waitFor(() => {
      expect(screen.getByLabelText(/Hold Stock for Pickup/i)).toBeTruthy()
    })

    // Fulfill via Register Sale & QR handoff button works
    const fulfillBtn = screen.getByRole('button', { name: /Fulfill via Register Sale & QR/i })
    fireEvent.click(fulfillBtn)
    expect(onNavigate).toHaveBeenCalledWith('register-sale', { ticketId: 21 })

    // Re-open Carlos Reyes drawer to test Save sequence (branch saved BEFORE reserve_product_stock)
    fireEvent.click(screen.getAllByText('Carlos Reyes')[1])
    await waitFor(() => {
      expect(screen.getByLabelText(/Hold Stock for Pickup/i)).toBeTruthy()
    })

    const branchSelect = screen.getByDisplayValue('Cavite Distribution Hub')
    fireEvent.change(branchSelect, { target: { value: 'Quiapo Branch (Manila)' } })
    fireEvent.click(screen.getByLabelText(/Hold Stock for Pickup/i))
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

    await waitFor(() => {
      expect(mockRpcCalls.some((c) => c.fnName === 'reserve_product_stock')).toBe(true)
    })

    const updateIdx = mockCallLog.findIndex((c) => c.op === 'update' && c.table === 'quote_tickets')
    const reserveIdx = mockCallLog.findIndex((c) => c.op === 'rpc' && c.fnName === 'reserve_product_stock')
    expect(updateIdx).toBeGreaterThan(-1)
    expect(reserveIdx).toBeGreaterThan(updateIdx)
    expect(mockCallLog[updateIdx].payload.store_branch).toBe('Quiapo Branch (Manila)')
  })

  it('auto-releases Stock Hold when marking Completed, deleting, or bulk-purging without calling missing RPC', async () => {
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    mockDb.quotes = [
      {
        id: 31,
        ticket_code: 'JDS-RES-2026-3001',
        customer_name: 'Active Hold User',
        mobile_contact: '09172223344',
        email: 'hold@example.com',
        product_id: 10,
        product_name: 'Deye 8kW Hybrid Inverter',
        quantity: 1,
        store_branch: 'Cavite Distribution Hub',
        status: 'Confirmed',
        visit_date: '2026-11-20',
        visit_time_slot: '09:00 AM - 10:00 AM',
        purpose_of_visitation: 'Store Pickup & Reservation',
        is_reservation: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 32,
        ticket_code: 'JDS-RES-2026-3002',
        customer_name: 'Expired Hold Purge',
        mobile_contact: '09173334455',
        email: 'expired@example.com',
        product_id: 10,
        product_name: 'Deye 8kW Hybrid Inverter',
        quantity: 1,
        store_branch: 'Quiapo Branch (Manila)',
        status: 'Cancelled',
        visit_date: oldDate.split('T')[0],
        visit_time_slot: '10:00 AM - 11:00 AM',
        purpose_of_visitation: 'Store Pickup',
        is_reservation: true,
        created_at: oldDate,
      },
    ]

    render(<InquiriesScreen initialViewMode="table" />)

    // Auto-purge on load should release ticket 32's reservation before deleting it
    await waitFor(() => {
      expect(
        mockRpcCalls.some(
          (c) => c.fnName === 'release_product_reservation' && c.params?.p_ticket_id === 32
        )
      ).toBe(true)
      expect(mockRpcCalls.some((c) => c.fnName === 'purge_inactive_quote_tickets')).toBe(false)
    })

    // Open active hold ticket 31, set status Completed -> note appears & save releases hold
    await waitFor(() => {
      expect(screen.getAllByText('Active Hold User').length).toBeGreaterThan(1)
    })
    fireEvent.click(screen.getAllByText('Active Hold User')[1])
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Completed/i })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /Completed/i }))
    expect(screen.getByText(/Marking Completed here releases any active Stock Hold/i)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

    await waitFor(() => {
      expect(
        mockRpcCalls.some(
          (c) => c.fnName === 'release_product_reservation' && c.params?.p_ticket_id === 31
        )
      ).toBe(true)
    })
  })

  it('RegisterSaleScreen auto-selects preselectedTicketId and registerCustomerAndSale passes p_branch + aggregated qty', async () => {
    mockDb.quotes = [
      {
        id: 41,
        ticket_code: 'JDS-RES-2026-4001',
        customer_name: 'Ana Cruz',
        mobile_contact: '09171234567',
        email: 'ana@example.com',
        product_id: 10,
        product_name: 'Deye 8kW Hybrid Inverter',
        quantity: 2,
        store_branch: 'Cavite Distribution Hub',
        status: 'Confirmed',
        purpose_of_visitation: 'Store Pickup & Reservation',
        is_reservation: true,
      },
    ]

    render(<RegisterSaleScreen onNavigate={vi.fn()} preselectedTicketId={41} />)

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('e.g. Maria Santos')
      expect(nameInput.value).toBe('Ana Cruz')
    })

    // Direct walk-in sale at Cavite passes p_branch='Cavite' and grouped p_quantity=2
    await registerCustomerAndSale({
      phoneNumber: '09171234567',
      fullName: 'Ana Cruz',
      email: 'ana@example.com',
      branchLocation: 'Cavite',
      items: [
        { productId: '10', serialNumber: 'SN-1', warrantyMonths: 60, purchaseDate: '2026-11-17' },
        { productId: '10', serialNumber: 'SN-2', warrantyMonths: 60, purchaseDate: '2026-11-17' },
      ],
      ticketId: 41,
    })

    const fulfillCall = mockRpcCalls.find((c) => c.fnName === 'fulfill_reservation_sale')
    expect(fulfillCall).toBeTruthy()
    expect(fulfillCall.params).toEqual({
      p_ticket_id: 41,
      p_product_id: 10,
      p_quantity: 2,
      p_branch: 'Cavite',
    })
  })
})
