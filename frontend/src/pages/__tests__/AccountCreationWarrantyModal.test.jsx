import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CustomerPortalPage from '../CustomerPortalPage'
import UsersScreen from '../../components/admin/UsersScreen'
import RegisterSaleScreen from '../../components/admin/RegisterSaleScreen'

// Mock Supabase client
vi.mock('../../lib/supabaseClient', () => {
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockImplementation(() => Promise.resolve({
      data: [{ id: 1, name: 'Solar Street Light 200W', default_warranty_months: 24 }],
      error: null
    })),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockResolvedValue({ data: [{ id: 'mock-id' }], error: null }),
    delete: vi.fn().mockReturnThis()
  }
  return {
    supabase: {
      from: vi.fn(() => queryBuilder),
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { user: { id: 'new-user-123' } },
          error: null
        }),
        signOut: vi.fn().mockResolvedValue({ error: null })
      }
    }
  }
})

// Mock Customer Service
vi.mock('../../lib/customerService', () => ({
  fetchCustomerPortalData: vi.fn().mockResolvedValue({
    data: {
      customer: {
        id: 'cust-123',
        name: 'Juan Dela Cruz',
        phone: '09171234567',
        access_token: 'valid-test-token-123',
        created_at: new Date().toISOString()
      },
      purchases: [
        {
          id: 'purch-1',
          product_name: 'Solar Street Light 200W',
          serial_number: 'JD-SL-2026-001',
          purchase_date: '2026-01-01',
          warranty_months: 24,
          warranty_expires_at: '2028-01-01T00:00:00Z',
          is_warranty_active: true,
          replacement_claimed: false,
          void_reason: null
        }
      ],
      claims: []
    },
    error: null
  }),
  getCustomerAuthStatus: vi.fn().mockResolvedValue({
    hasPassword: false,
    email: 'juan@example.com',
    emailConfirmed: false,
    emailConfirmationStatus: 'awaiting_confirmation'
  }),
  confirmCustomerEmailByToken: vi.fn().mockResolvedValue({
    success: true,
    email: 'juan@example.com',
    message: 'Your email address has been verified and confirmed.'
  }),
  queueAndSendCustomerConfirmationEmail: vi.fn().mockResolvedValue({
    status: 'awaiting_confirmation',
    email: 'maria.santos@email.com',
    message: 'Confirmation email sent to maria.santos@email.com. Awaiting verification.'
  }),
  registerCustomerAndSale: vi.fn().mockResolvedValue({
    customer: {
      id: 'cust-new',
      name: 'Maria Santos',
      phone: '09181234567',
      email: 'maria.santos@email.com',
      email_confirmed: false,
      email_confirmation_status: 'awaiting_confirmation',
      access_token: 'new-token-uuid-456'
    },
    purchases: [
      {
        id: 'p-new',
        product_name: 'Solar Flood Light 100W',
        serial_number: 'JD-FL-100',
        warranty_months: 24,
        warranty_expires_at: '2028-11-11T00:00:00Z'
      }
    ],
    qrUrl: 'http://localhost:5173/portal?token=new-token-uuid-456',
    emailConfirmation: {
      status: 'awaiting_confirmation',
      email: 'maria.santos@email.com',
      message: 'Confirmation email sent to maria.santos@email.com. Awaiting verification.'
    }
  }),
  searchCustomerByPhone: vi.fn().mockResolvedValue({
    customer: null,
    purchases: []
  })
}))

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-user' },
    role: 'admin',
    signOut: vi.fn()
  })
}))

