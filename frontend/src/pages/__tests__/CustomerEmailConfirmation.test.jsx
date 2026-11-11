import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RegisterSaleScreen from '../../components/admin/RegisterSaleScreen'
import CustomerPortalPage from '../CustomerPortalPage'
import QuoteModal from '../../components/QuoteModal'
import { buildConfirmationEmailHtml } from '../../../api/send-confirmation-email'
import * as customerService from '../../lib/customerService'

// Mock Supabase client
vi.mock('../../lib/supabaseClient', () => {
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockImplementation(() =>
      Promise.resolve({
        data: [{ id: 1, name: 'Solar Street Light 200W', default_warranty_months: 24 }],
        error: null
      })
    ),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockResolvedValue({ data: [{ id: 'mock-id' }], error: null }),
    delete: vi.fn().mockReturnThis()
  }
  return {
    supabase: {
      from: vi.fn(() => queryBuilder),
      auth: {
        signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        signInWithOtp: vi.fn().mockResolvedValue({ data: {}, error: null })
      }
    }
  }
})

// Mock Customer Service
vi.mock('../../lib/customerService', () => ({
  searchCustomerByPhone: vi.fn().mockResolvedValue({
    customer: null,
    purchases: []
  }),
  registerCustomerAndSale: vi.fn(),
  fetchCustomerPortalData: vi.fn(),
  getCustomerAuthStatus: vi.fn(),
  confirmCustomerEmailByToken: vi.fn(),
  queueAndSendCustomerConfirmationEmail: vi.fn(),
  setCustomerPassword: vi.fn(),
  deleteCustomerAccount: vi.fn()
}))

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-user' },
    role: 'admin',
    setCustomerSession: vi.fn(),
    signOut: vi.fn()
  })
}))

