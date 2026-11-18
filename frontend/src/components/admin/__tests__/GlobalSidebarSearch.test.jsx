import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OperationsSidebar from '../OperationsSidebar'

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'a-1', email: 'elena@jdsolar.ph' },
    role: 'admin',
    signOut: vi.fn(),
  }),
}))

vi.mock('../../../lib/supabaseClient', () => {
  const datasets = {
    products: [{ id: 10, name: 'Deye 8kW Hybrid Inverter', type: 'Hybrid Inverters', watt: 8000, is_archived: false }],
    quote_tickets: [{ id: 'q-1', ticket_code: 'JDS-INQ-104', customer_name: 'Juan Dela Cruz', customer_phone: '09171234567', purpose: 'Product Quote', status: 'Pending' }],
    warranty_claims: [{ id: 'abcd1234-0000-0000-0000-000000000000', issue_category: 'Battery Drain', description: 'Voltage drop', status: 'in_review' }],
    customers: [{ id: 'c-1', full_name: 'Maria Santos', phone_number: '09179998888', access_token: 'JDS-CUST-01' }],
    orders: [{ id: 42, customer_name: 'Pedro Reyes', product_name: 'Deye 8kW Hybrid Inverter', status: 'Pending' }],
  }

  const makeChain = (table) => {
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      in: vi.fn(() => chain),
      or: vi.fn(() => chain),
      ilike: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      then: (cb) => Promise.resolve({ data: datasets[table] || [], count: 0, error: null }).then(cb),
    }
    return chain
  }

  return {
    supabase: {
      from: vi.fn((table) => makeChain(table)),
    },
  }
})

describe('OperationsSidebar Global Search', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('searches products, inquiries, warranty claims, customers, and orders and passes deep-link payload on click', async () => {
    const onNavigate = vi.fn()
    render(
      <MemoryRouter>
        <OperationsSidebar
          roleVariant="admin"
          activeScreen="dashboard"
          onNavigate={onNavigate}
          isOpen={true}
          onClose={vi.fn()}
        />
      </MemoryRouter>
    )

    const input = screen.getByPlaceholderText(/Search items, inquiries, claims/i)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Deye' } })

    await waitFor(() => {
      expect(screen.getByText('Deye 8kW Hybrid Inverter')).toBeTruthy()
      expect(screen.getByText('Juan Dela Cruz')).toBeTruthy()
      expect(screen.getByText('JDS-INQ-104')).toBeTruthy()
      expect(screen.getByText('Battery Drain')).toBeTruthy()
      expect(screen.getByText('CLAIM-ABCD1234')).toBeTruthy()
      expect(screen.getByText('Maria Santos')).toBeTruthy()
      expect(screen.getByText('#42')).toBeTruthy()
    })

    fireEvent.click(screen.getByText('JDS-INQ-104'))
    expect(onNavigate).toHaveBeenCalledWith('inquiries', {
      searchQuery: 'JDS-INQ-104',
      itemId: 'q-1',
    })
  })

  it('supports ArrowDown and Enter keyboard navigation in search results', async () => {
    const onNavigate = vi.fn()
    render(
      <MemoryRouter>
        <OperationsSidebar
          roleVariant="admin"
          activeScreen="dashboard"
          onNavigate={onNavigate}
          isOpen={true}
          onClose={vi.fn()}
        />
      </MemoryRouter>
    )

    const input = screen.getByPlaceholderText(/Search items, inquiries, claims/i)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'products' } })

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onNavigate).toHaveBeenCalledWith('products')
  })
})