describe('First-Time Customer Warranty Terms & Policy Modal', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders mandatory First-Time Warranty Modal on initial portal entry and unblocks on acceptance', async () => {
    render(
      <MemoryRouter initialEntries={['/portal?token=valid-test-token-123']}>
        <CustomerPortalPage />
      </MemoryRouter>
    )

    // Wait for customer portal data to load
    await waitFor(() => {
      expect(screen.getByText(/Welcome, Juan Dela Cruz!/i)).toBeDefined()
    })

    // 1. Verify modal appears automatically for first-time visitor
    expect(screen.getByRole('dialog')).toBeDefined()
    expect(screen.getByText('2-Year Solar Warranty & Disqualification Notice')).toBeDefined()
    expect(screen.getByText(/First-Time Portal Access Acknowledgment/i)).toBeDefined()
    expect(screen.getByText(/24 Months \(2 Years\)/i)).toBeDefined()

    // 2. Verify disqualification and customer carelessness clauses
    expect(screen.getByText(/3\. Disqualified Conditions & Damage Exclusions/i)).toBeDefined()
    expect(screen.getByText(/customer carelessness, or operational negligence/i)).toBeDefined()

    // 3. Verify acknowledgment button is disabled until checkbox is checked
    const acknowledgeBtn = screen.getByRole('button', { name: /Acknowledge & Access Dashboard/i })
    expect(acknowledgeBtn.disabled).toBe(true)

    // 4. Mark checkbox
    const agreementCheckbox = screen.getByRole('checkbox')
    fireEvent.click(agreementCheckbox)
    expect(acknowledgeBtn.disabled).toBe(false)

    // 5. Click acknowledge
    fireEvent.click(acknowledgeBtn)

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    // Check that localStorage recorded acceptance
    expect(localStorage.getItem('jd_warranty_ack_valid-test-token-123')).toBe('true')
  })

  it('does NOT show modal on subsequent visits, but allows reviewing terms via button', async () => {
    // Pre-acknowledge
    localStorage.setItem('jd_warranty_ack_valid-test-token-123', 'true')

    render(
      <MemoryRouter initialEntries={['/portal?token=valid-test-token-123']}>
        <CustomerPortalPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Juan Dela Cruz!/i)).toBeDefined()
    })

    // Modal should NOT be present initially
    expect(screen.queryByRole('dialog')).toBeNull()

    // Click "Terms & Policy" in overview banner to review
    const reviewBtn = screen.getByRole('button', { name: /Terms & Policy/i })
    fireEvent.click(reviewBtn)

    // Modal should now open in review mode with a Close button
    expect(screen.getByRole('dialog')).toBeDefined()
    expect(screen.getByText('2-Year Solar Warranty & Disqualification Notice')).toBeDefined()

    const closeBtns = screen.getAllByRole('button', { name: /Close/i })
    fireEvent.click(closeBtns[0])

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })

  it('does NOT show a warranty warning modal upon creating a new user account in admin panel', async () => {
    render(
      <MemoryRouter>
        <UsersScreen />
      </MemoryRouter>
    )

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Create Account/i })).toBeDefined()
    })

    // Click "Create Account" button to toggle the form
    const createAccountBtn = screen.getByRole('button', { name: /Create Account/i })
    fireEvent.click(createAccountBtn)

    // Fill in new user form using placeholders
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Maria Clara/i), { target: { value: 'Engr. Test User' } })
    fireEvent.change(screen.getByPlaceholderText(/name@solarapp\.com/i), { target: { value: 'engr.test@jdsolar.ph' } })
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'SolarPass2026!' } })

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Register Account/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/created successfully/i)).toBeDefined()
    })

    // Assert no warranty modal or "human error" warning was triggered
    expect(screen.queryByText(/warranty is human error/i)).toBeNull()
  })

  it('shows a QR receipt modal on sale registration, but NO "human error" warranty disclaimer', async () => {
    render(
      <MemoryRouter>
        <RegisterSaleScreen onNavigate={vi.fn()} />
      </MemoryRouter>
    )

    // Wait for catalog products to load
    await waitFor(() => {
      expect(screen.queryByText(/Complete Sale & Generate QR/i)).toBeDefined()
    })

    // Enter phone, full name, and required email using exact placeholders
    fireEvent.change(screen.getByPlaceholderText('09171234567'), { target: { value: '09181234567' } })
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Maria Santos$/i), { target: { value: 'Maria Santos' } })
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. maria\.santos@email\.com/i), { target: { value: 'maria.santos@email.com' } })

    // Submit registration form
    const registerBtn = screen.getByRole('button', { name: /Complete Sale & Generate QR/i })
    fireEvent.click(registerBtn)

    // The QR modal opens to provide portal access to the customer
    await waitFor(() => {
      expect(screen.getByText('Customer QR & Access Token')).toBeDefined()
    })

    // Check modal contents for "human error" or warranty warning
    expect(screen.queryByText(/warranty is human error/i)).toBeNull()
  })
})
