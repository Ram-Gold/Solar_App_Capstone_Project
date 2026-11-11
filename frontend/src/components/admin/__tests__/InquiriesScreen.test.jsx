import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import InquiriesScreen from '../InquiriesScreen'

const { mockInquiries } = vi.hoisted(() => ({
  mockInquiries: [
    {
      id: 101,
      ticket_code: 'JDS-INQ-1001',
      customer_name: 'Maria Santos',
      mobile_contact: '09171234567',
      email: 'maria@example.com',
      product_name: '5kW Hybrid Solar Inverter',
      product_watt: 5000,
      quantity: 1,
      store_branch: 'Cavite Distribution Hub',
      status: 'Pending',
      visit_date: '2026-11-20',
      visit_time_slot: '09:00 AM - 10:00 AM',
      purpose_of_visitation: 'Showroom Consultation',
      street_address: '123 Solar Street',
      barangay: 'San Antonio',
      city: 'Cavite City',
      province: 'Cavite',
      delivery_address: '123 Solar Street, San Antonio, Cavite City, Cavite',
      created_at: new Date().toISOString(),
    },
  ],
}))

vi.mock('../../../lib/supabaseClient', () => {
  const mockOrder = vi.fn().mockResolvedValue({ data: mockInquiries, error: null })
  const mockSelect = vi.fn(() => ({ order: mockOrder }))
  const mockDelete = vi.fn(() => ({ in: vi.fn().mockResolvedValue({ error: null }) }))
  const mockFrom = vi.fn(() => ({ select: mockSelect, delete: mockDelete }))
  return {
    supabase: {
      from: mockFrom,
    },
  }
})

describe('InquiriesScreen', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders without crashing and displays header controls', async () => {
    render(<InquiriesScreen />)

    expect(screen.getByText(/Inquiries & Showroom Schedule/i)).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /Calendar/i })[0]).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /Table/i })[0]).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /New Inquiry/i })[0]).toBeTruthy()
  })

  it('renders inquiry in table view smoothly', async () => {
    render(<InquiriesScreen initialViewMode="table" />)

    await waitFor(() => {
      const table = screen.getByRole('table')
      expect(table.textContent).toContain('Maria Santos')
      expect(table.textContent).toContain('JDS-INQ-1001')
    })
  })

  it('opens and closes the Log New Inquiry modal', async () => {
    render(<InquiriesScreen />)

    const newInquiryBtn = screen.getAllByRole('button', { name: /New Inquiry/i })[0]
    fireEvent.click(newInquiryBtn)

    expect(screen.getByText(/Log New Customer Inquiry/i)).toBeTruthy()

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i })
    fireEvent.click(cancelBtn)

    await waitFor(() => {
      expect(screen.queryByText(/Log New Customer Inquiry/i)).toBeNull()
    })
  })

  it('closes modals on Escape key press without runtime error', async () => {
    render(<InquiriesScreen />)

    const newInquiryBtn = screen.getAllByRole('button', { name: /New Inquiry/i })[0]
    fireEvent.click(newInquiryBtn)

    expect(screen.getByText(/Log New Customer Inquiry/i)).toBeTruthy()

    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByText(/Log New Customer Inquiry/i)).toBeNull()
    })
  })
})