describe('Customer Account Creation Email & Confirmation Flow', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('requires a valid email address on POS customer account creation and shows confirmation status in QR modal', async () => {
    customerService.registerCustomerAndSale.mockImplementation(async ({ onEmailStatusChange }) => {
      if (onEmailStatusChange) {
        onEmailStatusChange({
          status: 'queued',
          email: 'maria.santos@email.com',
          message: 'Queuing email confirmation...'
        })
        onEmailStatusChange({
          status: 'awaiting_confirmation',
          email: 'maria.santos@email.com',
          message: 'Confirmation email sent to maria.santos@email.com. Awaiting verification.'
        })
      }
      return {
        customer: {
          id: 'cust-101',
          full_name: 'Maria Santos',
          phone_number: '09181234567',
          email: 'maria.santos@email.com',
          email_confirmed: false,
          email_confirmation_status: 'awaiting_confirmation',
          access_token: 'token-uuid-101'
        },
        purchases: [
          {
            id: 'purch-101',
            product_name: 'Solar Street Light 200W',
            serial_number: 'SN-101',
            warranty_months: 24,
            warranty_expires_at: '2028-11-11T00:00:00Z',
            branch_location: 'Cavite'
          }
        ],
        qrUrl: 'http://localhost:5173/portal?token=token-uuid-101',
        emailConfirmation: {
          status: 'awaiting_confirmation',
          email: 'maria.santos@email.com',
          message: 'Confirmation email sent to maria.santos@email.com. Awaiting verification.'
        }
      }
    })

    render(
      <MemoryRouter>
        <RegisterSaleScreen onNavigate={vi.fn()} />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Complete Sale & Generate QR/i })).toBeDefined()
    })

    // Fill phone and name, but enter an invalid email
    fireEvent.change(screen.getByPlaceholderText('09171234567'), {
      target: { value: '09181234567' }
    })
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Maria Santos$/i), {
      target: { value: 'Maria Santos' }
    })
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. maria\.santos@email\.com/i), {
      target: { value: 'invalid-email' }
    })

    const form = screen.getByRole('button', { name: /Complete Sale & Generate QR/i }).closest('form')
    fireEvent.submit(form)

    // Should block submission and show validation message
    expect(screen.getByText(/Please enter a valid customer email address/i)).toBeDefined()
    expect(customerService.registerCustomerAndSale).not.toHaveBeenCalled()

    // Now enter a valid email and submit
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. maria\.santos@email\.com/i), {
      target: { value: 'maria.santos@email.com' }
    })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Customer QR & Access Token')).toBeDefined()
    })

    // Verify awaiting confirmation banner and Resend button appear in QRReceiptModal
    expect(screen.getByText(/Confirmation Email Sent — Awaiting Verification/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /Resend Confirmation Email/i })).toBeDefined()
  })

  it('displays non-blocking Awaiting Email Confirmation banner in CustomerPortalPage and supports Resend', async () => {
    localStorage.setItem('jd_warranty_ack_token-unconfirmed-1', 'true')

    customerService.fetchCustomerPortalData.mockResolvedValue({
      data: {
        customer: {
          id: 'cust-202',
          name: 'Engr. Roberto Cruz',
          phone: '09179998888',
          email: 'roberto.cruz@solar.ph',
          email_confirmed: false,
          email_confirmation_status: 'awaiting_confirmation',
          token: 'token-unconfirmed-1'
        },
        purchases: [],
        claims: []
      },
      error: null
    })

    customerService.getCustomerAuthStatus.mockResolvedValue({
      hasPassword: false,
      email: 'roberto.cruz@solar.ph',
      emailConfirmed: false,
      emailConfirmationStatus: 'awaiting_confirmation'
    })

    customerService.queueAndSendCustomerConfirmationEmail.mockImplementation(async ({ onStatusChange }) => {
      if (onStatusChange) {
        onStatusChange({
          status: 'awaiting_confirmation',
          email: 'roberto.cruz@solar.ph',
          message: 'Confirmation email sent to roberto.cruz@solar.ph. Awaiting verification.'
        })
      }
      return { status: 'awaiting_confirmation', email: 'roberto.cruz@solar.ph' }
    })

    render(
      <MemoryRouter initialEntries={['/portal?token=token-unconfirmed-1']}>
        <CustomerPortalPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Engr\. Roberto Cruz!/i)).toBeDefined()
    })

    expect(screen.getByText('Awaiting Email Confirmation')).toBeDefined()
    expect(screen.getByText(/Confirmation email sent to roberto\.cruz@solar\.ph/i)).toBeDefined()

    const resendBtn = screen.getByRole('button', { name: /Resend Confirmation Email/i })
    fireEvent.click(resendBtn)

    await waitFor(() => {
      expect(customerService.queueAndSendCustomerConfirmationEmail).toHaveBeenCalledTimes(1)
    })
  })

  it('automatically verifies customer email when visiting portal with ?confirm_email= token', async () => {
    localStorage.setItem('jd_warranty_ack_token-confirm-1', 'true')

    customerService.confirmCustomerEmailByToken.mockResolvedValue({
      success: true,
      email: 'verified.customer@solar.ph',
      message: 'Your email address has been verified and confirmed.'
    })

    customerService.fetchCustomerPortalData.mockResolvedValue({
      data: {
        customer: {
          id: 'cust-303',
          name: 'Elena Reyes',
          phone: '09171112222',
          email: 'verified.customer@solar.ph',
          email_confirmed: true,
          email_confirmation_status: 'confirmed',
          token: 'token-confirm-1'
        },
        purchases: [],
        claims: []
      },
      error: null
    })

    customerService.getCustomerAuthStatus.mockResolvedValue({
      hasPassword: true,
      email: 'verified.customer@solar.ph',
      emailConfirmed: true,
      emailConfirmationStatus: 'confirmed'
    })

    render(
      <MemoryRouter initialEntries={['/portal?token=token-confirm-1&confirm_email=verify-uuid-999']}>
        <CustomerPortalPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(customerService.confirmCustomerEmailByToken).toHaveBeenCalledWith(
        'token-confirm-1',
        'verify-uuid-999'
      )
    })

    await waitFor(() => {
      expect(screen.getByText(/Your email address has been verified and confirmed/i)).toBeDefined()
    })

    // Non-blocking awaiting banner should NOT be rendered once confirmed
    expect(screen.queryByText('Awaiting Email Confirmation')).toBeNull()
  })

  it('enforces mandatory email input in public QuoteModal Step 1', () => {
    render(
      <QuoteModal
        isOpen={true}
        onClose={vi.fn()}
        product={{ id: 1, name: 'Solar Flood Light 300W', watt: 300 }}
        initialMode="inquire"
      />
    )

    // Fill name and phone, leave email empty, and submit Step 1 form
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Engr\. Juan Dela Cruz/i), {
      target: { value: 'Engr. Juan Dela Cruz' }
    })
    fireEvent.change(screen.getByPlaceholderText('09171234567'), {
      target: { value: '09171234567' }
    })

    const continueBtn = screen.getByRole('button', { name: /Continue to Schedule Visit/i })
    fireEvent.submit(continueBtn.closest('form'))

    expect(screen.getByText('Email address is required.')).toBeDefined()
  })

  it('builds an emoji-free industrial HTML confirmation email containing all account details and verification link', () => {
    const html = buildConfirmationEmailHtml({
      customerName: 'Maria Santos',
      phoneNumber: '09181234567',
      email: 'maria.santos@email.com',
      branchLocation: 'Cavite',
      accessToken: 'token-abc-123',
      portalUrl: 'https://jdforcesolar.com/portal?token=token-abc-123',
      confirmUrl: 'https://jdforcesolar.com/portal?token=token-abc-123&confirm_email=ver-xyz-789'
    })

    expect(html).toContain('Maria Santos')
    expect(html).toContain('maria.santos@email.com')
    expect(html).toContain('09181234567')
    expect(html).toContain('Cavite')
    expect(html).toContain('token-abc-123')
    expect(html).toContain('confirm_email=ver-xyz-789')
    expect(html).toContain('Confirm Email &amp; Open Customer Portal')
  })
})
