import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn()
}))

vi.mock('../../../lib/supabaseClient', () => ({
  supabase: mockSupabase,
  createIsolatedAuthClient: vi.fn()
}))

import { searchOpenInquiryByPhone } from '../../../lib/customerService'
import RegisterSaleScreen from '../RegisterSaleScreen'

function createChain(resolvedValue) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    single: vi.fn().mockResolvedValue(resolvedValue),
    maybeSingle: vi.fn().mockResolvedValue(resolvedValue),
    then: (resolve) => Promise.resolve(resolvedValue).then(resolve)
  }
  return chain
}

function createQuoteTicketsMock(listData = [], singleData = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: singleData, error: null }),
    then: (resolve) => Promise.resolve({ data: listData, error: null }).then(resolve)
  }
}

describe('Ticket 01: Inquiry Lookup by Phone in Direct Walk-In Sale', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('searchOpenInquiryByPhone returns the latest Pending or Confirmed quote_ticket matching the phone', async () => {
    const mockTicket = {
      id: 77,
      ticket_code: 'JDS-INQ-0077',
      customer_name: 'Carlos Mendoza',
      mobile_contact: '09175551234',
      email: 'carlos@example.com',
      product_id: 10,
      product_name: '550W Monocrystalline Solar Panel',
      quantity: 2,
      store_branch: 'Cavite Distribution Hub',
      is_reservation: false,
      status: 'Pending',
      purpose_of_visitation: 'Technical Consultation'
    }

    const quoteChain = createChain({ data: mockTicket, error: null })
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'quote_tickets') return quoteChain
      return createChain({ data: [], error: null })
    })

    const { inquiry, error } = await searchOpenInquiryByPhone('0917-555-1234')

    expect(error).toBeNull()
    expect(inquiry).toEqual(mockTicket)
    expect(mockSupabase.from).toHaveBeenCalledWith('quote_tickets')
    expect(quoteChain.eq).toHaveBeenCalledWith('mobile_contact', '09175551234')
    expect(quoteChain.in).toHaveBeenCalledWith('status', ['Pending', 'Confirmed'])
  })

  it('surfaces an open Inquiry and pre-fills customer, branch, and inquired solar panel in Direct Walk-In Sale mode', async () => {
    const mockProducts = [
      { id: 1, name: '100W Solar Panel', default_warranty_months: 12, stock_quantity: 10, stock_quiapo: 5, stock_cavite: 5, is_archived: false },
      { id: 10, name: '550W Monocrystalline Solar Panel', default_warranty_months: 24, stock_quantity: 8, stock_quiapo: 3, stock_cavite: 5, is_archived: false }
    ]
    const mockTicket = {
      id: 77,
      ticket_code: 'JDS-INQ-0077',
      customer_name: 'Carlos Mendoza',
      mobile_contact: '09175551234',
      email: 'carlos@example.com',
      product_id: 10,
      product_name: '550W Monocrystalline Solar Panel',
      quantity: 2,
      store_branch: 'Cavite Distribution Hub',
      is_reservation: false,
      status: 'Pending',
      purpose_of_visitation: 'Technical Consultation'
    }

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'products') {
        return createChain({ data: mockProducts, error: null })
      }
      if (table === 'customers') {
        return createChain({ data: null, error: null })
      }
      if (table === 'quote_tickets') {
        return createQuoteTicketsMock([], mockTicket)
      }
      return createChain({ data: [], error: null })
    })

    render(<RegisterSaleScreen onNavigate={vi.fn()} />)

    // Flush initial mount effects
    await act(async () => {
      await Promise.resolve()
    })

    const phoneInput = screen.getByLabelText(/Mobile Phone Number/i)
    fireEvent.change(phoneInput, { target: { value: '09175551234' } })

    // Advance past 400ms debounce
    await act(async () => {
      vi.advanceTimersByTime(450)
      await Promise.resolve()
    })

    expect(screen.getByText(/Open Inquiry Found/i)).toBeTruthy()
    expect(screen.getAllByText(/JDS-INQ-0077/).length).toBeGreaterThan(0)
    expect(screen.getByLabelText(/Customer Full Name/i).value).toBe('Carlos Mendoza')
    expect(screen.getByLabelText(/Customer Email Address/i).value).toBe('carlos@example.com')
    expect(screen.getByLabelText(/Branch:/i).value).toBe('Cavite')
    expect(screen.getByText(/Purchased Products \(2\)/i)).toBeTruthy()
  })

  it('Ticket 02: links matched Inquiry on Direct Walk-In Sale submission and allows unlinking it', async () => {
    const mockProducts = [
      { id: 10, name: '550W Monocrystalline Solar Panel', default_warranty_months: 24, stock_quantity: 8, stock_quiapo: 3, stock_cavite: 5, reserved_quiapo: 0, reserved_cavite: 0, is_archived: false }
    ]
    const mockTicket = {
      id: 77,
      ticket_code: 'JDS-INQ-0077',
      customer_name: 'Carlos Mendoza',
      mobile_contact: '09175551234',
      email: 'carlos@example.com',
      product_id: 10,
      product_name: '550W Monocrystalline Solar Panel',
      quantity: 1,
      store_branch: 'Cavite Distribution Hub',
      is_reservation: false,
      status: 'Pending',
      purpose_of_visitation: 'Technical Consultation'
    }

    const insertChain = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 501, full_name: 'Carlos Mendoza', phone_number: '09175551234', email: 'carlos@example.com', access_token: 'tok-501' },
        error: null
      })
    }

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'products') return createChain({ data: mockProducts, error: null })
      if (table === 'customers') {
        return {
          ...createChain({ data: null, error: null }),
          insert: vi.fn(() => insertChain)
        }
      }
      if (table === 'purchases') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn().mockResolvedValue({ data: [{ id: 901, product_id: 10, serial_number: 'SN-100' }], error: null })
          }))
        }
      }
      if (table === 'quote_tickets') {
        return createQuoteTicketsMock([], mockTicket)
      }
      return createChain({ data: [], error: null })
    })
    mockSupabase.rpc.mockResolvedValue({ data: { success: true }, error: null })

    render(<RegisterSaleScreen onNavigate={vi.fn()} />)
    await act(async () => { await Promise.resolve() })

    fireEvent.change(screen.getByLabelText(/Mobile Phone Number/i), { target: { value: '09175551234' } })
    await act(async () => {
      vi.advanceTimersByTime(450)
      await Promise.resolve()
    })

    // Can unlink the matched inquiry
    const unlinkBtn = screen.getByRole('button', { name: /Unlink Inquiry/i })
    expect(unlinkBtn).toBeTruthy()

    // Submit with matched inquiry linked
    const serialInputs = screen.getAllByPlaceholderText(/e\.g\. SN-882910/i)
    fireEvent.change(serialInputs[0], { target: { value: 'SN-100' } })

    const submitBtn = screen.getAllByRole('button', { name: /Complete Sale & Generate QR/i })[0]
    await act(async () => {
      fireEvent.click(submitBtn)
      await Promise.resolve()
    })

    expect(mockSupabase.rpc).toHaveBeenCalledWith('fulfill_reservation_sale', {
      p_ticket_id: 77,
      p_product_id: 10,
      p_quantity: 1,
      p_branch: 'Cavite'
    })
  })

  it('Ticket 03: includes open Consultation Inquiries (JDS-INQ-*) in the Register Sale ticket selector alongside Store Pickups', async () => {
    const mockProducts = [
      { id: 10, name: '550W Monocrystalline Solar Panel', default_warranty_months: 24, stock_quantity: 8, stock_quiapo: 3, stock_cavite: 5, reserved_quiapo: 0, reserved_cavite: 0, is_archived: false }
    ]
    const mockTickets = [
      {
        id: 88,
        ticket_code: 'JDS-INQ-0088',
        customer_name: 'Elena Reyes',
        mobile_contact: '09181112222',
        email: 'elena@example.com',
        product_id: 10,
        product_name: '550W Monocrystalline Solar Panel',
        quantity: 2,
        store_branch: 'Quiapo Showroom (Manila)',
        is_reservation: false,
        status: 'Pending',
        purpose_of_visitation: 'Technical Consultation'
      },
      {
        id: 12,
        ticket_code: 'JDS-RES-0012',
        customer_name: 'Marco Cruz',
        mobile_contact: '09193334444',
        email: 'marco@example.com',
        product_id: 10,
        product_name: '550W Monocrystalline Solar Panel',
        quantity: 1,
        store_branch: 'Cavite Distribution Hub',
        is_reservation: true,
        status: 'Confirmed',
        purpose_of_visitation: 'Store Pickup'
      }
    ]

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'products') return createChain({ data: mockProducts, error: null })
      if (table === 'quote_tickets') return createChain({ data: mockTickets, error: null })
      return createChain({ data: [], error: null })
    })

    render(<RegisterSaleScreen onNavigate={vi.fn()} />)
    await act(async () => { await Promise.resolve() })

    const saleModeSelect = screen.getByLabelText(/Sale mode/i)
    fireEvent.change(saleModeSelect, { target: { value: 'reservation' } })

    const ticketOption = screen.getByRole('option', { name: /JDS-INQ-0088.*Consultation/i })
    expect(ticketOption).toBeTruthy()
    expect(screen.getByRole('option', { name: /JDS-RES-0012.*Store Pickup/i })).toBeTruthy()

    const ticketSelect = screen.getByLabelText(/Select Inquiry or Reservation Ticket/i)
    fireEvent.change(ticketSelect, { target: { value: '88' } })

    expect(screen.getByLabelText(/Customer Full Name/i).value).toBe('Elena Reyes')
    expect(screen.getByLabelText(/Customer Email Address/i).value).toBe('elena@example.com')
    expect(screen.getByLabelText(/Branch:/i).value).toBe('Quiapo')
    expect(screen.getByText(/Purchased Products \(2\)/i)).toBeTruthy()
  })

  it('Ticket 01: returning Customer record takes precedence for name/email while still surfacing open Inquiry', async () => {
    const mockProducts = [
      { id: 10, name: '550W Monocrystalline Solar Panel', default_warranty_months: 24, stock_quantity: 8, stock_quiapo: 3, stock_cavite: 5, is_archived: false }
    ]
    const existingCustomer = {
      id: 42,
      phone_number: '09171119999',
      full_name: 'Returning Buyer',
      email: 'returning@example.com',
      access_token: 'tok-42'
    }
    const openInquiry = {
      id: 99,
      ticket_code: 'JDS-INQ-0099',
      customer_name: 'Inquiry Alias',
      mobile_contact: '09171119999',
      email: 'alias@example.com',
      product_id: 10,
      product_name: '550W Monocrystalline Solar Panel',
      quantity: 3,
      store_branch: 'Cavite Distribution Hub',
      is_reservation: false,
      status: 'Confirmed'
    }

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'products') return createChain({ data: mockProducts, error: null })
      if (table === 'customers') return createChain({ data: existingCustomer, error: null })
      if (table === 'quote_tickets') return createQuoteTicketsMock([], openInquiry)
      return createChain({ data: [], error: null })
    })

    render(<RegisterSaleScreen onNavigate={vi.fn()} />)
    await act(async () => { await Promise.resolve() })

    fireEvent.change(screen.getByLabelText(/Mobile Phone Number/i), { target: { value: '09171119999' } })
    await act(async () => {
      vi.advanceTimersByTime(450)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByText(/Returning Customer/i)).toBeTruthy()
    expect(screen.getByText(/Open Inquiry Found: JDS-INQ-0099/i)).toBeTruthy()
    expect(screen.getByLabelText(/Customer Full Name/i).value).toBe('Returning Buyer')
    expect(screen.getByLabelText(/Customer Email Address/i).value).toBe('returning@example.com')
    expect(screen.getByText(/Purchased Products \(3\)/i)).toBeTruthy()
  })

  it('Ticket 02: unlinking a matched Inquiry omits p_ticket_id on Direct Walk-In Sale submit, while Store Pickup with Stock Hold converts cleanly', async () => {
    const mockProducts = [
      { id: 10, name: '550W Monocrystalline Solar Panel', default_warranty_months: 24, stock_quantity: 5, stock_quiapo: 5, stock_cavite: 0, reserved_quiapo: 1, reserved_cavite: 0, is_archived: false }
    ]
    const mockPickup = {
      id: 81,
      ticket_code: 'JDS-RES-0081',
      customer_name: 'Ana Lopez',
      mobile_contact: '09178887777',
      email: 'ana@example.com',
      product_id: 10,
      product_name: '550W Monocrystalline Solar Panel',
      quantity: 1,
      store_branch: 'Quiapo Showroom (Manila)',
      is_reservation: true,
      status: 'Confirmed',
      purpose_of_visitation: 'Store Pickup'
    }

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'products') return createChain({ data: mockProducts, error: null })
      if (table === 'customers') {
        return {
          ...createChain({ data: null, error: null }),
          insert: vi.fn(() => createChain({ data: { id: 502, full_name: 'Ana Lopez', phone_number: '09178887777', email: 'ana@example.com', access_token: 'tok-502' }, error: null }))
        }
      }
      if (table === 'purchases') return createChain({ data: [{ id: 902, product_id: 10 }], error: null })
      if (table === 'quote_tickets') return createQuoteTicketsMock([], mockPickup)
      return createChain({ data: [], error: null })
    })
    mockSupabase.rpc.mockResolvedValue({ data: { success: true }, error: null })

    render(<RegisterSaleScreen onNavigate={vi.fn()} />)
    await act(async () => { await Promise.resolve() })

    fireEvent.change(screen.getByLabelText(/Mobile Phone Number/i), { target: { value: '09178887777' } })
    await act(async () => {
      vi.advanceTimersByTime(450)
      await Promise.resolve()
    })

    // Unlink Inquiry and submit -> p_ticket_id must be null
    fireEvent.click(screen.getByRole('button', { name: /Unlink Inquiry/i }))
    expect(screen.queryByText(/Open Inquiry Found/i)).toBeNull()

    const submitBtn = screen.getAllByRole('button', { name: /Complete Sale & Generate QR/i })[0]
    await act(async () => {
      fireEvent.click(submitBtn)
      await Promise.resolve()
    })

    expect(mockSupabase.rpc).toHaveBeenCalledWith('fulfill_reservation_sale', {
      p_ticket_id: null,
      p_product_id: 10,
      p_quantity: 1,
      p_branch: 'Quiapo'
    })
  })
})
