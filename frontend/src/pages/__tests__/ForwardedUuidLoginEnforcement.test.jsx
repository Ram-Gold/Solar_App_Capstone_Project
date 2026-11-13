import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import LoginPage from '../LoginPage'
import CustomerPortalPage from '../CustomerPortalPage'
import ProtectedRoute from '../../components/ProtectedRoute'
import * as customerService from '../../lib/customerService'

// Location probe helper
function LocationTracker() {
  const location = useLocation()
  return <div data-testid="location-path">{location.pathname + location.search}</div>
}

// Mock customerService
vi.mock('../../lib/customerService', () => ({
  loginCustomerWithPassword: vi.fn(),
  getCustomerAuthStatus: vi.fn(),
  setCustomerPassword: vi.fn(),
  fetchCustomerPortalData: vi.fn(),
  confirmCustomerEmailByToken: vi.fn(),
  queueAndSendCustomerConfirmationEmail: vi.fn(),
  deleteCustomerAccount: vi.fn()
}))

// Mock Supabase
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null })
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    }))
  }
}))

// Mock AuthContext
const mockSetCustomerSession = vi.fn()
const mockSignIn = vi.fn()
let mockAuthState = {
  user: null,
  role: null,
  loading: false,
  signIn: mockSignIn,
  signOut: vi.fn(),
  setCustomerSession: mockSetCustomerSession
}

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuthState
}))

describe('Forwarded UUID Login Enforcement', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    mockAuthState = {
      user: null,
      role: null,
      loading: false,
      signIn: mockSignIn,
      signOut: vi.fn(),
      setCustomerSession: mockSetCustomerSession
    }
  })

  afterEach(() => {
    cleanup()
  })

  it('redirects an unauthenticated visitor to login when a UUID is forwarded to /portal', async () => {
    render(
      <MemoryRouter initialEntries={['/portal?token=forwarded-uuid-101']}>
        <Routes>
          <Route
            path="/portal"
            element={
              <ProtectedRoute allowedRoles={['customer', 'admin', 'staff']}>
                <CustomerPortalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={
              <>
                <LoginPage />
                <LocationTracker />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    // Verify redirected to login with forwarded token preserved in query parameters
    await waitFor(() => {
      const loc = screen.getByTestId('location-path')
      expect(loc.textContent).toBe('/login?token=forwarded-uuid-101')
    })

    // Verify jd_customer_token is NOT automatically set into localStorage
    expect(localStorage.getItem('jd_customer_token')).toBeNull()
  })

  it('requires password login on LoginPage even when UUID is forwarded for an existing customer account', async () => {
    customerService.getCustomerAuthStatus.mockResolvedValue({
      hasPassword: true,
      email: 'customer.test@jdsolar.ph',
      emailConfirmed: true,
      emailConfirmationStatus: 'confirmed'
    })

    render(
      <MemoryRouter initialEntries={['/login?token=existing-uuid-202']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/portal" element={<div>Customer Dashboard Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    // Verify account verified notification is presented
    await waitFor(() => {
      expect(screen.getByText('Account Verified')).toBeDefined()
      expect(
        screen.getByText(/Please enter your account password to authenticate and access your dashboard/i)
      ).toBeDefined()
    })

    // Verify email input is pre-populated
    const emailInput = screen.getByLabelText(/Email Address/i)
    expect(emailInput.value).toBe('customer.test@jdsolar.ph')

    // Password input is present and required
    const passwordInput = screen.getByLabelText(/Password/i)
    expect(passwordInput).toBeDefined()

    // Attempting login with correct password
    customerService.loginCustomerWithPassword.mockResolvedValue({
      token: 'existing-uuid-202',
      customer: { email: 'customer.test@jdsolar.ph', token: 'existing-uuid-202' },
      error: null
    })

    fireEvent.change(passwordInput, { target: { value: 'CorrectPassword123' } })
    fireEvent.click(screen.getByRole('button', { name: /Sign In to Dashboard/i }))

    await waitFor(() => {
      expect(customerService.loginCustomerWithPassword).toHaveBeenCalledWith(
        'customer.test@jdsolar.ph',
        'CorrectPassword123'
      )
      expect(mockSetCustomerSession).toHaveBeenCalledWith(
        'existing-uuid-202',
        'customer.test@jdsolar.ph'
      )
    })
  })

  it('enforces first-time password creation when UUID is forwarded for a customer without an existing password', async () => {
    customerService.getCustomerAuthStatus.mockResolvedValue({
      hasPassword: false,
      email: 'pos.customer@jdsolar.ph',
      emailConfirmed: false,
      emailConfirmationStatus: 'awaiting_confirmation'
    })

    customerService.setCustomerPassword.mockResolvedValue({
      success: true,
      email: 'pos.customer@jdsolar.ph',
      message: 'Password saved successfully.'
    })

    render(
      <MemoryRouter initialEntries={['/login?token=new-pos-uuid-303']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/portal" element={<div>Customer Dashboard Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    // Verify First-Time Account Activation banner appears
    await waitFor(() => {
      expect(screen.getByText('First-Time Account Activation')).toBeDefined()
      expect(
        screen.getByText(/Please create a password \(minimum 8 characters\) to secure your account/i)
      ).toBeDefined()
    })

    // Confirm Password field is present
    expect(screen.getByLabelText(/Confirm Password/i)).toBeDefined()

    const newPwdInput = screen.getByLabelText(/^Create Password/i)
    const confirmPwdInput = screen.getByLabelText(/Confirm Password/i)
    const submitBtn = screen.getByRole('button', { name: /Activate Account & Sign In/i })

    // Test mismatched passwords
    fireEvent.change(newPwdInput, { target: { value: 'StrongPass123' } })
    fireEvent.change(confirmPwdInput, { target: { value: 'MismatchedPass456' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/New password and confirmation do not match/i)).toBeDefined()
    })
    expect(customerService.setCustomerPassword).not.toHaveBeenCalled()

    // Test valid matching password
    fireEvent.change(confirmPwdInput, { target: { value: 'StrongPass123' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(customerService.setCustomerPassword).toHaveBeenCalledWith({
        token: 'new-pos-uuid-303',
        email: 'pos.customer@jdsolar.ph',
        password: 'StrongPass123'
      })
      expect(mockSetCustomerSession).toHaveBeenCalledWith(
        'new-pos-uuid-303',
        'pos.customer@jdsolar.ph'
      )
    })
  })
})
